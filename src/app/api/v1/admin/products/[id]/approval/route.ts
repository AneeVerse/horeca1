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
import { requirePermission } from '@/lib/permissions/engine';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';
import { syncProductToBrand } from '@/modules/brand/brand.service';
import { sendProductRejectedNotifications } from '@/lib/productRejectionNotifications';

// Helper: extract the [id] segment from /api/v1/admin/products/{id}/approval
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  // segments: [..., 'products', '{id}', 'approval']
  return segments[segments.length - 2];
}

const approvalSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    note: z.string().optional(),
  })
  .refine((d) => d.action !== 'reject' || (d.note?.trim().length ?? 0) > 0, {
    message: 'Rejection reason is required',
    path: ['note'],
  });

// PATCH — approve or reject a product
export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.approve');
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
      // Gate: a product can only be approved once its brand AND category are
      // approved too. New (vendor-suggested) brands/categories must clear the
      // approvals queue first. A legacy text-only brand with no Brand record
      // doesn't block — there's nothing tracked to gate on.
      const refs = await prisma.product.findUnique({
        where: { id },
        select: {
          brand: true,
          category: { select: { name: true, approvalStatus: true } },
          categoryLinks: { select: { category: { select: { name: true, approvalStatus: true } } } },
        },
      });

      const blockers: string[] = [];

      if (refs?.brand) {
        const brand = await prisma.brand.findFirst({
          where: { name: { equals: refs.brand.trim(), mode: 'insensitive' } },
          select: { name: true, approvalStatus: true },
        });
        if (brand && brand.approvalStatus !== 'approved') {
          blockers.push(`Brand "${brand.name}" (${brand.approvalStatus})`);
        }
      }

      const seenCat = new Set<string>();
      const catRefs = [
        ...(refs?.category ? [refs.category] : []),
        ...(refs?.categoryLinks.map(pc => pc.category) ?? []),
      ];
      for (const c of catRefs) {
        if (!c || seenCat.has(c.name)) continue;
        seenCat.add(c.name);
        if (c.approvalStatus !== 'approved') {
          blockers.push(`Category "${c.name}" (${c.approvalStatus})`);
        }
      }

      if (blockers.length > 0) {
        throw Errors.badRequest(
          `Cannot approve "${existing.name}" yet — approve these first: ${blockers.join(', ')}.`
        );
      }

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

      logAction(ctx, req, {
        action: AUDIT_ACTIONS.productApprove,
        entity: 'Product',
        entityId: id,
        after: { approvalStatus: 'approved', note: note ?? null },
        metadata: { vendorId: existing.vendorId, productName: existing.name },
      });

      if (product.brand) {
        syncProductToBrand(
          product.brand,
          product.name,
          product.categoryId,
          product.imageUrl,
          product.packSize ?? undefined,
          product.unit ?? undefined,
          product.masterProductId || undefined
        ).catch(console.error);
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

    await sendProductRejectedNotifications({
      productId: id,
      vendorId: existing.vendorId,
      productName: existing.name,
      reason: note,
    });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.productReject,
      entity: 'Product',
      entityId: id,
      after: { approvalStatus: 'rejected', note: note ?? null },
      metadata: { vendorId: existing.vendorId, productName: existing.name },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return errorResponse(error);
  }
});
