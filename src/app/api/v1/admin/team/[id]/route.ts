// PATCH  /api/v1/admin/team/[id] — change an admin team member's role
// DELETE /api/v1/admin/team/[id] — remove a member from the admin team
//
// `[id]` is the AdminTeamMember.userId (matches the legacy contract so the
// existing front-end DELETE call site keeps working).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';
import { redis } from '@/lib/redis';
import type { TeamRole } from '@prisma/client';

const updateSchema = z.object({
  roleId: z.string().uuid().optional(),
  permissions: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
}).refine(d => d.roleId || d.permissions, { message: 'Either roleId or permissions is required' });

const ADMIN_ROLE_TO_ENUM: Record<string, TeamRole> = {
  'Super Admin': 'owner',
  'Ops Admin': 'manager',
  'Finance Admin': 'manager',
  'Support Agent': 'viewer',
  Editor: 'editor',
  Viewer: 'viewer',
};

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'users.edit');
    const userId = extractId(req);

    const member = await prisma.adminTeamMember.findUnique({
      where: { userId },
      select: { id: true, role: true, roleId: true },
    });
    if (!member) throw Errors.notFound('Team member not found');

    const body = await req.json();
    const input = updateSchema.parse(body);

    let role: { id: string; name: string; scope: string };
    if (input.permissions && Object.keys(input.permissions).length > 0) {
      const ALLOWED = ['view', 'create', 'edit', 'delete', 'approve'];
      const sanitized: Record<string, Record<string, boolean>> = {};
      for (const [mod, actions] of Object.entries(input.permissions)) {
        sanitized[mod] = {};
        for (const [a, v] of Object.entries(actions)) {
          if (ALLOWED.includes(a) && typeof v === 'boolean') sanitized[mod][a] = v;
        }
      }
      role = await prisma.accountRole.create({
        data: { businessAccountId: null, name: `Custom-${Date.now().toString(36)}`, scope: 'admin', permissions: sanitized, isTemplate: false, createdBy: ctx.userId },
        select: { id: true, name: true, scope: true },
      });
    } else {
      const found = await prisma.accountRole.findUnique({
        where: { id: input.roleId! },
        select: { id: true, name: true, scope: true },
      });
      if (!found || found.scope !== 'admin') throw Errors.badRequest('roleId must reference an admin-scope role');
      role = found;
    }

    const legacyEnum: TeamRole = ADMIN_ROLE_TO_ENUM[role.name] ?? 'viewer';

    await prisma.adminTeamMember.update({
      where: { id: member.id },
      data: { roleId: role.id, role: legacyEnum },
    });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.adminTeamRoleChange,
      entity: 'AdminTeamMember',
      entityId: userId,
      before: { roleId: member.roleId, role: member.role },
      after: { roleId: role.id, role: legacyEnum, roleName: role.name },
    });

    try { await redis.set(`session:stale:${userId}`, '1', 'EX', 3600); } catch { /* non-critical */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'users.delete');
    const userId = extractId(req);

    if (userId === ctx.userId) {
      throw Errors.badRequest('You cannot remove yourself from the admin team');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'admin') throw Errors.notFound('Admin user not found');

    const member = await prisma.adminTeamMember.findUnique({
      where: { userId },
      select: { id: true, role: true, roleId: true },
    });

    if (member) {
      await prisma.adminTeamMember.delete({ where: { id: member.id } });
    }
    // Demote user role so they can't access admin routes
    await prisma.user.update({ where: { id: userId }, data: { role: 'customer' } });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.adminTeamRemove,
      entity: 'AdminTeamMember',
      entityId: userId,
      before: { roleId: member?.roleId, role: member?.role ?? 'owner' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
