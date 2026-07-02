import { prisma } from '../src/lib/prisma';

async function main() {
  const apply = process.argv.includes('--apply');
  const bmps = await prisma.brandMasterProduct.findMany({
    where: { masterProductId: null },
    include: { brand: true },
  });

  console.log(`Found ${bmps.length} BrandMasterProducts with null masterProductId. Attempting to link by name/brand…`);
  let linkedCount = 0;

  for (const bmp of bmps) {
    // Find a MasterProduct with the same brand name and product name (case-insensitive)
    const mp = await prisma.masterProduct.findFirst({
      where: {
        brand: { equals: bmp.brand.name.trim(), mode: 'insensitive' },
        name: { equals: bmp.name.trim(), mode: 'insensitive' },
      },
    });

    if (mp) {
      linkedCount++;
      console.log(`[LINK] "${bmp.name}" (${bmp.brand.name}) -> Master ID: ${mp.id} (SKU: ${mp.sku})`);
      if (apply) {
        // Link and copy fields
        await prisma.brandMasterProduct.update({
          where: { id: bmp.id },
          data: {
            masterProductId: mp.id,
            sku: mp.sku,
            packSize: mp.packSize || bmp.packSize,
            unit: mp.uom || bmp.unit,
          },
        });
      }
    } else {
      // Try fuzzy or partial name match? Let's stick to exact name + brand for safety
      console.log(`[NO MATCH] "${bmp.name}" (${bmp.brand.name})`);
    }
  }

  console.log(`\nMatched and ready to link: ${linkedCount} / ${bmps.length}`);
  if (!apply) {
    console.log('Dry run. Run with --apply to apply updates to the database.');
  } else {
    console.log(`Successfully linked and updated ${linkedCount} rows.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
