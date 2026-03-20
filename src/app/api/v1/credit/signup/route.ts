// POST /api/v1/credit/signup — Request a credit line from a vendor
// WHY: Customer applies for credit ("I want ₹50,000 credit from Daily Fresh Foods")
//      This creates a "pending" credit account that the vendor must approve
// PROTECTED: Must be logged in

import { NextRequest, NextResponse } from 'next/server';
import { CreditService } from '@/modules/credit/credit.service';
import { signupCreditSchema } from '@/modules/credit/credit.validator';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const creditService = new CreditService();

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const { vendorId, requestedLimit } = signupCreditSchema.parse(body);

    const account = await creditService.signup(ctx.userId, vendorId, requestedLimit);
    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
