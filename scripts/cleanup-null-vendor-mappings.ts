import { prisma } from '../src/lib/prisma';

async function main() {
  const apply = process.argv.includes('--apply');

  // Find mappings where the product has vendorId = null
  const badMappings = await prisma.brandProductMapping.findMany({
    where: {
      distributorProduct: {
        vendorId: null,
      },
    },
    include: {
      distributorProduct: true,
    },
  });

  console.log(`Found ${badMappings.length} mappings linked to null-vendor products.`);
  for (const m of badMappings) {
    console.log(`- Mapping ${m.id} for product "${m.distributorProduct.name}" (Vendor: null)`);
  }

  if (badMappings.length === 0) {
    console.log('No bad mappings found.');
    return;
  }

  if (!apply) {
    console.log('Dry run. Run with --apply to delete these mappings.');
    return;
  }

  const ids = badMappings.map(m => m.id);
  const result = await prisma.brandProductMapping.deleteMany({
    where: {
      id: { in: ids },
    },
  });

  console.log(`Successfully deleted ${result.count} mappings.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
