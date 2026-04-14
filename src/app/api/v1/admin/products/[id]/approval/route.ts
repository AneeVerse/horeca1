// PATCH /api/v1/admin/products/:id/approval — Approve or reject a product
// WHY: Admin moderation workflow — vendors submit products, admin reviews and
//      approves or rejects them before they appear on the marketplace.
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { emitEvent } from '@/events/emitter';
import { requireAdminPerm } from '@/lib/teamPermissions';

// Helper: extract the [id] segment from /api/v1/admin/products/{id}/approval
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // segments: [..., 'products', '{id}', 'approval']
  return segments[segments.length - 2];
}

const approvalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().optional(),
});

// PATCH — approve or reject a product
export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'products:write');
    const id = extractId(req);
    const body = await req.json();
    const { action, note } = approvalSchema.parse(body);

    // Verify product exists
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, vendorId: true, name: true },
    });
    if (!existing) throw Errors.notFound('Product');

    if (action === 'approve') {
      const product = await prisma.product.update({
        where: { id },
        data: {
          approvalStatus: 'approved',
          approvedBy: ctx.userId,
          approvedAt: new Date(),
          approvalNote: note ?? null,
        },
      });

      if (existing.vendorId) {
        emitEvent('ProductApproved', {
          productId: id,
          vendorId: existing.vendorId,
          productName: existing.name,
          approvedBy: ctx.userId,
        });
      }

      return NextResponse.json({ success: true, data: product });
    }

    // action === 'reject'
    const product = await prisma.product.update({
      where: { id },
      data: {
        approvalStatus: 'rejected',
        approvedBy: ctx.userId,
        approvedAt: new Date(),
        approvalNote: note ?? null,
      },
    });

    if (existing.vendorId) {
      emitEvent('ProductRejected', {
        productId: id,
        vendorId: existing.vendorId,
        productName: existing.name,
        rejectedBy: ctx.userId,
        reason: note,
      });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return errorResponse(error);
  }
});
