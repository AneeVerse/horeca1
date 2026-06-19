// GET /api/v1/brand/application-status — Check approval status for the active brand business account
// WHY: Brand portal layout needs to gate access while admin review is pending.
// PROTECTED: Any authenticated user

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

export const GET = withAuth(async (_req: NextRequest, ctx) => {
  try {
    if (!ctx.activeBusinessAccountId) {
      return NextResponse.json({
        success: true,
        data: { hasApplication: false },
      });
    }

    const brand = await prisma.brand.findFirst({
      where: { businessAccountId: ctx.activeBusinessAccountId },
      select: {
        name: true,
        approvalStatus: true,
        createdAt: true,
      },
    });

    if (!brand) {
      return NextResponse.json({
        success: true,
        data: { hasApplication: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        hasApplication: true,
        status: brand.approvalStatus,
        brandName: brand.name,
        appliedAt: brand.createdAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
