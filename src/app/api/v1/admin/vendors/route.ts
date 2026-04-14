// GET  /api/v1/admin/vendors — List all vendors with details
// POST /api/v1/admin/vendors — Admin creates a vendor directly (auto-verified)
// WHY: Admin vendor management page — review, filter by verification status, search,
//      and directly onboard new vendors without waiting for an application
// PROTECTED: Admin only
// SUPPORTS (GET): ?verified=true|false&search=&cursor=&limit=20

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { requireAdminPerm } from '@/lib/teamPermissions';

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const createVendorSchema = z.object({
  // Owner account
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  phone: z.string().optional(),
  // Vendor profile
  businessName: z.string().min(1).max(255),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  minOrderValue: z.number().min(0).optional(),
});

export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const params = req.nextUrl.searchParams;
    const verified = params.has('verified') ? params.get('verified') === 'true' : undefined;
    const search = params.get('search') || undefined;
    const cursor = params.get('cursor') || undefined;
    const limit = Math.min(Number(params.get('limit')) || 20, 100);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (typeof verified === 'boolean') {
      where.isVerified = verified;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        slug: true,
        logoUrl: true,
        rating: true,
        isVerified: true,
        isActive: true,
        creditEnabled: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    const hasMore = vendors.length > limit;
    if (hasMore) vendors.pop();

    const nextCursor = hasMore ? vendors[vendors.length - 1].id : null;

    return NextResponse.json({
      success: true,
      data: {
        vendors,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

// POST — admin directly creates a verified vendor (no application needed)
export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'settings:write');

    const body = await req.json();
    const input = createVendorSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) throw Errors.conflict('Email already in use');

    const slug = slugify(input.businessName);
    const slugExists = await prisma.vendor.findUnique({ where: { slug }, select: { id: true } });
    if (slugExists) throw Errors.conflict('A vendor with this business name already exists');

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          password: hashedPassword,
          role: 'vendor',
          phone: input.phone ?? null,
          isActive: true,
        },
      });
      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          businessName: input.businessName,
          slug,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          minOrderValue: input.minOrderValue ?? 0,
          isVerified: true,
          isActive: true,
        },
        select: {
          id: true,
          businessName: true,
          slug: true,
          logoUrl: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      });
      return vendor;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
