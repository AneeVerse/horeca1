// GET /api/v1/vendor/orders/:id/invoice — Download GST invoice PDF for vendor's order
// PROTECTED: Vendor with orders.view (scoped to vendor)

import { NextRequest, NextResponse } from 'next/server';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { generateInvoicePdf } from '@/lib/invoice';
import { prisma } from '@/lib/prisma';

function extractOrderId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 2]!;
}

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'orders.view');
    const vendorId = await resolveVendorId(ctx, req);
    const orderId = extractOrderId(req);

    const order = await prisma.order.findFirst({
      where: { id: orderId, vendorId },
      select: { id: true, orderNumber: true },
    });
    if (!order) throw Errors.notFound('Order');

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateInvoicePdf(orderId);
    } catch (pdfErr) {
      console.error('[vendor-invoice] PDF generation failed for order', orderId, pdfErr);
      throw pdfErr;
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${order.orderNumber}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
