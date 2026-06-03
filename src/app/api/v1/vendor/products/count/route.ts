/**
 * GET /api/v1/vendor/products/count
 * ─────────────────────────────────
 * Lightweight count endpoint matching the same filter surface as
 * PATCH /api/v1/vendor/products/bulk-update. Powers the live "N products
 * match this filter" indicator on the Bulk Update page so vendors see
 * the blast radius before clicking Apply.
 *
 * Scoped to the caller's vendorId — multi-tenant safe.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const querySchema = z.object({
  categoryId: z.string().uuid().optional(),
  brand: z.string().min(1).max(150).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.view');
    const vendorId = await resolveVendorId(ctx, req);

    const params = req.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      categoryId: params.get('categoryId') || undefined,
      brand: params.get('brand') || undefined,
      isActive: params.get('isActive') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ success: true, data: { total: 0 } });
    }
    const { categoryId, brand, isActive } = parsed.data;

    const where: Record<string, unknown> = { vendorId };
    if (categoryId) where.categoryId = categoryId;
    if (brand) where.brand = brand;
    if (typeof isActive === 'string') where.isActive = isActive === 'true';

    const total = await prisma.product.count({ where });
    return NextResponse.json({ success: true, data: { total } });
  } catch (err) {
    return errorResponse(err);
  }
});
