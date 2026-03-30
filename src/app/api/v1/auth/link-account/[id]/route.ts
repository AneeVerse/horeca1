import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/auth';

/**
 * DELETE /api/v1/auth/link-account/[id]
 * Removes a linked account (both directions).
 */
export const DELETE = withAuth(async (
  _req: NextRequest,
  ctx
) => {
  // Extract the link ID from the URL
  const url = new URL(_req.url);
  const segments = url.pathname.split('/');
  const linkId = segments[segments.length - 1];

  if (!linkId) {
    return NextResponse.json(
      { success: false, error: 'Link ID is required' },
      { status: 400 }
    );
  }

  // Find the link and verify ownership
  const link = await prisma.linkedAccount.findUnique({
    where: { id: linkId },
  });

  if (!link || link.userId !== ctx.userId) {
    return NextResponse.json(
      { success: false, error: 'Link not found' },
      { status: 404 }
    );
  }

  // Delete both directions
  await prisma.$transaction([
    prisma.linkedAccount.delete({ where: { id: link.id } }),
    prisma.linkedAccount.deleteMany({
      where: { userId: link.linkedUserId, linkedUserId: link.userId },
    }),
  ]);

  return NextResponse.json({ success: true });
});
