// PATCH /api/v1/orders/:id/status — Update order status
// WHY: Vendors (and admins) move orders through the lifecycle:
//      pending → confirmed → processing → shipped → delivered
//      Or cancel: pending → cancelled
//      Each transition emits an event (used for notifications, stock release on cancel, etc.)
// PROTECTED: Vendor or admin only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderService } from '@/modules/order/order.service';
import { updateStatusSchema } from '@/modules/order/order.validator';
import { withRole } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';

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

    // Resolve the vendor entity ID from the authenticated user
    let vendorId: string;

    if (ctx.role === 'admin') {
      // Admins can update any order — fetch vendorId from the order itself
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { vendorId: true },
      });
      if (!order) throw Errors.notFound('Order');
      vendorId = order.vendorId;
    } else {
      // Vendor users: look up their vendor profile by userId
      const vendor = await prisma.vendor.findUnique({
        where: { userId: ctx.userId },
        select: { id: true },
      });
      if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');
      vendorId = vendor.id;
    }

    const order = await orderService.updateStatus(orderId, vendorId, status);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return errorResponse(error);
  }
});
