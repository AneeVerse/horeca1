// PATCH /api/v1/admin/promotions/entries/:id — Record a completed UPI payout (UTR)
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';
import { promotionService } from '@/modules/promotion/promotion.service';
import { markEntryPaidSchema } from '@/modules/promotion/promotion.validator';

function extractId(req: NextRequest) {
  return new URL(req.url).pathname.split('/').at(-1) ?? '';
}

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'promotions.edit');
    const id = extractId(req);
    const body = markEntryPaidSchema.parse(await req.json());

    const entry = await promotionService.markEntryPaid(id, ctx.userId, body.paidReference);

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.cashbackMarkPaid,
      entity: 'cashback_entry',
      entityId: id,
      after: { amount: Number(entry.amount), paidReference: body.paidReference },
    });
    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return errorResponse(error);
  }
});
