import { prisma } from '../src/lib/prisma';

async function main() {
  const apply = process.argv.includes('--apply');
  const bmps = await prisma.brandMasterProduct.findMany({
    include: {
      masterProduct: true,
    },
  });

  console.log(`Found ${bmps.length} BrandMasterProducts. Checking for corruptions…`);
  let fixedCount = 0;

  for (const bmp of bmps) {
    const mp = bmp.masterProduct;
    if (!mp) {
      // No linked master product, skip
      continue;
    }

    let needsUpdate = false;
    const updateData: any = {};

    // 1. If BrandMasterProduct SKU is incorrect (e.g. piece, pcs, bottle, or empty) and MasterProduct has a valid SKU
    if (mp.sku && bmp.sku !== mp.sku) {
      needsUpdate = true;
      updateData.sku = mp.sku;
      console.log(`[BMP: ${bmp.name}] SKU mismatch: "${bmp.sku}" -> "${mp.sku}"`);
    }

    // 2. If BrandMasterProduct packSize differs from MasterProduct packSize
    if (mp.packSize && bmp.packSize !== mp.packSize) {
      needsUpdate = true;
      updateData.packSize = mp.packSize;
      console.log(`[BMP: ${bmp.name}] PackSize mismatch: "${bmp.packSize}" -> "${mp.packSize}"`);
    }

    // 3. If BrandMasterProduct unit differs from MasterProduct uom
    if (mp.uom && bmp.unit !== mp.uom) {
      needsUpdate = true;
      updateData.unit = mp.uom;
      console.log(`[BMP: ${bmp.name}] Unit/UOM mismatch: "${bmp.unit}" -> "${mp.uom}"`);
    }

    if (needsUpdate) {
      fixedCount++;
      if (apply) {
        await prisma.brandMasterProduct.update({
          where: { id: bmp.id },
          data: updateData,
        });
      }
    }
  }

  console.log(`Checked ${bmps.length} rows. Found ${fixedCount} rows needing correction.`);
  if (!apply) {
    console.log('Dry run. Run with --apply to write updates to the database.');
  } else {
    console.log(`Successfully updated ${fixedCount} rows.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
