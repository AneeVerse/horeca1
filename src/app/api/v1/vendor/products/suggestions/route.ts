// GET /api/v1/vendor/products/suggestions?q=tomato
// WHY: When a vendor types a product name, show existing approved products
//      so they can pick one instead of creating a duplicate that needs approval.
//      Also flags if the vendor already has a product with a similar name (duplicate prevention).
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: { suggestions: [], ownMatches: [] } });
    }

    // Resolve vendor
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });

    const [catalogProducts, ownProducts, brandMasterProducts] = await Promise.all([
      // Find approved products from the catalog (any vendor)
      prisma.product.findMany({
        where: {
          approvalStatus: 'approved',
          isActive: true,
          name: { contains: q, mode: 'insensitive' },
          // Exclude this vendor's own products from suggestions
          ...(vendor ? { vendorId: { not: vendor.id } } : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          originalPrice: true,
          packSize: true,
          unit: true,
          sku: true,
          hsn: true,
          brand: true,
          barcode: true,
          description: true,
          imageUrl: true,
          images: true,
          tags: true,
          taxPercent: true,
          minOrderQty: true,
          creditEligible: true,
          category: { select: { id: true, name: true, slug: true } },
          vendor: { select: { businessName: true } },
        },
        take: 8,
        orderBy: { name: 'asc' },
      }),

      // Find this vendor's own products matching the name (duplicate detection)
      vendor
        ? prisma.product.findMany({
            where: {
              vendorId: vendor.id,
              name: { contains: q, mode: 'insensitive' },
            },
            select: {
              id: true,
              name: true,
              approvalStatus: true,
              isActive: true,
            },
            take: 5,
          })
        : [],

      // Find brand canonical products (BrandMasterProduct) from approved/active brands.
      // These are catalog entries the brand has registered but no vendor stocks yet —
      // surfacing them lets the vendor become the first distributor with a verified mapping.
      prisma.brandMasterProduct.findMany({
        where: {
          isActive: true,
          name: { contains: q, mode: 'insensitive' },
          brand: { isActive: true, approvalStatus: 'approved' },
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          packSize: true,
          unit: true,
          sku: true,
          brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
          categoryRel: { select: { id: true, name: true, slug: true } },
        },
        take: 8,
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        suggestions: catalogProducts,
        ownMatches: ownProducts,
        brandSuggestions: brandMasterProducts.map(bp => ({
          id: bp.id,
          name: bp.name,
          description: bp.description,
          imageUrl: bp.imageUrl,
          packSize: bp.packSize,
          unit: bp.unit,
          sku: bp.sku,
          brand: bp.brand,
          category: bp.categoryRel,
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
