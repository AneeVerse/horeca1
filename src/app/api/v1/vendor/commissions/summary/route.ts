/**
 * GET /api/v1/vendor/commissions/summary    — totals per salesperson per period
 *
 * Driven by Postgres GROUP BY (see commission.service.summarize). The
 * dashboard widget on the vendor's Sales Team page pulls this.
 */

import { NextRequest, NextResponse } from 'next/server';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { summarize } from '@/modules/commission/commission.service';

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'commissions.view');
    const vendorId = await resolveVendorId(ctx, req);
    const period = req.nextUrl.searchParams.get('period') ?? undefined;
    const salespersonId = req.nextUrl.searchParams.get('salespersonId') ?? undefined;

    const rows = await summarize({ vendorId, period, salespersonId });
    return NextResponse.json({ success: true, data: rows });
  } catch (err) { return errorResponse(err); }
});
