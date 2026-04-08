// POST   /api/v1/vendor/settings/service-areas — Add a service area
// PATCH  /api/v1/vendor/settings/service-areas — Update a service area
// DELETE /api/v1/vendor/settings/service-areas — Remove a service area

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';

const addSchema = z.object({
  pincode: z.string().min(4).max(10),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

// POST — add new service area pincode
export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const body = await req.json();
    const { pincode } = addSchema.parse(body);

    // Check for duplicate
    const existing = await prisma.serviceArea.findUnique({
      where: { vendorId_pincode: { vendorId, pincode } },
    });
    if (existing) throw Errors.conflict('Service area with this pincode already exists');

    const area = await prisma.serviceArea.create({
      data: { vendorId, pincode, isActive: true },
      select: { id: true, pincode: true, isActive: true },
    });

    return NextResponse.json({ success: true, data: area }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — toggle active/inactive
export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const body = await req.json();
    const { id, isActive } = updateSchema.parse(body);

    // Verify ownership
    const area = await prisma.serviceArea.findFirst({
      where: { id, vendorId },
    });
    if (!area) throw Errors.notFound('Service area');

    const updated = await prisma.serviceArea.update({
      where: { id },
      data: { isActive },
      select: { id: true, pincode: true, isActive: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

// DELETE — remove service area
export const DELETE = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const body = await req.json();
    const { id } = deleteSchema.parse(body);

    // Verify ownership
    const area = await prisma.serviceArea.findFirst({
      where: { id, vendorId },
    });
    if (!area) throw Errors.notFound('Service area');

    await prisma.serviceArea.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
