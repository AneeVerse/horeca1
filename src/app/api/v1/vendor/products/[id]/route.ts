// PATCH  /api/v1/vendor/products/:id — Update product details
// DELETE /api/v1/vendor/products/:id — Soft-delete (deactivate) a product
// WHY: Vendors need to update product info (price, description, images, etc.)
//      and deactivate products they no longer want to sell
// PROTECTED: Vendor only (vendors + admins)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { CatalogService } from '@/modules/catalog/catalog.service';

// Validation schema for product updates (all fields optional)
const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  basePrice: z.number().positive().optional(),
  imageUrl: z.string().url().optional(),
  packSize: z.string().optional(),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
  creditEligible: z.boolean().optional(),
});

// Helper: extract the [id] segment from /api/v1/vendor/products/{id}
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

// PATCH — update product fields
export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    // Resolve vendorId from session — never trust client-supplied vendorId
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');
    const vendorId = vendor.id;

    const productId = extractId(req);
    const body = await req.json();
    const data = updateProductSchema.parse(body);

    const catalogService = new CatalogService();
    const updated = await catalogService.updateProduct(productId, vendorId, data);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

// DELETE — soft-delete by setting isActive = false
export const DELETE = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    // Resolve vendorId from session — never trust client-supplied vendorId
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');
    const vendorId = vendor.id;

    const productId = extractId(req);

    const catalogService = new CatalogService();
    await catalogService.updateProduct(productId, vendorId, { isActive: false });

    return NextResponse.json({ success: true, data: { id: productId, isActive: false } });
  } catch (error) {
    return errorResponse(error);
  }
});
