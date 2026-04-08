// GET /api/v1/vendor/dashboard — Vendor dashboard stats
// WHY: Powers the vendor dashboard overview page with key metrics:
//      total orders, total revenue, active products, low stock count,
//      order status breakdown, and recent orders
// PROTECTED: Vendor only (vendors + admins)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);

    // Run all stat queries in parallel for performance
    const [
      totalOrders,
      revenueResult,
      activeProducts,
      inventoryRows,
      ordersByStatusRaw,
      recentOrders,
    ] = await Promise.all([
      // Total orders for this vendor
      prisma.order.count({ where: { vendorId } }),

      // Revenue from non-cancelled orders
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          vendorId,
          status: { in: ['delivered', 'confirmed', 'processing', 'shipped'] },
        },
      }),

      // Active product count
      prisma.product.count({ where: { vendorId, isActive: true } }),

      // Inventory rows for low-stock calculation
      prisma.inventory.findMany({
        where: { vendorId },
        select: { qtyAvailable: true, qtyReserved: true, lowStockThreshold: true },
      }),

      // Orders grouped by status
      prisma.order.groupBy({
        by: ['status'],
        where: { vendorId },
        _count: { id: true },
      }),

      // Last 10 orders with customer info
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
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
    ]);

    // Count low-stock items in JS (available - reserved <= threshold)
    const lowStockCount = inventoryRows.filter(
      (inv) => inv.qtyAvailable - inv.qtyReserved <= inv.lowStockThreshold
    ).length;

    // Transform ordersByStatus into a clean map: { pending: 5, confirmed: 12, ... }
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
          activeProducts,
          lowStockCount,
        },
        ordersByStatus,
        recentOrders,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
