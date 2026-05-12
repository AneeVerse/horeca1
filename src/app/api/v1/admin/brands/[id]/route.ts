// GET  /api/v1/admin/brands/[id] — Get brand detail
// PATCH /api/v1/admin/brands/[id] — Admin edits brand profile (logo, banner, categories, bgColor, showcaseImages, etc.)
// DELETE /api/v1/admin/brands/[id] — Permanently delete a brand (cascades master products, mappings, team, invites)
// REQUIRES: role=admin

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { requireAdminPerm } from '@/lib/teamPermissions';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import type { AuthContext } from '@/middleware/auth';

// Lenient — admin should be able to save partial/legacy data.
// Empty strings → null (frontend already does this). URLs not strictly validated
// because some legacy records have bare domains like "amul.com".
const patchSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  logoUrl: z.string().max(1024).nullable().optional(),
  bannerUrl: z.string().max(1024).nullable().optional(),
  website: z.string().max(512).nullable().optional(),
  tagline: z.string().max(512).nullable().optional(),
  categories: z.array(z.string().max(80)).max(12).optional(),
  bgColor: z.string().max(20).nullable().optional(),
  showcaseImages: z.array(z.string().max(1024)).max(5).optional(),
  isActive: z.boolean().optional(),
});

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const GET = adminOnly(async (req: NextRequest, _ctx: AuthContext) => {
  try {
    const id = req.nextUrl.pathname.split('/').at(-1)!;
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        _count: { select: { masterProducts: { where: { isActive: true } }, productMappings: true } },
      },
    });
    if (!brand) return NextResponse.json({ success: false, error: { message: 'Brand not found' } }, { status: 404 });
    return NextResponse.json({ success: true, data: brand });
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = adminOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'settings:write');
    const id = req.nextUrl.pathname.split('/').at(-1)!;
    const body = await req.json();
    const input = patchSchema.parse(body);

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        ...input,
        ...(input.name ? { slug: slugify(input.name) } : {}),
      },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

// Hard delete. BrandMasterProduct, BrandProductMapping, BrandTeamMember, and
// BrandDistributorInvite all cascade on brandId — one delete wipes the lot.
// The owning User row is untouched (FK is non-cascading from User side).
export const DELETE = adminOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'settings:write');
    const id = req.nextUrl.pathname.split('/').at(-1)!;
    const existing = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw Errors.notFound('Brand');
    await prisma.brand.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    return errorResponse(error);
  }
});
