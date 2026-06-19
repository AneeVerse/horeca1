/**
 * POST /api/v1/admin/inventory/bulk
 * ─────────────────────────────────
 * Admin cross-vendor bulk stock adjust for the Bulk Update Engine. Each
 * product's inventory is written under its own vendor (catalog-level products
 * with no vendor are skipped). Mode = set / increase / decrease, plus an
 * optional low-stock threshold.
 *
 * Body: { productIds: string[], mode?, value?, lowStockThreshold? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';

const bodySchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(500),
  mode: z.enum(['set', 'increase', 'decrease']).optional(),
  value: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
}).refine(
  (s) => !!s.mode || s.lowStockThreshold !== undefined,
  { message: 'Provide a mode and/or lowStockThreshold' },
);

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'inventory.edit');
    const body = bodySchema.parse(await req.json());

    const result = await new InventoryService().bulkAdjustStock({
      productIds: body.productIds,
      mode: body.mode,
      value: body.value,
      lowStockThreshold: body.lowStockThreshold,
      scopeVendorId: null, // admin: each row uses the product's own vendor
    });

    void logAction(ctx, req, {
      action: AUDIT_ACTIONS.inventoryBulkUpdate,
      entity: 'inventory',
      metadata: { scope: 'admin', mode: body.mode ?? 'threshold', updated: result.updated, skipped: result.skipped },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
});
