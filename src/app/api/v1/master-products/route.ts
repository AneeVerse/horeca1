// GET /api/v1/master-products — search/list the Horeca1 master catalog.
// WHY: vendor + admin + brand product forms pick a master SKU; this powers that picker.
// PROTECTED: vendor + brand + admin.
// SUPPORTS: ?search=&limit=20&brand=Everest

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { getCategoryPickerMeta } from '@/modules/catalog/catalog.service';

export const GET = withRole(['vendor', 'brand', 'admin'], async (req: NextRequest) => {
  try {
    const params = req.nextUrl.searchParams;
    const search = params.get('search')?.trim() || undefined;
    const brandParam = params.get('brand')?.trim() || undefined;
    const exact = params.get('exact') === 'true';
    const limit = Math.min(Number(params.get('limit')) || 20, 50);

    const where: Prisma.MasterProductWhereInput = { isActive: true, approvalStatus: 'approved' };

    if (brandParam) {
      where.brand = { equals: brandParam, mode: 'insensitive' as const };
    }

    if (search) {
      if (exact) {
        where.sku = { equals: search.toUpperCase(), mode: 'insensitive' as const };
      } else {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
          ...(brandParam ? [] : [{ brand: { contains: search, mode: 'insensitive' as const } }]),
          { aliasNames: { has: search.toLowerCase() } },
        ];
      }
    }

    const masters = await prisma.masterProduct.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true, sku: true, name: true, brand: true, uom: true,
        taxPercent: true, imageUrl: true, images: true, categoryId: true, metadata: true,
        category: { select: { id: true, name: true } },
        categoryLinks: {
          select: { categoryId: true, isPrimary: true },
          orderBy: [{ isPrimary: 'desc' }, { categoryId: 'asc' }],
        },
      },
    });

    const withCategories = await Promise.all(
      masters.map(async (m) => {
        const rawIds =
          m.categoryLinks.length > 0
            ? m.categoryLinks.map((l) => l.categoryId)
            : m.categoryId
              ? [m.categoryId]
              : [];
        const { categoryIds, categoryLeafMissing } = await getCategoryPickerMeta(rawIds);
        const { categoryLinks: _links, ...rest } = m;
        return { ...rest, categoryIds, categoryLeafMissing };
      }),
    );

    // Catalog SKU-first ordering when the query looks like a SKU code.
    const sorted = search && !exact
      ? [...withCategories].sort((a, b) => {
          const q = search.toUpperCase();
          const score = (sku: string) => {
            const upper = sku.toUpperCase();
            if (upper === q) return 0;
            if (upper.startsWith(q)) return 1;
            if (upper.includes(q)) return 2;
            return 3;
          };
          const diff = score(a.sku) - score(b.sku);
          return diff !== 0 ? diff : a.name.localeCompare(b.name);
        })
      : withCategories;

    return NextResponse.json({ success: true, data: sorted });
  } catch (error) {
    return errorResponse(error);
  }
});
