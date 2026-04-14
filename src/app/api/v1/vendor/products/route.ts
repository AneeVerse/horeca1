// GET  /api/v1/vendor/products — List vendor's products (includes inactive)
// POST /api/v1/vendor/products — Create a new product + initialize inventory
// WHY: Vendors need to manage their product catalog — view all products
//      (including deactivated ones) and add new products to their storefront
// PROTECTED: Vendor only (vendors + admins)
// SUPPORTS (GET): ?categoryId=&search=&cursor=&limit=20

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { CatalogService } from '@/modules/catalog/catalog.service';
import { emitEvent } from '@/events/emitter';
import { resolveVendorId, resolveVendorContext } from '@/lib/resolveVendorId';
import { requireVendorPerm } from '@/lib/teamPermissions';

// Validation schema for product creation
const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  categoryId: z.string().uuid().optional(),
  basePrice: z.number().positive(),
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
  promoPrice: z.number().positive().optional(),
  promoStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm
  promoEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),   // HH:mm
  minOrderQty: z.number().int().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  creditEligible: z.boolean().optional(),
  basedOnProductId: z.string().uuid().optional(),
  priceSlabs: z.array(z.object({
    minQty: z.number().int().min(1),
    maxQty: z.number().int().min(1).optional(),
    price: z.number().positive(),
    promoPrice: z.number().positive().optional(),
  })).optional(),
});

// GET — list all vendor products (includes inactive for management)
export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);

    // Parse query params
    const params = req.nextUrl.searchParams;
    const categoryId = params.get('categoryId') || undefined;
    const search = params.get('search') || undefined;
    const cursor = params.get('cursor') || undefined;
    const limit = Math.min(Number(params.get('limit')) || 20, 200);

    const catalogService = new CatalogService();
    const result = await catalogService.getVendorProducts(vendorId, {
      categoryId,
      search,
      cursor,
      limit,
      includeInactive: true,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});

// POST — create a new product and initialize its inventory record
export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId, teamRole } = await resolveVendorContext(ctx, req);
    requireVendorPerm(teamRole, 'products:write');

    const body = await req.json();
    const data = createProductSchema.parse(body);

    // Prevent duplicate: check if this vendor already has a product with the same name
    const existing = await prisma.product.findFirst({
      where: {
        vendorId,
        name: { equals: data.name, mode: 'insensitive' },
      },
      select: { id: true, name: true, approvalStatus: true },
    });
    if (existing) {
      throw Errors.conflict(
        `You already have a product named "${existing.name}" (${existing.approvalStatus}). Edit the existing product instead.`
      );
    }

    const { priceSlabs, basedOnProductId, ...productData } = data;
    const catalogService = new CatalogService();
    const product = await catalogService.createProduct(vendorId, { ...productData, basedOnProductId });

    // After product creation, add price slabs if provided
    if (priceSlabs && priceSlabs.length > 0) {
      await prisma.priceSlab.createMany({
        data: priceSlabs.map((slab, idx) => ({
          productId: product.id,
          vendorId,
          minQty: slab.minQty,
          maxQty: slab.maxQty ?? null,
          price: slab.price,
          promoPrice: slab.promoPrice ?? null,
          sortOrder: idx,
        })),
      });
    }

    // Initialize inventory record for the new product
    await prisma.inventory.create({
      data: {
        productId: product.id,
        vendorId,
        qtyAvailable: 0,
        lowStockThreshold: 10,
      },
    });

    // Only notify admins if product needs approval (not auto-approved)
    if (product.approvalStatus === 'pending') {
      emitEvent('ProductSubmitted', {
        productId: product.id,
        vendorId,
        productName: data.name,
      });
    }

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
