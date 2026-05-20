/**
 * GET    /api/v1/account/[id] — read account details (any member)
 * PATCH  /api/v1/account/[id] — update account metadata (requires settings.edit)
 * DELETE /api/v1/account/[id] — soft-deactivate account (requires settings.edit + must be owner)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { assertAccountMember, assertAccountPermission } from '@/lib/accountAccess';

export const GET = withAuth(async (_req: NextRequest, ctx) => {
  try {
    const id = extractId(_req);
    await assertAccountMember(ctx.userId, id);
    const account = await prisma.businessAccount.findUnique({
      where: { id },
      select: {
        id: true, legalName: true, displayName: true, gstin: true, pan: true,
        businessType: true, isCustomer: true, isVendor: true, isBrand: true, status: true,
        primaryOutletId: true, createdAt: true, updatedAt: true,
        outlets: {
          select: { id: true, name: true, code: true, addressLine: true, city: true, state: true, pincode: true, isActive: true, requiresAddressUpdate: true },
        },
        _count: { select: { members: true, roles: true } },
      },
    });
    if (!account) throw Errors.notFound('Business account');
    return NextResponse.json({ success: true, data: account });
  } catch (err) { return errorResponse(err); }
});

const PatchBody = z.object({
  legalName: z.string().min(2).max(255).optional(),
  displayName: z.string().max(255).nullable().optional(),
  gstin: z.string().max(20).nullable().optional(),
  pan: z.string().max(20).nullable().optional(),
  businessType: z.string().max(50).nullable().optional(),
  primaryOutletId: z.string().uuid().nullable().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = extractId(req);
    await assertAccountPermission(ctx.userId, id, 'settings.edit');
    const body = PatchBody.parse(await req.json());

    // If changing primaryOutletId, verify it belongs to this account.
    if (body.primaryOutletId) {
      const ok = await prisma.outlet.findFirst({
        where: { id: body.primaryOutletId, businessAccountId: id },
        select: { id: true },
      });
      if (!ok) throw Errors.badRequest('primaryOutletId must reference an outlet of this account');
    }
    const updated = await prisma.businessAccount.update({ where: { id }, data: body });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) { return errorResponse(err); }
});

export const DELETE = withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = extractId(req);
    await assertAccountPermission(ctx.userId, id, 'settings.edit');
    await prisma.businessAccount.update({ where: { id }, data: { status: 'deactivated' } });
    return NextResponse.json({ success: true });
  } catch (err) { return errorResponse(err); }
});

function extractId(req: NextRequest): string {
  // /api/v1/account/<id>
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 1];
}
