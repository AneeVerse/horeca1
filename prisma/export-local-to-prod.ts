/**
 * export-local-to-prod.ts
 *
 * Reads all core data from LOCAL DB and upserts it into PRODUCTION DB.
 * Run this whenever you add products/vendors/categories locally and want them on prod.
 *
 * Usage:
 *   LOCAL_DB_URL="postgresql://horeca1:horeca1_dev@localhost:5432/horeca1" \
 *   PROD_DB_URL="postgresql://horeca1:5RWoLMyTN6fyA27EXpsf0w11@64.227.187.210:5432/horeca1" \
 *   npx tsx prisma/export-local-to-prod.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const localUrl  = process.env.LOCAL_DB_URL  || process.env.DATABASE_URL!;
const prodUrl   = process.env.PROD_DB_URL!;

if (!prodUrl) {
  console.error('❌ PROD_DB_URL is required');
  process.exit(1);
}

const local = new PrismaClient({ adapter: new PrismaPg({ connectionString: localUrl }) });
const prod  = new PrismaClient({ adapter: new PrismaPg({ connectionString: prodUrl  }) });

async function main() {
  console.log('🚀 Starting local → production sync...\n');

  // ── Categories ───────────────────────────────────────────────────────────
  const categories = await local.category.findMany();
  for (const cat of categories) {
    await prod.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name, slug: cat.slug,
        imageUrl: cat.imageUrl, isActive: cat.isActive, sortOrder: cat.sortOrder,
        parentId: cat.parentId,
      },
      create: cat,
    });
  }
  console.log(`✅ Categories: ${categories.length} synced`);

  // ── Vendors (users + vendor profiles) ───────────────────────────────────
  const vendorUsers = await local.user.findMany({ where: { role: 'vendor' } });
  for (const u of vendorUsers) {
    await prod.user.upsert({
      where: { id: u.id },
      update: { fullName: u.fullName, phone: u.phone, isActive: u.isActive },
      create: u,
    });
  }

  const vendors = await local.vendor.findMany({ include: { serviceAreas: true, deliverySlots: true } });
  for (const { serviceAreas, deliverySlots, ...v } of vendors) {
    await prod.vendor.upsert({
      where: { id: v.id },
      update: {
        businessName: v.businessName, slug: v.slug, logoUrl: v.logoUrl,
        coverImageUrl: v.coverImageUrl, description: v.description,
        address: v.address, city: v.city, pincode: v.pincode, state: v.state,
        phone: v.phone, email: v.email, gstin: v.gstin, fssai: v.fssai,
        rating: v.rating, totalRatings: v.totalRatings,
        minOrderValue: v.minOrderValue, isActive: v.isActive,
        approvalStatus: v.approvalStatus,
      },
      create: v,
    });

    for (const sa of serviceAreas) {
      await prod.vendorServiceArea.upsert({
        where: { id: sa.id },
        update: { pincode: sa.pincode, isActive: sa.isActive },
        create: sa,
      });
    }

    for (const ds of deliverySlots) {
      await prod.deliverySlot.upsert({
        where: { id: ds.id },
        update: { dayOfWeek: ds.dayOfWeek, slotLabel: ds.slotLabel, cutoffHour: ds.cutoffHour, isActive: ds.isActive },
        create: ds,
      });
    }
  }
  console.log(`✅ Vendors: ${vendors.length} synced (with service areas + delivery slots)`);

  // ── Products ─────────────────────────────────────────────────────────────
  const products = await local.product.findMany({ include: { priceSlabs: true, inventory: true } });
  for (const { priceSlabs, inventory, ...p } of products) {
    await prod.product.upsert({
      where: { id: p.id },
      update: {
        vendorId: p.vendorId, categoryId: p.categoryId, name: p.name, slug: p.slug,
        description: p.description, imageUrl: p.imageUrl, images: p.images,
        packSize: p.packSize, unit: p.unit, basePrice: p.basePrice,
        originalPrice: p.originalPrice, taxPercent: p.taxPercent,
        sku: p.sku, hsn: p.hsn, brand: p.brand, barcode: p.barcode, tags: p.tags,
        isActive: p.isActive, approvalStatus: p.approvalStatus, sortOrder: p.sortOrder,
        minOrderQty: p.minOrderQty, maxOrderQty: p.maxOrderQty,
      },
      create: p,
    });

    for (const slab of priceSlabs) {
      await prod.productPriceSlab.upsert({
        where: { id: slab.id },
        update: { minQty: slab.minQty, maxQty: slab.maxQty, price: slab.price },
        create: slab,
      });
    }

    if (inventory) {
      await prod.inventory.upsert({
        where: { productId: inventory.productId },
        update: { stock: inventory.stock, reserved: inventory.reserved, lowStockThreshold: inventory.lowStockThreshold },
        create: inventory,
      });
    }
  }
  console.log(`✅ Products: ${products.length} synced (with price slabs + inventory)`);

  // ── Collections ──────────────────────────────────────────────────────────
  const collections = await local.collection.findMany({ include: { products: true } });
  for (const { products: collProducts, ...c } of collections) {
    await prod.collection.upsert({
      where: { id: c.id },
      update: { title: c.title, slug: c.slug, description: c.description, imageUrl: c.imageUrl, isActive: c.isActive, sortOrder: c.sortOrder },
      create: c,
    });
    // Sync collection ↔ product links
    await prod.collectionProduct.deleteMany({ where: { collectionId: c.id } });
    for (const cp of collProducts) {
      // Only link products that exist on prod
      const exists = await prod.product.findUnique({ where: { id: cp.productId } });
      if (exists) {
        await prod.collectionProduct.create({ data: { collectionId: cp.collectionId, productId: cp.productId, sortOrder: cp.sortOrder } });
      }
    }
  }
  console.log(`✅ Collections: ${collections.length} synced`);

  console.log('\n🎉 Sync complete! All local data is now on production.');
}

main()
  .catch(e => { console.error('❌ Sync failed:', e.message); process.exit(1); })
  .finally(() => Promise.all([local.$disconnect(), prod.$disconnect()]));
