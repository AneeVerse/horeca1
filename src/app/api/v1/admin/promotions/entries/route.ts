// GET /api/v1/admin/promotions/entries — Cashback entries (UPI payout queue + history)
// WHY: UPI cashbacks are paid out manually in Phase 1 — ops filters
//      status=approved&destination=upi, transfers, then marks each paid.
// PROTECTED: Admin only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { listEntriesQuerySchema } from '@/modules/promotion/promotion.validator';

export const GET = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'promotions.view');
    const query = listEntriesQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const entries = await prisma.cashbackEntry.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.destination ? { destination: query.destination } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
      },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, businessName: true } },
        campaign: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > query.limit;
    if (hasMore) entries.pop();

    return NextResponse.json({
      success: true,
      data: {
        entries,
        pagination: { next_cursor: hasMore ? entries[entries.length - 1]?.id : null, has_more: hasMore },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
