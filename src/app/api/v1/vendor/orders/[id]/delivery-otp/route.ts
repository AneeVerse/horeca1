// POST /api/v1/vendor/orders/:id/delivery-otp — issue a delivery OTP (Phase 5)
// WHY: When an order heads out, the vendor/delivery operator triggers a 4-digit
//      code that's sent to the customer (SMS/email/in-app). The customer reads
//      it to the agent, who enters it on the delivered transition to prove
//      handover. The code itself is never returned here — only the customer
//      receives it.
// PROTECTED: Vendor only; requires orders.edit.

import { NextRequest, NextResponse } from 'next/server';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { OrderService } from '@/modules/order/order.service';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const orderService = new OrderService();

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'orders.edit');

    const segments = new URL(req.url).pathname.split('/').filter(Boolean);
    // .../vendor/orders/<id>/delivery-otp → id is second-to-last
    const orderId = segments[segments.length - 2];

    const result = await orderService.generateDeliveryOtp(orderId, vendorId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});
