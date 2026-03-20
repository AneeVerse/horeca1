// GET /api/v1/credit/check?vendorId=xxx — Check available credit with a vendor
// WHY: Before checkout, the frontend checks if the customer has a credit line with the vendor
//      If yes, shows "Pay with Credit" option alongside Razorpay
//      Returns: credit_limit, credit_used, available balance, status
// PROTECTED: Must be logged in

import { NextRequest, NextResponse } from 'next/server';
import { CreditService } from '@/modules/credit/credit.service';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const creditService = new CreditService();

export const GET = withAuth(async (req: NextRequest, ctx) => {
  try {
    const vendorId = req.nextUrl.searchParams.get('vendorId');
    if (!vendorId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'vendorId required' } },
        { status: 400 }
      );
    }

    const result = await creditService.check(ctx.userId, vendorId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});
