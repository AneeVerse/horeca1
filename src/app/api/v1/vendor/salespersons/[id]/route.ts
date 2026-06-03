/**
 * GET    /api/v1/vendor/salespersons/[id]   — fetch a single salesperson
 * PATCH  /api/v1/vendor/salespersons/[id]   — update name/phone/email/code/isActive
 * DELETE /api/v1/vendor/salespersons/[id]   — soft-delete (isActive=false)
 *
 * Hard delete is intentionally NOT supported: a salesperson with even
 * one CommissionAccrual or assigned VendorCustomer must remain queryable
 * for historical reports. Soft-delete preserves all FKs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const PatchBody = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().regex(/^\d{10}$/).nullable().optional(),
  email: z.string().email().nullable().optional(),
  code: z.string().max(30).nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

function extractId(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return segs[segs.length - 1];
}

/** Ensure the salesperson row belongs to the resolved vendor — multi-tenancy guard. */
async function assertOwnership(salespersonId: string, vendorId: string) {
  const sp = await prisma.salesperson.findFirst({
    where: { id: salespersonId, vendorId },
    select: { id: true },
  });
  if (!sp) throw Errors.notFound('Salesperson');
  return sp;
}

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'salespersons.view');
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);
    await assertOwnership(id, vendorId);

    const sp = await prisma.salesperson.findUnique({
      where: { id },
      select: {
        id: true, name: true, phone: true, email: true, code: true,
        userId: true, isActive: true, createdAt: true, updatedAt: true,
        _count: { select: { vendorCustomers: true, orders: true, accruals: true, rules: true } },
      },
    });
    return NextResponse.json({ success: true, data: sp });
  } catch (err) { return errorResponse(err); }
});

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'salespersons.edit');
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);
    await assertOwnership(id, vendorId);
    const body = PatchBody.parse(await req.json());

    if (body.userId) {
      const u = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } });
      if (!u) throw Errors.badRequest('Linked user does not exist');
    }

    const updated = await prisma.salesperson.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
        ...(body.email !== undefined ? { email: body.email?.trim().toLowerCase() || null } : {}),
        ...(body.code !== undefined ? { code: body.code?.trim() || null } : {}),
        ...(body.userId !== undefined ? { userId: body.userId } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) { return errorResponse(err); }
});

export const DELETE = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'salespersons.delete');
    const vendorId = await resolveVendorId(ctx, req);
    const id = extractId(req);
    await assertOwnership(id, vendorId);

    // Soft delete: preserves rules + accruals + customer mappings. The
    // salesperson disappears from default lists but historical reports
    // still resolve their name via the FK. Reactivation flips isActive
    // back via PATCH.
    await prisma.salesperson.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) { return errorResponse(err); }
});
