// GET   /api/v1/inventory/:productId — Get stock info for a product
// PATCH /api/v1/inventory/:productId — Update stock level (vendor only)
// WHY: GET — product cards show "In Stock" / "Out of Stock" / "Low Stock" badges
//      PATCH — vendors update stock after receiving new shipments or doing manual counts
//      When stock drops below lowStockThreshold, a StockUpdated event is emitted
//      (which can trigger a notification to the vendor)
// GET: Public (needed for product cards)
// PATCH: Vendor/Admin only

import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { updateStockSchema } from '@/modules/inventory/inventory.validator';
import { withRole } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';

const inventoryService = new InventoryService();

// GET — public stock check
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const stock = await inventoryService.getStock(productId);
    return NextResponse.json({ success: true, data: stock });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH — vendor updates stock
export const PATCH = withRole(['vendor', 'admin'], async (req: NextRequest, ctx) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const productId = segments[segments.length - 1];

    const body = await req.json();
    const data = updateStockSchema.parse(body);

    const stock = await inventoryService.updateStock(productId, ctx.userId, data);
    return NextResponse.json({ success: true, data: stock });
  } catch (error) {
    return errorResponse(error);
  }
});
