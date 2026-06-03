/**
 * PATCH  /api/v1/vendor/commission-rules/[id]   — update rule fields
 * DELETE /api/v1/vendor/commission-rules/[id]   — soft-disable (isActive=false)
 *
 * Hard delete is intentionally NOT supported: accruals reference the rule
 * via `rule_id` (SetNull on delete is configured, but we prefer the
 * audit trail intact). Toggle isActive=false to stop a rule from
 * generating new accruals.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const PatchBody = z
  .object({
    ratePercent: z.number().min(0).max(100).nullable().optional(),
    rateFixed: z.number().nonnegative().nullable().optional(),
    minOrderValue: z.number().nonnegative().nullable().optional(),
    validFrom: z.string().datetime().nullable().optional(),
    validTo: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  // If either rate is being touched, both must end up valid post-merge.
  // We accept the rate change here and re-validate the combined state
  // below using the persisted row + this patch.
  ;

function extractId(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return segs[segs.length - 1];
}

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'commissions.edit');
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);
    const body = PatchBody.parse(await req.json());

    const current = await prisma.commissionRule.findFirst({
      where: { id, vendorId },
      select: { id: true, ratePercent: true, rateFixed: true },
    });
    if (!current) throw Errors.notFound('Commission rule');

    // Re-validate the rate XOR invariant in the patched state.
    const nextPercent = body.ratePercent !== undefined ? body.ratePercent : current.ratePercent;
    const nextFixed = body.rateFixed !== undefined ? body.rateFixed : current.rateFixed;
    const onlyOne = (nextPercent != null && nextFixed == null) || (nextPercent == null && nextFixed != null);
    if (!onlyOne) {
      throw Errors.badRequest('Exactly one of ratePercent or rateFixed must be set after the patch');
    }

    const updated = await prisma.commissionRule.update({
      where: { id },
      data: {
        ...(body.ratePercent !== undefined ? { ratePercent: body.ratePercent } : {}),
        ...(body.rateFixed !== undefined ? { rateFixed: body.rateFixed } : {}),
        ...(body.minOrderValue !== undefined ? { minOrderValue: body.minOrderValue } : {}),
        ...(body.validFrom !== undefined ? { validFrom: body.validFrom ? new Date(body.validFrom) : null } : {}),
        ...(body.validTo !== undefined ? { validTo: body.validTo ? new Date(body.validTo) : null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) { return errorResponse(err); }
});

export const DELETE = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'commissions.edit');
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);
    const found = await prisma.commissionRule.findFirst({
      where: { id, vendorId },
      select: { id: true },
    });
    if (!found) throw Errors.notFound('Commission rule');

    // Soft-disable, not hard-delete. See the file-header note for the
    // audit-trail rationale.
    await prisma.commissionRule.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) { return errorResponse(err); }
});
