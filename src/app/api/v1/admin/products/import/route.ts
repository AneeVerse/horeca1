import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { parseProductImport } from '@/modules/import-export/excel.service';

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw Errors.notFound('File');

    const vendorId = formData.get('vendorId') as string | null;
    if (!vendorId) throw Errors.forbidden('vendorId is required for import');

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
    if (!vendor) throw Errors.notFound('Vendor');

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, errors: parseErrors } = parseProductImport(buffer);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: { created: 0, errors: parseErrors.length > 0 ? parseErrors : [{ row: 0, message: 'No valid rows found in file' }] },
      });
    }

    // Batch create products in chunks of 50
    let created = 0;
    const createErrors: { row: number; message: string }[] = [...parseErrors];

    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const rowNum = i + j + 2; // Excel row number
        try {
          const slug = row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

          await prisma.product.create({
            data: {
              vendorId,
              categoryId: row.categoryId || null,
              name: row.name,
              slug,
              basePrice: row.basePrice,
              originalPrice: row.originalPrice || null,
              packSize: row.packSize || null,
              unit: row.unit || null,
              sku: row.sku || null,
              hsn: row.hsn || null,
              brand: row.brand || null,
              barcode: row.barcode || null,
              tags: row.tags ? row.tags.split(';').map(t => t.trim()).filter(Boolean) : [],
              taxPercent: row.taxPercent || 0,
              minOrderQty: row.minOrderQty || 1,
              description: row.description || null,
              imageUrl: row.imageUrl || null,
              approvalStatus: 'approved', // Admin imports are pre-approved
              approvedBy: ctx.userId,
              approvedAt: new Date(),
              inventory: {
                create: { vendorId, qtyAvailable: 0, lowStockThreshold: 10 },
              },
            },
          });
          created++;
        } catch (err) {
          createErrors.push({
            row: rowNum,
            message: err instanceof Error ? err.message : 'Failed to create product',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, errors: createErrors },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
