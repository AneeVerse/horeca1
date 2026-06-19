/**
 * GET  /api/v1/vendor/combos — list the vendor's combos / bundles
 * POST /api/v1/vendor/combos — create a combo from a product selection
 *
 * Powers the Bulk Update Engine's "Combo / bundle" action: bundle the selected
 * products at one combo price (+ optional validity window).
 * PROTECTED: vendor only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { ComboService } from '@/modules/catalog/combo.service';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  comboPrice: z.number().min(0),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    qty: z.number().int().min(1).max(1000).default(1),
  })).min(1).max(50),
});

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const combos = await new ComboService().listForVendor(vendorId);
    return NextResponse.json({ success: true, data: combos });
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.edit');
    const vendorId = await resolveVendorId(ctx, req);
    const body = createSchema.parse(await req.json());

    const combo = await new ComboService().createFromSelection({
      vendorId,
      name: body.name,
      comboPrice: body.comboPrice,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validTo: body.validTo ? new Date(body.validTo) : null,
      items: body.items,
    });

    void logAction(ctx, req, {
      action: AUDIT_ACTIONS.comboCreate,
      entity: 'product_combo',
      entityId: combo.id,
      metadata: { vendorId, name: body.name, comboPrice: body.comboPrice, itemCount: combo.items.length },
    });

    return NextResponse.json({ success: true, data: combo }, { status: 201 });
  } catch (error) {
    return errorResponse(error instanceof z.ZodError ? Errors.badRequest(error.issues[0]?.message ?? 'Invalid input') : error);
  }
});
