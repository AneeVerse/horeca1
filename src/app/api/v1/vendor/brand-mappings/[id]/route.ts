// PATCH /api/v1/vendor/brand-mappings/[id] — Vendor accepts or rejects a pending_review mapping
// BODY: { status: "verified" | "rejected", reviewNote?: string }
// REQUIRES: role=vendor (or admin), products:write permission. The mapping must be on this vendor's product.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requireVendorPerm } from '@/lib/teamPermissions';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';
import type { AuthContext } from '@/middleware/auth';

const reviewSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  reviewNote: z.string().max(500).optional(),
});

export const PATCH = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { vendorId, teamRole } = await resolveVendorContext(ctx, req);
    requireVendorPerm(teamRole, 'products:write');

    const id = req.nextUrl.pathname.split('/').at(-1)!;
    const body = await req.json();
    const { status, reviewNote } = reviewSchema.parse(body);

    // Guard: mapping's distributor product must belong to caller's vendor
    const mapping = await prisma.brandProductMapping.findFirst({
      where: {
        id,
        distributorProduct: { vendorId },
      },
      include: {
        brandMasterProduct: { select: { name: true, brand: { select: { name: true } } } },
      },
    });
    if (!mapping) throw Errors.notFound('Mapping not found in your inventory');

    const updated = await prisma.brandProductMapping.update({
      where: { id },
      data: {
        status,
        matchedBy: 'manually_verified',
        confidenceScore: status === 'verified' ? 1.0 : mapping.confidenceScore,
        reviewedBy: ctx.userId,
        reviewNote: reviewNote ?? null,
        updatedAt: new Date(),
      },
    });

    logAction(ctx, req, {
      action: status === 'verified' ? AUDIT_ACTIONS.brandMappingVerified : AUDIT_ACTIONS.brandMappingRejected,
      entity: 'BrandProductMapping',
      entityId: id,
      metadata: {
        brandName: mapping.brandMasterProduct.brand.name,
        masterName: mapping.brandMasterProduct.name,
        reviewNote: reviewNote ?? null,
        actor: 'vendor',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
