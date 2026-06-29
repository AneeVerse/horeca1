import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Cleaning up duplicate primary category links...');

  // 1. Clean up product categories
  const productCats = await prisma.productCategory.findMany({
    where: { isPrimary: true },
  });

  const productMap = new Map<string, typeof productCats>();
  for (const pc of productCats) {
    const list = productMap.get(pc.productId) ?? [];
    list.push(pc);
    productMap.set(pc.productId, list);
  }

  let productCleans = 0;
  for (const [productId, list] of productMap.entries()) {
    if (list.length > 1) {
      console.log(`Product ${productId} has ${list.length} primary categories. Resetting...`);
      const [primary, ...others] = list;
      for (const other of others) {
        await prisma.productCategory.update({
          where: {
            productId_categoryId: {
              productId: other.productId,
              categoryId: other.categoryId,
            },
          },
          data: { isPrimary: false },
        });
        productCleans++;
      }
    }
  }

  // 2. Clean up master product categories
  const masterCats = await prisma.masterProductCategory.findMany({
    where: { isPrimary: true },
  });

  const masterMap = new Map<string, typeof masterCats>();
  for (const mc of masterCats) {
    const list = masterMap.get(mc.masterProductId) ?? [];
    list.push(mc);
    masterMap.set(mc.masterProductId, list);
  }

  let masterCleans = 0;
  for (const [masterProductId, list] of masterMap.entries()) {
    if (list.length > 1) {
      console.log(`MasterProduct ${masterProductId} has ${list.length} primary categories. Resetting...`);
      const [primary, ...others] = list;
      for (const other of others) {
        await prisma.masterProductCategory.update({
          where: {
            masterProductId_categoryId: {
              masterProductId: other.masterProductId,
              categoryId: other.categoryId,
            },
          },
          data: { isPrimary: false },
        });
        masterCleans++;
      }
    }
  }

  console.log(`Cleaned up ${productCleans} product category duplicates and ${masterCleans} master product category duplicates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
