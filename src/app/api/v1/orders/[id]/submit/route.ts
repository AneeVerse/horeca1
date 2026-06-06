// PATCH /api/v1/orders/:id/submit — submit a saved draft PO (draft → pending). Req 7.
import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/modules/order/order.service';
import { withAuth } from '@/middleware/auth';
import { requirePermission } from '@/lib/permissions/engine';
import { errorResponse, Errors } from '@/middleware/errorHandler';

function orderId(req: NextRequest): string {
  const seg = new URL(req.url).pathname.split('/');
  return seg[seg.length - 2]; // .../orders/{id}/submit
}

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  try {
    if (ctx.role !== 'customer') requirePermission(ctx, 'storefront.order');
    if (!ctx.activeBusinessAccountId || !ctx.activeOutletId) {
      throw Errors.badRequest('No active outlet selected.');
    }
    const updated = await new OrderService().submitDraft(orderId(req), {
      userId: ctx.userId,
      businessAccountId: ctx.activeBusinessAccountId,
      outletId: ctx.activeOutletId,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
