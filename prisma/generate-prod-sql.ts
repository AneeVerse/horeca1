/**
 * Generates an idempotent SQL file from the local DB, compatible with production schema.
 * Uses PL/pgSQL DO blocks to resolve vendor/category IDs by name, then upsert products.
 *
 * Usage:
 *   npx tsx prisma/generate-prod-sql.ts > prod-sync.sql
 *
 * Then on server:
 *   docker exec -i horeca1-db psql -U horeca1 -d horeca1 < prod-sync.sql
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const local = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function esc(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function escArr(arr: string[]): string {
  if (!arr || arr.length === 0) return `ARRAY[]::text[]`;
  return `ARRAY[${arr.map(esc).join(',')}]::text[]`;
}

function decStr(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  return String(v);
}

async function main() {
  const lines: string[] = [
    '-- Auto-generated sync SQL from local DB → production',
    `-- Generated: ${new Date().toISOString()}`,
    '-- Safe to re-run (all upserts are idempotent)',
    '',
  ];

  // ── Categories ──────────────────────────────────────────────────────────
  // Only update name/image; slug is the conflict target.
  // Production keeps its own UUIDs — products resolve by slug subquery.
  const cats = await local.category.findMany({ orderBy: { sortOrder: 'asc' } });
  lines.push('-- CATEGORIES');
  for (const c of cats) {
    lines.push(
      `INSERT INTO categories (id, name, slug, parent_id, image_url, sort_order, is_active, created_at)` +
      ` VALUES (${esc(c.id)}, ${esc(c.name)}, ${esc(c.slug)}, ${esc(c.parentId)}, ${esc(c.imageUrl)}, ${c.sortOrder}, ${c.isActive}, ${esc(c.createdAt)})` +
      ` ON CONFLICT (slug) DO UPDATE SET name=${esc(c.name)}, image_url=${esc(c.imageUrl)}, is_active=${c.isActive};`
    );
  }
  lines.push('');

  // ── Vendors: create any that don't yet exist on production ───────────────
  const vendors = await local.vendor.findMany({
    include: { user: true, serviceAreas: true, deliverySlots: true },
  });
  lines.push('-- VENDORS (create missing ones via DO blocks)');
  for (const { user, serviceAreas, deliverySlots, ...v } of vendors) {
    if (!user) continue;
    lines.push(`DO $$`);
    lines.push(`DECLARE v_user_id UUID; BEGIN`);
    lines.push(
      `  INSERT INTO users (id, email, password, full_name, role, phone, pincode, is_active, created_at, updated_at)` +
      ` VALUES (${esc(user.id)}, ${esc(user.email)}, ${esc(user.password)}, ${esc(user.fullName)}, ${esc(user.role)}, ${esc(user.phone)}, ${esc(user.pincode)}, ${user.isActive}, ${esc(user.createdAt)}, ${esc(user.updatedAt)})` +
      ` ON CONFLICT (email) DO NOTHING;`
    );
    lines.push(`  SELECT id INTO v_user_id FROM users WHERE email = ${esc(user.email)};`);
    lines.push(
      `  INSERT INTO vendors (id, user_id, business_name, slug, description, logo_url, rating, min_order_value, is_active, is_verified, created_at, updated_at)` +
      ` VALUES (gen_random_uuid(), v_user_id, ${esc(v.businessName)}, ${esc(v.slug)}, ${esc(v.description)}, ${esc(v.logoUrl)}, ${decStr(v.rating)}, ${decStr(v.minOrderValue)}, ${v.isActive}, true, ${esc(v.createdAt)}, ${esc(v.updatedAt)})` +
      ` ON CONFLICT (slug) DO UPDATE SET business_name=${esc(v.businessName)}, logo_url=${esc(v.logoUrl)}, description=${esc(v.description)}, is_verified=true;`
    );
    for (const sa of serviceAreas) {
      lines.push(
        `  INSERT INTO service_areas (id, vendor_id, pincode, is_active)` +
        ` SELECT ${esc(sa.id)}, v.id, ${esc(sa.pincode)}, ${sa.isActive} FROM vendors v WHERE v.slug = ${esc(v.slug)}` +
        ` ON CONFLICT (vendor_id, pincode) DO NOTHING;`
      );
    }
    lines.push(`END $$;`);
    lines.push('');
  }

  // ── Products via DO blocks ───────────────────────────────────────────────
  // Each block: resolve vendor + category by name/slug, upsert product, then
  // upsert its price_slabs + inventory using the resolved product_id.
  const products = await local.product.findMany({
    include: {
      priceSlabs: true,
      inventory: true,
      vendor: { select: { businessName: true } },
      category: { select: { slug: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  lines.push('-- PRODUCTS (each in a DO block to resolve production IDs)');

  for (const { priceSlabs, inventory, vendor, category: catRel, ...p } of products) {
    if (!vendor) continue;

    const block: string[] = [];
    block.push(`DO $$`);
    block.push(`DECLARE`);
    block.push(`  v_vendor_id UUID;`);
    block.push(`  v_cat_id    UUID;`);
    block.push(`  v_prod_id   UUID;`);
    block.push(`BEGIN`);
    block.push(`  SELECT id INTO v_vendor_id FROM vendors WHERE business_name = ${esc(vendor.businessName)} LIMIT 1;`);
    block.push(`  IF v_vendor_id IS NULL THEN RETURN; END IF;`);

    if (catRel) {
      block.push(`  SELECT id INTO v_cat_id FROM categories WHERE slug = ${esc(catRel.slug)} LIMIT 1;`);
    } else {
      block.push(`  v_cat_id := NULL;`);
    }

    const images = escArr(p.images as string[]);
    const tags = escArr(p.tags as string[]);

    block.push(
      `  INSERT INTO products (id, vendor_id, category_id, name, slug, description, image_url, images, pack_size, unit, base_price, original_price, tax_percent, sku, hsn, brand, barcode, tags, is_active, approval_status, min_order_qty, created_at, updated_at)` +
      ` VALUES (gen_random_uuid(), v_vendor_id, v_cat_id, ${esc(p.name)}, ${esc(p.slug)}, ${esc(p.description)}, ${esc(p.imageUrl)}, ${images}, ${esc(p.packSize)}, ${esc(p.unit)}, ${decStr(p.basePrice)}, ${decStr(p.originalPrice)}, ${decStr(p.taxPercent)}, ${esc(p.sku)}, ${esc(p.hsn)}, ${esc(p.brand)}, ${esc(p.barcode)}, ${tags}, ${p.isActive}, 'approved', ${p.minOrderQty}, ${esc(p.createdAt)}, ${esc(p.updatedAt)})` +
      ` ON CONFLICT (vendor_id, slug) DO UPDATE SET name=${esc(p.name)}, base_price=${decStr(p.basePrice)}, image_url=${esc(p.imageUrl)}, is_active=${p.isActive}, category_id=v_cat_id, updated_at=${esc(p.updatedAt)}` +
      ` RETURNING id INTO v_prod_id;`
    );
    block.push(`  IF v_prod_id IS NULL THEN`);
    block.push(`    SELECT id INTO v_prod_id FROM products WHERE vendor_id = v_vendor_id AND slug = ${esc(p.slug)};`);
    block.push(`  END IF;`);
    block.push(`  IF v_prod_id IS NULL THEN RETURN; END IF;`);

    for (const slab of priceSlabs) {
      block.push(
        `  INSERT INTO price_slabs (id, product_id, vendor_id, min_qty, max_qty, price, sort_order)` +
        ` VALUES (gen_random_uuid(), v_prod_id, v_vendor_id, ${slab.minQty}, ${esc(slab.maxQty)}, ${decStr(slab.price)}, ${slab.sortOrder})` +
        ` ON CONFLICT (product_id, min_qty) DO UPDATE SET price=${decStr(slab.price)}, max_qty=${esc(slab.maxQty)};`
      );
    }

    if (inventory) {
      block.push(
        `  INSERT INTO inventory (id, product_id, vendor_id, qty_available, qty_reserved, low_stock_threshold, updated_at)` +
        ` VALUES (gen_random_uuid(), v_prod_id, v_vendor_id, ${inventory.qtyAvailable}, ${inventory.qtyReserved}, ${inventory.lowStockThreshold}, ${esc(inventory.updatedAt)})` +
        ` ON CONFLICT (product_id) DO UPDATE SET qty_available=${inventory.qtyAvailable}, qty_reserved=${inventory.qtyReserved};`
      );
    }

    block.push(`END $$;`);
    lines.push(block.join('\n'));
    lines.push('');
  }

  lines.push(`-- Done: ${cats.length} categories, ${products.length} products`);
  lines.push('');

  process.stdout.write(lines.join('\n') + '\n');
  process.stderr.write(`✅ SQL generated: ${cats.length} categories, ${products.length} products\n`);
}

main()
  .catch(e => { process.stderr.write('❌ ' + e.message + '\n'); process.exit(1); })
  .finally(() => local.$disconnect());
