// PATCH /api/v1/orders/:id/status — Update order status
// WHY: Vendors (and admins) move orders through the lifecycle:
//      pending → confirmed → processing → shipped → delivered
//      Or cancel: pending → cancelled
//      Each transition emits an event (used for notifications, stock release on cancel, etc.)
// PROTECTED: Vendor or admin only

import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/modules/order/order.service';
import { updateStatusSchema } from '@/modules/order/order.validator';
import { withRole } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';

const orderService = new OrderService();

// Only vendors and admins can update order status
export const PATCH = withRole(['vendor', 'admin'], async (req: NextRequest, ctx) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    // URL: /api/v1/orders/{id}/status → id is segments[4]
    const orderId = segments[4];

    const body = await req.json();
    const { status } = updateStatusSchema.parse(body);

    // For vendors: they can only update orders assigned to their vendor profile
    // For admins: they can update any order (ctx.role check happens in withRole)
    const order = await orderService.updateStatus(orderId, ctx.userId, status);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return errorResponse(error);
  }
});
