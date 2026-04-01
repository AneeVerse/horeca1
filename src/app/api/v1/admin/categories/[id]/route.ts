// GET    /api/v1/admin/categories/:id — Category detail with children and product count
// PATCH  /api/v1/admin/categories/:id — Update category fields
// DELETE /api/v1/admin/categories/:id — Permanently delete category
// WHY: Admin needs to manage individual categories — view hierarchy, edit, deactivate
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';

// Helper: extract the [id] segment from the URL
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// GET — category detail with children and product count
export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const id = extractId(req);

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) throw Errors.notFound('Category');

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — update category fields
export const PATCH = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const id = extractId(req);
    const body = await req.json();
    const data = updateCategorySchema.parse(body);

    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw Errors.notFound('Category');

    const category = await prisma.category.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    return errorResponse(error);
  }
});

// DELETE — permanently remove category
export const DELETE = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const id = extractId(req);

    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw Errors.notFound('Category');

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    return errorResponse(error);
  }
});
