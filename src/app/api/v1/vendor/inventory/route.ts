// GET   /api/v1/vendor/inventory — List all inventory for vendor's products
// PATCH /api/v1/vendor/inventory — Update stock level or low-stock threshold
// WHY: Vendors need to monitor stock levels across all products and update
//      quantities as shipments arrive or thresholds need adjustment
// PROTECTED: Vendor only (vendors + admins)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { resolveVendorId } from '@/lib/resolveVendorId';

// Validation schema for inventory updates
const updateInventorySchema = z.object({
  productId: z.string().uuid(),
  qtyAvailable: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

// GET — list all inventory rows with product info + low-stock flag
export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);

    const inventory = await prisma.inventory.findMany({
      where: { vendorId },
      include: {
        product: {
          select: { id: true, name: true, imageUrl: true, isActive: true, basePrice: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Enrich each row with computed isLowStock flag
    const data = inventory.map((item) => ({
      ...item,
      isLowStock: item.qtyAvailable - item.qtyReserved <= item.lowStockThreshold,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — update stock quantity or low-stock threshold for a product
export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);

    const body = await req.json();
    const { productId, qtyAvailable, lowStockThreshold } = updateInventorySchema.parse(body);

    const inventoryService = new InventoryService();
    const updated = await inventoryService.updateStock(productId, vendorId, {
      ...(qtyAvailable !== undefined && { qtyAvailable }),
      ...(lowStockThreshold !== undefined && { lowStockThreshold }),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
