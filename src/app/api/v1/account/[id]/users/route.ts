/**
 * GET  /api/v1/account/[id]/users — list members + their role assignments
 * POST /api/v1/account/[id]/users — invite a user to the account by email/phone with a role
 *                                   (requires users.create)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { assertAccountMember, assertAccountPermission } from '@/lib/accountAccess';
import { uniqueHcid } from '@/lib/hcid';
import { sendEmail } from '@/lib/providers/email';
import { buildInviteEmail } from '@/lib/email-templates/invite';

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
            id: true, fullName: true, email: true, phone: true, image: true, hcidDisplay: true, isActive: true,
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
  fullName: z.string().min(2).max(100).optional(),
  password: z.string().min(6).max(72).optional(),
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

    // Look up (or create) the invitee user.
    // - email identifier + user missing  → admin must supply fullName + password → create User inline
    // - email identifier + user exists   → use existing; if body.password is set, also reset their password
    // - phone identifier + user missing  → reject (we only support new-user invites by email today)
    const looksEmail = body.identifier.includes('@');
    const phoneRaw = body.identifier.replace(/\D/g, '');
    const phoneDigits = phoneRaw.length === 12 ? phoneRaw.replace(/^91/, '') : phoneRaw;
    const normalizedEmail = looksEmail ? body.identifier.toLowerCase() : null;

    let invitee: { id: string; email: string | null; fullName: string } | null = null;
    let tempPassword: string | null = null;

    if (looksEmail && normalizedEmail) {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, fullName: true },
      });
      if (existing) {
        invitee = existing;
        // Admin opted to reset the invitee's password during the invite flow.
        if (body.password) {
          const hashed = await bcrypt.hash(body.password, 12);
          await prisma.user.update({ where: { id: existing.id }, data: { password: hashed } });
          tempPassword = body.password;
        }
      } else {
        if (!body.fullName || !body.password) {
          throw Errors.badRequest('fullName and password are required when inviting a new user by email');
        }
        const hashed = await bcrypt.hash(body.password, 12);
        const hcidDisplay = await uniqueHcid();
        const created = await prisma.user.create({
          data: {
            fullName: body.fullName,
            email: normalizedEmail,
            password: hashed,
            role: 'customer',
            isActive: true,
            hcidDisplay,
          },
          select: { id: true, email: true, fullName: true },
        });
        invitee = created;
        tempPassword = body.password;
      }
    } else if (phoneDigits.length === 10) {
      const existing = await prisma.user.findUnique({
        where: { phone: phoneDigits },
        select: { id: true, email: true, fullName: true },
      });
      if (!existing) {
        throw Errors.notFound('Phone-based invites require the user to already have an account. Use an email to invite a new user.');
      }
      invitee = existing;
    } else {
      throw Errors.badRequest('Enter a valid email address or 10-digit phone number');
    }

    if (!invitee) throw Errors.notFound('Could not resolve invitee');
    const inviteeUser = invitee; // tight non-null reference for the tx closure

    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.businessAccountMember.upsert({
        where: { userId_businessAccountId: { userId: inviteeUser.id, businessAccountId: id } },
        update: {},
        create: {
          userId: inviteeUser.id,
          businessAccountId: id,
          isPrimary: false,
          invitedBy: ctx.userId,
          acceptedAt: new Date(),
        },
      });
      const existing = await tx.userRole.findFirst({
        where: { userId: inviteeUser.id, businessAccountId: id, outletId: body.outletId ?? null, roleId: body.roleId },
        select: { id: true },
      });
      const assignment = existing ?? await tx.userRole.create({
        data: { userId: inviteeUser.id, businessAccountId: id, outletId: body.outletId ?? null, roleId: body.roleId },
      });
      return { membership, assignment };
    });

    // Fire-and-forget invite email. Never let a mail-send failure roll back the user creation.
    if (tempPassword && inviteeUser.email) {
      try {
        const [account, inviter] = await Promise.all([
          prisma.businessAccount.findUnique({ where: { id }, select: { legalName: true, displayName: true } }),
          prisma.user.findUnique({ where: { id: ctx.userId }, select: { fullName: true } }),
        ]);
        const businessName = account?.displayName || account?.legalName || 'your business';
        const loginUrl = (process.env.AUTH_URL ?? 'http://localhost:3000') + '/login';
        const { subject, text, html } = buildInviteEmail({
          recipientName: inviteeUser.fullName,
          recipientEmail: inviteeUser.email,
          tempPassword,
          scope: 'customer',
          businessName,
          loginUrl,
          inviterName: inviter?.fullName?.trim() || undefined,
        });
        await sendEmail({ to: inviteeUser.email, subject, text, html, name: inviteeUser.fullName });
      } catch (err) {
        console.error('[invite-email]', err);
      }
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) { return errorResponse(err); }
});

function extractAccountId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 2];
}
