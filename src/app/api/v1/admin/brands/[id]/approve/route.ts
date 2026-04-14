// POST /api/v1/admin/brands/[id]/approve — Approve or reject a brand
// BODY: { action: "approved" | "rejected" }
// REQUIRES: role=admin

import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/modules/brand/brand.service';
import { adminOnly } from '@/middleware/rbac';
import { z } from 'zod';
import type { AuthContext } from '@/middleware/auth';
import { requireAdminPerm } from '@/lib/teamPermissions';

const brandService = new BrandService();
const schema = z.object({ action: z.enum(['approved', 'rejected']) });

export const POST = adminOnly(async (req: NextRequest, ctx: AuthContext) => {
  requireAdminPerm(ctx.adminTeamRole, 'settings:write');
  const id = req.nextUrl.pathname.split('/').at(-2)!;
  const body = await req.json();
  const { action } = schema.parse(body);
  const brand = await brandService.adminApproveBrand(id, action, ctx.userId);
  return NextResponse.json({ success: true, data: brand });
});
