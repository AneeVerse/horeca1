// POST /api/v1/payments/initiate — Create a Razorpay payment order
// WHY: Before showing the Razorpay checkout popup, we need to create an "order" on Razorpay's side
//      This gives us a razorpay_order_id that the frontend passes to Razorpay's SDK
// FLOW: Frontend sends orderId → we create Razorpay order → return razorpay_order_id to frontend
//       → frontend opens Razorpay popup → user pays → frontend gets signature → calls /verify
// PROTECTED: Must be logged in

import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/modules/payment/payment.service';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const paymentService = new PaymentService();

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'orderId is required' } },
        { status: 400 }
      );
    }

    const result = await paymentService.initiate(orderId, ctx.userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});
