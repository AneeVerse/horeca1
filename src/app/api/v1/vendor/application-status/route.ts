// GET /api/v1/vendor/application-status — Check if current user has a pending vendor application
// WHY: Homepage needs to show a "Your vendor profile is under review" banner
//      for users who signed up as vendor but haven't been approved yet.
// PROTECTED: Any authenticated user

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

export const GET = withAuth(async (_req: NextRequest, ctx) => {
  try {
    // A user may own multiple vendor profiles since the V2.2 HCID change.
    // Surface the most recently created one for the homepage banner — that's
    // the most likely candidate for "still pending review".
    const vendor = await prisma.vendor.findFirst({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!vendor) {
      return NextResponse.json({
        success: true,
        data: { hasApplication: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        hasApplication: true,
        status: vendor.isVerified ? 'approved' : 'pending',
        businessName: vendor.businessName,
        appliedAt: vendor.createdAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
