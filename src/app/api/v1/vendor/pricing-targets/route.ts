// GET /api/v1/vendor/pricing-targets — the customers and customer outlets
// this vendor can target in price-list assignments.
//
// Customers come from TWO sources: buyers who have actually ordered from
// this vendor, plus CRM-mapped VendorCustomer rows (which may include
// customers onboarded before their first order). Outlets are the outlets
// of those customers' business accounts — NOT the vendor's own outlets:
// the pricing resolver matches PriceListAssignment.outletId against the
// BUYER's active outlet, so vendor outlets would never match.
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);

    const [orderBuyers, crmCustomers] = await Promise.all([
      prisma.order.findMany({
        where: { vendorId },
        select: {
          businessAccountId: true,
          userId: true,
          user: { select: { fullName: true, businessName: true, email: true } },
        },
        distinct: ['userId'],
      }),
      prisma.vendorCustomer.findMany({
        where: { vendorId },
        select: {
          userId: true,
          user: {
            select: {
              fullName: true,
              businessName: true,
              email: true,
              userRoles: { select: { businessAccountId: true } },
            },
          },
        },
      }),
    ]);

    const label = (u: { fullName: string | null; businessName: string | null; email: string | null }, id: string) =>
      u.businessName ?? u.fullName ?? u.email ?? id;

    const customers = new Map<string, { userId: string; label: string }>();
    const accountIds = new Set<string>();

    for (const o of orderBuyers) {
      customers.set(o.userId, { userId: o.userId, label: label(o.user, o.userId) });
      accountIds.add(o.businessAccountId);
    }
    for (const c of crmCustomers) {
      if (!customers.has(c.userId)) {
        customers.set(c.userId, { userId: c.userId, label: label(c.user, c.userId) });
      }
      for (const r of c.user.userRoles) accountIds.add(r.businessAccountId);
    }

    const outlets = accountIds.size
      ? await prisma.outlet.findMany({
          where: { businessAccountId: { in: [...accountIds] }, isActive: true },
          select: {
            id: true,
            name: true,
            city: true,
            pincode: true,
            businessAccount: { select: { displayName: true, legalName: true } },
          },
          orderBy: { name: 'asc' },
        })
      : [];

    return NextResponse.json({
      success: true,
      data: {
        customers: [...customers.values()].sort((a, b) => a.label.localeCompare(b.label)),
        outlets: outlets.map((o) => ({
          id: o.id,
          name: o.name,
          city: o.city,
          pincode: o.pincode,
          businessName: o.businessAccount.displayName ?? o.businessAccount.legalName,
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
