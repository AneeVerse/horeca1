// POST /api/v1/admin/orders/:id/reassign — ops move a pending order to a different vendor (Req 7).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { OrderService } from '@/modules/order/order.service';
import { reassignVendorSchema } from '@/modules/order/order.validator';

function orderId(req: NextRequest): string {
  const seg = new URL(req.url).pathname.split('/');
  return seg[seg.length - 2]; // .../orders/{id}/reassign
}

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'orders.edit');
    const id = orderId(req);
    const { newVendorId } = reassignVendorSchema.parse(await req.json());
    const order = await prisma.order.findUnique({ where: { id }, select: { vendorId: true } });
    if (!order) throw Errors.notFound('Order');
    const updated = await new OrderService().reassignOrderVendor(id, order.vendorId, newVendorId);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
