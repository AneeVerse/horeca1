/**
 * GET  /api/v1/account              — list every BusinessAccount the caller belongs to
 * POST /api/v1/account              — create a new BusinessAccount + primary Outlet + owner role
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, Errors } from '@/middleware/errorHandler';

export const GET = withAuth(async (_req: NextRequest, ctx) => {
  try {
    const memberships = await prisma.businessAccountMember.findMany({
      where: { userId: ctx.userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: {
        isPrimary: true,
        createdAt: true,
        businessAccount: {
          select: {
            id: true, legalName: true, displayName: true, gstin: true, businessType: true,
            isCustomer: true, isVendor: true, isBrand: true, status: true,
            primaryOutletId: true,
            outlets: { select: { id: true, name: true, pincode: true, requiresAddressUpdate: true } },
          },
        },
      },
    });
    return NextResponse.json({
      success: true,
      data: memberships.map((m) => ({
        ...m.businessAccount,
        isPrimary: m.isPrimary,
        joinedAt: m.createdAt,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
});

const CreateBody = z.object({
  legalName: z.string().min(2).max(255),
  displayName: z.string().max(255).optional(),
  gstin: z.string().max(20).optional(),
  pan: z.string().max(20).optional(),
  businessType: z.string().max(50).optional(),
  isCustomer: z.boolean().optional().default(true),
  isVendor: z.boolean().optional().default(false),
  isBrand: z.boolean().optional().default(false),
  primaryOutlet: z.object({
    name: z.string().min(1).max(255),
    addressLine: z.string().min(1),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    placeId: z.string().optional(),
  }),
});

export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = CreateBody.parse(await req.json());

    // The creator becomes the Owner of the new account.
    const ownerTemplate = await prisma.accountRole.findFirst({
      where: { businessAccountId: null, isTemplate: true, name: 'Owner', scope: 'account' },
      select: { id: true },
    });
    if (!ownerTemplate) throw Errors.badRequest('Owner role template missing. Run data backfill first.');

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.businessAccount.create({
        data: {
          legalName: body.legalName,
          displayName: body.displayName,
          gstin: body.gstin,
          pan: body.pan,
          businessType: body.businessType,
          isCustomer: body.isCustomer,
          isVendor: body.isVendor,
          isBrand: body.isBrand,
        },
      });
      const outlet = await tx.outlet.create({
        data: {
          businessAccountId: account.id,
          name: body.primaryOutlet.name,
          addressLine: body.primaryOutlet.addressLine,
          city: body.primaryOutlet.city,
          state: body.primaryOutlet.state,
          pincode: body.primaryOutlet.pincode,
          latitude: body.primaryOutlet.latitude,
          longitude: body.primaryOutlet.longitude,
          placeId: body.primaryOutlet.placeId,
          requiresAddressUpdate: !(body.primaryOutlet.latitude && body.primaryOutlet.longitude),
        },
      });
      await tx.businessAccount.update({ where: { id: account.id }, data: { primaryOutletId: outlet.id } });
      await tx.businessAccountMember.create({
        data: { userId: ctx.userId, businessAccountId: account.id, isPrimary: false, acceptedAt: new Date() },
      });
      await tx.userRole.create({
        data: { userId: ctx.userId, businessAccountId: account.id, outletId: null, roleId: ownerTemplate.id },
      });
      return { account, outlet };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
});
