// POST /api/v1/brand/categories/suggest — Brand suggests a new category for admin approval.
// Mirrors the vendor flow at /api/v1/vendor/categories/suggest. Created with
// status=pending, isActive=false. Admin approves at /admin/categories.
// PROTECTED: brand or admin

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { brandOnly } from '@/middleware/rbac';
import { resolveBrandContext, resolveUserId } from '@/lib/resolveBrandId';
import { requireBrandPerm } from '@/lib/teamPermissions';
import { errorResponse } from '@/middleware/errorHandler';
import { emitEvent } from '@/events/emitter';
import type { AuthContext } from '@/middleware/auth';

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

const schema = z.object({
  name: z.string().min(2).max(80),
  parentId: z.string().uuid().optional(),
});

export const POST = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { teamRole } = await resolveBrandContext(ctx, req);
    requireBrandPerm(teamRole, 'settings:write');
    const userId = await resolveUserId(ctx, req);

    const body = await req.json();
    const input = schema.parse(body);

    // Avoid duplicate suggestions: if any (pending or approved) category with same slug exists, return it.
    const existingSlug = slugify(input.name);
    const existing = await prisma.category.findFirst({
      where: { slug: existingSlug },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: existing, alreadyExists: true });
    }

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug: existingSlug,
        parentId: input.parentId ?? null,
        approvalStatus: 'pending',
        suggestedBy: userId,
        isActive: false,
      },
    });

    emitEvent('CategorySuggested', {
      categoryId: category.id,
      categoryName: input.name,
      suggestedBy: userId,
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
