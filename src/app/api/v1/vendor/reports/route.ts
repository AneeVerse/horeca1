import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import type { AuthContext } from '@/middleware/auth';

export const GET = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);

    // Last 6 months range
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [monthlyOrders, topProducts, orderStatusBreakdown, totals] = await Promise.all([
      // Revenue + order count per month for last 6 months
      prisma.order.findMany({
        where: {
          vendorId,
          createdAt: { gte: sixMonthsAgo },
          status: { notIn: ['cancelled'] },
        },
        select: { totalAmount: true, createdAt: true },
      }),

      // Top 10 products by total quantity sold
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { vendorId, status: { notIn: ['cancelled'] } },
        },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 10,
      }),

      // Order count by status (all time)
      prisma.order.groupBy({
        by: ['status'],
        where: { vendorId },
        _count: { id: true },
      }),

      // All-time totals
      prisma.order.aggregate({
        where: { vendorId, status: { notIn: ['cancelled'] } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    // Build monthly revenue map: "2026-04" → { revenue, orders }
    const monthMap: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = { revenue: 0, orders: 0 };
    }
    for (const o of monthlyOrders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[key]) {
        monthMap[key].revenue += Number(o.totalAmount);
        monthMap[key].orders += 1;
      }
    }
    const revenueByMonth = Object.entries(monthMap).map(([month, v]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      revenue: Math.round(v.revenue),
      orders: v.orders,
    }));

    // Hydrate top products with name
    const productIds = topProducts.map(p => p.productId);
    const productNames = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(productNames.map(p => [p.id, p.name]));
    const topProductsHydrated = topProducts.map(p => ({
      productId: p.productId,
      name: nameMap[p.productId] ?? 'Unknown',
      qty: p._sum.quantity ?? 0,
      revenue: Math.round(Number(p._sum.totalPrice ?? 0)),
    }));

    // Status breakdown
    const statusBreakdown = Object.fromEntries(
      orderStatusBreakdown.map(s => [s.status, s._count.id])
    );

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          revenue: Math.round(Number(totals._sum.totalAmount ?? 0)),
          orders: totals._count.id,
        },
        revenueByMonth,
        topProducts: topProductsHydrated,
        statusBreakdown,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
});
