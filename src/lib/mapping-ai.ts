// Provider-agnostic LLM-as-judge for brand product mapping (Phase 3 alt path).
//
// Different paradigm from src/lib/embeddings.ts: instead of encoding products
// to vectors, we ask a chat model "are these the same SKU?". Slower per pair
// but works with chat-only providers (OpenRouter, DeepSeek, etc.) and gives
// explainable reasons.
//
// Pick a provider with MAPPING_AI_PROVIDER env var:
//   MAPPING_AI_PROVIDER=openrouter (default)
//     OPENROUTER_API_KEY=sk-or-...
//     OPENROUTER_MODEL=google/gemini-2.0-flash-001  (default)
//
// Adding new providers (direct OpenAI, Anthropic, etc.) = one new class.
//
// Performance:
// - Caller decides which candidates to judge (only uncertain ones)
// - judgeBatch runs requests in parallel with a concurrency limit
// - Per-request in-memory cache dedupes repeats within a single mapping run
// - 8s timeout per call; failures return null (caller falls back to rule score)

export interface MappingJudgeResult {
    match: boolean;
    confidence: number; // 0..1
    reason: string;
}

export interface MappingAIProvider {
    readonly name: string;
    readonly model: string;
    /** Judge a single product pair. Returns null on any failure. */
    judge(brandProduct: string, distributorProduct: string): Promise<MappingJudgeResult | null>;
}

// ── Helpers ───────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init: RequestInit, ms = DEFAULT_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Mapping AI env var ${name} is not set`);
    return v;
}

// Strict, deterministic prompt. Forces JSON output with a stable schema.
const SYSTEM_PROMPT = `You are a B2B marketplace product matcher.
Given two product names (brand canonical + distributor listing), decide if they refer to the same SKU a buyer could swap between.

Rules:
- Same brand, same product type, same pack size = MATCH
- Same brand but different pack sizes (100g vs 1kg, 250ml vs 1L) = NO MATCH
- Same brand but different variants (salted vs unsalted, classic vs masala, fresh vs frozen) = NO MATCH
- Abbreviations or typos are fine if clearly the same product (Knorr vs Knr, Buttter vs Butter)
- Different brands = NO MATCH (even if same product type)

Respond with ONLY a JSON object, no prose:
{"match": true|false, "confidence": 0.0-1.0, "reason": "<6 words>"}

Confidence guide:
- 0.95+ = certain
- 0.8-0.94 = high but some doubt
- 0.6-0.8 = plausible
- <0.6 = unlikely (still answer match=false)`;

// ── OpenRouter provider (OpenAI-compatible chat completions) ──────────
// API: POST https://openrouter.ai/api/v1/chat/completions
// Recommended headers: HTTP-Referer + X-Title for OpenRouter analytics.

class OpenRouterProvider implements MappingAIProvider {
    readonly name = 'openrouter';
    readonly model: string;
    private apiKey: string;
    private referer: string;

    constructor() {
        this.apiKey = requireEnv('OPENROUTER_API_KEY');
        this.model = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001';
        this.referer = process.env.AUTH_URL ?? 'https://horeca1.app';
    }

    async judge(brandProduct: string, distributorProduct: string): Promise<MappingJudgeResult | null> {
        const userPrompt = `Brand canonical: ${brandProduct}\nDistributor listing: ${distributorProduct}`;

        try {
            const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': this.referer,
                    'X-Title': 'Horeca1 Brand Mapping',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0,
                    max_tokens: 100,
                    response_format: { type: 'json_object' }, // honoured by most models, ignored gracefully by others
                }),
            });

            if (!res.ok) {
                console.warn('[mapping-ai] OpenRouter error', res.status, await res.text().catch(() => res.statusText));
                return null;
            }

            const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
            const content = json.choices?.[0]?.message?.content?.trim();
            if (!content) return null;

            // Some models wrap JSON in ```json ... ``` even when asked not to. Strip fences.
            const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            const parsed = JSON.parse(cleaned) as Partial<MappingJudgeResult>;

            if (typeof parsed.match !== 'boolean' || typeof parsed.confidence !== 'number') return null;

            return {
                match: parsed.match,
                confidence: Math.max(0, Math.min(1, parsed.confidence)),
                reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 200) : '',
            };
        } catch (err) {
            console.warn('[mapping-ai] judge failed:', (err as Error).message);
            return null;
        }
    }
}

// ── Factory ───────────────────────────────────────────────────────────

let cachedProvider: MappingAIProvider | null = null;
let cachedProviderName: string | null = null;

/** Resolve the configured provider (cached). Returns null if env not set. */
export function getMappingAI(): MappingAIProvider | null {
    const raw = process.env.MAPPING_AI_PROVIDER;
    if (!raw) return null;
    const name = raw.toLowerCase();
    if (cachedProvider && cachedProviderName === name) return cachedProvider;

    try {
        let provider: MappingAIProvider;
        switch (name) {
            case 'openrouter': provider = new OpenRouterProvider(); break;
            default:
                console.warn(`[mapping-ai] Unknown MAPPING_AI_PROVIDER "${name}". Disabled.`);
                return null;
        }
        cachedProvider = provider;
        cachedProviderName = name;
        return provider;
    } catch (err) {
        console.warn('[mapping-ai] provider init failed:', (err as Error).message);
        return null;
    }
}

/** Reset cache (tests/env changes). */
export function resetMappingAI(): void {
    cachedProvider = null;
    cachedProviderName = null;
}

// ── Batch judge with concurrency limit + cache ────────────────────────

interface JudgePair {
    /** Caller-supplied identifier so result lines up with input. */
    key: string;
    brandProduct: string;
    distributorProduct: string;
}

/**
 * Run many judge calls in parallel with a hard concurrency cap and an
 * in-memory cache so identical product-pair texts only get one API call.
 *
 * Returns a Map<key, result | null>. Null = either provider unavailable, the
 * call failed, or it timed out — caller should fall back to rule-only score.
 */
export async function judgeBatch(
    pairs: JudgePair[],
    opts: { concurrency?: number } = {},
): Promise<Map<string, MappingJudgeResult | null>> {
    const result = new Map<string, MappingJudgeResult | null>();
    const provider = getMappingAI();
    if (!provider) {
        for (const p of pairs) result.set(p.key, null);
        return result;
    }

    const concurrency = Math.max(1, Math.min(opts.concurrency ?? 8, 16));
    const cache = new Map<string, MappingJudgeResult | null>();

    const cacheKey = (a: string, b: string) => `${a.toLowerCase().trim()}|||${b.toLowerCase().trim()}`;

    let cursor = 0;
    const workers: Promise<void>[] = [];

    const worker = async () => {
        while (true) {
            const i = cursor++;
            if (i >= pairs.length) return;
            const p = pairs[i];
            const ck = cacheKey(p.brandProduct, p.distributorProduct);
            if (cache.has(ck)) {
                result.set(p.key, cache.get(ck)!);
                continue;
            }
            const r = await provider.judge(p.brandProduct, p.distributorProduct);
            cache.set(ck, r);
            result.set(p.key, r);
        }
    };

    for (let i = 0; i < concurrency; i++) workers.push(worker());
    await Promise.all(workers);
    return result;
}
