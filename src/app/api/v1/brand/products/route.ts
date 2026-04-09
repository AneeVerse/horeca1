// GET  /api/v1/brand/products — List brand's master product catalog
// POST /api/v1/brand/products — Add a product to brand catalog
// REQUIRES: role=brand (or admin)

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { createBrandProductSchema } from '@/modules/brand/brand.validator';
import { brandOnly } from '@/middleware/rbac';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

export const GET = brandOnly(async (_req: NextRequest, ctx: AuthContext) => {
  const products = await brandService.listMyProducts(ctx.userId);
  return NextResponse.json({ success: true, data: products });
});

export const POST = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const input = createBrandProductSchema.parse(body);
  const product = await brandService.createMasterProduct(ctx.userId, input);
  return NextResponse.json({ success: true, data: product }, { status: 201 });
});
