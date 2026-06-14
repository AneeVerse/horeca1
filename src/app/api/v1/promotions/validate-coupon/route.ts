// POST /api/v1/promotions/validate-coupon — Preview a coupon against the
//      user's server-side cart (active business account + outlet).
// WHY: The checkout page shows the estimated discount before placing the
//      order. The order transaction re-validates everything — this endpoint
//      never reserves a use. Rate-limited to stop code brute-forcing.
// PROTECTED: Must be logged in

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { checkRateLimit } from '@/lib/rateLimit';
import { promotionService } from '@/modules/promotion/promotion.service';
import { validateCouponSchema } from '@/modules/promotion/promotion.validator';

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const { allowed } = await checkRateLimit(`coupon-validate:${ctx.userId}`, 15, 60000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a minute.' } },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    const body = validateCouponSchema.parse(await req.json());
    if (!ctx.activeBusinessAccountId || !ctx.activeOutletId) {
      throw Errors.badRequest('No active outlet selected');
    }

    const result = await promotionService.previewCoupon({
      userId: ctx.userId,
      businessAccountId: ctx.activeBusinessAccountId,
      outletId: ctx.activeOutletId,
      code: body.code,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});
