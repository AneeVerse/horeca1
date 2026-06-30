// GET /api/v1/admin/brands/[id]/team — list brand team members (admin read-only)

import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/middleware/rbac';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { toTeamMemberDTO, teamMemberInclude, type TeamMemberDTO } from '@/lib/teamMemberShape';

function extractBrandId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 2];
}

export const GET = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'brands.view');
    const brandId = extractBrandId(req);

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
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
    if (!brand) throw Errors.notFound('Brand not found');
    if (!brand.user) throw Errors.badRequest('This brand has no linked owner account');

    const members = await prisma.brandTeamMember.findMany({
      where: { brandId },
      orderBy: { createdAt: 'asc' },
      include: teamMemberInclude,
    });

    const owner: TeamMemberDTO = toTeamMemberDTO({
      id: `owner-${brand.user.id}`,
      createdAt: brand.user.createdAt,
      legacyRole: 'owner',
      isOwner: true,
      user: brand.user,
      roleRef: null,
    });
    const adminTemplate = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, isTemplate: true, scope: 'brand', name: 'Brand Admin' },
      select: { id: true, name: true, scope: true, description: true },
    });
    if (adminTemplate) {
      owner.role = {
        id: adminTemplate.id,
        name: adminTemplate.name,
        scope: 'brand',
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
