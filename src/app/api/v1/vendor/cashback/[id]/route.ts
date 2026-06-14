// PATCH  /api/v1/vendor/cashback/:id — Update own campaign
// DELETE /api/v1/vendor/cashback/:id — Delete own campaign (deactivate if used)
// PROTECTED: Vendor only — scoped to the resolved vendor

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';
import { updateCashbackCampaignSchema } from '@/modules/promotion/promotion.validator';
import { campaignUpdateData } from '@/modules/promotion/promotion.mappers';

function extractId(req: NextRequest) {
  return new URL(req.url).pathname.split('/').at(-1) ?? '';
}

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'promotions.edit');

    const id = extractId(req);
    const body = updateCashbackCampaignSchema.parse(await req.json());

    const existing = await prisma.cashbackCampaign.findFirst({ where: { id, vendorId } });
    if (!existing) throw Errors.notFound('Cashback campaign');

    const updated = await prisma.cashbackCampaign.update({ where: { id }, data: campaignUpdateData(body) });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.cashbackCampaignUpdate,
      entity: 'cashback_campaign',
      entityId: id,
      before: { isActive: existing.isActive },
      after: { isActive: updated.isActive },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'promotions.delete');

    const id = extractId(req);
    const existing = await prisma.cashbackCampaign.findFirst({
      where: { id, vendorId },
      include: { _count: { select: { entries: true } } },
    });
    if (!existing) throw Errors.notFound('Cashback campaign');

    if (existing._count.entries > 0) {
      await prisma.cashbackCampaign.update({ where: { id }, data: { isActive: false } });
      logAction(ctx, req, {
        action: AUDIT_ACTIONS.cashbackCampaignDelete,
        entity: 'cashback_campaign',
        entityId: id,
        metadata: { deactivatedInsteadOfDeleted: true },
      });
      return NextResponse.json({ success: true, data: { deactivated: true } });
    }

    await prisma.cashbackCampaign.delete({ where: { id } });
    logAction(ctx, req, { action: AUDIT_ACTIONS.cashbackCampaignDelete, entity: 'cashback_campaign', entityId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
