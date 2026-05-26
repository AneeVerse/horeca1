// GET /api/v1/vendor/dashboard — Vendor dashboard stats
// PROTECTED: Vendor only (vendors + admins)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);

    // IST-aware day/month boundaries
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayStartIST = new Date(nowIST);
    todayStartIST.setUTCHours(0, 0, 0, 0);
    todayStartIST.setTime(todayStartIST.getTime() - 5.5 * 60 * 60 * 1000); // back to UTC

    const monthStartIST = new Date(nowIST);
    monthStartIST.setUTCDate(1);
    monthStartIST.setUTCHours(0, 0, 0, 0);
    monthStartIST.setTime(monthStartIST.getTime() - 5.5 * 60 * 60 * 1000);

    const activeStatuses = ['confirmed', 'processing', 'shipped', 'delivered'] as const;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      revenueResult,
      todaySalesResult,
      mtdSalesResult,
      pendingPaymentsResult,
      activeProducts,
      inventoryRows,
      ordersByStatusRaw,
      pendingOrders,
      recentOrders,
      vendorWallet,
      overdueResult,
      pendingSettlement,
      fastMoversRaw,
      allVendorOrders,
      creditAggregate,
      packingCount,
      dispatchCount,
      delayedCount,
    ] = await Promise.all([
      prisma.order.count({ where: { vendorId } }),

      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { vendorId, status: { in: [...activeStatuses] } },
      }),

      // Sales placed (& confirmed) today
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { vendorId, status: { in: [...activeStatuses] }, createdAt: { gte: todayStartIST } },
      }),

      // Month-to-date sales
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { vendorId, status: { in: [...activeStatuses] }, createdAt: { gte: monthStartIST } },
      }),

      // Unpaid / partially paid order value (outstanding receivables)
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          vendorId,
          paymentStatus: { in: ['unpaid', 'partial'] },
          status: { notIn: ['cancelled'] },
        },
      }),

      prisma.product.count({ where: { vendorId, isActive: true } }),

      prisma.inventory.findMany({
        where: { vendorId },
        select: { qtyAvailable: true, qtyReserved: true, lowStockThreshold: true },
      }),

      prisma.order.groupBy({
        by: ['status'],
        where: { vendorId },
        _count: { id: true },
      }),

      // Pending orders needing action — oldest first (most urgent)
      prisma.order.findMany({
        where: { vendorId, status: 'pending' },
        take: 20,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          createdAt: true,
          notes: true,
          user: { select: { id: true, fullName: true, businessName: true, email: true } },
          _count: { select: { items: true } },
        },
      }),

      // Recent 10 orders for the activity table
      prisma.order.findMany({
        where: { vendorId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          paymentStatus: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, email: true } },
          _count: { select: { items: true } },
        },
      }),

      // Vendor wallet balance
      prisma.vendorWallet.findUnique({
        where: { vendorId },
        select: { balance: true, pendingAmount: true },
      }),

      // Overdue credit amount (past due date, not yet paid)
      prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: {
          vendorId,
          type: 'debit',
          dueDate: { lt: new Date() },
          // Identify unpaid by checking creditUsed still covers it — approximate via no credit txn after
        },
      }),

      // Pending settlement amount
      prisma.vendorSettlement.aggregate({
        _sum: { netAmount: true },
        where: { vendorId, status: 'pending' },
      }),

      // Fast movers — top 5 products by qty sold in delivered orders (last 30 days)
      prisma.$queryRaw<{ productId: string; productName: string; totalQty: bigint; revenue: string }[]>(
        Prisma.sql`
          SELECT oi.product_id AS "productId",
                 oi.product_name AS "productName",
                 SUM(oi.quantity) AS "totalQty",
                 SUM(oi.total_price) AS "revenue"
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE o.vendor_id = ${vendorId}::uuid
            AND o.status = 'delivered'
            AND o.created_at >= ${thirtyDaysAgo}
          GROUP BY oi.product_id, oi.product_name
          ORDER BY SUM(oi.quantity) DESC
          LIMIT 5
        `
      ),

      // All orders for this vendor — used to compute customer segments in JS
      prisma.order.findMany({
        where: { vendorId },
        select: { userId: true, createdAt: true },
      }),

      // Credit utilization aggregate
      prisma.creditAccount.aggregate({
        where: { vendorId },
        _sum: { creditLimit: true, creditUsed: true },
      }),

      // Fulfillment: packing pending (processing), dispatch pending (shipped), delayed (48h+)
      prisma.order.count({ where: { vendorId, status: 'processing' } }),
      prisma.order.count({ where: { vendorId, status: 'shipped' } }),
      prisma.order.count({
        where: {
          vendorId,
          status: { in: ['confirmed', 'processing', 'shipped'] },
          createdAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const lowStockCount = inventoryRows.filter(
      (inv) => inv.qtyAvailable - inv.qtyReserved <= inv.lowStockThreshold,
    ).length;

    const ordersByStatus: Record<string, number> = {};
    for (const group of ordersByStatusRaw) {
      ordersByStatus[group.status] = group._count.id;
    }

    // ── Fast movers: normalise BigInt/Decimal from raw query ──
    const fastMovers = fastMoversRaw.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      totalQty: Number(row.totalQty),
      revenue: Number(row.revenue),
    }));

    // ── Customer counts: computed from allVendorOrders in JS ──
    const latestOrderByUser = new Map<string, Date>();
    const earliestOrderByUser = new Map<string, Date>();
    for (const order of allVendorOrders) {
      const prev = latestOrderByUser.get(order.userId);
      if (!prev || order.createdAt > prev) latestOrderByUser.set(order.userId, order.createdAt);
      const earliest = earliestOrderByUser.get(order.userId);
      if (!earliest || order.createdAt < earliest) earliestOrderByUser.set(order.userId, order.createdAt);
    }
    const totalCustomers = latestOrderByUser.size;
    let newCustomers = 0;
    let dormantCustomers = 0;
    for (const [userId, lastOrder] of latestOrderByUser.entries()) {
      const firstOrder = earliestOrderByUser.get(userId)!;
      const isNew = firstOrder >= thirtyDaysAgo;
      const isDormant = lastOrder < thirtyDaysAgo;
      if (isNew) newCustomers++;
      if (isDormant) dormantCustomers++;
    }
    const customerCounts = { total: totalCustomers, new: newCustomers, dormant: dormantCustomers };

    // ── Credit utilization ──
    const totalCreditLimit = Number(creditAggregate._sum.creditLimit ?? 0);
    const totalCreditUsed = Number(creditAggregate._sum.creditUsed ?? 0);
    const creditUtilizationPct =
      totalCreditLimit > 0 ? Math.round((totalCreditUsed / totalCreditLimit) * 100) : 0;
    const creditUtilization = {
      totalLimit: totalCreditLimit,
      totalUsed: totalCreditUsed,
      pct: creditUtilizationPct,
    };

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          totalRevenue: revenueResult._sum.totalAmount ?? 0,
          todaySales: todaySalesResult._sum.totalAmount ?? 0,
          mtdSales: mtdSalesResult._sum.totalAmount ?? 0,
          pendingPayments: pendingPaymentsResult._sum.totalAmount ?? 0,
          activeProducts,
          lowStockCount,
          pendingOrdersCount: pendingOrders.length,
          walletBalance: Number(vendorWallet?.balance ?? 0),
          pendingSettlement: Number(pendingSettlement._sum.netAmount ?? 0),
          overdueAmount: Number(overdueResult._sum.amount ?? 0),
          pendingWalletAmount: Number(vendorWallet?.pendingAmount ?? 0),
        },
        ordersByStatus,
        pendingOrders,
        recentOrders,
        fastMovers,
        customerCounts,
        creditUtilization,
        fulfillment: {
          packingPending: packingCount,
          dispatchPending: dispatchCount,
          deliveryDelayed: delayedCount,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
