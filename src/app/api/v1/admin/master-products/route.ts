// GET  /api/v1/admin/master-products — list the Horeca1 master catalog (admin CRUD).
// POST /api/v1/admin/master-products — create a master SKU (auto-generated H1-SKU-NNNNN).
// PROTECTED: admin.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { assertLeafCategory } from '@/modules/catalog/catalog.service';
import { nextMasterSku } from '@/lib/sku';

const createSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid(),
  brand: z.string().max(150).optional(),
  uom: z.string().max(50).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  aliasNames: z.array(z.string()).optional(),
  searchKeywords: z.array(z.string()).optional(),
});

export const GET = adminOnly(async (req: NextRequest) => {
  try {
    const params = req.nextUrl.searchParams;
    const search = params.get('search')?.trim() || undefined;
    const limit = Math.min(Number(params.get('limit')) || 30, 100);
    const cursor = params.get('cursor') || undefined;

    const where: Prisma.MasterProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { aliasNames: { has: search.toLowerCase() } },
      ];
    }

    const rows = await prisma.masterProduct.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { vendorProducts: true } },
      },
    });
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    return NextResponse.json({
      success: true,
      data: {
        masterProducts: rows.map((m) => ({ ...m, vendorCount: m._count.vendorProducts })),
        nextCursor: hasMore ? rows[rows.length - 1]?.id : null,
        hasMore,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.create');
    const data = createSchema.parse(await req.json());

    // Category must be a leaf (level-2) sub-category (Req 5).
    await assertLeafCategory([data.categoryId]);

    const master = await prisma.$transaction(async (tx) => {
      const sku = await nextMasterSku(tx);
      return tx.masterProduct.create({
        data: {
          sku,
          name: data.name,
          categoryId: data.categoryId,
          brand: data.brand ?? null,
          uom: data.uom ?? null,
          taxPercent: data.taxPercent ?? 0,
          imageUrl: data.imageUrl ?? null,
          images: data.images ?? [],
          aliasNames: data.aliasNames ?? [],
          searchKeywords: data.searchKeywords ?? [],
        },
      });
    });

    return NextResponse.json({ success: true, data: master }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
