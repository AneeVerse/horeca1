// GET  /api/v1/brand/team — list team members for this brand
// POST /api/v1/brand/team — create a new team member (owner only)

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { brandOnly } from '@/middleware/rbac';
import { resolveBrandContext } from '@/lib/resolveBrandId';
import { requireBrandPerm } from '@/lib/teamPermissions';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';
import type { AuthContext } from '@/middleware/auth';

const createMemberSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(['manager', 'editor', 'viewer']),
});

export const GET = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const { brandId } = await resolveBrandContext(ctx, req);

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { userId: true, user: { select: { id: true, fullName: true, email: true, createdAt: true } } },
  });
  if (!brand) throw Errors.notFound('Brand not found');

  const members = await prisma.brandTeamMember.findMany({
    where: { brandId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true, isActive: true } },
    },
  });

  const ownerRow = {
    id: 'owner',
    role: 'owner' as const,
    createdAt: brand.user.createdAt,
    user: { id: brand.user.id, fullName: brand.user.fullName, email: brand.user.email, isActive: true },
    isOwner: true,
  };

  return NextResponse.json({
    success: true,
    data: [ownerRow, ...members.map(m => ({ ...m, isOwner: false }))],
  });
});

export const POST = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const { brandId, teamRole } = await resolveBrandContext(ctx, req);
  requireBrandPerm(teamRole, 'team:manage');

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
        role: 'brand',
        isActive: true,
      },
    });
    const member = await tx.brandTeamMember.create({
      data: {
        brandId,
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
