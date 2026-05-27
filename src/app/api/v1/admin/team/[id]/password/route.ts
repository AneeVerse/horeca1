// PATCH /api/v1/admin/team/[id]/password — reset an admin team member's login password

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import type { TeamRole } from '@prisma/client';

const schema = z.object({
  password: z.string().min(6).max(72),
});

const ENUM_RANK: Record<TeamRole, number> = { owner: 80, manager: 60, editor: 40, viewer: 20 };
const SEEDED_OWNER_RANK = 100;

function extractUserId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 2]; // …/team/[userId]/password
}

async function adminRank(userId: string): Promise<number> {
  const m = await prisma.adminTeamMember.findUnique({ where: { userId }, select: { role: true } });
  return m ? ENUM_RANK[m.role] : SEEDED_OWNER_RANK;
}

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'users.edit');
    const userId = extractUserId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'admin') throw Errors.notFound('Admin user not found');

    // The seeded super-admin owner has no AdminTeamMember row. Refusing here
    // blocks the only path for a lower-privileged admin to take over the
    // platform owner's account via password reset.
    const target = await prisma.adminTeamMember.findUnique({
      where: { userId },
      select: { role: true },
    });
    if (!target) {
      throw Errors.forbidden('The platform owner\'s password cannot be reset from this endpoint');
    }

    // Rank check — caller must outrank target before resetting their password.
    const callerRank = await adminRank(ctx.userId);
    if (callerRank <= ENUM_RANK[target.role]) {
      throw Errors.forbidden('You cannot reset the password of a peer or higher-ranked admin');
    }

    const { password } = schema.parse(await req.json());
    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
