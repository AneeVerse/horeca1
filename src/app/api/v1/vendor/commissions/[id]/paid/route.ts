/**
 * POST /api/v1/vendor/commissions/[id]/paid — move approved → paid
 *
 * Records the disbursement reference (UPI txn ID, NEFT ref, etc.) in
 * the `notes` field for the vendor's own books. No money moves out
 * of Horeca1; this state is the vendor stating "I paid the rep offline".
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const Body = z.object({ reference: z.string().min(1).max(500) });

function extractId(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return segs[segs.length - 2];
}

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'commissions.approve');
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);
    const { reference } = Body.parse(await req.json());

    const accrual = await prisma.commissionAccrual.findFirst({
      where: { id, vendorId },
      select: { id: true, status: true, notes: true },
    });
    if (!accrual) throw Errors.notFound('Commission accrual');
    if (accrual.status !== 'approved') {
      throw Errors.badRequest(`Cannot mark paid from status='${accrual.status}'; must be 'approved'`);
    }

    const updated = await prisma.commissionAccrual.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        notes: `${accrual.notes ? accrual.notes + '\n' : ''}[paid] ${reference}`,
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) { return errorResponse(err); }
});
