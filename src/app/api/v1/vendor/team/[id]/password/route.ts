// PATCH /api/v1/vendor/team/[id]/password — reset a vendor team member's login password

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { vendorOnly } from '@/middleware/rbac';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';

const schema = z.object({
  password: z.string().min(6).max(72),
});

function extractMemberId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 2]; // …/team/[memberId]/password
}

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'users.edit');
    const memberId = extractMemberId(req);

    const member = await prisma.vendorTeamMember.findFirst({
      where: { id: memberId, vendorId },
      select: { userId: true },
    });
    if (!member) throw Errors.notFound('Team member not found');

    const { password } = schema.parse(await req.json());
    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({ where: { id: member.userId }, data: { password: hashed } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
