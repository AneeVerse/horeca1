import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const products = await prisma.product.findMany({
    where: {
      name: { contains: 'Mealtime Oregano Sprinkler' }
    },
    include: {
      category: true,
      masterProduct: true,
    }
  });

  console.log('Found products count:', products.length);
  for (const p of products) {
    console.log({
      id: p.id,
      name: p.name,
      sku: p.sku,
      vendorSku: p.vendorSku,
      masterSku: p.masterProduct?.sku,
      categoryId: p.categoryId,
      categoryName: p.category?.name,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
