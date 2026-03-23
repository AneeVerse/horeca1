// GET /api/v1/vendor/orders — List vendor's orders
// WHY: Vendor order management — view all orders placed with this vendor,
//      filter by status, search by order number, with cursor pagination
// PROTECTED: Vendor only (vendors + admins)
// SUPPORTS: ?status=&search=&cursor=&limit=20

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    // Resolve vendorId from session — never trust client-supplied vendorId
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) throw Errors.forbidden('No vendor profile linked to your account');
    const vendorId = vendor.id;

    // Parse query params
    const params = req.nextUrl.searchParams;
    const status = params.get('status') || undefined;
    const search = params.get('search') || undefined;
    const cursor = params.get('cursor') || undefined;
    const limit = Math.min(Number(params.get('limit')) || 20, 50);

    // Build where clause
    const where: Record<string, unknown> = {
      vendorId,
      ...(status && { status }),
      ...(search && { orderNumber: { contains: search, mode: 'insensitive' } }),
    };

    const orders = await prisma.order.findMany({
      where,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        paymentStatus: true,
        createdAt: true,
        user: {
          select: { fullName: true, email: true, businessName: true },
        },
        _count: { select: { items: true } },
      },
    });

    const hasMore = orders.length > limit;
    if (hasMore) orders.pop();

    const nextCursor = hasMore ? orders[orders.length - 1].id : null;

    return NextResponse.json({
      success: true,
      data: {
        orders,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
