// ============================================================
// Brand Auto-Mapping Engine — Phase 1 (Rules-based)
// ============================================================
// Strategy: deterministic matching with human review fallback
//
// Confidence thresholds:
//   >= 0.90 → auto_mapped   (high confidence, no review needed)
//   >= 0.70 → pending_review (medium, queue for admin)
//   <  0.70 → ignored        (too uncertain)
//
// Phase 2: replace scoring with embeddings + fuzzy matching

import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/events/emitter';
import type { MatchMethod } from '@prisma/client';

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
export function scoreMatch(
  brandProductName: string,
  brandName: string,
  distributorProductName: string,
  distributorBrandField: string | null,
): number {
  const normBrand   = normalise(brandProductName);
  const normDist    = normalise(distributorProductName);
  const normBrandId = normalise(brandName);

  let score = 0;

  // 1. Brand name appears in distributor product (strong signal — 0.35)
  if (normDist.includes(normBrandId) || normalise(distributorBrandField ?? '').includes(normBrandId)) {
    score += 0.35;
  }

  // 2. Jaccard token similarity on full product name (0–0.40)
  score += jaccardSimilarity(normBrand, normDist) * 0.40;

  // 3. Pack size match (0.15)
  const psA = extractPackSize(normBrand);
  const psB = extractPackSize(normDist);
  if (psA && psB && psA === psB) score += 0.15;

  // 4. Distributor brand field exact match (0.10 bonus)
  if (distributorBrandField && normalise(distributorBrandField) === normBrandId) {
    score += 0.10;
  }

  return Math.min(score, 1);
}

// ── Run mapping for one BrandMasterProduct ───────────────────
export async function runMappingForProduct(brandMasterProductId: string): Promise<void> {
  const masterProduct = await prisma.brandMasterProduct.findUniqueOrThrow({
    where: { id: brandMasterProductId },
    include: { brand: true },
  });

  // Find distributor products that mention this brand name (fast pre-filter)
  const brandNameLower = masterProduct.brand.name.toLowerCase();
  const candidates = await prisma.product.findMany({
    where: {
      isActive: true,
      approvalStatus: 'approved',
      OR: [
        { brand: { contains: brandNameLower, mode: 'insensitive' } },
        { name:  { contains: brandNameLower, mode: 'insensitive' } },
        { tags:  { has: brandNameLower } },
      ],
    },
    select: { id: true, name: true, brand: true, vendorId: true },
  });

  for (const candidate of candidates) {
    // Skip already-mapped (verified/auto)
    const existing = await prisma.brandProductMapping.findUnique({
      where: {
        brandMasterProductId_distributorProductId: {
          brandMasterProductId,
          distributorProductId: candidate.id,
        },
      },
    });
    if (existing && existing.status !== 'rejected') continue;

    const confidence = scoreMatch(
      masterProduct.name,
      masterProduct.brand.name,
      candidate.name,
      candidate.brand,
    );

    if (confidence < 0.70) continue; // below threshold — skip

    const status: 'auto_mapped' | 'pending_review' =
      confidence >= 0.90 ? 'auto_mapped' : 'pending_review';
    const matchedBy: MatchMethod = 'rule_based';

    await prisma.brandProductMapping.upsert({
      where: {
        brandMasterProductId_distributorProductId: {
          brandMasterProductId,
          distributorProductId: candidate.id,
        },
      },
      create: {
        brandId: masterProduct.brandId,
        brandMasterProductId,
        distributorProductId: candidate.id,
        confidenceScore: confidence,
        status,
        matchedBy,
      },
      update: {
        confidenceScore: confidence,
        status,
        matchedBy,
        updatedAt: new Date(),
      },
    });

    emitEvent('BrandProductMapped', {
      mappingId: brandMasterProductId,
      brandId: masterProduct.brandId,
      brandMasterProductId,
      distributorProductId: candidate.id,
      confidenceScore: confidence,
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
    select: { id: true, name: true, brand: true, isActive: true, approvalStatus: true },
  });
  if (!distributorProduct || !distributorProduct.isActive || distributorProduct.approvalStatus !== 'approved') {
    return;
  }

  // Pre-filter brand master products: brand name appears in distributor name/brand field
  const distNameLower = distributorProduct.name.toLowerCase();
  const distBrandLower = (distributorProduct.brand ?? '').toLowerCase();
  const masterProducts = await prisma.brandMasterProduct.findMany({
    where: {
      isActive: true,
      brand: { isActive: true, approvalStatus: 'approved' },
    },
    include: { brand: true },
  });

  for (const mp of masterProducts) {
    const brandNameLower = mp.brand.name.toLowerCase();
    // Quick filter: only score if distributor name OR brand field mentions the brand
    if (!distNameLower.includes(brandNameLower) && !distBrandLower.includes(brandNameLower)) {
      continue;
    }

    const existing = await prisma.brandProductMapping.findUnique({
      where: {
        brandMasterProductId_distributorProductId: {
          brandMasterProductId: mp.id,
          distributorProductId: distributorProduct.id,
        },
      },
    });
    if (existing && existing.status !== 'rejected') continue;

    const confidence = scoreMatch(mp.name, mp.brand.name, distributorProduct.name, distributorProduct.brand);
    if (confidence < 0.70) continue;

    const status: 'auto_mapped' | 'pending_review' =
      confidence >= 0.90 ? 'auto_mapped' : 'pending_review';

    await prisma.brandProductMapping.upsert({
      where: {
        brandMasterProductId_distributorProductId: {
          brandMasterProductId: mp.id,
          distributorProductId: distributorProduct.id,
        },
      },
      create: {
        brandId: mp.brandId,
        brandMasterProductId: mp.id,
        distributorProductId: distributorProduct.id,
        confidenceScore: confidence,
        status,
        matchedBy: 'rule_based',
      },
      update: {
        confidenceScore: confidence,
        status,
        matchedBy: 'rule_based',
        updatedAt: new Date(),
      },
    });

    emitEvent('BrandProductMapped', {
      mappingId: mp.id,
      brandId: mp.brandId,
      brandMasterProductId: mp.id,
      distributorProductId: distributorProduct.id,
      confidenceScore: confidence,
      status,
    });
  }
}
