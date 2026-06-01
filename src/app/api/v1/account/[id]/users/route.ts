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
    // A BusinessAccount can have isCustomer=true AND isVendor=true simultaneously
    // (V2.2 HCID model). In that case a single User on the account may hold both
    // 'account' (customer-side) UserRoles AND 'vendor' UserRoles. The customer
    // team page must surface ONLY the account-scope roles — otherwise vendor-
    // team and customer-team data leak into each other. The vendor team page
    // uses VendorTeamMember which is a different table and already isolated.
    const members = await prisma.businessAccountMember.findMany({
      where: { businessAccountId: id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true, isPrimary: true, acceptedAt: true, createdAt: true,
        user: {
          select: {
            id: true, fullName: true, email: true, phone: true, image: true, hcidDisplay: true, isActive: true,
            userRoles: {
              where: { businessAccountId: id, role: { scope: 'account' } },
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
  // Either pick an existing role (roleId) OR send a custom permissions
  // matrix and we create an inline scope='account' AccountRole for it.
  roleId: z.string().uuid().optional(),
  permissions: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  outletId: z.string().uuid().nullable().optional(),
  fullName: z.string().min(2).max(100).optional(),
  password: z.string().min(6).max(72).optional(),
}).refine((d) => d.roleId || d.permissions, { message: 'Either roleId or permissions is required' });

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = extractAccountId(req);
    await assertAccountPermission(ctx.userId, id, 'users.create');
    const body = InviteBody.parse(await req.json());

    // Resolve the role for this membership.
    //   • permissions object supplied → create a new scope='account' custom role
    //     scoped to THIS business account. Filtered to account-scope modules
    //     by the client; we still re-sanitize on the server.
    //   • else → require an existing roleId that belongs to the account or is
    //     a template.
    let roleIdToUse: string;
    if (body.permissions && Object.keys(body.permissions).length > 0) {
      const ALLOWED_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'];
      const sanitized: Record<string, Record<string, boolean>> = {};
      for (const [mod, actions] of Object.entries(body.permissions)) {
        sanitized[mod] = {};
        for (const [a, v] of Object.entries(actions)) {
          if (ALLOWED_ACTIONS.includes(a) && typeof v === 'boolean' && v) sanitized[mod][a] = true;
        }
      }
      const customRole = await prisma.accountRole.create({
        data: {
          businessAccountId: id,
          name: `Custom-${Date.now().toString(36)}`,
          scope: 'account',
          permissions: sanitized,
          isTemplate: false,
          createdBy: ctx.userId,
        },
        select: { id: true },
      });
      roleIdToUse = customRole.id;
    } else {
      const role = await prisma.accountRole.findFirst({
        where: { id: body.roleId!, scope: 'account', OR: [{ businessAccountId: id }, { isTemplate: true }] },
        select: { id: true },
      });
      if (!role) throw Errors.badRequest('Role not available for this account');
      roleIdToUse = role.id;
    }

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
        where: { userId: inviteeUser.id, businessAccountId: id, outletId: body.outletId ?? null, roleId: roleIdToUse },
        select: { id: true },
      });
      const assignment = existing ?? await tx.userRole.create({
        data: { userId: inviteeUser.id, businessAccountId: id, outletId: body.outletId ?? null, roleId: roleIdToUse },
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
