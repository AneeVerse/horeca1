import type { PrismaClient, Prisma } from '@prisma/client';

// Horeca1 auto-SKU format: "H1-SKU-00001" (fallback for imports/backfill only).
// Admin-entered SKUs (e.g. RIC-BAS-001) are the canonical identifier for new masters.
export const MASTER_SKU_PREFIX = 'H1-SKU-';

/** Valid admin-entered master SKU: 2–40 chars, alphanumeric + hyphens/underscores. */
export const MASTER_SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/;

export function normalizeMasterSku(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validateMasterSku(sku: string): { ok: true; normalized: string } | { ok: false; message: string } {
  const normalized = normalizeMasterSku(sku);
  if (normalized.length < 2 || normalized.length > 40) {
    return { ok: false, message: 'SKU must be 2–40 characters' };
  }
  if (!MASTER_SKU_PATTERN.test(normalized)) {
    return { ok: false, message: 'SKU may only contain letters, numbers, hyphens, and underscores' };
  }
  return { ok: true, normalized };
}

export function formatMasterSku(n: number): string {
  return `${MASTER_SKU_PREFIX}${String(n).padStart(5, '0')}`;
}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Next available master SKU. Reads the highest existing sku and increments.
 * Call inside the same transaction as the create to avoid a race under
 * concurrent master-product creation.
 */
export async function nextMasterSku(db: Db): Promise<string> {
  const last = await db.masterProduct.findFirst({
    orderBy: { sku: 'desc' },
    select: { sku: true },
  });
  const lastNum = last?.sku.match(/(\d+)\s*$/)?.[1];
  const next = lastNum ? parseInt(lastNum, 10) + 1 : 1;
  return formatMasterSku(next);
}
