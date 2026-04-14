// GET  /api/v1/admin/brands — List all brands (admin)
// POST /api/v1/admin/brands — Admin creates a brand directly (auto-approved)
// SUPPORTS (GET): ?status=pending|approved|rejected
// REQUIRES: role=admin

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { BrandService } from '@/modules/brand/brand.service';
import { adminOnly } from '@/middleware/rbac';
import { requireAdminPerm } from '@/lib/teamPermissions';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { prisma } from '@/lib/prisma';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const createBrandSchema = z.object({
  // Owner account
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  // Brand profile
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  tagline: z.string().max(512).optional(),
});

export const GET = adminOnly(async (req: NextRequest, _ctx: AuthContext) => {
  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const brands = await brandService.adminListBrands(status);
  return NextResponse.json({ success: true, data: brands });
});

// POST — admin directly creates an approved brand (no application needed)
export const POST = adminOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'settings:write');

    const body = await req.json();
    const input = createBrandSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) throw Errors.conflict('Email already in use');

    const slug = slugify(input.name);
    const slugExists = await prisma.brand.findUnique({ where: { slug }, select: { id: true } });
    if (slugExists) throw Errors.conflict('A brand with this name already exists');

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
      const brand = await tx.brand.create({
        data: {
          userId: user.id,
          name: input.name,
          slug,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          website: input.website ?? null,
          tagline: input.tagline ?? null,
          approvalStatus: 'approved',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          approvalStatus: true,
          isActive: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, email: true } },
        },
      });
      return brand;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
