/**
 * GET  /api/v1/account/[id]/outlets — list outlets in the account
 * POST /api/v1/account/[id]/outlets — create a new outlet (requires outlets.create)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/middleware/errorHandler';
import { assertAccountMember, assertAccountPermission } from '@/lib/accountAccess';

export const GET = withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = extractAccountId(req);
    await assertAccountMember(ctx.userId, id);
    const outlets = await prisma.outlet.findMany({
      where: { businessAccountId: id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ success: true, data: outlets });
  } catch (err) { return errorResponse(err); }
});

const CreateBody = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).nullable().optional(),
  addressLine: z.string().min(1),
  flatInfo: z.string().max(255).nullable().optional(),
  landmark: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  pincode: z.string().max(10).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  placeId: z.string().max(500).nullable().optional(),
});

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = extractAccountId(req);
    await assertAccountPermission(ctx.userId, id, 'outlets.create');
    const body = CreateBody.parse(await req.json());
    // "Address complete" = has a valid 6-digit pincode. Pincode is what serviceability
    // and checkout actually use; lat/lng is nice-to-have. Without this rule, every new
    // outlet would be permanently flagged "Address needed" because we have no geocoder yet.
    const hasUsablePincode = !!body.pincode && /^\d{6}$/.test(body.pincode);

    const result = await prisma.$transaction(async (tx) => {
      const outlet = await tx.outlet.create({
        data: {
          businessAccountId: id,
          ...body,
          requiresAddressUpdate: !hasUsablePincode,
        },
      });

      // Create a corresponding SavedAddress for this user linked to the new outlet
      await tx.savedAddress.create({
        data: {
          userId: ctx.userId,
          outletId: outlet.id,
          label: body.name || 'Branch Outlet',
          businessName: body.name,
          fullAddress: body.addressLine,
          shortAddress: body.addressLine.split(',').slice(0, 2).join(', '),
          flatInfo: body.flatInfo,
          landmark: body.landmark,
          pincode: body.pincode,
          city: body.city,
          state: body.state,
          latitude: body.latitude ?? 0,
          longitude: body.longitude ?? 0,
          placeId: body.placeId,
          isDefault: false,
        },
      });

      return outlet;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) { return errorResponse(err); }
});

function extractAccountId(req: NextRequest): string {
  // /api/v1/account/<id>/outlets
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 2];
}
