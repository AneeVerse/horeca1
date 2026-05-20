/**
 * GET  /api/v1/account/[id]/users — list members + their role assignments
 * POST /api/v1/account/[id]/users — invite a user to the account by email/phone with a role
 *                                   (requires users.create)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { assertAccountMember, assertAccountPermission } from '@/lib/accountAccess';

export const GET = withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = extractAccountId(req);
    await assertAccountMember(ctx.userId, id);
    const members = await prisma.businessAccountMember.findMany({
      where: { businessAccountId: id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true, isPrimary: true, acceptedAt: true, createdAt: true,
        user: {
          select: {
            id: true, fullName: true, email: true, phone: true, image: true, hcidDisplay: true,
            userRoles: {
              where: { businessAccountId: id },
              select: { id: true, outletId: true, role: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    return NextResponse.json({ success: true, data: members });
  } catch (err) { return errorResponse(err); }
});

const InviteBody = z.object({
  identifier: z.string().min(3), // email or phone
  roleId: z.string().uuid(),
  outletId: z.string().uuid().nullable().optional(),
});

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = extractAccountId(req);
    await assertAccountPermission(ctx.userId, id, 'users.create');
    const body = InviteBody.parse(await req.json());

    // Validate role belongs to the account (template or custom)
    const role = await prisma.accountRole.findFirst({
      where: { id: body.roleId, OR: [{ businessAccountId: id }, { isTemplate: true }] },
      select: { id: true },
    });
    if (!role) throw Errors.badRequest('Role not available for this account');

    // Validate outlet belongs to the account if specified
    if (body.outletId) {
      const ok = await prisma.outlet.findFirst({ where: { id: body.outletId, businessAccountId: id }, select: { id: true } });
      if (!ok) throw Errors.badRequest('Outlet does not belong to this account');
    }

    // Find the invitee user (must already have an account; full invite-by-email flow is V2.3).
    const looksEmail = body.identifier.includes('@');
    const phoneDigits = body.identifier.replace(/\D/g, '').replace(/^91/, '');
    const invitee = looksEmail
      ? await prisma.user.findUnique({ where: { email: body.identifier.toLowerCase() }, select: { id: true } })
      : (phoneDigits.length === 10
          ? await prisma.user.findUnique({ where: { phone: phoneDigits }, select: { id: true } })
          : null);
    if (!invitee) throw Errors.notFound('User (invite-by-email registration is not yet supported; ask them to sign up first)');

    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.businessAccountMember.upsert({
        where: { userId_businessAccountId: { userId: invitee.id, businessAccountId: id } },
        update: {},
        create: {
          userId: invitee.id,
          businessAccountId: id,
          isPrimary: false,
          invitedBy: ctx.userId,
          acceptedAt: new Date(),
        },
      });
      const existing = await tx.userRole.findFirst({
        where: { userId: invitee.id, businessAccountId: id, outletId: body.outletId ?? null, roleId: body.roleId },
        select: { id: true },
      });
      const assignment = existing ?? await tx.userRole.create({
        data: { userId: invitee.id, businessAccountId: id, outletId: body.outletId ?? null, roleId: body.roleId },
      });
      return { membership, assignment };
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) { return errorResponse(err); }
});

function extractAccountId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 2];
}
