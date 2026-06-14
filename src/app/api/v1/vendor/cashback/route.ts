// GET  /api/v1/vendor/cashback — List this vendor's cashback campaigns
// POST /api/v1/vendor/cashback — Create a campaign funded by this vendor
// WHY: Promo brief — "Buy from Vendor X, receive ₹300 Cashback". Vendor
//      campaigns only ever match this vendor's orders (Rule 5 picks the
//      single highest source across platform + vendor campaigns).
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId, resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';
import { createCashbackCampaignSchema } from '@/modules/promotion/promotion.validator';
import { campaignCreateData } from '@/modules/promotion/promotion.mappers';

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    requirePermission(ctx, 'promotions.view');

    const campaigns = await prisma.cashbackCampaign.findMany({
      where: { vendorId },
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'promotions.create');

    const body = createCashbackCampaignSchema.parse(await req.json());

    const campaign = await prisma.cashbackCampaign.create({
      data: campaignCreateData(body, vendorId, ctx.userId),
    });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.cashbackCampaignCreate,
      entity: 'cashback_campaign',
      entityId: campaign.id,
      after: { name: campaign.name, vendorId },
    });
    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
