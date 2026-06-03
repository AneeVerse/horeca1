/**
 * POST /api/v1/vendor/commissions/[id]/approve — move pending → approved
 *
 * Stamps the caller's userId on `approved_by` for audit. Only valid from
 * status='pending'; other states return 400 with a precise reason.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

function extractId(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  // pathname ends in .../commissions/<id>/approve, so id is at -2
  return segs[segs.length - 2];
}

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'commissions.approve');
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);

    const accrual = await prisma.commissionAccrual.findFirst({
      where: { id, vendorId },
      select: { id: true, status: true },
    });
    if (!accrual) throw Errors.notFound('Commission accrual');
    if (accrual.status !== 'pending') {
      throw Errors.badRequest(`Cannot approve from status='${accrual.status}'; must be 'pending'`);
    }

    const updated = await prisma.commissionAccrual.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: ctx.userId,
        approvedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) { return errorResponse(err); }
});
