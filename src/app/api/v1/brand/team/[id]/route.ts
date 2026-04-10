// PATCH  /api/v1/brand/team/[id] — update team member role (owner only)
// DELETE /api/v1/brand/team/[id] — remove team member (owner only)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { brandOnly } from '@/middleware/rbac';
import { resolveBrandContext } from '@/lib/resolveBrandId';
import { requireBrandPerm } from '@/lib/teamPermissions';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';

const updateSchema = z.object({
  role: z.enum(['manager', 'editor', 'viewer']),
});

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const PATCH = brandOnly(async (req: NextRequest, ctx) => {
  try {
    const id = extractId(req);
    const { brandId, teamRole } = await resolveBrandContext(ctx, req);
    requireBrandPerm(teamRole, 'team:manage');

    const member = await prisma.brandTeamMember.findFirst({
      where: { id, brandId },
      select: { id: true },
    });
    if (!member) throw Errors.notFound('Team member not found');

    const body = await req.json();
    const input = updateSchema.parse(body);

    const updated = await prisma.brandTeamMember.update({
      where: { id },
      data: { role: input.role },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, fullName: true, email: true, isActive: true } },
      },
    });

    return NextResponse.json({ success: true, data: { ...updated, isOwner: false } });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = brandOnly(async (req: NextRequest, ctx) => {
  try {
    const id = extractId(req);
    const { brandId, teamRole } = await resolveBrandContext(ctx, req);
    requireBrandPerm(teamRole, 'team:manage');

    const member = await prisma.brandTeamMember.findFirst({
      where: { id, brandId },
      select: { id: true },
    });
    if (!member) throw Errors.notFound('Team member not found');

    await prisma.brandTeamMember.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
