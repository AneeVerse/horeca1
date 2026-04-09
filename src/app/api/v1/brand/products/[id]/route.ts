// PATCH  /api/v1/brand/products/[id] — Update a brand master product
// DELETE /api/v1/brand/products/[id] — Soft-delete a brand master product
// REQUIRES: role=brand or admin (admin uses impersonation cookie)

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { updateBrandProductSchema } from '@/modules/brand/brand.validator';
import { brandOnly } from '@/middleware/rbac';
import { resolveUserId } from '@/lib/resolveBrandId';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

export const PATCH = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const userId = await resolveUserId(ctx, req);
  const productId = req.nextUrl.pathname.split('/').at(-1)!;
  const body = await req.json();
  const input = updateBrandProductSchema.parse(body);
  const product = await brandService.updateMasterProduct(userId, productId, input);
  return NextResponse.json({ success: true, data: product });
});

export const DELETE = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const userId = await resolveUserId(ctx, req);
  const productId = req.nextUrl.pathname.split('/').at(-1)!;
  await brandService.deleteMasterProduct(userId, productId);
  return NextResponse.json({ success: true });
});
