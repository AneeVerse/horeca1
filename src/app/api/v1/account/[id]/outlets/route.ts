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
  code: z.string().max(50).optional(),
  addressLine: z.string().min(1),
  flatInfo: z.string().max(255).optional(),
  landmark: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().max(500).optional(),
});

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = extractAccountId(req);
    await assertAccountPermission(ctx.userId, id, 'outlets.create');
    const body = CreateBody.parse(await req.json());
    const outlet = await prisma.outlet.create({
      data: {
        businessAccountId: id,
        ...body,
        requiresAddressUpdate: !(body.latitude && body.longitude),
      },
    });
    return NextResponse.json({ success: true, data: outlet }, { status: 201 });
  } catch (err) { return errorResponse(err); }
});

function extractAccountId(req: NextRequest): string {
  // /api/v1/account/<id>/outlets
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 2];
}
