// GET /api/v1/brand/coverage — Distributor coverage for brand's products
// POST /api/v1/brand/coverage — Trigger re-run of auto-mapping engine
// REQUIRES: role=brand (or admin)

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { brandOnly } from '@/middleware/rbac';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

export const GET = brandOnly(async (_req: NextRequest, ctx: AuthContext) => {
  const coverage = await brandService.getDistributorCoverage(ctx.userId);
  return NextResponse.json({ success: true, data: coverage });
});

export const POST = brandOnly(async (_req: NextRequest, ctx: AuthContext) => {
  const result = await brandService.triggerMapping(ctx.userId);
  return NextResponse.json({ success: true, data: result });
});
