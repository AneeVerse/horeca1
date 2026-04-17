// PATCH  /api/v1/admin/team/[id] — update admin team member role (owner only)
// DELETE /api/v1/admin/team/[id] — remove admin team member (owner only)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { requireAdminPerm } from '@/lib/teamPermissions';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';

const updateSchema = z.object({
  role: z.enum(['manager', 'editor', 'viewer']),
});

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'team:manage');
    const id = extractId(req);

    const member = await prisma.adminTeamMember.findUnique({ where: { userId: id }, select: { userId: true, role: true } });
    if (!member) throw Errors.notFound('Team member not found');

    const body = await req.json();
    const input = updateSchema.parse(body);

    await prisma.adminTeamMember.update({ where: { userId: id }, data: { role: input.role } });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.adminTeamRoleChange,
      entity: 'AdminTeamMember',
      entityId: id,
      before: { role: member.role },
      after: { role: input.role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'team:manage');
    const id = extractId(req);

    const member = await prisma.adminTeamMember.findUnique({ where: { userId: id }, select: { userId: true, role: true } });
    if (!member) throw Errors.notFound('Team member not found');

    await prisma.adminTeamMember.delete({ where: { userId: id } });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.adminTeamRemove,
      entity: 'AdminTeamMember',
      entityId: id,
      before: { role: member.role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
