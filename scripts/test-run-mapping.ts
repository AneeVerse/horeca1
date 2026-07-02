import { prisma } from '../src/lib/prisma';
import { runMappingForBrand } from '../src/modules/brand/brand-mapper';

async function main() {
  const brandName = 'Manama';
  const brand = await prisma.brand.findFirst({
    where: { name: { contains: brandName, mode: 'insensitive' } },
  });

  if (!brand) {
    console.log(`Brand "${brandName}" not found.`);
    return;
  }

  console.log(`Running mapping for brand "${brand.name}" (ID: ${brand.id})…`);
  await runMappingForBrand(brand.id);
  console.log('Mapping run successfully completed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
