/**
 * GET /api/v1/admin/salespersons    — list salespersons across ALL vendors
 *
 * Used by the admin customers page to power the "filter by salesperson"
 * dropdown. Admin-only — vendor-side endpoints already exist at
 * /api/v1/vendor/salespersons for per-vendor scope.
 *
 * Filters:
 *   ?vendorId=UUID         — narrow to one vendor's reps
 *   ?includeInactive=true  — include soft-deleted reps for historical reports
 *   ?q=text                — fuzzy match on name / code / phone / email
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/middleware/rbac';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';

export const GET = adminOnly(async (req: NextRequest, ctx) => {
  try {
    // Admin views customer-team perms (users.view) cover this — a salesperson
    // list is part of customer triage. Don't introduce a new admin perm key
    // for a read-only listing.
    requirePermission(ctx, 'users.view');

    const { searchParams } = req.nextUrl;
    const vendorId = searchParams.get('vendorId') ?? undefined;
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const q = searchParams.get('q')?.trim() ?? '';

    const rows = await prisma.salesperson.findMany({
      where: {
        ...(vendorId ? { vendorId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true, name: true, code: true, phone: true, email: true,
        isActive: true, vendorId: true,
        vendor: { select: { id: true, businessName: true } },
        _count: { select: { vendorCustomers: true, orders: true, accruals: true } },
      },
      take: 500,
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (err) { return errorResponse(err); }
});
