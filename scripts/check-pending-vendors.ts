import { prisma } from '../src/lib/prisma';

async function main() {
  const pending = await prisma.brandProductMapping.findMany({
    where: { status: 'pending_review' },
    include: {
      distributorProduct: {
        include: {
          vendor: true,
        },
      },
    },
  });

  console.log(`Found ${pending.length} pending mappings:`);
  for (const m of pending) {
    const product = m.distributorProduct;
    console.log(`Mapping ID: ${m.id}`);
    console.log(`  Product ID: ${product?.id}`);
    console.log(`  Product Name: ${product?.name}`);
    console.log(`  Vendor ID: ${product?.vendorId}`);
    console.log(`  Vendor Name: ${product?.vendor?.businessName}`);
    console.log('---');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
