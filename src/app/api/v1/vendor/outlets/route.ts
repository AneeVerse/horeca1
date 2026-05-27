// GET /api/v1/vendor/outlets — list outlets for the vendor's business account

import { NextRequest, NextResponse } from 'next/server';
import { vendorOnly } from '@/middleware/rbac';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/middleware/errorHandler';
import type { AuthContext } from '@/middleware/auth';

export const GET = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        businessAccountId: true,
        businessName: true,
        businessAccount: { select: { displayName: true, legalName: true } },
      },
    });

    if (!vendor) return NextResponse.json({ success: true, data: { businessAccount: null, outlets: [] } });

    // If the caller is outlet-scoped (their UserRole has outletId set on at
    // least one row), only return the outlets they can actually access.
    // Account-wide members (accessibleOutletIds is empty) see everything.
    const outlets = await prisma.outlet.findMany({
      where: {
        businessAccountId: vendor.businessAccountId,
        isActive: true,
        ...(ctx.accessibleOutletIds.length > 0
          ? { id: { in: ctx.accessibleOutletIds } }
          : {}),
      },
      select: { id: true, name: true, code: true, addressLine: true, city: true, pincode: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        businessAccount: {
          id: vendor.businessAccountId,
          name: vendor.businessAccount.displayName ?? vendor.businessAccount.legalName ?? vendor.businessName,
        },
        outlets,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
