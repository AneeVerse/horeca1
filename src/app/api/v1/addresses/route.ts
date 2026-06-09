// GET  /api/v1/addresses — list saved addresses for session user
// POST /api/v1/addresses — save a new address

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole } from '@/middleware/rbac';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/middleware/errorHandler';

const createSchema = z.object({
  label: z.string().min(1).max(50).default('Other'),
  businessName: z.string().max(255).optional(),
  fullAddress: z.string().min(1),
  shortAddress: z.string().max(255).optional(),
  flatInfo: z.string().max(255).optional(),
  landmark: z.string().max(255).optional(),
  pincode: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  latitude: z.number(),
  longitude: z.number(),
  placeId: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
});

// Allow all authenticated roles — customers, vendors, brands (not admin-only)
const ALL_ROLES = ['customer', 'vendor', 'brand', 'admin'] as const;

export const GET = withRole([...ALL_ROLES], async (req: NextRequest, ctx) => {
  try {
    if (ctx.activeBusinessAccountId) {
      const activeAccount = await prisma.businessAccount.findUnique({
        where: { id: ctx.activeBusinessAccountId },
        select: { primaryOutletId: true },
      });
      const outlets = await prisma.outlet.findMany({
        where: { businessAccountId: ctx.activeBusinessAccountId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      const addresses = outlets.map((o) => ({
        id: o.id,
        label: o.name,
        businessName: o.name,
        fullAddress: o.addressLine,
        shortAddress: o.addressLine.split(',').slice(0, 2).join(', '),
        flatInfo: o.flatInfo || undefined,
        landmark: o.landmark || undefined,
        pincode: o.pincode || undefined,
        city: o.city || undefined,
        state: o.state || undefined,
        latitude: o.latitude ?? 0,
        longitude: o.longitude ?? 0,
        placeId: o.placeId || undefined,
        isDefault: o.id === activeAccount?.primaryOutletId,
      }));
      return NextResponse.json({ success: true, data: addresses });
    }

    const addresses = await prisma.savedAddress.findMany({
      where: { userId: ctx.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = withRole([...ALL_ROLES], async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const input = createSchema.parse(body);

    const address = await prisma.$transaction(async (tx) => {
      let outletId: string | undefined;

      if (ctx.activeBusinessAccountId) {
        const hasUsablePincode = !!input.pincode && /^\d{6}$/.test(input.pincode);
        const outlet = await tx.outlet.create({
          data: {
            businessAccountId: ctx.activeBusinessAccountId,
            name: input.businessName || input.label || 'Branch Outlet',
            addressLine: input.fullAddress,
            flatInfo: input.flatInfo || null,
            landmark: input.landmark || null,
            city: input.city || null,
            state: input.state || null,
            pincode: input.pincode || null,
            latitude: input.latitude,
            longitude: input.longitude,
            placeId: input.placeId || null,
            requiresAddressUpdate: !hasUsablePincode,
          },
        });
        outletId = outlet.id;

        if (input.isDefault) {
          await tx.businessAccount.update({
            where: { id: ctx.activeBusinessAccountId },
            data: { primaryOutletId: outlet.id },
          });
        }
      }

      // Unset any existing default if this one is flagged as default
      if (input.isDefault) {
        await tx.savedAddress.updateMany({
          where: { userId: ctx.userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Sync pincode + businessName onto the User row if not yet set —
      // the profile-completion check reads from User, not SavedAddress
      const userPatch: Record<string, string> = {};
      if (input.pincode || input.businessName) {
        const current = await tx.user.findUnique({
          where: { id: ctx.userId },
          select: { pincode: true, businessName: true },
        });
        if (input.pincode && !current?.pincode) userPatch.pincode = input.pincode;
        if (input.businessName && !current?.businessName) userPatch.businessName = input.businessName;
        if (Object.keys(userPatch).length > 0) {
          await tx.user.update({ where: { id: ctx.userId }, data: userPatch });
        }
      }

      return tx.savedAddress.create({
        data: {
          userId: ctx.userId,
          outletId: outletId,
          label: input.label,
          businessName: input.businessName,
          fullAddress: input.fullAddress,
          shortAddress: input.shortAddress,
          flatInfo: input.flatInfo,
          landmark: input.landmark,
          pincode: input.pincode,
          city: input.city,
          state: input.state,
          latitude: input.latitude,
          longitude: input.longitude,
          placeId: input.placeId,
          isDefault: input.isDefault,
        },
      });
    });

    return NextResponse.json({ success: true, data: address }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
