// POST /api/v1/vendor/brands/suggest — Vendor suggests a new brand for admin approval.
// PROTECTED: Vendor only.
//
// Delegates to findOrCreateBrandByName so brand creation behaves identically here,
// in product import, and in single-product add. Brands are lightweight catalog
// labels (no backing login account) until an admin approves; the portal account
// is provisioned only if/when the real brand company onboards.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { findOrCreateBrandByName } from '@/modules/brand/brand.service';

const schema = z.object({
  name: z.string().min(2).max(255),
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    await resolveVendorContext(ctx, req); // tenant guard
    requirePermission(ctx, 'products.create');

    const { name } = schema.parse(await req.json());
    const resolved = await findOrCreateBrandByName({ name, autoApprove: false, suggestedBy: ctx.userId });
    if (!resolved) throw Errors.badRequest('Brand name is required');

    return NextResponse.json(
      {
        success: true,
        data: { id: resolved.id, name: resolved.name, approvalStatus: resolved.approvalStatus },
        alreadyExists: !resolved.created,
      },
      { status: resolved.created ? 201 : 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
});
