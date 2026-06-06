import type { PrismaClient, Prisma } from '@prisma/client';

// Horeca1 canonical SKU format: "H1-SKU-00001" (5-digit zero-padded sequence).
// Zero-padding keeps lexicographic order == numeric order so `orderBy sku desc`
// reliably yields the highest existing number (until 99999, far beyond catalog size).
export const MASTER_SKU_PREFIX = 'H1-SKU-';

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
