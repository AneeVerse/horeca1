// GET /api/v1/products/:id — Public product detail
// Returns product info with vendor details and price slabs
// PUBLIC: No auth required

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, Errors } from '@/middleware/errorHandler';

export async function GET(req: NextRequest) {
  try {
    const segments = req.nextUrl.pathname.split('/');
    const productId = segments[segments.length - 1];

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        originalPrice: true,
        promoPrice: true,
        imageUrl: true,
        images: true,
        packSize: true,
        unit: true,
        brand: true,
        tags: true,
        isActive: true,
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, businessName: true, slug: true, logoUrl: true, rating: true, minOrderValue: true } },
        priceSlabs: { orderBy: { minQty: 'asc' }, select: { minQty: true, maxQty: true, price: true } },
        inventory: { select: { qtyAvailable: true } },
      },
    });

    if (!product || !product.isActive) {
      throw Errors.notFound('Product not found');
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return errorResponse(error);
  }
}
