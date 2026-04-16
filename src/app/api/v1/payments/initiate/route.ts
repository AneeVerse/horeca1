// POST /api/v1/payments/initiate — Create a Razorpay payment order
// WHY: Before showing the Razorpay checkout popup, we need to create an "order" on Razorpay's side
//      This gives us a razorpay_order_id that the frontend passes to Razorpay's SDK
// FLOW: Frontend sends orderId → we create Razorpay order → return razorpay_order_id to frontend
//       → frontend opens Razorpay popup → user pays → frontend gets signature → calls /verify
// PROTECTED: Must be logged in

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PaymentService } from '@/modules/payment/payment.service';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';
import { checkRateLimit } from '@/lib/rateLimit';

const initiateSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

const paymentService = new PaymentService();

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    // Rate limit: 10 payment initiations per user per minute
    const { allowed } = await checkRateLimit(`payment:${ctx.userId}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait.' } },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await req.json();
    const { orderId } = initiateSchema.parse(body);

    const result = await paymentService.initiate(orderId, ctx.userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});
