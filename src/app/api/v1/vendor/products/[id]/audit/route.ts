// GET /api/v1/vendor/products/:id/audit — field-level change history for a product
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 2];
}

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'products.edit');
    const productId = extractId(req);

    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId },
      select: { id: true },
    });
    if (!product) throw Errors.notFound('Product');

    const logs = await prisma.productAuditLog.findMany({
      where: { productId },
      orderBy: { changedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        field: true,
        oldValue: true,
        newValue: true,
        changedAt: true,
        source: true,
        actor: { select: { fullName: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    return errorResponse(error);
  }
});
