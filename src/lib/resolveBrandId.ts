// resolveBrandId — shared helper for all brand API routes
// Supports: admin impersonation, direct brand owners, and team members.

import { NextRequest } from 'next/server';
import type { TeamRole } from '@prisma/client';
import type { AuthContext } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';

export interface BrandContext {
  brandId: string;
  teamRole: TeamRole | 'owner';
}

export async function resolveBrandContext(ctx: AuthContext, req: NextRequest): Promise<BrandContext> {
  if (ctx.role === 'admin') {
    const impersonateId = req.cookies.get('admin_impersonate_brand_id')?.value;
    if (!impersonateId) throw Errors.forbidden('No brand selected for admin view. Go back and click "View Portal" on a brand.');
    const brand = await prisma.brand.findUnique({ where: { id: impersonateId }, select: { id: true } });
    if (!brand) throw Errors.forbidden('Impersonated brand not found');
    return { brandId: brand.id, teamRole: 'owner' };
  }

  // Check direct ownership first
  const ownBrand = await prisma.brand.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (ownBrand) return { brandId: ownBrand.id, teamRole: 'owner' };

  // Check team membership
  const membership = await prisma.brandTeamMember.findFirst({
    where: { userId: ctx.userId },
    select: { brandId: true, role: true },
  });
  if (!membership) throw Errors.forbidden('No brand profile linked to your account');
  return { brandId: membership.brandId, teamRole: membership.role };
}

// Backward-compatible wrappers
export async function resolveBrandId(ctx: AuthContext, req: NextRequest): Promise<string> {
  return (await resolveBrandContext(ctx, req)).brandId;
}

export async function resolveUserId(ctx: AuthContext, req: NextRequest): Promise<string> {
  if (ctx.role === 'admin') {
    const impersonateId = req.cookies.get('admin_impersonate_brand_id')?.value;
    if (!impersonateId) throw Errors.forbidden('No brand selected for admin view.');
    const brand = await prisma.brand.findUnique({ where: { id: impersonateId }, select: { userId: true } });
    if (!brand) throw Errors.forbidden('Impersonated brand not found');
    return brand.userId;
  }
  // Owner path
  const ownBrand = await prisma.brand.findUnique({
    where: { userId: ctx.userId },
    select: { userId: true },
  });
  if (ownBrand) return ownBrand.userId;

  // Team member — return the brand owner's userId
  const membership = await prisma.brandTeamMember.findFirst({
    where: { userId: ctx.userId },
    select: { brand: { select: { userId: true } } },
  });
  if (!membership) throw Errors.forbidden('No brand profile linked to your account');
  return membership.brand.userId;
}
