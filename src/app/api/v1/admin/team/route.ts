// GET  /api/v1/admin/team — list admin team members
// POST /api/v1/admin/team — create a new admin team member (owner only — first admin)

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { requireAdminPerm } from '@/lib/teamPermissions';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';
import type { AuthContext } from '@/middleware/auth';
import { logAction } from '@/lib/auditLog';

const createMemberSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(['manager', 'editor', 'viewer']),
});

export const GET = adminOnly(async (req: NextRequest, ctx: AuthContext) => {
  // Find all admin users
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, fullName: true, email: true, isActive: true, createdAt: true },
  });

  // Get team role records
  const teamRecords = await prisma.adminTeamMember.findMany({
    select: { userId: true, role: true },
  });
  const roleMap = new Map(teamRecords.map(r => [r.userId, r.role]));

  const data = admins.map(a => ({
    id: roleMap.has(a.id) ? teamRecords.find(r => r.userId === a.id)!.userId : 'owner-' + a.id,
    role: roleMap.get(a.id) ?? 'owner',
    isOwner: !roleMap.has(a.id),
    createdAt: a.createdAt,
    user: { id: a.id, fullName: a.fullName, email: a.email, isActive: a.isActive },
  }));

  return NextResponse.json({ success: true, data });
});

export const POST = adminOnly(async (req: NextRequest, ctx: AuthContext) => {
  requireAdminPerm(ctx.adminTeamRole, 'team:manage');

  const body = await req.json();
  const input = createMemberSchema.parse(body);

  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw Errors.conflict('Email already in use');

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    });
    const member = await tx.adminTeamMember.create({
      data: {
        userId: user.id,
        role: input.role,
        invitedBy: ctx.userId,
      },
    });
    return { member, user };
  });

  await logAction(ctx, req, {
    action: 'admin_team.invite',
    entity: 'AdminTeamMember',
    entityId: result.user.id,
    after: { email: result.user.email, role: result.member.role },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: result.member.userId,
      role: result.member.role,
      isOwner: false,
      createdAt: result.member.createdAt,
      user: { id: result.user.id, fullName: result.user.fullName, email: result.user.email, isActive: result.user.isActive },
    },
  }, { status: 201 });
});
