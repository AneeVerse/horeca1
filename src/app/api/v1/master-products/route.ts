// GET /api/v1/master-products — search/list the Horeca1 master catalog.
// WHY: vendor + admin + brand product forms pick a master SKU; this powers that picker.
// PROTECTED: vendor + brand + admin.
// SUPPORTS: ?search=&limit=20&brand=Everest

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';

export const GET = withRole(['vendor', 'brand', 'admin'], async (req: NextRequest) => {
  try {
    const params = req.nextUrl.searchParams;
    const search = params.get('search')?.trim() || undefined;
    const brandParam = params.get('brand')?.trim() || undefined;
    const limit = Math.min(Number(params.get('limit')) || 20, 50);

    const where: Prisma.MasterProductWhereInput = { isActive: true };

    if (brandParam) {
      where.brand = { equals: brandParam, mode: 'insensitive' as const };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { sku: { contains: search, mode: 'insensitive' as const } },
        ...(brandParam ? [] : [{ brand: { contains: search, mode: 'insensitive' as const } }]),
        { aliasNames: { has: search.toLowerCase() } },
      ];
    }

    const masters = await prisma.masterProduct.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true, sku: true, name: true, brand: true, uom: true,
        taxPercent: true, imageUrl: true, images: true, categoryId: true,
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: masters });
  } catch (error) {
    return errorResponse(error);
  }
});
