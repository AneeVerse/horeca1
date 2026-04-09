// GET /api/v1/admin/brands/mappings — List pending brand-product mappings for review
// SUPPORTS: ?limit=50
// REQUIRES: role=admin

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { adminOnly } from '@/middleware/rbac';
import type { AuthContext } from '@/middleware/auth';

const brandService = new BrandService();

export const GET = adminOnly(async (req: NextRequest, _ctx: AuthContext) => {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50);
  const mappings = await brandService.adminListPendingMappings(limit);
  return NextResponse.json({ success: true, data: mappings });
});
