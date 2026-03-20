// GET /api/v1/admin/users — List all users with pagination
// WHY: Admin user management page — search users, filter by role, toggle accounts
// PROTECTED: Admin only
// SUPPORTS: ?role=customer|vendor|admin&search=&cursor=&limit=20

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import type { Role } from '@prisma/client';

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
