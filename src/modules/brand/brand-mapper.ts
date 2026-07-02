// ============================================================
// Brand Auto-Mapping Engine — Phase 1 (Rules-based)
// ============================================================
// Strategy: deterministic matching with human review fallback
//
// Confidence thresholds:
//   >= 0.90 → pending_review (vendor must confirm before discovery)
//   >= 0.70 → pending_review (medium, queue for vendor review)
//   <  0.70 → ignored        (too uncertain)
//
// Phase 2: replace scoring with embeddings + fuzzy matching

import { ensurePendingDistributorAuth } from '@/lib/brandAuthorizedDistributor';
import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/events/emitter';
import type { MatchMethod } from '@prisma/client';
import { embed, cosineSimilarity, getEmbeddingProvider } from '@/lib/embeddings';
import { getMappingAI, judgeBatch } from '@/lib/mapping-ai';

// ── Text normalisation ───────────────────────────────────────
const NOISE_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'with', 'for',
  'pack', 'box', 'bag', 'bottle', 'jar', 'pouch', 'sachet',
]);

const UNIT_ALIASES: Record<string, string> = {
  kilogram: 'kg', kilograms: 'kg', kgs: 'kg',
  gram: 'g', grams: 'g', grms: 'g', gm: 'g', gms: 'g',
  litre: 'l', litres: 'l', liter: 'l', liters: 'l', ltr: 'l', ltrs: 'l',
  millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', mls: 'ml',
};

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')          // remove punctuation
    .replace(/(\d+)\s*(kg|g|ml|l|ltr|gm|gms|kgs|gram|grams|kilogram|kilogram)/gi,
      (_, n, u) => `${n}${UNIT_ALIASES[u.toLowerCase()] ?? u.toLowerCase()}`) // "1 KG" → "1kg"
    .split(/\s+/)
    .filter(w => w.length > 0 && !NOISE_WORDS.has(w))
    .join(' ')
    .trim();
}

// ── Token overlap similarity (Jaccard) ──────────────────────
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── Pack size extraction ─────────────────────────────────────
function extractPackSize(text: string): string | null {
  const m = text.match(/\d+(?:\.\d+)?\s*(?:kg|g|ml|l)/i);
  return m ? normalise(m[0]) : null;
}

// ── Score a single distributor product against brand product ─
//
// Phase 1 (rules-based) signals weights:
//   1. Brand-name token in product/brand field   +0.35
//   2. Jaccard token similarity on full name     up to +0.40
//   3. Pack size exact match                     +0.15
//   4. Distributor brand-field exact match       +0.10
//
// Phase 3 adds an OPTIONAL semantic-similarity signal:
//   5. Cosine similarity between embeddings     up to +0.30 (if both embeddings present)
//
// When the AI signal contributes, the rule-based portion is scaled to 0.70 so
// the final score still tops out at 1.0 while letting embeddings catch typos,
// abbreviations and Hindi/English variants the rules miss
// ("Knr Ketchup 1kg" ≈ "Knorr Ketchup 1kg").
//
// If embeddings aren't available (provider down, not yet computed), we fall
// back to pure rule-based — no behavior change vs Phase 1.
export function scoreMatch(
  brandProductName: string,
  brandName: string,
  distributorProductName: string,
  distributorBrandField: string | null,
  opts?: { brandEmbedding?: number[] | null; distributorEmbedding?: number[] | null },
): { score: number; usedAI: boolean; aiSimilarity: number | null } {
  const normBrand   = normalise(brandProductName);
  const normDist    = normalise(distributorProductName);
  const normBrandId = normalise(brandName);

  let ruleScore = 0;

  // 1. Brand name appears in distributor product (strong signal — 0.35)
  if (normDist.includes(normBrandId) || normalise(distributorBrandField ?? '').includes(normBrandId)) {
    ruleScore += 0.35;
  }

  // 2. Jaccard token similarity on full product name (0–0.40)
  ruleScore += jaccardSimilarity(normBrand, normDist) * 0.40;

  // 3. Pack size match (0.15)
  const psA = extractPackSize(normBrand);
  const psB = extractPackSize(normDist);
  if (psA && psB && psA === psB) ruleScore += 0.15;

  // 4. Distributor brand field exact match (0.10 bonus)
  if (distributorBrandField && normalise(distributorBrandField) === normBrandId) {
    ruleScore += 0.10;
  }

  ruleScore = Math.min(ruleScore, 1);

  const brandEmb = opts?.brandEmbedding;
  const distEmb = opts?.distributorEmbedding;
  const haveBothEmbeddings = brandEmb && distEmb && brandEmb.length > 0 && distEmb.length > 0 && brandEmb.length === distEmb.length;

  if (!haveBothEmbeddings) {
    return { score: ruleScore, usedAI: false, aiSimilarity: null };
  }

  // Embeddings available — blend signals.
  const sim = cosineSimilarity(brandEmb!, distEmb!); // -1..1, mostly 0..1 for related products
  const aiSimilarity = Math.max(0, sim);             // clamp negative noise to 0
  const blended = ruleScore * 0.70 + aiSimilarity * 0.30;
  return { score: Math.min(blended, 1), usedAI: true, aiSimilarity };
}

/** Build the canonical text we embed for a product (used by both sides). */
function buildEmbeddingText(name: string, brand?: string | null, packSize?: string | null, unit?: string | null, category?: string | null): string {
  const parts = [
    brand?.trim(),
    name?.trim(),
    [packSize?.trim(), unit?.trim()].filter(Boolean).join(' '),
    category?.trim(),
  ].filter(Boolean);
  return parts.join(' ');
}

/** Embed and persist the embedding for ONE BrandMasterProduct. Fire-and-forget safe. */
export async function embedBrandMasterProduct(brandMasterProductId: string): Promise<void> {
  const mp = await prisma.brandMasterProduct.findUnique({
    where: { id: brandMasterProductId },
    include: { brand: { select: { name: true } }, categoryRel: { select: { name: true } } },
  });
  if (!mp) return;
  const text = buildEmbeddingText(mp.name, mp.brand?.name, mp.packSize, mp.unit, mp.categoryRel?.name ?? mp.category);
  const vector = await embed(text);
  if (!vector) return; // provider failed — leave existing embedding untouched
  let modelTag = 'unknown';
  try { modelTag = getEmbeddingProvider().name; } catch { /* env not set */ }
  await prisma.brandMasterProduct.update({
    where: { id: brandMasterProductId },
    data: { embedding: vector, embeddingModel: modelTag, embeddingUpdatedAt: new Date() },
  });
}

/** Embed and persist the embedding for ONE distributor Product. Fire-and-forget safe. */
export async function embedDistributorProduct(productId: string): Promise<void> {
  const p = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: { select: { name: true } } },
  });
  if (!p) return;
  const text = buildEmbeddingText(p.name, p.brand, p.packSize, p.unit, p.category?.name);
  const vector = await embed(text);
  if (!vector) return;
  let modelTag = 'unknown';
  try { modelTag = getEmbeddingProvider().name; } catch { /* env not set */ }
  await prisma.product.update({
    where: { id: productId },
    data: { embedding: vector, embeddingModel: modelTag, embeddingUpdatedAt: new Date() },
  });
}

// ── Run mapping for one BrandMasterProduct ───────────────────
//
// AI hybrid pre-filter: when the brand master has an embedding, we first
// fetch ALL approved distributor products with their embeddings and rank by
// cosine similarity. Then we run the full scoreMatch on the top candidates
// + anyone the brand-name pre-filter would have caught (so we don't miss
// products with the brand name in the title but no embedding yet).
export async function runMappingForProduct(brandMasterProductId: string): Promise<void> {
  const masterProduct = await prisma.brandMasterProduct.findUniqueOrThrow({
    where: { id: brandMasterProductId },
    include: { brand: true },
  });

  const brandNameLower = masterProduct.brand.name.toLowerCase();
  // Brand-name pre-filter (deterministic — always runs).
  const ruleCandidates = await prisma.product.findMany({
    where: {
      isActive: true,
      approvalStatus: 'approved',
      vendorId: { not: null },
      OR: [
        { brand: { contains: brandNameLower, mode: 'insensitive' } },
        { name:  { contains: brandNameLower, mode: 'insensitive' } },
        { tags:  { has: brandNameLower } },
      ],
    },
    select: { id: true, name: true, brand: true, vendorId: true, embedding: true },
  });

  // Semantic pre-filter (if brand master has an embedding): top-50 products
  // by cosine similarity, even if their text doesn't mention the brand name.
  // This is what catches "Knr Ketchup" vs "Knorr Ketchup" type cases.
  const candidateMap = new Map<string, { id: string; name: string; brand: string | null; vendorId: string | null; embedding: number[] }>();
  for (const c of ruleCandidates) candidateMap.set(c.id, c);

  if (masterProduct.embedding && masterProduct.embedding.length > 0) {
    const aiPool = await prisma.product.findMany({
      where: {
        isActive: true,
        approvalStatus: 'approved',
        vendorId: { not: null },
        embeddingModel: { equals: masterProduct.embeddingModel ?? undefined }, // only same model produces comparable vectors
      },
      select: { id: true, name: true, brand: true, vendorId: true, embedding: true },
    });
    const ranked = aiPool
      .map(p => ({ p, sim: cosineSimilarity(masterProduct.embedding, p.embedding) }))
      .filter(r => r.sim > 0.55) // only keep semantically plausible
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 50)
      .map(r => r.p);
    for (const p of ranked) candidateMap.set(p.id, p);
  }

  // Always re-evaluate existing pending_review mappings, even if their distributor
  // product wouldn't pass the brand-name pre-filter. They were flagged once for a
  // reason — let the AI judge make the call.
  const pendingExisting = await prisma.brandProductMapping.findMany({
    where: { brandMasterProductId, status: 'pending_review' },
    select: {
      distributorProduct: {
        select: { id: true, name: true, brand: true, vendorId: true, embedding: true },
      },
    },
  });
  for (const row of pendingExisting) {
    if (row.distributorProduct) candidateMap.set(row.distributorProduct.id, row.distributorProduct);
  }

  // Step 1: rule-score every candidate up front (fast, sync)
  type Scored = {
    candidate: typeof candidateMap extends Map<string, infer V> ? V : never;
    score: number;
    existingStatus: string | null;
  };
  const scored: Scored[] = [];
  for (const candidate of candidateMap.values()) {
    const existing = await prisma.brandProductMapping.findUnique({
      where: {
        brandMasterProductId_distributorProductId: {
          brandMasterProductId,
          distributorProductId: candidate.id,
        },
      },
      select: { status: true },
    });
    // Skip live mappings (admin-curated) and rejected (admin said no).
    // Re-evaluate pending_review so AI can promote/demote them.
    if (existing && (existing.status === 'auto_mapped' || existing.status === 'verified' || existing.status === 'rejected')) continue;

    const r = scoreMatch(
      masterProduct.name,
      masterProduct.brand.name,
      candidate.name,
      candidate.brand,
      { brandEmbedding: masterProduct.embedding, distributorEmbedding: candidate.embedding },
    );
    scored.push({ candidate, score: r.score, existingStatus: existing?.status ?? null });
  }

  // Step 2: AI-judge the UNCERTAIN zone (0.55..0.95) in parallel — fast.
  // Below 0.55 = clearly not a match; above 0.95 = clearly a match. Skip both to save calls.
  // BUT: existing pending_review rows ALWAYS get judged — they were flagged once,
  // we owe them a real verdict (promote, confirm, or clean up the false positive).
  const aiAvailable = !!getMappingAI();
  let aiResults = new Map<string, { match: boolean; confidence: number; reason: string } | null>();
  if (aiAvailable) {
    const toJudge = scored.filter(s =>
      s.existingStatus === 'pending_review' || (s.score >= 0.55 && s.score <= 0.95)
    );
    if (toJudge.length > 0) {
      const brandText = `${masterProduct.brand.name} ${masterProduct.name}${masterProduct.packSize ? ' ' + masterProduct.packSize : ''}${masterProduct.unit ? ' ' + masterProduct.unit : ''}`.trim();
      aiResults = await judgeBatch(
        toJudge.map(s => ({
          key: s.candidate.id,
          brandProduct: brandText,
          distributorProduct: `${s.candidate.brand ?? ''} ${s.candidate.name}`.trim(),
        })),
        { concurrency: 8 },
      );
    }
  }

  // Step 3: persist final mappings using rule + AI blend.
  for (const s of scored) {
    const aiVerdict = aiResults.get(s.candidate.id);
    let finalScore = s.score;

    if (aiVerdict) {
      if (aiVerdict.match) {
        finalScore = Math.min(1, s.score * 0.4 + aiVerdict.confidence * 0.6);
      } else {
        finalScore = s.score * 0.3 * (1 - aiVerdict.confidence);
      }
    }

    if (finalScore < 0.70) {
      // Soft-reject stale pending_review when AI is confident it's wrong — keep audit trail.
      if (s.existingStatus === 'pending_review' && aiVerdict && !aiVerdict.match && aiVerdict.confidence >= 0.7) {
        await prisma.brandProductMapping.updateMany({
          where: {
            brandMasterProductId,
            distributorProductId: s.candidate.id,
            status: 'pending_review',
          },
          data: {
            status: 'rejected',
            reviewNote: aiVerdict.reason ? `AI rejected: ${aiVerdict.reason}` : 'AI rejected on re-evaluation',
            updatedAt: new Date(),
          },
        });
      }
      continue;
    }

    const status: 'auto_mapped' | 'pending_review' = 'pending_review';
    const matchedBy: MatchMethod = 'rule_based';

    await prisma.brandProductMapping.upsert({
      where: {
        brandMasterProductId_distributorProductId: {
          brandMasterProductId,
          distributorProductId: s.candidate.id,
        },
      },
      create: {
        brandId: masterProduct.brandId,
        brandMasterProductId,
        distributorProductId: s.candidate.id,
        confidenceScore: finalScore,
        status,
        matchedBy,
        reviewNote: aiVerdict?.reason ? `AI: ${aiVerdict.reason}` : null,
      },
      update: {
        confidenceScore: finalScore,
        status,
        matchedBy,
        reviewNote: aiVerdict?.reason ? `AI: ${aiVerdict.reason}` : null,
        updatedAt: new Date(),
      },
    });

    if (s.candidate.vendorId) {
      await ensurePendingDistributorAuth(masterProduct.brandId, s.candidate.vendorId);
    }

    emitEvent('BrandProductMapped', {
      mappingId: brandMasterProductId,
      brandId: masterProduct.brandId,
      brandMasterProductId,
      distributorProductId: s.candidate.id,
      confidenceScore: finalScore,
      status,
    });
  }
}

// ── Run mapping for ALL products of a brand ──────────────────
export async function runMappingForBrand(brandId: string): Promise<void> {
  const masterProducts = await prisma.brandMasterProduct.findMany({
    where: { brandId, isActive: true },
    select: { id: true },
  });

  for (const mp of masterProducts) {
    await runMappingForProduct(mp.id);
  }
}

// ── Run mapping for ONE distributor product (inverse direction) ─
// Triggered when a vendor adds/updates a product — score it against
// all approved brand master catalogs and create mappings for hits ≥0.70.
export async function runMappingForVendorProduct(distributorProductId: string): Promise<void> {
  const distributorProduct = await prisma.product.findUnique({
    where: { id: distributorProductId },
    select: { id: true, name: true, brand: true, vendorId: true, isActive: true, approvalStatus: true, embedding: true, embeddingModel: true },
  });
  if (!distributorProduct || !distributorProduct.isActive || distributorProduct.approvalStatus !== 'approved' || !distributorProduct.vendorId) {
    return;
  }

  const distNameLower = distributorProduct.name.toLowerCase();
  const distBrandLower = (distributorProduct.brand ?? '').toLowerCase();
  const masterProducts = await prisma.brandMasterProduct.findMany({
    where: {
      isActive: true,
      brand: { isActive: true, approvalStatus: 'approved' },
    },
    include: { brand: true },
  });

  const haveDistEmbedding = distributorProduct.embedding && distributorProduct.embedding.length > 0;

  // Step 1: collect rule-scored candidates that pass pre-filter
  type ScoredM = { mp: (typeof masterProducts)[number]; score: number };
  const scored: ScoredM[] = [];
  for (const mp of masterProducts) {
    const brandNameLower = mp.brand.name.toLowerCase();
    const mentionsBrand = distNameLower.includes(brandNameLower) || distBrandLower.includes(brandNameLower);

    let semanticPasses = false;
    if (!mentionsBrand && haveDistEmbedding && mp.embedding && mp.embedding.length > 0
        && mp.embeddingModel === distributorProduct.embeddingModel) {
      const sim = cosineSimilarity(distributorProduct.embedding, mp.embedding);
      semanticPasses = sim > 0.55;
    }
    if (!mentionsBrand && !semanticPasses) continue;

    const existing = await prisma.brandProductMapping.findUnique({
      where: {
        brandMasterProductId_distributorProductId: {
          brandMasterProductId: mp.id,
          distributorProductId: distributorProduct.id,
        },
      },
      select: { status: true },
    });
    // Skip live mappings (admin-curated) and rejected (admin said no).
    // Re-evaluate pending_review so AI can promote/demote them.
    if (existing && (existing.status === 'auto_mapped' || existing.status === 'verified' || existing.status === 'rejected')) continue;

    const r = scoreMatch(mp.name, mp.brand.name, distributorProduct.name, distributorProduct.brand,
      { brandEmbedding: mp.embedding, distributorEmbedding: distributorProduct.embedding });
    scored.push({ mp, score: r.score });
  }

  // Step 2: AI-judge uncertain pairs in parallel
  const aiAvailable = !!getMappingAI();
  let aiResults = new Map<string, { match: boolean; confidence: number; reason: string } | null>();
  if (aiAvailable) {
    const uncertain = scored.filter(s => s.score >= 0.55 && s.score <= 0.95);
    if (uncertain.length > 0) {
      const distText = `${distributorProduct.brand ?? ''} ${distributorProduct.name}`.trim();
      aiResults = await judgeBatch(
        uncertain.map(s => ({
          key: s.mp.id,
          brandProduct: `${s.mp.brand.name} ${s.mp.name}${s.mp.packSize ? ' ' + s.mp.packSize : ''}${s.mp.unit ? ' ' + s.mp.unit : ''}`.trim(),
          distributorProduct: distText,
        })),
        { concurrency: 8 },
      );
    }
  }

  // Step 3: persist with rule + AI blend
  for (const s of scored) {
    const aiVerdict = aiResults.get(s.mp.id);
    let finalScore = s.score;
    if (aiVerdict) {
      finalScore = aiVerdict.match
        ? Math.min(1, s.score * 0.4 + aiVerdict.confidence * 0.6)
        : s.score * 0.3 * (1 - aiVerdict.confidence);
    }
    if (finalScore < 0.70) continue;

    const status: 'auto_mapped' | 'pending_review' = 'pending_review';

    await prisma.brandProductMapping.upsert({
      where: {
        brandMasterProductId_distributorProductId: {
          brandMasterProductId: s.mp.id,
          distributorProductId: distributorProduct.id,
        },
      },
      create: {
        brandId: s.mp.brandId,
        brandMasterProductId: s.mp.id,
        distributorProductId: distributorProduct.id,
        confidenceScore: finalScore,
        status,
        matchedBy: 'rule_based',
        reviewNote: aiVerdict?.reason ? `AI: ${aiVerdict.reason}` : null,
      },
      update: {
        confidenceScore: finalScore,
        status,
        matchedBy: 'rule_based',
        reviewNote: aiVerdict?.reason ? `AI: ${aiVerdict.reason}` : null,
        updatedAt: new Date(),
      },
    });

    if (distributorProduct.vendorId) {
      await ensurePendingDistributorAuth(s.mp.brandId, distributorProduct.vendorId);
    }

    emitEvent('BrandProductMapped', {
      mappingId: s.mp.id,
      brandId: s.mp.brandId,
      brandMasterProductId: s.mp.id,
      distributorProductId: distributorProduct.id,
      confidenceScore: finalScore,
      status,
    });
  }
}
