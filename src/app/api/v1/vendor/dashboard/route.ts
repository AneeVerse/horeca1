// GET /api/v1/vendor/dashboard — Vendor dashboard stats
// PROTECTED: Vendor only (vendors + admins)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    ]);

    const lowStockCount = inventoryRows.filter(
      (inv) => inv.qtyAvailable - inv.qtyReserved <= inv.lowStockThreshold,
    ).length;

    const ordersByStatus: Record<string, number> = {};
    for (const group of ordersByStatusRaw) {
      ordersByStatus[group.status] = group._count.id;
    }

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
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
