/**
 * One-off: verify H1-SKU-00012 master category links (parent vs leaf).
 * Run: npx tsx scripts/verify-butter-master.ts
 */
import { prisma } from '../src/lib/prisma';

const SKU = 'H1-SKU-00012';

async function main() {
  const mp = await prisma.masterProduct.findFirst({
    where: { sku: { equals: SKU, mode: 'insensitive' } },
    include: {
      category: { select: { id: true, name: true, parentId: true, _count: { select: { children: true } } } },
      categoryLinks: {
        include: { category: { select: { id: true, name: true, parentId: true, _count: { select: { children: true } } } } },
      },
    },
  });

  if (!mp) {
    console.log(`Master product ${SKU} not found.`);
    return;
  }

  const cat = mp.category;
  const isParent = cat._count.children > 0;
  console.log('SKU:', mp.sku);
  console.log('categoryId:', mp.categoryId, cat.name, isParent ? '(PARENT)' : '(leaf)');
  console.log('categoryLinks:', mp.categoryLinks.length);
  for (const link of mp.categoryLinks) {
    const c = link.category;
    const leaf = c._count.children === 0;
    console.log(`  - ${c.name} ${leaf ? '(leaf)' : '(parent)'} isPrimary=${link.isPrimary}`);
  }

  if (isParent && mp.categoryLinks.length === 0) {
    const butter = await prisma.category.findFirst({
      where: {
        name: { contains: 'butter', mode: 'insensitive' },
        parentId: cat.id,
        isActive: true,
      },
      select: { id: true, name: true },
    });
    if (butter) {
      console.log(`\nFix: adding leaf link "${butter.name}" (${butter.id})`);
      await prisma.masterProductCategory.create({
        data: {
          masterProductId: mp.id,
          categoryId: butter.id,
          isPrimary: true,
        },
      });
      await prisma.masterProduct.update({
        where: { id: mp.id },
        data: { categoryId: butter.id },
      });
      console.log('Done — master categoryId + primary link updated.');
    } else {
      console.log('\nNo Butter sub-category under', cat.name, '— manual admin fix required.');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
