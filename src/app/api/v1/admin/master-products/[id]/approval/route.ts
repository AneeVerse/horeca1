// PATCH /api/v1/admin/master-products/:id/approval — Approve or reject a pending master catalog entry.
// PROTECTED: Admin only.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { emitEvent } from '@/events/emitter';
import { requirePermission } from '@/lib/permissions/engine';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';
import { syncProductToBrand } from '@/modules/brand/brand.service';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 2];
}

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const approvalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().optional(),
});

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.approve');
    const id = extractId(req);
    const { action, note } = approvalSchema.parse(await req.json());

    const existing = await prisma.masterProduct.findUnique({
      where: { id },
      select: { id: true, name: true, brand: true, categoryId: true, imageUrl: true, uom: true, sku: true, suggestedBy: true },
    });
    if (!existing) throw Errors.notFound('Master product');

    if (action === 'approve') {
      const master = await prisma.masterProduct.update({
        where: { id },
        data: {
          approvalStatus: 'approved',
          approvedBy: ctx.userId,
          approvedAt: new Date(),
          approvalNote: note ?? null,
          isActive: true,
        },
      });

      // If brand user suggested this master, auto-create their BrandMasterProduct link.
      if (existing.suggestedBy) {
        const brand = await prisma.brand.findFirst({
          where: { userId: existing.suggestedBy },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (brand) {
          const slug = slugify(existing.name);
          await prisma.brandMasterProduct.upsert({
            where: { brandId_slug: { brandId: brand.id, slug } },
            create: {
              brandId: brand.id,
              masterProductId: master.id,
              name: existing.name,
              slug,
              sku: existing.sku,
              categoryId: existing.categoryId,
              categoryIds: [existing.categoryId],
              imageUrl: existing.imageUrl,
              unit: existing.uom,
            },
            update: {
              masterProductId: master.id,
              sku: existing.sku,
              isActive: true,
            },
          });
        }
      }

      syncProductToBrand(
        master.brand,
        master.name,
        master.categoryId,
        master.imageUrl,
        master.uom,
        master.sku,
        master.id,
      ).catch(console.error);

      emitEvent('ProductApproved', {
        productId: id,
        vendorId: '',
        productName: existing.name,
        approvedBy: ctx.userId,
      });

      logAction(ctx, req, {
        action: AUDIT_ACTIONS.productApprove,
        entity: 'MasterProduct',
        entityId: id,
        after: { approvalStatus: 'approved', note: note ?? null },
        metadata: { productName: existing.name, sku: existing.sku },
      });

      return NextResponse.json({ success: true, data: master });
    }

    const master = await prisma.masterProduct.update({
      where: { id },
      data: {
        approvalStatus: 'rejected',
        approvedBy: ctx.userId,
        approvedAt: new Date(),
        approvalNote: note ?? null,
      },
    });

    emitEvent('ProductRejected', {
      productId: id,
      vendorId: '',
      productName: existing.name,
      rejectedBy: ctx.userId,
      reason: note,
    });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.productReject,
      entity: 'MasterProduct',
      entityId: id,
      after: { approvalStatus: 'rejected', note: note ?? null },
      metadata: { productName: existing.name, sku: existing.sku },
    });

    return NextResponse.json({ success: true, data: master });
  } catch (error) {
    return errorResponse(error);
  }
});
