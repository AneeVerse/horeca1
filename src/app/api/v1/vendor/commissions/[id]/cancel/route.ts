/**
 * POST /api/v1/vendor/commissions/[id]/cancel — move pending|approved → cancelled
 *
 * Terminal state — no resurrection. If you cancel by mistake, create a
 * manual accrual via admin SQL (we don't expose that surface in V2.2).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const Body = z.object({ note: z.string().max(500).optional() });

function extractId(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return segs[segs.length - 2];
}

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'commissions.approve');
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);
    const { note } = Body.parse(await req.json().catch(() => ({})));

    const accrual = await prisma.commissionAccrual.findFirst({
      where: { id, vendorId },
      select: { id: true, status: true, notes: true },
    });
    if (!accrual) throw Errors.notFound('Commission accrual');
    if (accrual.status === 'cancelled' || accrual.status === 'paid') {
      throw Errors.badRequest(`Cannot cancel from status='${accrual.status}'`);
    }

    const updated = await prisma.commissionAccrual.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: note ? `${accrual.notes ? accrual.notes + '\n' : ''}[cancelled] ${note}` : accrual.notes,
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) { return errorResponse(err); }
});
