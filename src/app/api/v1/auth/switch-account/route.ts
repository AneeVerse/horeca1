import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/auth';

/**
 * POST /api/v1/auth/switch-account
 * Generates a one-time switch token for the target linked account.
 * Client uses this token with signIn('credentials', { switchToken }) to switch sessions.
 */
export const POST = withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const { linkedUserId } = body;

  if (!linkedUserId) {
    return NextResponse.json(
      { success: false, error: 'linkedUserId is required' },
      { status: 400 }
    );
  }

  // Find the link from current user to target
  const link = await prisma.linkedAccount.findUnique({
    where: {
      userId_linkedUserId: { userId: ctx.userId, linkedUserId },
    },
    include: {
      linkedUser: { select: { role: true, isActive: true } },
    },
  });

  if (!link) {
    return NextResponse.json(
      { success: false, error: 'Account link not found' },
      { status: 404 }
    );
  }

  if (!link.linkedUser.isActive) {
    return NextResponse.json(
      { success: false, error: 'Target account is deactivated' },
      { status: 403 }
    );
  }

  // Generate a fresh one-time switch token
  const freshToken = crypto.randomUUID();
  await prisma.linkedAccount.update({
    where: { id: link.id },
    data: { switchToken: freshToken },
  });

  return NextResponse.json({
    success: true,
    data: {
      switchToken: freshToken,
      role: link.linkedUser.role,
    },
  });
});
