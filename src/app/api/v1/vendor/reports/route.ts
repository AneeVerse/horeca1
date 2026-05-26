import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import type { AuthContext } from '@/middleware/auth';

// Resolve period param → start date and bucket granularity
function parsePeriod(p: string | null): { start: Date; buckets: 'day' | 'week' | 'month'; label: string } {
  const now = new Date();
  switch (p) {
    case '7d':  return { start: new Date(now.getTime() - 7 * 86_400_000),   buckets: 'day',   label: 'Last 7 days' };
    case '30d': return { start: new Date(now.getTime() - 30 * 86_400_000),  buckets: 'day',   label: 'Last 30 days' };
    case '90d': return { start: new Date(now.getTime() - 90 * 86_400_000),  buckets: 'week',  label: 'Last 90 days' };
    default:    return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), buckets: 'month', label: 'Last 6 months' };
  }
}

// Week number helper (ISO)
function isoWeek(d: Date) {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const delta = d.getTime() - jan4.getTime();
  return `${d.getFullYear()}-W${String(Math.floor(delta / 604_800_000) + 1).padStart(2, '0')}`;
}

export const GET = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const period = new URL(req.url).searchParams.get('period');
    const { start, buckets } = parsePeriod(period);

    const [periodOrders, topProducts, orderStatusBreakdown, totals, customerStats, inventoryRows] =
      await Promise.all([
        // Orders in period (non-cancelled)
        prisma.order.findMany({
          where: { vendorId, createdAt: { gte: start }, status: { notIn: ['cancelled'] } },
          select: { totalAmount: true, createdAt: true, userId: true },
        }),

        // Top 10 products by revenue (all time non-cancelled)
        prisma.orderItem.groupBy({
          by: ['productId'],
          where: { order: { vendorId, status: { notIn: ['cancelled'] } } },
          _sum: { quantity: true, totalPrice: true },
          orderBy: { _sum: { totalPrice: 'desc' } },
          take: 10,
        }),

        // Status breakdown (all time)
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

        // Per-customer spend (in period) for customer analytics
        prisma.order.groupBy({
          by: ['userId'],
          where: { vendorId, createdAt: { gte: start }, status: { notIn: ['cancelled'] } },
          _sum: { totalAmount: true },
          _count: { id: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 10,
        }),

        // Inventory for fill-rate / dead stock (products with 0 fulfilled orders in period)
        prisma.inventory.findMany({
          where: { vendorId },
          select: { productId: true, qtyAvailable: true, qtyReserved: true, lowStockThreshold: true, product: { select: { id: true, name: true } } },
        }),
      ]);

    // ─── Revenue timeseries ─────────────────────────────────────────────────
    const bucketMap: Record<string, { revenue: number; orders: number }> = {};
    for (const o of periodOrders) {
      let key: string;
      const d = new Date(o.createdAt);
      if (buckets === 'day') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (buckets === 'week') {
        key = isoWeek(d);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      bucketMap[key] = bucketMap[key] ?? { revenue: 0, orders: 0 };
      bucketMap[key].revenue += Number(o.totalAmount);
      bucketMap[key].orders += 1;
    }
    const revenueByPeriod = Object.entries(bucketMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        key,
        label: buckets === 'day' ? key.slice(5)  // MM-DD
          : buckets === 'week' ? key
          : new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        revenue: Math.round(v.revenue),
        orders: v.orders,
      }));

    // ─── Top products ────────────────────────────────────────────────────────
    const productNames = await prisma.product.findMany({
      where: { id: { in: topProducts.map(p => p.productId) } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(productNames.map(p => [p.id, p.name]));
    const topProductsHydrated = topProducts.map(p => ({
      productId: p.productId,
      name: nameMap[p.productId] ?? 'Unknown',
      qty: p._sum.quantity ?? 0,
      revenue: Math.round(Number(p._sum.totalPrice ?? 0)),
    }));

    // ─── Customer analytics ─────────────────────────────────────────────────
    const topCustomerUserIds = customerStats.map(c => c.userId);
    const topCustomerUsers = await prisma.user.findMany({
      where: { id: { in: topCustomerUserIds } },
      select: { id: true, fullName: true, businessName: true },
    });
    const userMap = Object.fromEntries(topCustomerUsers.map(u => [u.id, u]));

    const totalCustomers = new Set(periodOrders.map(o => o.userId)).size;
    const repeatCustomers = customerStats.filter(c => (c._count?.id ?? 0) > 1).length;
    const aov = periodOrders.length > 0
      ? periodOrders.reduce((s, o) => s + Number(o.totalAmount), 0) / periodOrders.length
      : 0;

    // Dormant = customers who ordered before (period start) but not after
    const dormantCount = await prisma.order.groupBy({
      by: ['userId'],
      where: { vendorId, createdAt: { lt: start }, status: { notIn: ['cancelled'] } },
    }).then(async (prev) => {
      const prevIds = new Set(prev.map(p => p.userId));
      const activeIds = new Set(periodOrders.map(o => o.userId));
      return [...prevIds].filter(id => !activeIds.has(id)).length;
    });

    const topCustomers = customerStats.map(c => ({
      userId: c.userId,
      fullName: userMap[c.userId]?.fullName ?? 'Unknown',
      businessName: userMap[c.userId]?.businessName ?? null,
      orderCount: c._count?.id ?? 0,
      totalSpend: Math.round(Number(c._sum?.totalAmount ?? 0)),
    }));

    // ─── Inventory analytics ────────────────────────────────────────────────
    // Products with orders fulfilled in period (for fill rate / turnover)
    const soldProductIds = new Set(
      (await prisma.orderItem.findMany({
        where: { order: { vendorId, createdAt: { gte: start }, status: { notIn: ['cancelled'] } } },
        select: { productId: true },
      })).map(i => i.productId),
    );

    const deadStock = inventoryRows
      .filter(r => !soldProductIds.has(r.productId) && r.qtyAvailable > 0)
      .map(r => ({ productId: r.productId, name: r.product.name, qty: r.qtyAvailable }))
      .slice(0, 10);

    const lowStockCount = inventoryRows.filter(r => r.qtyAvailable - r.qtyReserved <= r.lowStockThreshold).length;
    const outOfStockCount = inventoryRows.filter(r => r.qtyAvailable - r.qtyReserved <= 0).length;
    const fillRate = inventoryRows.length > 0
      ? Math.round(((inventoryRows.length - outOfStockCount) / inventoryRows.length) * 100)
      : 100;

    // ─── Status breakdown ────────────────────────────────────────────────────
    const statusBreakdown = Object.fromEntries(
      orderStatusBreakdown.map(s => [s.status, s._count.id])
    );

    return NextResponse.json({
      success: true,
      data: {
        period: period ?? '6m',
        totals: {
          revenue: Math.round(Number(totals._sum.totalAmount ?? 0)),
          orders: totals._count.id,
        },
        revenueByPeriod,
        topProducts: topProductsHydrated,
        statusBreakdown,
        customerAnalytics: {
          totalCustomers,
          repeatCustomers,
          dormantCount,
          aov: Math.round(aov),
          topCustomers,
        },
        inventoryAnalytics: {
          fillRate,
          lowStockCount,
          outOfStockCount,
          totalSkus: inventoryRows.length,
          deadStock,
        },
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
});
