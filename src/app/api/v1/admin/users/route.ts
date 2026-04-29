// GET  /api/v1/admin/users — List all users with pagination
// POST /api/v1/admin/users — Admin creates a customer/vendor without OTP
// WHY: Admin user management page — search users, filter by role, create accounts
// PROTECTED: Admin only
// SUPPORTS: ?role=customer|vendor|admin&search=&cursor=&limit=20

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { requireAdminPerm } from '@/lib/teamPermissions';
import { withRateLimit } from '@/middleware/withRateLimit';
import type { Role } from '@prisma/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function vendorSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `${base}-${Date.now().toString(36)}`;
}

export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const params = req.nextUrl.searchParams;
    const role = params.get('role') as Role | null;
    const search = params.get('search') || undefined;
    const cursor = params.get('cursor') || undefined;
    const limit = Math.min(Number(params.get('limit')) || 20, 100);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        businessName: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Cursor pagination: if we got limit+1 results, there's a next page
    const hasMore = users.length > limit;
    if (hasMore) users.pop();

    const nextCursor = hasMore ? users[users.length - 1].id : null;

    return NextResponse.json({
      success: true,
      data: {
        users,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

// POST — admin creates a user (customer or vendor) without OTP
export const POST = withRateLimit(adminOnly(async (req: NextRequest, ctx) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'settings:write');
    const body = await req.json();

    const fullName = String(body.fullName ?? '').trim();
    const phone = String(body.phone ?? '').replace(/\D/g, '').replace(/^91/, '');
    const rawEmail = String(body.email ?? '').trim().toLowerCase();
    const email = rawEmail && EMAIL_RE.test(rawEmail) ? rawEmail : null;
    const businessName = String(body.businessName ?? '').trim() || null;
    const gstNumber = String(body.gstNumber ?? '').trim() || null;
    const pincode = String(body.pincode ?? '').trim() || null;
    const password = String(body.password ?? '');
    const role: Role = body.role === 'vendor' ? 'vendor' : 'customer';

    if (!fullName) throw Errors.badRequest('Full name is required');
    if (!/^\d{10}$/.test(phone)) throw Errors.badRequest('Enter a valid 10-digit phone number');
    if (rawEmail && !email) throw Errors.badRequest('Enter a valid email address');
    if (password && password.length < 6) throw Errors.badRequest('Password must be at least 6 characters');

    // Uniqueness checks
    const phoneTaken = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (phoneTaken) throw Errors.badRequest('A user with this phone already exists');

    if (email) {
      const emailTaken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (emailTaken) throw Errors.badRequest('A user with this email already exists');
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.create({
      data: {
        fullName,
        phone,
        email,
        businessName,
        gstNumber,
        pincode,
        password: passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        businessName: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (role === 'vendor') {
      await prisma.vendor.create({
        data: {
          userId: user.id,
          businessName: businessName ?? fullName,
          slug: vendorSlug(businessName ?? fullName),
          isActive: false,
          isVerified: false,
        },
      });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return errorResponse(error);
  }
}), 'mutation');
