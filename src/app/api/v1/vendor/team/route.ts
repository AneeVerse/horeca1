// GET  /api/v1/vendor/team — list vendor team members (with assigned Role)
// POST /api/v1/vendor/team — invite a user to the vendor team
//
// V2.2 RBAC: permission check uses the new requirePermission engine.
// POST body: { identifier (email|phone), fullName?, password?, roleId }.

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { vendorOnly } from '@/middleware/rbac';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { uniqueHcid } from '@/lib/hcid';
import { toTeamMemberDTO, teamMemberInclude, type TeamMemberDTO } from '@/lib/teamMemberShape';
import type { AuthContext } from '@/middleware/auth';
import type { TeamRole } from '@prisma/client';

const inviteSchema = z.object({
  identifier: z.string().min(3).max(255),
  fullName: z.string().min(2).max(100).optional(),
  password: z.string().min(6).max(72).optional(),
  roleId: z.string().uuid(),
});

const VENDOR_ROLE_TO_ENUM: Record<string, TeamRole> = {
  'Vendor Admin': 'owner',
  'Vendor Manager': 'manager',
  'Vendor Editor': 'editor',
  'Vendor Viewer': 'viewer',
};

export const GET = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { userId: true, user: { select: { id: true, fullName: true, email: true, phone: true, hcidDisplay: true, isActive: true, createdAt: true } } },
    });
    if (!vendor) throw Errors.notFound('Vendor not found');

    const members = await prisma.vendorTeamMember.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'asc' },
      include: teamMemberInclude,
    });

    // Owner row is synthesised from the vendor.user — they have no team-member record.
    const owner: TeamMemberDTO = toTeamMemberDTO({
      id: `owner-${vendor.user.id}`,
      createdAt: vendor.user.createdAt,
      legacyRole: 'owner',
      isOwner: true,
      user: vendor.user,
      // Fabricate a label-only role for the owner row so the UI chip renders.
      roleRef: null,
    });
    // Replace synthesised role name "Owner" with "Vendor Admin" if that template exists.
    const adminTemplate = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, isTemplate: true, scope: 'vendor', name: 'Vendor Admin' },
      select: { id: true, name: true, scope: true, description: true },
    });
    if (adminTemplate) {
      owner.role = { id: adminTemplate.id, name: adminTemplate.name, scope: 'vendor', description: adminTemplate.description };
    }

    const others: TeamMemberDTO[] = members.map((m) => toTeamMemberDTO({
      id: m.id,
      createdAt: m.createdAt,
      legacyRole: m.role,
      isOwner: false,
      user: m.user,
      roleRef: m.roleRef,
    }));

    return NextResponse.json({ success: true, data: [owner, ...others] });
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'users.create');

    const body = await req.json();
    const input = inviteSchema.parse(body);

    const role = await prisma.accountRole.findUnique({
      where: { id: input.roleId },
      select: { id: true, name: true, scope: true, description: true },
    });
    if (!role || role.scope !== 'vendor') {
      throw Errors.badRequest('roleId must reference a vendor-scope role');
    }

    // Resolve the vendor's BusinessAccount so we can also write the V2.2-native
    // BusinessAccountMember + UserRole rows. These are what loadActiveContext
    // reads to populate session.permissions — without them a newly invited
    // member would get a VendorTeamMember row but no actual permissions.
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { businessAccountId: true },
    });
    if (!vendor) throw Errors.notFound('Vendor not found');

    const identifierTrim = input.identifier.trim();
    const looksEmail = identifierTrim.includes('@');
    let user = looksEmail
      ? await prisma.user.findUnique({ where: { email: identifierTrim.toLowerCase() } })
      : await prisma.user.findUnique({ where: { phone: identifierTrim.replace(/\D/g, '') } });

    if (!user) {
      if (!looksEmail) throw Errors.badRequest('New vendor invites require an email identifier');
      if (!input.fullName || !input.password) {
        throw Errors.badRequest('fullName and password are required when the invitee is a new user');
      }
      const hashedPassword = await bcrypt.hash(input.password, 12);
      const hcidDisplay = await uniqueHcid();
      user = await prisma.user.create({
        data: {
          fullName: input.fullName,
          email: identifierTrim.toLowerCase(),
          password: hashedPassword,
          role: 'vendor',
          isActive: true,
          hcidDisplay,
        },
      });
    }

    const existingMember = await prisma.vendorTeamMember.findUnique({
      where: { vendorId_userId: { vendorId, userId: user.id } },
      select: { id: true },
    });
    if (existingMember) {
      throw Errors.conflict('User is already on this vendor team — update their role instead');
    }

    const legacyEnum: TeamRole = VENDOR_ROLE_TO_ENUM[role.name] ?? 'viewer';
    const userId = user.id;
    const businessAccountId = vendor.businessAccountId;

    const member = await prisma.$transaction(async (tx) => {
      const m = await tx.vendorTeamMember.create({
        data: {
          vendorId,
          userId,
          role: legacyEnum,
          roleId: role.id,
          invitedBy: ctx.userId,
        },
        include: teamMemberInclude,
      });

      await tx.businessAccountMember.upsert({
        where: { userId_businessAccountId: { userId, businessAccountId } },
        update: {},
        create: {
          userId,
          businessAccountId,
          isPrimary: false,
          invitedBy: ctx.userId,
          acceptedAt: new Date(),
        },
      });

      // UserRole row: account-wide (outletId = null) since the new team UI
      // doesn't yet assign per-outlet. Idempotent — skip if same row exists.
      const existingRole = await tx.userRole.findFirst({
        where: { userId, businessAccountId, outletId: null, roleId: role.id },
        select: { id: true },
      });
      if (!existingRole) {
        // Replace any prior vendor-scope role for this (user, account) so the
        // role change is reflected in the permission union, not added on top.
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
      }

      return m;
    });

    const dto = toTeamMemberDTO({
      id: member.id,
      createdAt: member.createdAt,
      legacyRole: member.role,
      isOwner: false,
      user: member.user,
      roleRef: member.roleRef,
    });

    return NextResponse.json({ success: true, data: dto }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
