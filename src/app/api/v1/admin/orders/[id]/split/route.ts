// POST /api/v1/admin/orders/:id/split — ops split a pending order into a sibling PO (Req 7).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { OrderService } from '@/modules/order/order.service';
import { splitOrderSchema } from '@/modules/order/order.validator';

function orderId(req: NextRequest): string {
  const seg = new URL(req.url).pathname.split('/');
  return seg[seg.length - 2]; // .../orders/{id}/split
}

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'orders.edit');
    const id = orderId(req);
    const { lines } = splitOrderSchema.parse(await req.json());
    const order = await prisma.order.findUnique({ where: { id }, select: { vendorId: true } });
    if (!order) throw Errors.notFound('Order');
    const result = await new OrderService().splitOrder(id, order.vendorId, lines);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
