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

  // Check direct ownership first. A user can only own one Vendor (Vendor.userId
  // is unique), so no active-account filter needed here.
  const ownVendor = await prisma.vendor.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, businessAccountId: true },
  });
  if (ownVendor) {
    // If the user is also a team member on other vendors, their session's
    // active business account may point elsewhere — respect it.
    if (ctx.activeBusinessAccountId && ownVendor.businessAccountId !== ctx.activeBusinessAccountId) {
      // fall through to team-membership lookup
    } else {
      return { vendorId: ownVendor.id, teamRole: 'owner' };
    }
  }

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
