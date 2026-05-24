// GET  /api/v1/brand/team — list brand team members (with assigned Role)
// POST /api/v1/brand/team — invite a user to the brand team

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { brandOnly } from '@/middleware/rbac';
import { resolveBrandContext } from '@/lib/resolveBrandId';
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

const BRAND_ROLE_TO_ENUM: Record<string, TeamRole> = {
  'Brand Admin': 'owner',
  'Brand Manager': 'manager',
  'Brand Editor': 'editor',
  'Brand Viewer': 'viewer',
};

export const GET = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { brandId } = await resolveBrandContext(ctx, req);

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { userId: true, user: { select: { id: true, fullName: true, email: true, phone: true, hcidDisplay: true, isActive: true, createdAt: true } } },
    });
    if (!brand) throw Errors.notFound('Brand not found');

    const members = await prisma.brandTeamMember.findMany({
      where: { brandId },
      orderBy: { createdAt: 'asc' },
      include: teamMemberInclude,
    });

    const owner: TeamMemberDTO = toTeamMemberDTO({
      id: `owner-${brand.user.id}`,
      createdAt: brand.user.createdAt,
      legacyRole: 'owner',
      isOwner: true,
      user: brand.user,
      roleRef: null,
    });
    const adminTemplate = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, isTemplate: true, scope: 'brand', name: 'Brand Admin' },
      select: { id: true, name: true, scope: true, description: true },
    });
    if (adminTemplate) {
      owner.role = { id: adminTemplate.id, name: adminTemplate.name, scope: 'brand', description: adminTemplate.description };
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

export const POST = brandOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { brandId } = await resolveBrandContext(ctx, req);
    requirePermission(ctx, 'users.create');

    const body = await req.json();
    const input = inviteSchema.parse(body);

    const role = await prisma.accountRole.findUnique({
      where: { id: input.roleId },
      select: { id: true, name: true, scope: true, description: true },
    });
    if (!role || role.scope !== 'brand') {
      throw Errors.badRequest('roleId must reference a brand-scope role');
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { businessAccountId: true },
    });
    if (!brand) throw Errors.notFound('Brand not found');

    const identifierTrim = input.identifier.trim();
    const looksEmail = identifierTrim.includes('@');
    let user = looksEmail
      ? await prisma.user.findUnique({ where: { email: identifierTrim.toLowerCase() } })
      : await prisma.user.findUnique({ where: { phone: identifierTrim.replace(/\D/g, '') } });

    if (!user) {
      if (!looksEmail) throw Errors.badRequest('New brand invites require an email identifier');
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
          role: 'brand',
          isActive: true,
          hcidDisplay,
        },
      });
    }

    const existingMember = await prisma.brandTeamMember.findUnique({
      where: { brandId_userId: { brandId, userId: user.id } },
      select: { id: true },
    });
    if (existingMember) {
      throw Errors.conflict('User is already on this brand team — update their role instead');
    }

    const legacyEnum: TeamRole = BRAND_ROLE_TO_ENUM[role.name] ?? 'viewer';
    const userId = user.id;
    const businessAccountId = brand.businessAccountId;

    const member = await prisma.$transaction(async (tx) => {
      const m = await tx.brandTeamMember.create({
        data: {
          brandId,
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

      const existingRole = await tx.userRole.findFirst({
        where: { userId, businessAccountId, outletId: null, roleId: role.id },
        select: { id: true },
      });
      if (!existingRole) {
        await tx.userRole.deleteMany({
          where: {
            userId,
            businessAccountId,
            outletId: null,
            role: { scope: 'brand' },
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
