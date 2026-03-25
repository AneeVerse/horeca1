// GET    /api/v1/admin/products/:id — Full product detail
// PATCH  /api/v1/admin/products/:id — Update any product field
// DELETE /api/v1/admin/products/:id — Soft-delete (set isActive: false)
// WHY: Admin needs to view, edit, and deactivate any product in the marketplace
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';

// Helper: extract the [id] segment from the URL
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // URL: /api/v1/admin/products/{id}
  return segments[segments.length - 1];
}

// Validation schema for product updates (all fields optional)
const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  basePrice: z.number().positive().optional(),
  originalPrice: z.number().positive().optional(),
  packSize: z.string().optional(),
  unit: z.string().optional(),
  sku: z.string().optional(),
  hsn: z.string().optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  minOrderQty: z.number().int().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  creditEligible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priceSlabs: z.array(z.object({
    minQty: z.number().int().min(1),
    maxQty: z.number().int().min(1).optional(),
    price: z.number().positive(),
  })).optional(),
});

// GET — full product detail with all relations
export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const id = extractId(req);

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: true,
        category: true,
        priceSlabs: { orderBy: { sortOrder: 'asc' } },
        inventory: true,
      },
    });

    if (!product) throw Errors.notFound('Product');

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — update any product field
export const PATCH = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const id = extractId(req);
    const body = await req.json();
    const data = updateProductSchema.parse(body);

    // Check product exists
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, vendorId: true },
    });
    if (!existing) throw Errors.notFound('Product');

    const { priceSlabs, ...productData } = data;

    // Update product fields
    const product = await prisma.product.update({
      where: { id },
      data: productData,
      include: {
        vendor: { select: { id: true, businessName: true } },
        category: { select: { id: true, name: true } },
        inventory: { select: { qtyAvailable: true } },
        priceSlabs: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // If priceSlabs provided, delete existing and recreate
    if (priceSlabs) {
      await prisma.priceSlab.deleteMany({ where: { productId: id } });

      if (priceSlabs.length > 0) {
        await prisma.priceSlab.createMany({
          data: priceSlabs.map((slab, idx) => ({
            productId: id,
            vendorId: existing.vendorId,
            minQty: slab.minQty,
            maxQty: slab.maxQty ?? null,
            price: slab.price,
            sortOrder: idx,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return errorResponse(error);
  }
});

// DELETE — soft-delete (set isActive: false)
export const DELETE = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const id = extractId(req);

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw Errors.notFound('Product');

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, data: { id, isActive: false } });
  } catch (error) {
    return errorResponse(error);
  }
});
