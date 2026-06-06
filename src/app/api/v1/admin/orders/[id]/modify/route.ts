// PATCH /api/v1/admin/orders/:id/modify — ops change line quantities on a pending order (Req 7).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { OrderService } from '@/modules/order/order.service';
import { modifyQuantitiesSchema } from '@/modules/order/order.validator';

function orderId(req: NextRequest): string {
  const seg = new URL(req.url).pathname.split('/');
  return seg[seg.length - 2]; // .../orders/{id}/modify
}

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'orders.edit');
    const id = orderId(req);
    const { lines } = modifyQuantitiesSchema.parse(await req.json());
    const order = await prisma.order.findUnique({ where: { id }, select: { vendorId: true } });
    if (!order) throw Errors.notFound('Order');
    const updated = await new OrderService().modifyOrderQuantities(id, order.vendorId, lines);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
