// GET /api/v1/admin/business-accounts/[id]/users — list customer account team members (admin read-only)

import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/middleware/rbac';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';

function extractBusinessAccountId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 2];
}

export const GET = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'customers.view');
    const businessAccountId = extractBusinessAccountId(req);

    const account = await prisma.businessAccount.findUnique({
      where: { id: businessAccountId },
      select: { id: true, isCustomer: true },
    });
    if (!account) throw Errors.notFound('Business account not found');
    if (!account.isCustomer) throw Errors.badRequest('This business account is not a customer account');

    const members = await prisma.businessAccountMember.findMany({
      where: { businessAccountId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        isPrimary: true,
        acceptedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            image: true,
            hcidDisplay: true,
            isActive: true,
            userRoles: {
              where: { businessAccountId, role: { scope: 'account' } },
              select: {
                id: true,
                outletId: true,
                role: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    return errorResponse(error);
  }
});
