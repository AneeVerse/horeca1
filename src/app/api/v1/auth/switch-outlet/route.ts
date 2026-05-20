/**
 * POST /api/v1/auth/switch-outlet
 *
 * Switch the active Outlet within the current BusinessAccount.
 * Client follows with `await update({ activeOutletId })` from useSession().
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { Errors, errorResponse } from '@/middleware/errorHandler';

const Body = z.object({ outletId: z.string().uuid() });

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    if (!ctx.activeBusinessAccountId) throw Errors.forbidden('No active business account on the session');
    const { outletId } = Body.parse(await req.json().catch(() => ({})));

    const outlet = await prisma.outlet.findFirst({
      where: { id: outletId, businessAccountId: ctx.activeBusinessAccountId },
      select: { id: true, requiresAddressUpdate: true },
    });
    if (!outlet) throw Errors.badRequest('Outlet does not belong to the active account');

    return NextResponse.json({
      success: true,
      data: { outletId: outlet.id, requiresAddressUpdate: outlet.requiresAddressUpdate },
    });
  } catch (err) {
    return errorResponse(err);
  }
});
