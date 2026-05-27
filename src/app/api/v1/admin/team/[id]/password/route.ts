// PATCH /api/v1/admin/team/[id]/password — reset an admin team member's login password

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';

const schema = z.object({
  password: z.string().min(6).max(72),
});

function extractUserId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 2]; // …/team/[userId]/password
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

    const { password } = schema.parse(await req.json());
    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
