import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { serializeFieldValue } from '@/lib/product-edit-policy';

type AuditDb = Prisma.TransactionClient | typeof prisma;

export type ProductAuditSource =
  | 'vendor_edit'
  | 'admin_edit'
  | 'master_sync'
  | 'import'
  | 'system';

export interface ProductFieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/** Append field-level audit rows for a product mutation. */
export async function logProductFieldChanges(
  productId: string,
  changedBy: string,
  source: ProductAuditSource,
  changes: ProductFieldChange[],
  db: AuditDb = prisma,
): Promise<void> {
  const rows = changes
    .filter((c) => serializeFieldValue(c.oldValue) !== serializeFieldValue(c.newValue))
    .map((c) => ({
      productId,
      field: c.field,
      oldValue: serializeFieldValue(c.oldValue),
      newValue: serializeFieldValue(c.newValue),
      changedBy,
      source,
    }));

  if (rows.length === 0) return;

  await db.productAuditLog.createMany({ data: rows });
}

/** Diff two plain objects and emit audit rows for listed keys. */
export async function auditProductDiff(
  productId: string,
  changedBy: string,
  source: ProductAuditSource,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
  db: AuditDb = prisma,
): Promise<void> {
  const changes: ProductFieldChange[] = fields
    .filter((f) => after[f] !== undefined)
    .map((field) => ({
      field,
      oldValue: before[field],
      newValue: after[field],
    }));

  await logProductFieldChanges(productId, changedBy, source, changes, db);
}
