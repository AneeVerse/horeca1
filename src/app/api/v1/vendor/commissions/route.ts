/**
 * GET /api/v1/vendor/commissions    — list accruals for the vendor.
 *   Filters: period (YYYY-MM), salespersonId, status, customerId.
 *
 * Used by the Commissions tab on the vendor portal's Sales Team page.
 * Multi-tenant via the vendorId scope; no row from another vendor's
 * accrual table will leak through even with a forged filter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

const StatusEnum = z.enum(['pending', 'approved', 'paid', 'cancelled']);

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'commissions.view');
    const vendorId = await resolveVendorId(ctx, req);

    const { searchParams } = req.nextUrl;
    const period = searchParams.get('period') ?? undefined;
    const salespersonId = searchParams.get('salespersonId') ?? undefined;
    const customerId = searchParams.get('customerId') ?? undefined;
    const statusRaw = searchParams.get('status');
    const status = statusRaw ? StatusEnum.parse(statusRaw) : undefined;
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '100'), 1), 500);

    const rows = await prisma.commissionAccrual.findMany({
      where: {
        vendorId,
        ...(period ? { period } : {}),
        ...(salespersonId ? { salespersonId } : {}),
        ...(status ? { status } : {}),
        ...(customerId ? { order: { userId: customerId } } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        salesperson: { select: { id: true, name: true } },
        order: {
          select: {
            id: true, orderNumber: true, totalAmount: true,
            createdAt: true, deliveredAt: true, status: true,
            user: { select: { id: true, fullName: true, businessName: true } },
          },
        },
        approver: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (err) { return errorResponse(err); }
});
