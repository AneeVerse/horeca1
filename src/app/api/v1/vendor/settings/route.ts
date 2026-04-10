// GET   /api/v1/vendor/settings — Get vendor profile with service areas and delivery slots
// PATCH /api/v1/vendor/settings — Update vendor profile fields
// WHY: Vendors need to view and manage their business profile, including
//      service areas, delivery slots, minimum order values, and credit settings
// PROTECTED: Vendor only (vendors + admins)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId, resolveVendorContext } from '@/lib/resolveVendorId';
import { requireVendorPerm } from '@/lib/teamPermissions';

// Validation schema for profile updates — whitelist of allowed fields
const updateSettingsSchema = z.object({
  businessName: z.string().min(1).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  minOrderValue: z.number().min(0).optional(),
  creditEnabled: z.boolean().optional(),
});

// GET — full vendor profile with service areas, delivery slots, and account info
export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);

    const profile = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        serviceAreas: {
          select: { id: true, pincode: true, isActive: true },
        },
        deliverySlots: {
          select: {
            id: true,
            dayOfWeek: true,
            slotStart: true,
            slotEnd: true,
            cutoffTime: true,
            isActive: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
        user: {
          select: { email: true, phone: true, fullName: true },
        },
      },
    });

    if (!profile) throw Errors.notFound('Vendor');

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    return errorResponse(error);
  }
});

// PATCH — update whitelisted vendor profile fields
export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId, teamRole } = await resolveVendorContext(ctx, req);
    requireVendorPerm(teamRole, 'settings:write');

    const body = await req.json();
    const allowedFields = updateSettingsSchema.parse(body);

    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: allowedFields,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
