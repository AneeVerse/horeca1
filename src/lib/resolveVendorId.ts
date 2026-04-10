// resolveVendorId — shared helper for all vendor API routes
// Supports: admin impersonation, direct vendor owners, and team members.

import { NextRequest } from 'next/server';
import type { TeamRole } from '@prisma/client';
import type { AuthContext } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';

export interface VendorContext {
  vendorId: string;
  teamRole: TeamRole | 'owner';
}

export async function resolveVendorContext(ctx: AuthContext, req: NextRequest): Promise<VendorContext> {
  if (ctx.role === 'admin') {
    const impersonateId = req.cookies.get('admin_impersonate_vendor_id')?.value;
    if (!impersonateId) throw Errors.forbidden('No vendor selected for admin view. Go back and click "View Dashboard" on a vendor.');
    const vendor = await prisma.vendor.findUnique({ where: { id: impersonateId }, select: { id: true } });
    if (!vendor) throw Errors.forbidden('Impersonated vendor not found');
    return { vendorId: vendor.id, teamRole: 'owner' };
  }

  // Check direct ownership first
  const ownVendor = await prisma.vendor.findUnique({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (ownVendor) return { vendorId: ownVendor.id, teamRole: 'owner' };

  // Check team membership (team members have role='vendor' but no direct Vendor record)
  const membership = await prisma.vendorTeamMember.findFirst({
    where: { userId: ctx.userId },
    select: { vendorId: true, role: true },
  });
  if (!membership) throw Errors.forbidden('No vendor profile linked to your account');
  return { vendorId: membership.vendorId, teamRole: membership.role };
}

// Backward-compatible wrapper — all existing routes that only need the ID still work
export async function resolveVendorId(ctx: AuthContext, req: NextRequest): Promise<string> {
  return (await resolveVendorContext(ctx, req)).vendorId;
}
