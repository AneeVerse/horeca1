// GET /api/v1/admin/approvals/summary — Return pending approval counts
// WHY: Admin dashboard badge counts — shows how many vendors, products, and
//      categories are awaiting review so admin knows what needs attention.
// PROTECTED: Admin only

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';

// GET — pending counts for vendors, products, and categories
export const GET = adminOnly(async (_req, _ctx) => {
  try {
    const [pendingVendors, pendingProducts, pendingCategories] = await Promise.all([
      prisma.vendor.count({ where: { isVerified: false } }),
      prisma.product.count({ where: { approvalStatus: 'pending' } }),
      prisma.category.count({ where: { approvalStatus: 'pending' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { pendingVendors, pendingProducts, pendingCategories },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
