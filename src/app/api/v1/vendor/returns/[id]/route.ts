// PATCH /api/v1/vendor/returns/:id — Vendor approves or rejects a return request
// WHY: Vendor has operational ownership of their orders — they decide the resolution.
//      Admin can override, but vendor does first review.
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

function extractId(req: NextRequest) {
  return new URL(req.url).pathname.split('/').at(-1) ?? '';
}

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNote: z.string().max(1000).optional(),
  refundAmount: z.number().min(0).optional(),
});

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'orders.edit');

    const returnId = extractId(req);
    const body = reviewSchema.parse(await req.json());

    // Verify the return belongs to one of this vendor's orders
    const returnReq = await prisma.returnRequest.findFirst({
      where: { id: returnId, order: { vendorId } },
      include: { order: { select: { id: true, status: true } } },
    });
    if (!returnReq) throw Errors.notFound('Return request');
    if (returnReq.status !== 'pending') {
      throw Errors.badRequest(`Return is already ${returnReq.status}`);
    }

    const updated = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: body.status,
        adminNote: body.adminNote,
        ...(body.refundAmount !== undefined && { refundAmount: body.refundAmount }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
