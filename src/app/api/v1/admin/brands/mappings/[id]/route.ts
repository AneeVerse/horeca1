// PATCH /api/v1/admin/brands/mappings/[id] — Verify or reject a mapping
// BODY: { status: "verified" | "rejected", reviewNote?: string }
// REQUIRES: role=admin

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { reviewMappingSchema } from '@/modules/brand/brand.validator';
import { adminOnly } from '@/middleware/rbac';
import { requirePermission } from '@/lib/permissions/engine';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

export const PATCH = adminOnly(async (req: NextRequest, ctx: AuthContext) => {
  requirePermission(ctx, 'brands.edit');
  const id = req.nextUrl.pathname.split('/').at(-1)!;
  const body = await req.json();
  const { status, reviewNote, brandMasterProductId } = reviewMappingSchema.parse(body);
  const mapping = await brandService.adminReviewMapping(id, status, ctx.userId, reviewNote, brandMasterProductId);
  return NextResponse.json({ success: true, data: mapping });
});
