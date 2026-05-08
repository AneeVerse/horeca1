// Provider-agnostic embedding service.
//
// Pick a provider with EMBEDDING_PROVIDER (defaults to 'openai'):
//   EMBEDDING_PROVIDER=openai   + OPENAI_API_KEY                  → text-embedding-3-small (1536 dims)
//   EMBEDDING_PROVIDER=deepseek + DEEPSEEK_API_KEY                → DeepSeek embeddings (OpenAI-compatible API)
//   EMBEDDING_PROVIDER=cohere   + COHERE_API_KEY                  → embed-multilingual-v3.0 (1024 dims)
//   EMBEDDING_PROVIDER=local    + EMBEDDING_LOCAL_URL             → POST { texts } → { embeddings }
//
// All providers return number[] (or number[][] for batch) so callers don't
// care which is wired. On any provider failure, embed() returns null so the
// caller falls back to rule-based scoring without crashing.
//
// Adding a new provider = implement the EmbeddingProvider interface and add
// one branch to getProvider(). No other code changes.

export interface EmbeddingProvider {
    readonly name: string;
    readonly dimensions: number;
    /** Embed a single string. */
    embed(text: string): Promise<number[]>;
    /** Embed a batch of strings (used by backfill scripts). */
    embedBatch(texts: string[]): Promise<number[][]>;
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
    if (!v) throw new Error(`Embedding provider env var ${name} is not set`);
    return v;
}

// ── OpenAI provider ───────────────────────────────────────────────────
// API: POST https://api.openai.com/v1/embeddings
// Body: { input: string | string[], model: 'text-embedding-3-small' }
// Response: { data: [{ embedding: number[] }] }

class OpenAIEmbeddingProvider implements EmbeddingProvider {
    readonly name = 'openai';
    readonly dimensions = 1536;
    private apiKey: string;
    private model: string;
    private baseUrl: string;

    constructor(opts?: { apiKey?: string; model?: string; baseUrl?: string }) {
        this.apiKey = opts?.apiKey ?? requireEnv('OPENAI_API_KEY');
        this.model = opts?.model ?? 'text-embedding-3-small';
        this.baseUrl = opts?.baseUrl ?? 'https://api.openai.com/v1';
    }

    async embed(text: string): Promise<number[]> {
        const result = await this.embedBatch([text]);
        return result[0];
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        const res = await fetchWithTimeout(`${this.baseUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({ input: texts, model: this.model }),
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => res.statusText);
            throw new Error(`OpenAI embeddings ${res.status}: ${errText}`);
        }
        const json = await res.json() as { data: Array<{ embedding: number[] }> };
        return json.data.map(d => d.embedding);
    }
}

// ── DeepSeek provider ─────────────────────────────────────────────────
// DeepSeek's API is OpenAI-compatible (base: https://api.deepseek.com/v1).
// Embeddings endpoint exists at /v1/embeddings — model name is deepseek-embedding
// when offered by the provider. If DeepSeek hasn't enabled embeddings on the
// account, the call returns 404 and embed() falls back to null upstream.

class DeepSeekEmbeddingProvider implements EmbeddingProvider {
    readonly name = 'deepseek';
    readonly dimensions = 1024;
    private inner: OpenAIEmbeddingProvider;

    constructor() {
        this.inner = new OpenAIEmbeddingProvider({
            apiKey: requireEnv('DEEPSEEK_API_KEY'),
            model: process.env.DEEPSEEK_EMBEDDING_MODEL ?? 'deepseek-embedding',
            baseUrl: 'https://api.deepseek.com/v1',
        });
    }

    embed(text: string): Promise<number[]> { return this.inner.embed(text); }
    embedBatch(texts: string[]): Promise<number[][]> { return this.inner.embedBatch(texts); }
}

// ── Cohere provider ───────────────────────────────────────────────────
// API: POST https://api.cohere.com/v1/embed
// Body: { texts: string[], model: 'embed-multilingual-v3.0', input_type: 'search_document' }
// Response: { embeddings: number[][] }

class CohereEmbeddingProvider implements EmbeddingProvider {
    readonly name = 'cohere';
    readonly dimensions = 1024;
    private apiKey: string;
    private model: string;

    constructor() {
        this.apiKey = requireEnv('COHERE_API_KEY');
        this.model = process.env.COHERE_EMBEDDING_MODEL ?? 'embed-multilingual-v3.0';
    }

    async embed(text: string): Promise<number[]> {
        const result = await this.embedBatch([text]);
        return result[0];
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        const res = await fetchWithTimeout('https://api.cohere.com/v1/embed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                texts,
                model: this.model,
                input_type: 'search_document',
            }),
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => res.statusText);
            throw new Error(`Cohere embeddings ${res.status}: ${errText}`);
        }
        const json = await res.json() as { embeddings: number[][] };
        return json.embeddings;
    }
}

// ── Local provider (sentence-transformers HTTP service) ───────────────
// You run any embedding model locally and expose:
//   POST {EMBEDDING_LOCAL_URL}  body: { texts: string[] }  → { embeddings: number[][] }
// Cheap to host on the same droplet.

class LocalEmbeddingProvider implements EmbeddingProvider {
    readonly name = 'local';
    readonly dimensions: number;
    private url: string;

    constructor() {
        this.url = requireEnv('EMBEDDING_LOCAL_URL');
        this.dimensions = Number(process.env.EMBEDDING_LOCAL_DIMENSIONS ?? '768');
    }

    async embed(text: string): Promise<number[]> {
        const result = await this.embedBatch([text]);
        return result[0];
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        const res = await fetchWithTimeout(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts }),
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => res.statusText);
            throw new Error(`Local embeddings ${res.status}: ${errText}`);
        }
        const json = await res.json() as { embeddings: number[][] };
        return json.embeddings;
    }
}

// ── Factory + safe wrappers ───────────────────────────────────────────

let cachedProvider: EmbeddingProvider | null = null;
let cachedProviderName: string | null = null;

/** Resolve the configured provider (cached). Throws if env is missing. */
export function getEmbeddingProvider(): EmbeddingProvider {
    const name = (process.env.EMBEDDING_PROVIDER ?? 'openai').toLowerCase();
    if (cachedProvider && cachedProviderName === name) return cachedProvider;

    let provider: EmbeddingProvider;
    switch (name) {
        case 'openai':   provider = new OpenAIEmbeddingProvider(); break;
        case 'deepseek': provider = new DeepSeekEmbeddingProvider(); break;
        case 'cohere':   provider = new CohereEmbeddingProvider(); break;
        case 'local':    provider = new LocalEmbeddingProvider(); break;
        default:
            throw new Error(`Unknown EMBEDDING_PROVIDER "${name}". Use openai | deepseek | cohere | local.`);
    }
    cachedProvider = provider;
    cachedProviderName = name;
    return provider;
}

/**
 * Safe single-text embedding.
 * Returns null on ANY failure (missing env, network, timeout, provider error)
 * so callers fall back to rule-based scoring without breaking the request.
 */
export async function embed(text: string): Promise<number[] | null> {
    if (!text || !text.trim()) return null;
    try {
        const provider = getEmbeddingProvider();
        return await provider.embed(text.trim());
    } catch (err) {
        console.warn('[embeddings] embed failed, falling back to rule-based:', (err as Error).message);
        return null;
    }
}

/**
 * Safe batch embedding (for backfill scripts).
 * Returns null on failure. Caller decides whether to retry per-item or skip.
 */
export async function embedBatch(texts: string[]): Promise<number[][] | null> {
    if (!texts.length) return [];
    try {
        const provider = getEmbeddingProvider();
        return await provider.embedBatch(texts);
    } catch (err) {
        console.warn('[embeddings] embedBatch failed:', (err as Error).message);
        return null;
    }
}

/** Cosine similarity between two unit-length-or-not vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Reset the cached provider — call after env changes (e.g. tests). */
export function resetEmbeddingProvider(): void {
    cachedProvider = null;
    cachedProviderName = null;
}
