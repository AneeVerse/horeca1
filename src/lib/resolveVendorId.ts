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

  // Check direct ownership first. Vendor.userId is no longer unique (one User
  // can own multiple vendor profiles, one per BusinessAccount), so we look
  // for a vendor that BOTH matches the user AND the active business account.
  // Without the second clause a multi-vendor user would land on whichever
  // row Postgres returns first.
  const ownVendor = await prisma.vendor.findFirst({
    where: {
      userId: ctx.userId,
      ...(ctx.activeBusinessAccountId ? { businessAccountId: ctx.activeBusinessAccountId } : {}),
    },
    select: { id: true, businessAccountId: true },
  });
  if (ownVendor) return { vendorId: ownVendor.id, teamRole: 'owner' };

  // Check team membership scoped to the active business account so a user on
  // multiple vendor teams lands on the vendor they actually selected in the
  // navbar account switcher. Without this filter, findFirst returned an
  // arbitrary membership and let a consultant accidentally operate on the
  // wrong vendor account.
  const membership = await prisma.vendorTeamMember.findFirst({
    where: {
      userId: ctx.userId,
      ...(ctx.activeBusinessAccountId
        ? { vendor: { businessAccountId: ctx.activeBusinessAccountId } }
        : {}),
    },
    select: { vendorId: true, role: true },
  });
  if (!membership) throw Errors.forbidden('No vendor profile linked to your account');
  return { vendorId: membership.vendorId, teamRole: membership.role };
}

// Backward-compatible wrapper — all existing routes that only need the ID still work
export async function resolveVendorId(ctx: AuthContext, req: NextRequest): Promise<string> {
  return (await resolveVendorContext(ctx, req)).vendorId;
}
