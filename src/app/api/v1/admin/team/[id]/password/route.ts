// PATCH /api/v1/admin/team/[id]/password — reset a team member's login password

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';

const schema = z.object({
  password: z.string().min(6).max(72),
});

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // …/admin/team/[userId]/password → userId is second-to-last
  return segments[segments.length - 2];
}

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'users.edit');
    const userId = extractId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, fullName: true },
    });
    if (!user || user.role !== 'admin') throw Errors.notFound('Admin user not found');

    const { password } = schema.parse(await req.json());
    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.adminTeamRoleChange,
      entity: 'User',
      entityId: userId,
      after: { action: 'password_reset', targetName: user.fullName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
