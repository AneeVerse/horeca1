// GET /api/v1/admin/brands — List all brands (admin)
// SUPPORTS: ?status=pending|approved|rejected
// REQUIRES: role=admin

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { adminOnly } from '@/middleware/rbac';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

export const GET = adminOnly(async (req: NextRequest, _ctx: AuthContext) => {
  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const brands = await brandService.adminListBrands(status);
  return NextResponse.json({ success: true, data: brands });
});
