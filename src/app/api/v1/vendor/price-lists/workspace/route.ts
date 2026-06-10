// GET   /api/v1/vendor/price-lists/workspace — matrix of products × price lists
// PATCH /api/v1/vendor/price-lists/workspace — upsert/clear price cells
//
// Powers the Smart Pricelist Workspace (Google-Sheets-style grid). Rows are the
// vendor's products, columns are their price lists. A cell holds the explicit
// PriceListItem.customPrice for that (product, list); empty = falls back to the
// list's global discount or the product base price (resolved on the client for
// display, never persisted). Column formulas are computed client-side and sent
// here as final per-cell prices — the brief stores final prices, not formulas.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId, resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const NOT_TOMBSTONED = { slug: { not: { startsWith: '_deleted_' } } } as const;

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const params = req.nextUrl.searchParams;
    const search = params.get('search')?.trim() || undefined;
    const categoryId = params.get('categoryId') || undefined;
    const cursor = params.get('cursor') || undefined;
    const limit = Math.min(Number(params.get('limit')) || 50, 200);

    const priceLists = await prisma.priceList.findMany({
      where: { vendorId, isActive: true },
      select: { id: true, name: true, discountPercent: true },
      orderBy: { createdAt: 'asc' },
    });

    const where = {
      vendorId,
      isActive: true,
      ...NOT_TOMBSTONED,
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? { OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ] }
        : {}),
    };

    const products = await prisma.product.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, sku: true, unit: true, packSize: true,
        basePrice: true, taxPercent: true,
        priceListItems: {
          where: { priceList: { vendorId, isActive: true } },
          select: { priceListId: true, customPrice: true, pricingType: true, discountPercent: true },
        },
      },
    });

    const hasMore = products.length > limit;
    if (hasMore) products.pop();

    const rows = products.map((p) => {
      // Map each list → the explicit override price (customPrice or computed
      // from a per-item discountPercent), or null when no item exists.
      const cells: Record<string, number | null> = {};
      for (const it of p.priceListItems) {
        if (it.customPrice != null) cells[it.priceListId] = Number(it.customPrice);
        else if (it.discountPercent != null) {
          cells[it.priceListId] = Math.round(Number(p.basePrice) * (1 - Number(it.discountPercent) / 100) * 100) / 100;
        } else cells[it.priceListId] = null;
      }
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        packSize: p.packSize,
        basePrice: Number(p.basePrice),
        taxPercent: Number(p.taxPercent),
        cells,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        priceLists: priceLists.map((l) => ({ id: l.id, name: l.name, discountPercent: Number(l.discountPercent) })),
        products: rows,
        pagination: { nextCursor: hasMore ? rows[rows.length - 1]?.id : null, hasMore },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

const patchSchema = z.object({
  cells: z.array(z.object({
    priceListId: z.string().uuid(),
    productId: z.string().uuid(),
    // null clears the override (cell reverts to the list/base fallback).
    customPrice: z.number().positive().nullable(),
  })).min(1).max(2000),
});

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'products.edit');
    const { cells } = patchSchema.parse(await req.json());

    // Authorize every referenced list + product against this vendor in two
    // bulk queries so a forged id can't touch another vendor's data.
    const listIds = [...new Set(cells.map((c) => c.priceListId))];
    const productIds = [...new Set(cells.map((c) => c.productId))];
    const [validLists, validProducts] = await Promise.all([
      prisma.priceList.findMany({ where: { id: { in: listIds }, vendorId }, select: { id: true } }),
      prisma.product.findMany({ where: { id: { in: productIds }, vendorId }, select: { id: true } }),
    ]);
    const okList = new Set(validLists.map((l) => l.id));
    const okProduct = new Set(validProducts.map((p) => p.id));

    let upserted = 0, cleared = 0, skipped = 0;
    await prisma.$transaction(async (tx) => {
      for (const c of cells) {
        if (!okList.has(c.priceListId) || !okProduct.has(c.productId)) { skipped++; continue; }
        if (c.customPrice == null) {
          const res = await tx.priceListItem.deleteMany({ where: { priceListId: c.priceListId, productId: c.productId } });
          cleared += res.count;
        } else {
          await tx.priceListItem.upsert({
            where: { priceListId_productId: { priceListId: c.priceListId, productId: c.productId } },
            create: { priceListId: c.priceListId, productId: c.productId, customPrice: c.customPrice, pricingType: 'fixed' },
            update: { customPrice: c.customPrice, pricingType: 'fixed', discountPercent: null },
          });
          upserted++;
        }
      }
    });

    return NextResponse.json({ success: true, data: { upserted, cleared, skipped } });
  } catch (error) {
    return errorResponse(error);
  }
});
