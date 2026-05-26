// GET    /api/v1/vendor/price-lists/:id — Get price list with items
// PATCH  /api/v1/vendor/price-lists/:id — Update name / discountPercent / isActive
// DELETE /api/v1/vendor/price-lists/:id — Soft-delete (isActive = false)
// PUT    /api/v1/vendor/price-lists/:id/items — Bulk set items (replace)
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';

function extractId(req: NextRequest) {
  return new URL(req.url).pathname.split('/').at(-1) ?? '';
}

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  // items: replace the full set of per-product overrides
  items: z
    .array(z.object({ productId: z.string().uuid(), customPrice: z.number().min(0) }))
    .optional(),
});

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);

    const priceList = await prisma.priceList.findFirst({
      where: { id, vendorId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, basePrice: true, unit: true, packSize: true } },
          },
        },
        customers: {
          include: {
            user: { select: { id: true, fullName: true, businessName: true } },
          },
        },
      },
    });
    if (!priceList) throw Errors.notFound('Price list');

    return NextResponse.json({ success: true, data: priceList });
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.priceList.findFirst({ where: { id, vendorId } });
    if (!existing) throw Errors.notFound('Price list');

    const updated = await prisma.$transaction(async (tx) => {
      const pl = await tx.priceList.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.discountPercent !== undefined && { discountPercent: body.discountPercent }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });

      if (body.items !== undefined) {
        // Replace all items atomically
        await tx.priceListItem.deleteMany({ where: { priceListId: id } });
        if (body.items.length > 0) {
          await tx.priceListItem.createMany({
            data: body.items.map((item) => ({
              priceListId: id,
              productId: item.productId,
              customPrice: item.customPrice,
            })),
          });
        }
      }

      return pl;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);

    const existing = await prisma.priceList.findFirst({ where: { id, vendorId } });
    if (!existing) throw Errors.notFound('Price list');

    // Soft delete — unassign any customers first
    await prisma.$transaction([
      prisma.vendorCustomer.updateMany({
        where: { priceListId: id },
        data: { priceListId: null },
      }),
      prisma.priceList.update({ where: { id }, data: { isActive: false } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
