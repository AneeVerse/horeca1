// resolveVendorId — shared helper for all vendor API routes
// WHY: Admin impersonation requires looking up vendorId by the impersonated vendor's id
//      (stored in the admin_impersonate_vendor_id cookie) instead of the session userId.
//      All vendor API routes use this instead of their own inline lookup.

import { NextRequest } from 'next/server';
import type { AuthContext } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';

export async function resolveVendorId(ctx: AuthContext, req: NextRequest): Promise<string> {
  if (ctx.role === 'admin') {
    const impersonateId = req.cookies.get('admin_impersonate_vendor_id')?.value;
    if (!impersonateId) throw Errors.forbidden('No vendor selected for admin view. Go back and click "View Dashboard" on a vendor.');
    const vendor = await prisma.vendor.findUnique({ where: { id: impersonateId }, select: { id: true } });
    if (!vendor) throw Errors.forbidden('Impersonated vendor not found');
    return vendor.id;
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');
  return vendor.id;
}
