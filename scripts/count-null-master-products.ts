import { prisma } from '../src/lib/prisma';

async function main() {
  const bmps = await prisma.brandMasterProduct.findMany({
    select: { id: true, name: true, sku: true, masterProductId: true },
  });

  const nullMasters = bmps.filter(b => !b.masterProductId);
  console.log(`Out of ${bmps.length} BrandMasterProducts, ${nullMasters.length} have null masterProductId.`);
  for (const b of nullMasters.slice(0, 10)) {
    console.log(`- "${b.name}" SKU="${b.sku}"`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
