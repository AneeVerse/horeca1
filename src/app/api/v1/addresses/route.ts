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
      // Unset any existing default if this one is flagged as default
      if (input.isDefault) {
        await tx.savedAddress.updateMany({
          where: { userId: ctx.userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.savedAddress.create({
        data: {
          userId: ctx.userId,
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
