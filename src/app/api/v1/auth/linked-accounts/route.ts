import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/auth';

/**
 * GET /api/v1/auth/linked-accounts
 * Returns all accounts linked to the current user.
 */
export const GET = withAuth(async (_req: NextRequest, ctx) => {
  const links = await prisma.linkedAccount.findMany({
    where: { userId: ctx.userId },
    include: {
      linkedUser: {
        select: { id: true, email: true, fullName: true, role: true, image: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const accounts = links.map((link) => ({
    linkId: link.id,
    id: link.linkedUser.id,
    email: link.linkedUser.email,
    name: link.linkedUser.fullName,
    role: link.linkedUser.role,
    image: link.linkedUser.image,
  }));

  return NextResponse.json({ success: true, data: accounts });
});
