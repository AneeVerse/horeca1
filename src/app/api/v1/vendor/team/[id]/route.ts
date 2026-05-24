// PATCH  /api/v1/vendor/team/[id] — change a vendor team member's role
// DELETE /api/v1/vendor/team/[id] — remove a member from the vendor team
//
// `[id]` is the VendorTeamMember.id (matches the legacy contract).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { vendorOnly } from '@/middleware/rbac';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import type { TeamRole } from '@prisma/client';

const updateSchema = z.object({
  roleId: z.string().uuid(),
});

const VENDOR_ROLE_TO_ENUM: Record<string, TeamRole> = {
  'Vendor Admin': 'owner',
  'Vendor Manager': 'manager',
  'Vendor Editor': 'editor',
  'Vendor Viewer': 'viewer',
};

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 1];
}

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'users.edit');
    const id = extractId(req);

    const member = await prisma.vendorTeamMember.findFirst({
      where: { id, vendorId },
      select: { id: true, role: true, roleId: true, userId: true },
    });
    if (!member) throw Errors.notFound('Team member not found');

    const body = await req.json();
    const { roleId } = updateSchema.parse(body);

    const role = await prisma.accountRole.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, scope: true },
    });
    if (!role || role.scope !== 'vendor') {
      throw Errors.badRequest('roleId must reference a vendor-scope role');
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { businessAccountId: true },
    });
    if (!vendor) throw Errors.notFound('Vendor not found');

    const legacyEnum: TeamRole = VENDOR_ROLE_TO_ENUM[role.name] ?? 'viewer';
    const userId = member.userId;
    const businessAccountId = vendor.businessAccountId;

    await prisma.$transaction(async (tx) => {
      await tx.vendorTeamMember.update({
        where: { id: member.id },
        data: { roleId: role.id, role: legacyEnum },
      });

      // Replace any prior vendor-scope UserRole for this (user, account, account-wide)
      // with the new role so the permission union reflects the change immediately.
      await tx.userRole.deleteMany({
        where: {
          userId,
          businessAccountId,
          outletId: null,
          role: { scope: 'vendor' },
        },
      });
      await tx.userRole.create({
        data: { userId, businessAccountId, outletId: null, roleId: role.id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});

export const DELETE = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'users.delete');
    const id = extractId(req);

    const member = await prisma.vendorTeamMember.findFirst({
      where: { id, vendorId },
      select: { id: true, userId: true },
    });
    if (!member) throw Errors.notFound('Team member not found');

    if (member.userId === ctx.userId) {
      throw Errors.badRequest('You cannot remove yourself from the team');
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { businessAccountId: true },
    });
    if (!vendor) throw Errors.notFound('Vendor not found');

    await prisma.$transaction(async (tx) => {
      await tx.vendorTeamMember.delete({ where: { id: member.id } });

      // Strip the vendor-scope UserRole(s) for this (user, account). Leave any
      // account-scope UserRole alone — a customer-side role attached to the
      // same BusinessAccount is unrelated to vendor team membership.
      await tx.userRole.deleteMany({
        where: {
          userId: member.userId,
          businessAccountId: vendor.businessAccountId,
          role: { scope: 'vendor' },
        },
      });
      // BusinessAccountMember is left in place — the user may still be a
      // customer of the same account or a brand-team member; removing it
      // would orphan those roles. The /account/[id]/users DELETE handler is
      // the right place to fully detach a member from an account.
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
