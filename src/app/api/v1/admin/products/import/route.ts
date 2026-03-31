import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { parseProductImport, type ParsedProductRow } from '@/modules/import-export/excel.service';

// ── Preview mode: parse file, match SKUs, return diff without committing ──
// ── Commit mode: actually create/update products with backup ──

interface PreviewItem {
  row: number;
  action: 'create' | 'update' | 'skip';
  name: string;
  sku?: string;
  category?: string;
  basePrice: number;
  grossRate: number;
  taxPercent: number;
  stock?: number;
  bulkSlabCount: number;
  hasPromo: boolean;
  // For updates — show what changed
  existing?: {
    id: string;
    name: string;
    basePrice: number;
    taxPercent: number;
    stock: number;
    brand?: string;
    sku?: string;
  };
  skipReason?: string;
}

interface PreviewResponse {
  totalRows: number;
  creates: number;
  updates: number;
  skips: number;
  errors: { row: number; field?: string; message: string }[];
  items: PreviewItem[];
}

interface CommitResponse {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
  backupId: string;
}

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw Errors.notFound('File');

    const vendorId = formData.get('vendorId') as string | null || null;
    const mode = (formData.get('mode') as string) || 'preview'; // 'preview' | 'commit'

    // Verify vendor exists (if provided)
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
      if (!vendor) throw Errors.notFound('Vendor');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, errors: parseErrors } = parseProductImport(buffer);

    if (rows.length === 0 && parseErrors.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalRows: 0, creates: 0, updates: 0, skips: 0,
          errors: [{ row: 0, message: 'No valid rows found in file' }],
          items: [],
        } satisfies PreviewResponse,
      });
    }

    // Resolve category names → IDs
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    });
    const catMap = new Map<string, string>();
    for (const c of allCategories) {
      catMap.set(c.name.toLowerCase(), c.id);
      catMap.set(c.slug.toLowerCase(), c.id);
    }

    // Fetch existing products for duplicate detection (by SKU or name)
    // When vendor selected: match within that vendor
    // When no vendor (catalog): match across ALL products to detect duplicates
    const vendorFilter: Record<string, unknown> = vendorId ? { vendorId } : {};

    // 1. Match by SKU
    const skus = rows.filter(r => r.sku).map(r => r.sku!);
    const existingBySku = new Map<string, typeof existingProducts[0]>();
    const existingProducts = skus.length > 0
      ? await prisma.product.findMany({
          where: { sku: { in: skus }, ...vendorFilter },
          include: {
            inventory: { select: { qtyAvailable: true } },
            priceSlabs: { orderBy: { sortOrder: 'asc' } },
          },
        })
      : [];
    for (const p of existingProducts) {
      if (p.sku) existingBySku.set(p.sku, p);
    }

    // 2. Match by name (fallback for rows without SKU or no SKU match)
    const names = rows.map(r => r.name);
    const existingByName = new Map<string, typeof existingProducts[0]>();
    const nameProducts = await prisma.product.findMany({
      where: { name: { in: names, mode: 'insensitive' }, ...vendorFilter },
      include: {
        inventory: { select: { qtyAvailable: true } },
        priceSlabs: { orderBy: { sortOrder: 'asc' } },
      },
    });
    for (const p of nameProducts) {
      existingByName.set(p.name.toLowerCase(), p);
    }

    // Helper: find existing product by SKU first, then by name
    function findExisting(row: { sku?: string; name: string }) {
      if (row.sku && existingBySku.has(row.sku)) return existingBySku.get(row.sku)!;
      return existingByName.get(row.name.toLowerCase());
    }

    // ── PREVIEW MODE ──
    if (mode === 'preview') {
      const items: PreviewItem[] = [];
      let creates = 0, updates = 0, skips = 0;

      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const existing = findExisting(r);

        if (existing) {
          updates++;
          items.push({
            row: rowNum,
            action: 'update',
            name: r.name,
            sku: r.sku,
            category: r.category,
            basePrice: r.basePrice,
            grossRate: r.grossRate,
            taxPercent: r.taxPercent,
            stock: r.stock,
            bulkSlabCount: r.bulkSlabs.length,
            hasPromo: !!r.promoPrice,
            existing: {
              id: existing.id,
              name: existing.name,
              basePrice: Number(existing.basePrice),
              taxPercent: Number(existing.taxPercent),
              stock: existing.inventory?.qtyAvailable ?? 0,
              brand: existing.brand || undefined,
              sku: existing.sku || undefined,
            },
          });
        } else {
          creates++;
          items.push({
            row: rowNum,
            action: 'create',
            name: r.name,
            sku: r.sku,
            category: r.category,
            basePrice: r.basePrice,
            grossRate: r.grossRate,
            taxPercent: r.taxPercent,
            stock: r.stock,
            bulkSlabCount: r.bulkSlabs.length,
            hasPromo: !!r.promoPrice,
          });
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          totalRows: rows.length,
          creates,
          updates,
          skips,
          errors: parseErrors,
          items,
        } satisfies PreviewResponse,
      });
    }

    // ── COMMIT MODE ──
    // Step 1: Create backup of existing products that will be updated
    const backupId = `import_${Date.now()}_${(vendorId || 'catalog').slice(0, 8)}`;
    const productsToBackup = existingProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      hsn: p.hsn,
      brand: p.brand,
      unit: p.unit,
      basePrice: Number(p.basePrice),
      taxPercent: Number(p.taxPercent),
      promoPrice: p.promoPrice ? Number(p.promoPrice) : null,
      stock: p.inventory?.qtyAvailable ?? 0,
      priceSlabs: p.priceSlabs.map(s => ({
        minQty: s.minQty,
        price: Number(s.price),
        promoPrice: s.promoPrice ? Number(s.promoPrice) : null,
      })),
    }));

    // Store backup as JSON in metadata (could use Redis/DB for production scale)
    // For now, we return it to the client for undo capability
    let created = 0, updated = 0;
    const commitErrors: { row: number; message: string }[] = [...parseErrors];

    // Optional: get skip list from client (rows to skip)
    const skipRowsStr = formData.get('skipRows') as string | null;
    const skipRows = new Set(skipRowsStr ? JSON.parse(skipRowsStr) as number[] : []);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;

      if (skipRows.has(rowNum)) continue;

      try {
        const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const categoryId = r.category ? catMap.get(r.category.toLowerCase()) || null : null;
        const existing = findExisting(r);

        if (existing) {
          // ── UPDATE existing product ──
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: r.name,
              hsn: r.hsn || existing.hsn,
              unit: r.unit || existing.unit,
              brand: r.brand || existing.brand,
              categoryId: categoryId || existing.categoryId,
              basePrice: r.basePrice,
              taxPercent: r.taxPercent,
              promoPrice: r.promoPrice || null,
              promoStartTime: r.promoStartTime || null,
              promoEndTime: r.promoEndTime || null,
              imageUrl: r.imageUrl || existing.imageUrl,
            },
          });

          // Update inventory if stock provided and vendor exists
          if (r.stock !== undefined && vendorId) {
            await prisma.inventory.upsert({
              where: { productId: existing.id },
              update: { qtyAvailable: r.stock },
              create: { productId: existing.id, vendorId, qtyAvailable: r.stock, lowStockThreshold: 10 },
            });
          }

          // Replace price slabs (requires vendorId)
          if (vendorId) await updatePriceSlabs(existing.id, vendorId, r);

          updated++;
        } else {
          // ── CREATE new product ──
          const productData: Record<string, unknown> = {
            vendorId: vendorId || null,
            categoryId,
            name: r.name,
            slug,
            sku: r.sku || null,
            hsn: r.hsn || null,
            unit: r.unit || null,
            brand: r.brand || null,
            basePrice: r.basePrice,
            taxPercent: r.taxPercent,
            promoPrice: r.promoPrice || null,
            promoStartTime: r.promoStartTime || null,
            promoEndTime: r.promoEndTime || null,
            imageUrl: r.imageUrl || null,
            approvalStatus: 'approved',
            approvedBy: ctx.userId,
            approvedAt: new Date(),
          };

          // Inventory requires vendorId
          if (vendorId) {
            productData.inventory = {
              create: { vendorId, qtyAvailable: r.stock ?? 0, lowStockThreshold: 10 },
            };
          }

          const product = await prisma.product.create({ data: productData as Parameters<typeof prisma.product.create>[0]['data'] });

          // Create price slabs (requires vendorId)
          if (vendorId) await updatePriceSlabs(product.id, vendorId, r);

          created++;
        }
      } catch (err) {
        commitErrors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : 'Failed to process product',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        updated,
        errors: commitErrors,
        backupId,
        backup: productsToBackup, // Client stores this for undo
      } satisfies CommitResponse & { backup: typeof productsToBackup },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

// Helper: replace price slabs for a product from import row
async function updatePriceSlabs(productId: string, vendorId: string, row: ParsedProductRow) {
  if (row.bulkSlabs.length === 0) return;

  // Delete existing slabs
  await prisma.priceSlab.deleteMany({ where: { productId, vendorId } });

  // Create new slabs
  await prisma.priceSlab.createMany({
    data: row.bulkSlabs.map((slab, idx) => ({
      productId,
      vendorId,
      minQty: slab.minQty,
      price: slab.taxableRate,
      promoPrice: slab.promoTaxableRate || null,
      sortOrder: idx,
    })),
  });
}
