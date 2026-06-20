// POST /api/v1/brand/master-products — Brand submits a new master catalog entry for admin approval.
// PROTECTED: brand only.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BrandService } from '@/modules/brand/brand.service';
import { brandOnly } from '@/middleware/rbac';
import { resolveUserId, resolveBrandContext } from '@/lib/resolveBrandId';
import { requirePermission } from '@/lib/permissions/engine';
import { errorResponse } from '@/middleware/errorHandler';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

const submitSchema = z.object({
  name: z.string().min(2).max(255),
  sku: z.string().min(2).max(40),
  categoryId: z.string().uuid(),
  imageUrl: z.string().url().optional(),
  uom: z.string().max(50).optional(),
});

export const POST = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    await resolveBrandContext(ctx, req);
    requirePermission(ctx, 'products.create');
    const userId = await resolveUserId(ctx, req);
    const input = submitSchema.parse(await req.json());
    const master = await brandService.submitPendingMasterProduct(userId, input);
    return NextResponse.json({ success: true, data: master }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
