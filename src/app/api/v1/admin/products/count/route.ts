/**
 * GET /api/v1/admin/products/count
 * ────────────────────────────────
 * Lightweight count endpoint matching the same filter surface as
 * PATCH /api/v1/admin/products/bulk-update. Powers the live "N products
 * match this filter" indicator on the Admin Bulk Update page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';

const querySchema = z.object({
  categoryId: z.string().uuid().optional(),
  brand: z.string().min(1).max(150).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  vendorId: z.string().optional(), // optional UUID, or 'null' for master catalog
});

export const GET = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.view');

    const params = req.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      categoryId: params.get('categoryId') || undefined,
      brand: params.get('brand') || undefined,
      isActive: params.get('isActive') || undefined,
      vendorId: params.get('vendorId') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ success: true, data: { total: 0 } });
    }

    const { categoryId, brand, isActive, vendorId } = parsed.data;

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (brand) where.brand = brand;
    if (typeof isActive === 'string') where.isActive = isActive === 'true';

    if (vendorId !== undefined) {
      where.vendorId = vendorId === 'null' ? null : vendorId;
    }

    const total = await prisma.product.count({ where });
    return NextResponse.json({ success: true, data: { total } });
  } catch (err) {
    return errorResponse(err);
  }
});
