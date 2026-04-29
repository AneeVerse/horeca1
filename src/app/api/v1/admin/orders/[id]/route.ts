// GET  /api/v1/admin/orders/:id — Get full order detail
// PATCH /api/v1/admin/orders/:id — Admin force-update order status
// WHY: Admin can view any order in full detail (items, payments, vendor, customer)
//      and override order status when needed (e.g., resolving disputes, manual corrections)
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { ApiError, errorResponse, Errors } from '@/middleware/errorHandler';
import type { OrderStatus } from '@prisma/client';
import { requireAdminPerm } from '@/lib/teamPermissions';
import { emitEvent } from '@/events/emitter';
import { InventoryService } from '@/modules/inventory/inventory.service';

const inventoryService = new InventoryService();

const VALID_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

// Helper: extract the [id] segment from /api/v1/admin/orders/{id}
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

// GET — full order with items, payments, vendor, customer info
export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const id = extractId(req);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logoUrl: true,
          },
        },
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
        creditTxns: {
          select: {
            id: true,
            type: true,
            amount: true,
            balanceAfter: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw Errors.notFound('Order');
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — admin force-update order status
export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'orders:write');
    const id = extractId(req);
    const body = await req.json();

    const { status } = body as { status?: OrderStatus };

    if (!status || !VALID_STATUSES.includes(status)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        400,
      );
    }

    // Verify order exists + grab items so we can release stock on cancel
    const existing = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
        vendorId: true,
        orderNumber: true,
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (!existing) {
      throw Errors.notFound('Order');
    }

    const isCancelTransition = status === 'cancelled' && existing.status !== 'cancelled';

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Release reserved inventory if we're moving into 'cancelled'
      if (isCancelTransition && existing.items.length > 0) {
        await inventoryService.releaseStock(existing.items, tx);
      }
      // 2. Update the order itself
      return tx.order.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          paymentStatus: true,
          updatedAt: true,
          vendor: { select: { id: true, businessName: true } },
          user: { select: { id: true, fullName: true, email: true } },
        },
      });
    });

    // 3. Fan out the appropriate event (after the transaction commits) so the
    //    notification worker sends an SMS / email / push to the customer.
    const basePayload = { orderId: existing.id, userId: existing.userId, vendorId: existing.vendorId };
    if (status === 'confirmed') emitEvent('OrderConfirmed', basePayload);
    else if (status === 'shipped') emitEvent('OrderShipped', basePayload);
    else if (status === 'delivered') emitEvent('OrderDelivered', basePayload);
    else if (status === 'cancelled') emitEvent('OrderCancelled', { ...basePayload, reason: 'Cancelled by admin' });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
