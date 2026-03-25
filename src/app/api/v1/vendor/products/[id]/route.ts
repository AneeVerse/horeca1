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
  originalPrice: z.number().positive().nullable().optional(),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  packSize: z.string().optional(),
  unit: z.string().optional(),
  sku: z.string().optional(),
  hsn: z.string().optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  promoPrice: z.number().positive().nullable().optional(),
  promoStartTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  promoEndTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  minOrderQty: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  creditEligible: z.boolean().optional(),
  categoryId: z.string().uuid().optional(),
  priceSlabs: z.array(z.object({
    minQty: z.number().int().min(1),
    maxQty: z.number().int().min(1).optional(),
    price: z.number().positive(),
    promoPrice: z.number().positive().optional(),
  })).optional(),
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

    const { priceSlabs, ...productData } = data;

    const catalogService = new CatalogService();
    const updated = await catalogService.updateProduct(productId, vendorId, productData);

    // Replace price slabs if provided
    if (priceSlabs !== undefined) {
      await prisma.priceSlab.deleteMany({ where: { productId, vendorId } });
      if (priceSlabs.length > 0) {
        await prisma.priceSlab.createMany({
          data: priceSlabs.map((slab, idx) => ({
            productId,
            vendorId,
            minQty: slab.minQty,
            maxQty: slab.maxQty ?? null,
            price: slab.price,
            promoPrice: slab.promoPrice ?? null,
            sortOrder: idx,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

// GET — fetch a single product with price slabs (for edit form)
export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');

    const productId = extractId(req);
    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId: vendor.id },
      include: {
        priceSlabs: { orderBy: { sortOrder: 'asc' } },
        inventory: { select: { qtyAvailable: true, qtyReserved: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!product) throw Errors.notFound('Product');

    return NextResponse.json({ success: true, data: product });
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
