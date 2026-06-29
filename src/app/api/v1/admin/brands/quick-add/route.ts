// POST /api/v1/admin/brands/quick-add — create (or reuse) an approved brand LABEL
// inline from the product form. Unlike POST /api/v1/admin/brands (which provisions a
// full brand account with login), this just creates a catalog label — approved + active
// immediately, since an admin is the authority. PROTECTED: admin.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { findOrCreateBrandByName } from '@/modules/brand/brand.service';

const schema = z.object({ name: z.string().min(1) });

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.create');
    const { name } = schema.parse(await req.json());
    const brand = await findOrCreateBrandByName({ name, autoApprove: true });
    if (!brand) throw Errors.badRequest('Brand name is required');
    return NextResponse.json({
      success: true,
      data: { id: brand.id, name: brand.name },
      alreadyExists: !brand.created,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
