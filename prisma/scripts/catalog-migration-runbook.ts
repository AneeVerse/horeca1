/**
 * Category M2M + listing status migration runbook.
 *
 * Usage:
 *   npx tsx prisma/scripts/catalog-migration-runbook.ts --dry-run
 *   npx tsx prisma/scripts/catalog-migration-runbook.ts --validate
 *
 * Pre-deploy: pg_dump backup (manual).
 * Rollback: restore dump + revert app if enum rename not yet applied.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const validateOnly = process.argv.includes('--validate');

async function counts() {
  const [products, masters, categoryLinks, nullMaster, draftCount] = await Promise.all([
    prisma.product.count(),
    prisma.masterProduct.count(),
    prisma.categoryCategory.count(),
    prisma.product.count({ where: { masterProductId: null } }),
    prisma.product.count({ where: { listingStatus: 'draft' } }),
  ]);
  return { products, masters, categoryLinks, nullMaster, draftCount };
}

async function productsWithoutPrimaryCategory(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM products p
    WHERE NOT EXISTS (
      SELECT 1 FROM product_categories pc
      WHERE pc.product_id = p.id AND pc.is_primary = true
    )
    AND p.category_id IS NOT NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  console.log('=== Catalog migration runbook ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : validateOnly ? 'VALIDATE' : 'LIVE COUNT'}`);

  const before = await counts();
  console.log('Pre/post counts:', before);

  const noPrimary = await productsWithoutPrimaryCategory();
  console.log('Products with category_id but no is_primary join:', noPrimary);

  if (validateOnly) {
    if (noPrimary > 0) {
      console.error('VALIDATION FAILED: products missing primary category');
      process.exit(1);
    }
    console.log('Validation OK');
    return;
  }

  if (dryRun) {
    console.log('Dry run — no writes. Would verify CategoryCategory backfill from parentId.');
    const orphans = await prisma.category.count({
      where: { parentId: { not: null }, parentLinks: { none: {} } },
    });
    console.log('Sub-categories without CategoryCategory M2M row:', orphans);
    return;
  }

  console.log('Live backfill not required if migration 20260629140000_category_m2m applied.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
