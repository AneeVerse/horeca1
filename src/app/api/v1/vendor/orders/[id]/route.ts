// GET   /api/v1/vendor/orders/:id — Get full order detail (vendor view)
// PATCH /api/v1/vendor/orders/:id — Update order status
// WHY: Vendors need to view detailed order info (items, payments, delivery slot,
//      customer info) and advance orders through the fulfillment lifecycle
// PROTECTED: Vendor only (vendors + admins)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { OrderService } from '@/modules/order/order.service';
import { updateStatusSchema } from '@/modules/order/order.validator';

// Helper: extract the [id] segment from /api/v1/vendor/orders/{id}
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

// GET — full order with items, payments, customer, delivery slot
export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    // Resolve vendorId from session — never trust client-supplied vendorId
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');
    const vendorId = vendor.id;

    const orderId = extractId(req);

    const order = await prisma.order.findFirst({
      where: { id: orderId, vendorId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            businessName: true,
          },
        },
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            method: true,
            razorpayPaymentId: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        deliverySlot: {
          select: {
            id: true,
            dayOfWeek: true,
            slotStart: true,
            slotEnd: true,
          },
        },
      },
    });

    if (!order) throw Errors.notFound('Order');

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — update order status through fulfillment lifecycle
export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    // Resolve vendorId from session — never trust client-supplied vendorId
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');
    const vendorId = vendor.id;

    const orderId = extractId(req);
    const body = await req.json();
    const { status } = updateStatusSchema.parse(body);

    const orderService = new OrderService();
    const updated = await orderService.updateStatus(orderId, vendorId, status);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
