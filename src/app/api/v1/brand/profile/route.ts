// GET  /api/v1/brand/profile — Get brand's own profile
// POST /api/v1/brand/profile — Create brand profile (first time)
// PATCH /api/v1/brand/profile — Update brand profile
// REQUIRES: role=brand (or admin)

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { createBrandSchema, updateBrandSchema } from '@/modules/brand/brand.validator';
import { brandOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

export const GET = brandOnly(async (_req: NextRequest, ctx: AuthContext) => {
  const profile = await brandService.getMyProfile(ctx.userId);
  return NextResponse.json({ success: true, data: profile });
});

export const POST = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const input = createBrandSchema.parse(body);
  const brand = await brandService.createBrand({ userId: ctx.userId, ...input });
  return NextResponse.json({ success: true, data: brand }, { status: 201 });
});

export const PATCH = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const input = updateBrandSchema.parse(body);
  const brand = await brandService.updateProfile(ctx.userId, input);
  return NextResponse.json({ success: true, data: brand });
});

// Catch errors at module level
export function handleError(error: unknown) {
  return errorResponse(error);
}
