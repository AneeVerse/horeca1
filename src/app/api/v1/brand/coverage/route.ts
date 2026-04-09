// GET  /api/v1/brand/coverage — Product-level distributor coverage
// POST /api/v1/brand/coverage — Trigger re-run of auto-mapping engine
// REQUIRES: role=brand or admin (admin uses impersonation cookie)

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { brandOnly } from '@/middleware/rbac';
import { resolveUserId } from '@/lib/resolveBrandId';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

export const GET = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const userId = await resolveUserId(ctx, req);
  const coverage = await brandService.getDistributorCoverage(userId);
  return NextResponse.json({ success: true, data: coverage });
});

export const POST = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  const userId = await resolveUserId(ctx, req);
  const result = await brandService.triggerMapping(userId);
  return NextResponse.json({ success: true, data: result });
});
