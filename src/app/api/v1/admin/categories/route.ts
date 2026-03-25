// GET  /api/v1/admin/categories — List all categories (including pending/inactive)
// POST /api/v1/admin/categories — Create a new category (auto-approved)
// WHY: Admin manages the category taxonomy — views all categories regardless of
//      approval status and creates new ones that are immediately active.
// PROTECTED: Admin only
// SUPPORTS (GET): ?approvalStatus=&search=

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';

// Auto-generate slug from name: lowercase, replace spaces with hyphens, strip non-alphanumeric
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-');
}

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  parentId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});

// GET — list all categories with children count and product count
export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const params = req.nextUrl.searchParams;
    const approvalStatus = params.get('approvalStatus') || undefined;
    const search = params.get('search') || undefined;

    const where: Record<string, unknown> = {};

    if (approvalStatus) where.approvalStatus = approvalStatus;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return errorResponse(error);
  }
});

// POST — create a new category (auto-approved by admin)
export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const data = createCategorySchema.parse(body);

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug || slugify(data.name),
        parentId: data.parentId ?? null,
        imageUrl: data.imageUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
        approvalStatus: 'approved',
        approvedBy: ctx.userId,
        approvedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
