// resolveBrandId — shared helper for all brand API routes
// WHY: Admin impersonation uses admin_impersonate_brand_id cookie instead of session userId.
//      All brand API routes call this instead of looking up brand by ctx.userId directly.

import { NextRequest } from 'next/server';
import type { AuthContext } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';

export async function resolveBrandId(ctx: AuthContext, req: NextRequest): Promise<string> {
  if (ctx.role === 'admin') {
    const impersonateId = req.cookies.get('admin_impersonate_brand_id')?.value;
    if (!impersonateId) throw Errors.forbidden('No brand selected for admin view. Go back and click "View Portal" on a brand.');
    const brand = await prisma.brand.findUnique({ where: { id: impersonateId }, select: { id: true } });
    if (!brand) throw Errors.forbidden('Impersonated brand not found');
    return brand.id;
  }

  const brand = await prisma.brand.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (!brand) throw Errors.forbidden('No brand profile linked to your account');
  return brand.id;
}

export async function resolveUserId(ctx: AuthContext, req: NextRequest): Promise<string> {
  if (ctx.role === 'admin') {
    const impersonateId = req.cookies.get('admin_impersonate_brand_id')?.value;
    if (!impersonateId) throw Errors.forbidden('No brand selected for admin view.');
    const brand = await prisma.brand.findUnique({ where: { id: impersonateId }, select: { userId: true } });
    if (!brand) throw Errors.forbidden('Impersonated brand not found');
    return brand.userId;
  }
  return ctx.userId;
}
