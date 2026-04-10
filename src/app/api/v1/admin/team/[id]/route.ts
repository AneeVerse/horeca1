// PATCH  /api/v1/admin/team/[id] — update admin team member role (owner only)
// DELETE /api/v1/admin/team/[id] — remove admin team member (owner only)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { requireAdminPerm } from '@/lib/teamPermissions';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';

const updateSchema = z.object({
  role: z.enum(['manager', 'editor', 'viewer']),
});

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

async function getAdminTeamRole(userId: string): Promise<'owner' | 'manager' | 'editor' | 'viewer'> {
  const membership = await prisma.adminTeamMember.findUnique({ where: { userId }, select: { role: true } });
  return membership ? membership.role : 'owner';
}

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    const id = extractId(req);
    const callerRole = await getAdminTeamRole(ctx.userId);
    requireAdminPerm(callerRole, 'team:manage');

    const member = await prisma.adminTeamMember.findUnique({ where: { userId: id }, select: { userId: true } });
    if (!member) throw Errors.notFound('Team member not found');

    const body = await req.json();
    const input = updateSchema.parse(body);

    await prisma.adminTeamMember.update({ where: { userId: id }, data: { role: input.role } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = adminOnly(async (req: NextRequest, ctx) => {
  try {
    const id = extractId(req);
    const callerRole = await getAdminTeamRole(ctx.userId);
    requireAdminPerm(callerRole, 'team:manage');

    const member = await prisma.adminTeamMember.findUnique({ where: { userId: id }, select: { userId: true } });
    if (!member) throw Errors.notFound('Team member not found');

    await prisma.adminTeamMember.delete({ where: { userId: id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
