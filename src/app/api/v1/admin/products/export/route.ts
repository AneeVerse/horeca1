import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { exportProductsToXlsx, exportProductsToCsv } from '@/modules/import-export/excel.service';

export const GET = adminOnly(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'xlsx';
    const approvalStatus = url.searchParams.get('approvalStatus') || undefined;
    const vendorId = url.searchParams.get('vendorId') || undefined;
    const categoryId = url.searchParams.get('categoryId') || undefined;

    const where: Record<string, unknown> = {};
    if (approvalStatus) where.approvalStatus = approvalStatus;
    if (vendorId) where.vendorId = vendorId;
    if (categoryId) where.categoryId = categoryId;

    const products = await prisma.product.findMany({
      where,
      include: {
        vendor: { select: { businessName: true } },
        category: { select: { name: true } },
        inventory: { select: { qtyAvailable: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000, // Safety limit
    });

    const rows = products.map(p => ({
      name: p.name,
      slug: p.slug,
      vendorName: p.vendor?.businessName ?? '',
      categoryName: p.category?.name,
      basePrice: Number(p.basePrice),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      packSize: p.packSize,
      unit: p.unit,
      sku: p.sku,
      hsn: p.hsn,
      brand: p.brand,
      barcode: p.barcode,
      tags: p.tags,
      taxPercent: p.taxPercent ? Number(p.taxPercent) : 0,
      minOrderQty: p.minOrderQty,
      description: p.description,
      imageUrl: p.imageUrl,
      approvalStatus: p.approvalStatus,
      stock: p.inventory?.qtyAvailable ?? 0,
    }));

    if (format === 'csv') {
      const csv = exportProductsToCsv(rows);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="products.csv"',
        },
      });
    }

    const buffer = exportProductsToXlsx(rows);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="products.xlsx"',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
