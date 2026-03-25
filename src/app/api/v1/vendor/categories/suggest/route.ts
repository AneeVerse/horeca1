// POST /api/v1/vendor/categories/suggest — Vendor suggests a new category
// WHY: Vendors may sell products that don't fit existing categories. They can
//      suggest new categories which go through admin approval before becoming active.
// PROTECTED: Vendor only (vendors + admins)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { emitEvent } from '@/events/emitter';

// Auto-generate slug from name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-');
}

const suggestCategorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid().optional(),
});

// POST — suggest a new category (pending admin approval)
export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const data = suggestCategorySchema.parse(body);

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: slugify(data.name),
        parentId: data.parentId ?? null,
        approvalStatus: 'pending',
        suggestedBy: ctx.userId,
        isActive: false,
      },
    });

    emitEvent('CategorySuggested', {
      categoryId: category.id,
      categoryName: data.name,
      suggestedBy: ctx.userId,
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
