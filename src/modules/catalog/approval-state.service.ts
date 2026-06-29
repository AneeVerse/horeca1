// DB-backed product approval transitions. Every approvalStatus mutation on a Product
// MUST go through transitionProductApproval (or the canTransitionApproval guard in
// catalog.service.updateProduct) — no raw `prisma.product.update({ data: { approvalStatus } })`.
//
// Loads the current state, validates the transition, updates the row, and writes a
// ProductAuditLog entry — all inside one transaction so the audit can never drift
// from the row.

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';
import { logProductFieldChanges, type ProductAuditSource } from '@/lib/product-audit';
import { canTransitionApproval, type ApprovalState } from '@/modules/catalog/approval-state';

type Db = Prisma.TransactionClient | typeof prisma;

export interface TransitionOptions {
  /** Extra scalar fields to set on the same update (approvedBy, approvedAt, approvalNote,
   *  masterProductId, categoryId, …). Unchecked variant so callers can set FK scalars. */
  data?: Prisma.ProductUncheckedUpdateInput;
  /** Audit source tag — defaults to 'system'. */
  source?: ProductAuditSource;
  /** Run inside an existing transaction client instead of opening a new one. */
  tx?: Db;
}

/**
 * Validate + apply a product approvalStatus transition, with an audit trail.
 * Throws Errors.conflict on an invalid transition and Errors.notFound when the
 * product does not exist.
 */
export async function transitionProductApproval(
  productId: string,
  to: ApprovalState,
  actorId: string | null,
  opts: TransitionOptions = {},
) {
  const exec = async (db: Db) => {
    const current = await db.product.findUnique({
      where: { id: productId },
      select: { approvalStatus: true },
    });
    if (!current) throw Errors.notFound('Product');

    if (!canTransitionApproval(current.approvalStatus, to)) {
      throw Errors.conflict(
        `Invalid product approval transition: "${current.approvalStatus}" → "${to}".`,
      );
    }

    const updated = await db.product.update({
      where: { id: productId },
      data: { ...(opts.data ?? {}), approvalStatus: to },
    });

    if (actorId && current.approvalStatus !== to) {
      await logProductFieldChanges(
        productId,
        actorId,
        opts.source ?? 'system',
        [{ field: 'approvalStatus', oldValue: current.approvalStatus, newValue: to }],
        db,
      );
    }

    return updated;
  };

  return opts.tx ? exec(opts.tx) : prisma.$transaction(exec);
}
