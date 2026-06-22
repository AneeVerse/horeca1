/**
 * Reset the catalog to a blank slate — FULL CATALOG WIPE.
 *
 * WHY: Pre-launch the catalog is full of dummy products. This wipes the entire
 * product catalog so you can start fresh, while preserving order/cart/list
 * *shells* and promotion/coupon records (only the rows that block a product
 * delete are removed — see "Minimal" handling below).
 *
 * WHAT IT DELETES (in FK-safe order, inside one transaction):
 *   Catalog (the "fresh start" target):
 *     - products            (+ cascades: price_slabs, inventory, product_categories,
 *                             collection_products, combo_items, brand_product_mappings,
 *                             price_list_items, vendor_customer_prices)
 *     - brand_master_products
 *     - master_products
 *     - product_combos
 *     - collections
 *     - categories          (the whole category tree)
 *   Blocking rows (non-cascading refs that would otherwise reject the delete):
 *     - order_items, cart_items, quick_order_list_items   (rows only — order/cart/list shells stay)
 *     - promotions.buyProductId / getProductId            (nulled — promotion rows stay)
 *
 * WHAT IT KEEPS: orders, carts, quick_order_lists, price_lists, promotions,
 * coupons, brands, vendors, users — only emptied of catalog references.
 * NOTE: stale UUIDs left in array columns (coupon.product_ids / category_ids,
 * product.substitute_ids) are not cleaned — those rows are deleted anyway here,
 * and coupon arrays are left untouched by design (minimal).
 *
 * Usage (from repo root):
 *   npx tsx prisma/scripts/reset-catalog.ts            # DRY RUN — counts only, no writes
 *   npx tsx prisma/scripts/reset-catalog.ts --yes      # actually wipe
 *
 * Targets whatever DATABASE_URL points at. To wipe prod, open the tunnel
 * (`npm run tunnel`) and point DATABASE_URL at the tunnelled DB first.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CONFIRM = process.argv.includes('--yes');

async function counts() {
  const [
    products,
    masterProducts,
    brandMasterProducts,
    categories,
    collections,
    productCombos,
    priceSlabs,
    inventory,
    orderItems,
    cartItems,
    quickOrderListItems,
    promosWithProductRef,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.masterProduct.count(),
    prisma.brandMasterProduct.count(),
    prisma.category.count(),
    prisma.collection.count(),
    prisma.productCombo.count(),
    prisma.priceSlab.count(),
    prisma.inventory.count(),
    prisma.orderItem.count(),
    prisma.cartItem.count(),
    prisma.quickOrderListItem.count(),
    prisma.promotion.count({
      where: { OR: [{ buyProductId: { not: null } }, { getProductId: { not: null } }] },
    }),
  ]);
  return {
    products,
    masterProducts,
    brandMasterProducts,
    categories,
    collections,
    productCombos,
    priceSlabs,
    inventory,
    orderItems,
    cartItems,
    quickOrderListItems,
    promosWithProductRef,
  };
}

async function main() {
  console.log(`\n  Catalog reset — ${CONFIRM ? 'LIVE RUN (--yes)' : 'DRY RUN'}`);
  console.log(`  DATABASE_URL host: ${maskHost(process.env.DATABASE_URL)}\n`);

  const before = await counts();
  console.log('  Current rows that will be deleted / cleared:');
  console.log('  ┌─ catalog (deleted)');
  console.log(`  │   products .............. ${before.products}`);
  console.log(`  │     ├ price_slabs ....... ${before.priceSlabs}   (cascade)`);
  console.log(`  │     └ inventory ......... ${before.inventory}   (cascade)`);
  console.log(`  │   master_products ....... ${before.masterProducts}`);
  console.log(`  │   brand_master_products . ${before.brandMasterProducts}`);
  console.log(`  │   product_combos ........ ${before.productCombos}`);
  console.log(`  │   collections ........... ${before.collections}`);
  console.log(`  │   categories ............ ${before.categories}`);
  console.log('  └─ blocking refs (minimal)');
  console.log(`      order_items .......... ${before.orderItems}   (rows; orders kept)`);
  console.log(`      cart_items ........... ${before.cartItems}   (rows; carts kept)`);
  console.log(`      quick_list_items ..... ${before.quickOrderListItems}   (rows; lists kept)`);
  console.log(`      promotions w/ ref .... ${before.promosWithProductRef}   (nulled; promos kept)`);

  if (!CONFIRM) {
    console.log('\n  DRY RUN — nothing was written. Re-run with --yes to execute.\n');
    return;
  }

  console.log('\n  Executing wipe in a transaction…');
  await prisma.$transaction(
    async (tx) => {
      // 1. Clear blocking, non-cascading product references (minimal: keep shells).
      await tx.orderItem.deleteMany({});
      await tx.cartItem.deleteMany({});
      await tx.quickOrderListItem.deleteMany({});
      await tx.promotion.updateMany({ data: { buyProductId: null, getProductId: null } });

      // 2. Break category self-reference so categories can delete in any order.
      await tx.category.updateMany({ data: { parentId: null } });

      // 3. Delete catalog parents (children cascade automatically).
      await tx.product.deleteMany({}); // cascades slabs, inventory, product_categories,
      //                                  collection_products, combo_items, brand_product_mappings,
      //                                  price_list_items, vendor_customer_prices
      await tx.brandMasterProduct.deleteMany({}); // cascades remaining brand_product_mappings
      await tx.masterProduct.deleteMany({}); // safe now: no products reference it
      await tx.productCombo.deleteMany({});
      await tx.collection.deleteMany({});
      await tx.category.deleteMany({}); // safe now: no master_products reference it
    },
    { maxWait: 10_000, timeout: 120_000 }
  );

  const after = await counts();
  const remaining =
    after.products +
    after.masterProducts +
    after.brandMasterProducts +
    after.categories +
    after.collections +
    after.productCombos;
  console.log('\n  Done. Remaining catalog rows (expect all 0):');
  console.log(`    products=${after.products} master=${after.masterProducts} ` +
    `brandMaster=${after.brandMasterProducts} categories=${after.categories} ` +
    `collections=${after.collections} combos=${after.productCombos}`);
  console.log(remaining === 0 ? '\n  ✅ Catalog is empty — fresh start ready.\n'
    : `\n  ⚠️  ${remaining} catalog rows remain — investigate.\n`);
}

function maskHost(url?: string): string {
  if (!url) return '(DATABASE_URL not set)';
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}/${u.pathname.replace(/^\//, '')}`;
  } catch {
    return '(unparseable)';
  }
}

main()
  .catch((e) => {
    console.error('\n  ❌ Reset failed (transaction rolled back):\n', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
