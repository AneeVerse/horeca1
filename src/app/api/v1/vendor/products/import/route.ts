/**
 * POST /api/v1/vendor/products/import — Server-side Excel/CSV product importer
 * GET  /api/v1/vendor/products/import?template=true — Download import template
 * ───────────────────────────────────────────────────────────────────────────
 * Vendor-facing twin of /api/v1/admin/products/import. Same robust two-phase
 * flow (preview → commit) with inline row edits, per-row skip, and an undo
 * backup — but every read, write, and backup is hard-scoped to the caller's
 * session-resolved vendorId. A vendor can never preview or mutate another
 * vendor's catalog: the vendorId is taken from resolveVendorContext, never
 * from the request body.
 *
 * Differences from the admin route (all intentional):
 *   • vendorId is always present (session-resolved), so inventory rows and
 *     price slabs are always created — no "catalog-level" no-vendor branch.
 *   • New products land as approvalStatus='pending' (vendors don't self-
 *     approve). Updates leave approval untouched.
 *   • Tombstoned products (slug starts with `_deleted_`) are excluded from
 *     match queries so a delete-then-reimport creates fresh rows instead of
 *     resurrecting a dead one.
 *   • Slugs are made unique per-vendor at create time to respect the
 *     [vendorId, slug] unique constraint even when a file repeats a name.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { parseProductImport, generateImportTemplate, type ParsedProductRow } from '@/modules/import-export/excel.service';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { findOrCreateMaster } from '@/modules/catalog/catalog.service';

// ── Response shapes — kept identical to the admin importer so the review
//    wizard UI is portable between the two portals. ──

interface PreviewItem {
  row: number;
  action: 'create' | 'update' | 'skip';
  name: string;
  sku?: string;
  hsn?: string;
  brand?: string;
  unit?: string;
  category?: string;
  basePrice: number;
  grossRate: number;
  taxPercent: number;
  promoPrice?: number | null;
  stock?: number;
  bulkSlabCount: number;
  bulkSlabs: Array<{ minQty: number; price: number; grossRate: number; promoPrice?: number | null }>;
  hasPromo: boolean;
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

// Tombstoned products keep their data but get a `_deleted_`-prefixed slug so
// the [vendorId, slug] unique constraint frees up. Match queries skip them.
const NOT_TOMBSTONED = { slug: { not: { startsWith: '_deleted_' } } } as const;

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const GET = vendorOnly(async () => {
  try {
    // Static import template — same canonical generator the admin uses, so
    // the column headers the parser expects never drift from the template.
    const buffer = generateImportTemplate();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="product_import_template.xlsx"',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'products.create');

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw Errors.notFound('File');

    const mode = (formData.get('mode') as string) || 'preview'; // 'preview' | 'commit'

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

    // Resolve category names → IDs (active + approved only — vendors can't
    // assign products to pending/disabled categories).
    const allCategories = await prisma.category.findMany({
      where: { isActive: true, approvalStatus: 'approved' },
      select: { id: true, name: true, slug: true },
    });
    const catMap = new Map<string, string>();
    for (const c of allCategories) {
      catMap.set(c.name.toLowerCase(), c.id);
      catMap.set(c.slug.toLowerCase(), c.id);
    }

    // ── Existing-product detection, scoped strictly to this vendor and
    //    excluding tombstones. Match by SKU first, then by name. ──
    const skus = rows.filter(r => r.sku).map(r => r.sku!);
    const existingProducts = skus.length > 0
      ? await prisma.product.findMany({
          where: { sku: { in: skus }, vendorId, ...NOT_TOMBSTONED },
          include: {
            inventory: { select: { qtyAvailable: true } },
            priceSlabs: { orderBy: { sortOrder: 'asc' } },
          },
        })
      : [];
    const existingBySku = new Map<string, typeof existingProducts[0]>();
    for (const p of existingProducts) {
      if (p.sku) existingBySku.set(p.sku, p);
    }

    const names = rows.map(r => r.name);
    const nameProducts = await prisma.product.findMany({
      where: { name: { in: names, mode: 'insensitive' }, vendorId, ...NOT_TOMBSTONED },
      include: {
        inventory: { select: { qtyAvailable: true } },
        priceSlabs: { orderBy: { sortOrder: 'asc' } },
      },
    });
    const existingByName = new Map<string, typeof existingProducts[0]>();
    for (const p of nameProducts) {
      existingByName.set(p.name.toLowerCase(), p);
    }

    function findExisting(row: { sku?: string; name: string }) {
      if (row.sku && existingBySku.has(row.sku)) return existingBySku.get(row.sku)!;
      return existingByName.get(row.name.toLowerCase());
    }

    // ── PREVIEW MODE ──
    if (mode === 'preview') {
      const items: PreviewItem[] = [];
      let creates = 0, updates = 0;
      const skips = 0;

      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const existing = findExisting(r);

        const slabPreview = r.bulkSlabs.map((s) => ({
          minQty: s.minQty,
          price: s.taxableRate,
          grossRate: s.grossRate,
          promoPrice: s.promoTaxableRate ?? null,
        }));

        if (existing) {
          updates++;
          items.push({
            row: rowNum,
            action: 'update',
            name: r.name,
            sku: r.sku,
            hsn: r.hsn,
            brand: r.brand,
            unit: r.unit,
            category: r.category,
            basePrice: r.basePrice,
            grossRate: r.grossRate,
            taxPercent: r.taxPercent,
            promoPrice: r.promoPrice ?? null,
            stock: r.stock,
            bulkSlabCount: r.bulkSlabs.length,
            bulkSlabs: slabPreview,
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
            hsn: r.hsn,
            brand: r.brand,
            unit: r.unit,
            category: r.category,
            basePrice: r.basePrice,
            grossRate: r.grossRate,
            taxPercent: r.taxPercent,
            promoPrice: r.promoPrice ?? null,
            stock: r.stock,
            bulkSlabCount: r.bulkSlabs.length,
            bulkSlabs: slabPreview,
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
    // Backup every product that could be updated so the UI can offer a
    // complete Undo. A product can be matched by SKU *or* by name, so we
    // union both maps and dedupe by id — backing up only the SKU matches
    // (as a naive version would) silently drops name-matched updates from
    // the restore set.
    const backupId = `import_${Date.now()}_${vendorId.slice(0, 8)}`;
    const backupSource = Array.from(
      new Map([...existingProducts, ...nameProducts].map((p) => [p.id, p])).values(),
    );
    const productsToBackup = backupSource.map(p => ({
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

    let created = 0, updated = 0;
    const commitErrors: { row: number; message: string }[] = [...parseErrors];

    // Rows the vendor chose to skip in the review table.
    const skipRowsStr = formData.get('skipRows') as string | null;
    const skipRows = new Set(skipRowsStr ? JSON.parse(skipRowsStr) as number[] : []);

    // Per-row inline edits made in the review table. Whitelisted at apply
    // time so a forged extra key can't reach Prisma.
    const editsStr = formData.get('edits') as string | null;
    type EditRow = Partial<{ name: string; sku: string; category: string; basePrice: number; taxPercent: number; stock: number }>;
    let editsMap: Record<number, EditRow> = {};
    if (editsStr) {
      try {
        const parsed = JSON.parse(editsStr) as Record<string, EditRow>;
        for (const [k, v] of Object.entries(parsed)) {
          const n = Number(k);
          if (!Number.isInteger(n)) continue;
          const safe: EditRow = {};
          if (typeof v.name === 'string')      safe.name = v.name.trim();
          if (typeof v.sku === 'string')       safe.sku = v.sku.trim();
          if (typeof v.category === 'string')  safe.category = v.category.trim();
          if (typeof v.basePrice === 'number'  && v.basePrice > 0) safe.basePrice = v.basePrice;
          if (typeof v.taxPercent === 'number' && v.taxPercent >= 0 && v.taxPercent <= 100) safe.taxPercent = v.taxPercent;
          if (typeof v.stock === 'number'      && v.stock >= 0 && Number.isInteger(v.stock)) safe.stock = v.stock;
          editsMap[n] = safe;
        }
      } catch { editsMap = {}; }
    }

    // Slug uniqueness guard — seed from this vendor's existing slugs (incl.
    // tombstones, since those still occupy the unique key) and reserve each
    // new slug as we mint it so two rows with the same name don't collide.
    const usedSlugs = new Set(
      (await prisma.product.findMany({ where: { vendorId }, select: { slug: true } })).map(p => p.slug),
    );
    function uniqueSlug(name: string): string {
      const base = toSlug(name) || 'product';
      let candidate = base;
      let n = 2;
      while (usedSlugs.has(candidate)) {
        candidate = `${base}-${n++}`;
      }
      usedSlugs.add(candidate);
      return candidate;
    }

    for (let i = 0; i < rows.length; i++) {
      const parsedRow = rows[i];
      const rowNum = i + 2;

      if (skipRows.has(rowNum)) continue;

      // Merge inline edits OVER the parsed row — vendor keystrokes win.
      const e = editsMap[rowNum] ?? {};
      const r = {
        ...parsedRow,
        ...(e.name      !== undefined ? { name: e.name } : {}),
        ...(e.sku       !== undefined ? { sku: e.sku } : {}),
        ...(e.category  !== undefined ? { category: e.category } : {}),
        ...(e.basePrice !== undefined ? { basePrice: e.basePrice } : {}),
        ...(e.taxPercent !== undefined ? { taxPercent: e.taxPercent } : {}),
        ...(e.stock     !== undefined ? { stock: e.stock } : {}),
      };

      try {
        const categoryId = r.category ? catMap.get(r.category.toLowerCase()) || null : null;
        const existing = findExisting(r);

        if (existing) {
          // ── UPDATE existing product (approval left untouched) ──
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: r.name,
              sku: r.sku ?? existing.sku,
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

          if (r.stock !== undefined) {
            await prisma.inventory.upsert({
              where: { productId: existing.id },
              update: { qtyAvailable: r.stock },
              create: { productId: existing.id, vendorId, qtyAvailable: r.stock, lowStockThreshold: 10 },
            });
          }

          await updatePriceSlabs(existing.id, vendorId, r);

          if (categoryId) {
            await prisma.productCategory.upsert({
              where: { productId_categoryId: { productId: existing.id, categoryId } },
              create: { productId: existing.id, categoryId, isPrimary: true },
              update: { isPrimary: true },
            });
          }

          updated++;
        } else {
          // ── CREATE new product (pending vendor approval) ──
          // P0-1: every product MUST map to a Horeca1 master SKU, exactly like
          // the single-product create path (CatalogService.createProduct). The
          // bulk path used to skip this, leaving imported rows orphaned from
          // the central item master and un-reassignable. Link/create the master
          // by (name, brand) when we have a resolved leaf category.
          const masterProductId = categoryId
            ? await findOrCreateMaster({ name: r.name, brand: r.brand ?? null, categoryId })
            : null;

          const product = await prisma.product.create({
            data: {
              vendorId,
              categoryId,
              masterProductId,
              name: r.name,
              slug: uniqueSlug(r.name),
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
              approvalStatus: 'pending',
              inventory: {
                create: { vendorId, qtyAvailable: r.stock ?? 0, lowStockThreshold: 10 },
              },
            },
          });

          if (categoryId) {
            await prisma.productCategory.create({
              data: { productId: product.id, categoryId, isPrimary: true },
            });
          }

          await updatePriceSlabs(product.id, vendorId, r);

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
        backup: productsToBackup,
      } satisfies CommitResponse & { backup: typeof productsToBackup },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

// Replace a product's price slabs from an import row (vendor-scoped).
async function updatePriceSlabs(productId: string, vendorId: string, row: ParsedProductRow) {
  if (row.bulkSlabs.length === 0) return;
  await prisma.priceSlab.deleteMany({ where: { productId, vendorId } });
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
