// GET  /api/v1/vendor/team — list team members for this vendor
// POST /api/v1/vendor/team — create a new team member (owner only)

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { vendorOnly } from '@/middleware/rbac';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requireVendorPerm } from '@/lib/teamPermissions';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';
import type { AuthContext } from '@/middleware/auth';

const createMemberSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(['manager', 'editor', 'viewer']),
});

export const GET = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  const { vendorId } = await resolveVendorContext(ctx, req);

  // Get owner info
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { userId: true, user: { select: { id: true, fullName: true, email: true, createdAt: true } } },
  });
  if (!vendor) throw Errors.notFound('Vendor not found');

  const members = await prisma.vendorTeamMember.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true, isActive: true } },
    },
  });

  // Prepend the owner row (not stored in team table)
  const ownerRow = {
    id: 'owner',
    role: 'owner' as const,
    createdAt: vendor.user.createdAt,
    user: { id: vendor.user.id, fullName: vendor.user.fullName, email: vendor.user.email, isActive: true },
    isOwner: true,
  };

  return NextResponse.json({
    success: true,
    data: [ownerRow, ...members.map(m => ({ ...m, isOwner: false }))],
  });
});

export const POST = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  const { vendorId, teamRole } = await resolveVendorContext(ctx, req);
  requireVendorPerm(teamRole, 'team:manage');

  const body = await req.json();
  const input = createMemberSchema.parse(body);

  // Check email not already taken
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw Errors.conflict('Email already in use');

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        password: hashedPassword,
        role: 'vendor',
        isActive: true,
      },
    });
    const member = await tx.vendorTeamMember.create({
      data: {
        vendorId,
        userId: user.id,
        role: input.role,
        invitedBy: ctx.userId,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, fullName: true, email: true, isActive: true } },
      },
    });
    return member;
  });

  return NextResponse.json({ success: true, data: { ...result, isOwner: false } }, { status: 201 });
});
