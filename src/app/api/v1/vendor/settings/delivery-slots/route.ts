// POST   /api/v1/vendor/settings/delivery-slots — Add a delivery slot
// PATCH  /api/v1/vendor/settings/delivery-slots — Update a delivery slot
// DELETE /api/v1/vendor/settings/delivery-slots — Remove a delivery slot

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requireVendorPerm } from '@/lib/teamPermissions';

const timeRegex = /^\d{2}:\d{2}$/;

const addSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  slotStart: z.string().regex(timeRegex, 'Format: HH:MM'),
  slotEnd: z.string().regex(timeRegex, 'Format: HH:MM'),
  cutoffTime: z.string().regex(timeRegex, 'Format: HH:MM'),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  slotStart: z.string().regex(timeRegex, 'Format: HH:MM').optional(),
  slotEnd: z.string().regex(timeRegex, 'Format: HH:MM').optional(),
  cutoffTime: z.string().regex(timeRegex, 'Format: HH:MM').optional(),
  isActive: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

// POST — add new delivery slot
export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId, teamRole } = await resolveVendorContext(ctx, req);
    requireVendorPerm(teamRole, 'settings:write');
    const body = await req.json();
    const data = addSchema.parse(body);

    const existing = await prisma.deliverySlot.findUnique({
      where: { vendorId_dayOfWeek_slotStart: { vendorId, dayOfWeek: data.dayOfWeek, slotStart: data.slotStart } },
    });
    if (existing) throw Errors.conflict('A slot for this day and start time already exists');

    const slot = await prisma.deliverySlot.create({
      data: { vendorId, ...data, isActive: true },
      select: { id: true, dayOfWeek: true, slotStart: true, slotEnd: true, cutoffTime: true, isActive: true },
    });

    return NextResponse.json({ success: true, data: slot }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — update delivery slot fields
export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId, teamRole } = await resolveVendorContext(ctx, req);
    requireVendorPerm(teamRole, 'settings:write');
    const body = await req.json();
    const { id, ...fields } = updateSchema.parse(body);

    const slot = await prisma.deliverySlot.findFirst({ where: { id, vendorId } });
    if (!slot) throw Errors.notFound('Delivery slot');

    const updated = await prisma.deliverySlot.update({
      where: { id },
      data: fields,
      select: { id: true, dayOfWeek: true, slotStart: true, slotEnd: true, cutoffTime: true, isActive: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

// DELETE — remove delivery slot
export const DELETE = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId, teamRole } = await resolveVendorContext(ctx, req);
    requireVendorPerm(teamRole, 'settings:write');
    const body = await req.json();
    const { id } = deleteSchema.parse(body);

    const slot = await prisma.deliverySlot.findFirst({ where: { id, vendorId } });
    if (!slot) throw Errors.notFound('Delivery slot');

    const orderCount = await prisma.order.count({ where: { deliverySlotId: id } });
    if (orderCount > 0) {
      throw Errors.conflict('Cannot delete slot — it is referenced by existing orders. Deactivate it instead.');
    }

    await prisma.deliverySlot.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
