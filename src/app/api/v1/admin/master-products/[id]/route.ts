// PATCH  /api/v1/admin/master-products/:id — update a master SKU.
// DELETE /api/v1/admin/master-products/:id — delete (blocked if vendor products are linked).
// PROTECTED: admin.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { assertLeafCategory } from '@/modules/catalog/catalog.service';
import { syncProductToBrand } from '@/modules/brand/brand.service';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().max(150).nullable().optional(),
  uom: z.string().max(50).nullable().optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  imageUrl: z.string().url().nullable().optional(),
  images: z.array(z.string().url()).optional(),
  aliasNames: z.array(z.string()).optional(),
  searchKeywords: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.edit');
    const id = extractId(req);
    const data = updateSchema.parse(await req.json());

    if (data.categoryId) await assertLeafCategory([data.categoryId]);

    const updated = await prisma.masterProduct.update({ where: { id }, data });

    // Sync to brand catalog in background
    syncProductToBrand(
      updated.brand,
      updated.name,
      updated.categoryId,
      updated.imageUrl,
      updated.uom,
      updated.sku,
      updated.id
    ).catch(console.error);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.delete');
    const id = extractId(req);

    const linked = await prisma.product.count({ where: { masterProductId: id } });
    if (linked > 0) {
      throw Errors.conflict(
        `Cannot delete — ${linked} vendor product(s) are mapped to this master SKU. Reassign or remove them first.`,
      );
    }

    await prisma.masterProduct.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    return errorResponse(error);
  }
});
