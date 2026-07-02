import { prisma } from '../src/lib/prisma';

async function main() {
  const products = await prisma.brandMasterProduct.findMany({
    select: { id: true, name: true, sku: true, packSize: true, unit: true },
    take: 30,
  });

  console.log('Sample BrandMasterProducts:');
  for (const p of products) {
    console.log(`- "${p.name}" SKU="${p.sku}" PackSize="${p.packSize}" Unit="${p.unit}"`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
