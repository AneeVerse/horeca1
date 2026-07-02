import { prisma } from '../src/lib/prisma';

async function main() {
  const masters = await prisma.masterProduct.findMany({
    select: { id: true, name: true, sku: true, packSize: true, uom: true },
    take: 30,
  });

  console.log('Sample MasterProducts:');
  for (const m of masters) {
    console.log(`- "${m.name}" SKU="${m.sku}" PackSize="${m.packSize}" UOM="${m.uom}"`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
