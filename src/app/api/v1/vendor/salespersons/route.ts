/**
 * GET  /api/v1/vendor/salespersons              — list salespersons for the vendor
 * POST /api/v1/vendor/salespersons              — create a salesperson
 *
 * Multi-tenant: every read/write is scoped to the resolved vendorId so
 * one vendor cannot enumerate another's reps even with a forged id.
 * Permission gates layered on top of vendorOnly: salespersons.view / .create.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const CreateBody = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().regex(/^\d{10}$/).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  code: z.string().max(30).optional().or(z.literal('')),
  userId: z.string().uuid().optional(),
});

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'salespersons.view');
    const vendorId = await resolveVendorId(ctx, req);
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true';

    const rows = await prisma.salesperson.findMany({
      where: { vendorId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true, name: true, phone: true, email: true, code: true,
        userId: true, isActive: true, createdAt: true, updatedAt: true,
        _count: { select: { vendorCustomers: true, orders: true, accruals: true } },
      },
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (err) { return errorResponse(err); }
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'salespersons.create');
    const vendorId = await resolveVendorId(ctx, req);
    const body = CreateBody.parse(await req.json());

    // If a User is linked, sanity-check it exists. We deliberately do NOT
    // require the user to be a member of this vendor's BA — a salesperson
    // could be a contractor with their own HCID.
    if (body.userId) {
      const u = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } });
      if (!u) throw Errors.badRequest('Linked user does not exist');
    }

    const created = await prisma.salesperson.create({
      data: {
        vendorId,
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim().toLowerCase() || null,
        code: body.code?.trim() || null,
        userId: body.userId ?? null,
      },
      select: {
        id: true, name: true, phone: true, email: true, code: true,
        userId: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) { return errorResponse(err); }
});
