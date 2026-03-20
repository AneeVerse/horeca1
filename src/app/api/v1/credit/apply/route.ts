// POST /api/v1/credit/apply — Use credit to pay for an order
// WHY: Instead of paying via Razorpay, the customer can use their vendor credit line
//      This deducts the amount from their credit balance in a database transaction
//      Common in B2B — vendors trust regular customers to pay on a monthly cycle
// PROTECTED: Must be logged in

import { NextRequest, NextResponse } from 'next/server';
import { CreditService } from '@/modules/credit/credit.service';
import { applyCreditSchema } from '@/modules/credit/credit.validator';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const creditService = new CreditService();

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const { orderId, amount } = applyCreditSchema.parse(body);

    const result = await creditService.apply(ctx.userId, orderId, amount);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});
