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
  minOrderQty: z.number().int().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  creditEligible: z.boolean().optional(),
  priceSlabs: z.array(z.object({
    minQty: z.number().int().min(1),
    maxQty: z.number().int().min(1).optional(),
    price: z.number().positive(),
  })).optional(),
});

// GET — list all vendor products (includes inactive for management)
export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    // Resolve vendorId from session — never trust client-supplied vendorId
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');
    const vendorId = vendor.id;

    // Parse query params
    const params = req.nextUrl.searchParams;
    const categoryId = params.get('categoryId') || undefined;
    const search = params.get('search') || undefined;
    const cursor = params.get('cursor') || undefined;
    const limit = Math.min(Number(params.get('limit')) || 20, 50);

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
    // Resolve vendorId from session — never trust client-supplied vendorId
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');
    const vendorId = vendor.id;

    const body = await req.json();
    const data = createProductSchema.parse(body);

    const { priceSlabs, ...productData } = data;
    const catalogService = new CatalogService();
    const product = await catalogService.createProduct(vendorId, productData);

    // After product creation, add price slabs if provided
    if (priceSlabs && priceSlabs.length > 0) {
      await prisma.priceSlab.createMany({
        data: priceSlabs.map((slab, idx) => ({
          productId: product.id,
          vendorId,
          minQty: slab.minQty,
          maxQty: slab.maxQty ?? null,
          price: slab.price,
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

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
