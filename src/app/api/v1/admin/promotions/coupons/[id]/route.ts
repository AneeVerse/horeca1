// PATCH  /api/v1/admin/promotions/coupons/:id — Update any coupon
// DELETE /api/v1/admin/promotions/coupons/:id — Delete (or deactivate if used)
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';
import { updateCouponSchema } from '@/modules/promotion/promotion.validator';
import { couponUpdateData } from '@/modules/promotion/promotion.mappers';

function extractId(req: NextRequest) {
  return new URL(req.url).pathname.split('/').at(-1) ?? '';
}

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'promotions.edit');
    const id = extractId(req);
    const body = updateCouponSchema.parse(await req.json());

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw Errors.notFound('Coupon');

    const updated = await prisma.coupon.update({ where: { id }, data: couponUpdateData(body) });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.couponUpdate,
      entity: 'coupon',
      entityId: id,
      before: { isActive: existing.isActive, discountValue: Number(existing.discountValue) },
      after: { isActive: updated.isActive, discountValue: Number(updated.discountValue) },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'promotions.delete');
    const id = extractId(req);

    const existing = await prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!existing) throw Errors.notFound('Coupon');

    // Redeemed coupons hold financial history — deactivate instead of delete.
    if (existing._count.redemptions > 0) {
      await prisma.coupon.update({ where: { id }, data: { isActive: false } });
      logAction(ctx, req, {
        action: AUDIT_ACTIONS.couponDelete,
        entity: 'coupon',
        entityId: id,
        metadata: { deactivatedInsteadOfDeleted: true },
      });
      return NextResponse.json({ success: true, data: { deactivated: true } });
    }

    await prisma.coupon.delete({ where: { id } });
    logAction(ctx, req, { action: AUDIT_ACTIONS.couponDelete, entity: 'coupon', entityId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
