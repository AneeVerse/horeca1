// Hyper-personalization profile endpoint.
// GET  → returns the signed-in user's profile completion status.
// POST → marks the profile as completed (idempotent — timestamp only set once).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/auth';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req: NextRequest, ctx) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      fullName: true,
      phone: true,
      pincode: true,
      businessName: true,
      gstNumber: true,
      profileCompletedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const hasCorePersonalization =
    !!user.pincode && !!user.businessName && !!user.fullName;

  return NextResponse.json({
    success: true,
    data: {
      profileCompletedAt: user.profileCompletedAt,
      isComplete: !!user.profileCompletedAt,
      hasCorePersonalization,
      fields: {
        fullName: !!user.fullName,
        phone: !!user.phone,
        pincode: !!user.pincode,
        businessName: !!user.businessName,
        gstNumber: !!user.gstNumber,
      },
    },
  });
});

export const POST = withAuth(async (_req: NextRequest, ctx) => {
  const existing = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { profileCompletedAt: true },
  });

  if (existing?.profileCompletedAt) {
    return NextResponse.json({
      success: true,
      data: { profileCompletedAt: existing.profileCompletedAt, alreadyCompleted: true },
    });
  }

  const updated = await prisma.user.update({
    where: { id: ctx.userId },
    data: { profileCompletedAt: new Date() },
    select: { profileCompletedAt: true },
  });

  return NextResponse.json({
    success: true,
    data: { profileCompletedAt: updated.profileCompletedAt, alreadyCompleted: false },
  });
});
