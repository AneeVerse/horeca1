// GET /api/v1/admin/vendors/[id]/team — list vendor team members (admin read-only)

import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/middleware/rbac';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { toTeamMemberDTO, teamMemberInclude, type TeamMemberDTO } from '@/lib/teamMemberShape';

function extractVendorId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 2];
}

export const GET = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'vendors.view');
    const vendorId = extractVendorId(req);

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            hcidDisplay: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });
    if (!vendor) throw Errors.notFound('Vendor not found');

    const members = await prisma.vendorTeamMember.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'asc' },
      include: teamMemberInclude,
    });

    const owner: TeamMemberDTO = toTeamMemberDTO({
      id: `owner-${vendor.user.id}`,
      createdAt: vendor.user.createdAt,
      legacyRole: 'owner',
      isOwner: true,
      user: vendor.user,
      roleRef: null,
    });
    const adminTemplate = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, isTemplate: true, scope: 'vendor', name: 'Vendor Admin' },
      select: { id: true, name: true, scope: true, description: true },
    });
    if (adminTemplate) {
      owner.role = {
        id: adminTemplate.id,
        name: adminTemplate.name,
        scope: 'vendor',
        description: adminTemplate.description,
      };
    }

    const others: TeamMemberDTO[] = members.map((m) => toTeamMemberDTO({
      id: m.id,
      createdAt: m.createdAt,
      legacyRole: m.role,
      isOwner: false,
      user: m.user,
      roleRef: m.roleRef,
    }));

    return NextResponse.json({ success: true, data: [owner, ...others] });
  } catch (error) {
    return errorResponse(error);
  }
});
