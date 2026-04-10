// GET  /api/v1/brand/products — List brand's master product catalog
// POST /api/v1/brand/products — Add a product to brand catalog
// REQUIRES: role=brand or admin (admin uses impersonation cookie)

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { createBrandProductSchema } from '@/modules/brand/brand.validator';
import { brandOnly } from '@/middleware/rbac';
import { resolveUserId, resolveBrandContext } from '@/lib/resolveBrandId';
import { requireBrandPerm } from '@/lib/teamPermissions';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

export const GET = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const userId = await resolveUserId(ctx, req);
  const products = await brandService.listMyProducts(userId);
  return NextResponse.json({ success: true, data: products });
});

export const POST = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const { teamRole } = await resolveBrandContext(ctx, req);
  requireBrandPerm(teamRole, 'products:write');
  const userId = await resolveUserId(ctx, req);
  const body = await req.json();
  const input = createBrandProductSchema.parse(body);
  const product = await brandService.createMasterProduct(userId, input);
  return NextResponse.json({ success: true, data: product }, { status: 201 });
});
