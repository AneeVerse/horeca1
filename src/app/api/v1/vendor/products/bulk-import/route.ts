// POST /api/v1/vendor/products/bulk-import — Import products from a validated CSV payload
// WHY: Vendors migrating from another system or managing 200+ SKUs via spreadsheet need
//      a way to upsert products in bulk without using the UI form one at a time.
//
// Upsert logic: if a product with the same SKU already exists for this vendor, update its
// basePrice, packSize, unit, and active status. Otherwise create a new product.
//
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const rowSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(100),
  basePrice: z.number().positive(),
  packSize: z.string().optional(),
  unit: z.string().optional(),
  hsn: z.string().optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
});

const importSchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
  defaultCategoryId: z.string().uuid().optional(),
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'products.edit');

    const { rows, defaultCategoryId } = importSchema.parse(await req.json());

    // Fetch all existing vendor products by SKU for upsert lookup
    const existingBySku = new Map(
      (await prisma.product.findMany({
        where: { vendorId, sku: { in: rows.map(r => r.sku) } },
        select: { id: true, sku: true },
      })).map(p => [p.sku!, p.id]),
    );

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const existingId = existingBySku.get(row.sku);

      if (existingId) {
        await prisma.product.update({
          where: { id: existingId },
          data: {
            name: row.name,
            basePrice: row.basePrice,
            packSize: row.packSize,
            unit: row.unit,
            hsn: row.hsn,
            taxPercent: row.taxPercent,
            description: row.description,
          },
        });
        updated++;
      } else {
        const slug = `${row.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
        const product = await prisma.product.create({
          data: {
            name: row.name,
            slug,
            sku: row.sku,
            vendorId,
            basePrice: row.basePrice,
            packSize: row.packSize,
            unit: row.unit,
            hsn: row.hsn,
            taxPercent: row.taxPercent,
            description: row.description,
            categoryId: defaultCategoryId ?? null,
            approvalStatus: 'pending',
          },
        });
        // Create inventory row
        await prisma.inventory.create({
          data: { vendorId, productId: product.id, qtyAvailable: 0, qtyReserved: 0 },
        });
        created++;
      }
    }

    return NextResponse.json({ success: true, created, updated, total: rows.length });
  } catch (error) {
    return errorResponse(error);
  }
});
