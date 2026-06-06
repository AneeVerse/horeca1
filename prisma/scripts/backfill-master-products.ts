/**
 * Backfill MasterProduct (Horeca1 canonical SKU) for every existing vendor Product.
 *
 * WHY: P0-1 introduces a central item master. Existing per-vendor products must be
 * grouped into masters before the FK can be enforced. Run this once AFTER the
 * `20260606_master_product` migration is applied, while the tunnel to the prod DB
 * is up (`npm run tunnel` in another terminal).
 *
 * Usage (from repo root):
 *   npx tsx prisma/scripts/backfill-master-products.ts --dry-run        # report only, no writes
 *   npx tsx prisma/scripts/backfill-master-products.ts                  # create masters + link products
 *   npx tsx prisma/scripts/backfill-master-products.ts --enforce-not-null
 *        # after a clean backfill (0 unlinked), flips products.master_product_id to NOT NULL
 *
 * Idempotent: re-running reuses masters already linked and only links the rest.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { formatMasterSku } from '../../src/lib/sku';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes('--dry-run');
const ENFORCE_NOT_NULL = process.argv.includes('--enforce-not-null');

const UNCATEGORIZED_ROOT_SLUG = 'uncategorized';
const UNCATEGORIZED_LEAF_SLUG = 'uncategorized-general';

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

async function ensureUncategorizedLeaf(): Promise<string> {
  const existingLeaf = await prisma.category.findUnique({
    where: { slug: UNCATEGORIZED_LEAF_SLUG },
    select: { id: true },
  });
  if (existingLeaf) return existingLeaf.id;
  if (DRY_RUN) return '(would-create-uncategorized-leaf)';

  let root = await prisma.category.findUnique({
    where: { slug: UNCATEGORIZED_ROOT_SLUG },
    select: { id: true },
  });
  if (!root) {
    root = await prisma.category.create({
      data: { name: 'Uncategorized', slug: UNCATEGORIZED_ROOT_SLUG, isActive: false, approvalStatus: 'approved' },
      select: { id: true },
    });
  }
  const leaf = await prisma.category.create({
    data: {
      name: 'Uncategorized — General',
      slug: UNCATEGORIZED_LEAF_SLUG,
      parentId: root.id,
      isActive: false,
      approvalStatus: 'approved',
    },
    select: { id: true },
  });
  return leaf.id;
}

async function main() {
  console.log(`\n=== MasterProduct backfill ${DRY_RUN ? '(DRY RUN)' : ''} ===`);

  // 1. Leaf-category lookup: a category is a leaf (terminal) if it has no children.
  // Matches assertLeafCategory — a flat top-level category with no children is a
  // valid terminal category, so products keep their real category instead of
  // defaulting to Uncategorized.
  const categories = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const hasChildren = new Set(categories.map((c) => c.parentId).filter((p): p is string => !!p));
  const knownIds = new Set(categories.map((c) => c.id));
  const isLeaf = (id: string | null | undefined): boolean =>
    !!id && knownIds.has(id) && !hasChildren.has(id);

  // 2. Load every product with the fields a master needs.
  const products = await prisma.product.findMany({
    select: {
      id: true, name: true, brand: true, unit: true, taxPercent: true,
      imageUrl: true, images: true, tags: true, categoryId: true, masterProductId: true,
      categoryLinks: { select: { categoryId: true, isPrimary: true } },
    },
  });
  console.log(`Products found: ${products.length}`);

  // 3. Group by normalized name + brand.
  const groups = new Map<string, typeof products>();
  for (const p of products) {
    const key = `${norm(p.name)}|${norm(p.brand)}`;
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  console.log(`Distinct master groups: ${groups.size}`);

  const uncategorizedLeafId = await ensureUncategorizedLeaf();

  // Seed the SKU counter from the current max.
  const lastMaster = await prisma.masterProduct.findFirst({ orderBy: { sku: 'desc' }, select: { sku: true } });
  let skuCounter = lastMaster ? (parseInt(lastMaster.sku.match(/(\d+)\s*$/)?.[1] ?? '0', 10)) : 0;

  let created = 0;
  let linked = 0;
  let reused = 0;
  let usedUncategorized = 0;

  for (const group of groups.values()) {
    // Idempotency: reuse a master already linked to any product in the group.
    const alreadyLinked = group.find((p) => p.masterProductId)?.masterProductId ?? null;
    let masterId = alreadyLinked;

    if (masterId) {
      reused++;
    } else {
      // Pick a leaf category from the group's products (prefer a primary leaf).
      let categoryId: string | null = null;
      for (const p of group) {
        const primary = p.categoryLinks.find((l) => l.isPrimary)?.categoryId ?? p.categoryId;
        if (isLeaf(primary)) { categoryId = primary; break; }
      }
      if (!categoryId) {
        for (const p of group) {
          const anyLeaf = p.categoryLinks.map((l) => l.categoryId).find((cid) => isLeaf(cid));
          if (anyLeaf) { categoryId = anyLeaf; break; }
        }
      }
      if (!categoryId) { categoryId = uncategorizedLeafId; usedUncategorized++; }

      const rep = group[0];
      const aliasNames = [...new Set(group.map((p) => p.name).filter((n) => n !== rep.name))];
      const searchKeywords = [...new Set(group.flatMap((p) => p.tags))];

      if (DRY_RUN) {
        masterId = '(dry-run)';
        created++;
      } else {
        skuCounter++;
        const master = await prisma.masterProduct.create({
          data: {
            sku: formatMasterSku(skuCounter),
            name: rep.name,
            aliasNames,
            brand: rep.brand,
            uom: rep.unit,
            taxPercent: rep.taxPercent,
            imageUrl: rep.imageUrl,
            images: rep.images,
            searchKeywords,
            categoryId,
          },
          select: { id: true },
        });
        masterId = master.id;
        created++;
      }
    }

    // Link any unlinked products in the group.
    const toLink = group.filter((p) => !p.masterProductId).map((p) => p.id);
    if (toLink.length && !DRY_RUN && masterId && masterId !== '(dry-run)') {
      await prisma.product.updateMany({ where: { id: { in: toLink } }, data: { masterProductId: masterId } });
    }
    linked += toLink.length;
  }

  console.log(`\nMasters created: ${created} (reused existing: ${reused})`);
  console.log(`Products linked: ${linked}`);
  console.log(`Groups defaulted to Uncategorized leaf: ${usedUncategorized}`);

  const remaining = await prisma.product.count({ where: { masterProductId: null } });
  console.log(`Products still NULL master_product_id: ${remaining}`);

  if (ENFORCE_NOT_NULL) {
    if (DRY_RUN) {
      console.log('--enforce-not-null ignored in --dry-run.');
    } else if (remaining === 0) {
      await prisma.$executeRawUnsafe('ALTER TABLE "products" ALTER COLUMN "master_product_id" SET NOT NULL');
      console.log('✔ products.master_product_id is now NOT NULL.');
    } else {
      console.log(`✗ Refusing to SET NOT NULL — ${remaining} products still unlinked. Re-run backfill first.`);
      process.exitCode = 1;
    }
  } else if (remaining === 0) {
    console.log('\nAll products linked. Re-run with --enforce-not-null to harden the column.');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
