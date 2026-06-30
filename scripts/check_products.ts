import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const products = await prisma.product.findMany({
    where: {
      sku: {
        in: ['H1-SKU-00146', 'H1-SKU-00145', 'H1-SKU-00144'],
      },
    },
    include: {
      vendor: true,
      masterProduct: true,
    },
  });
  console.log('Query by SKU:', products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    vendorSku: p.vendorSku,
    basePrice: p.basePrice.toString(),
    taxPercent: p.taxPercent.toString(),
    vendorId: p.vendorId,
    vendorBusinessName: p.vendor?.businessName,
    masterProductId: p.masterProductId,
    masterSku: p.masterProduct?.sku,
  })));

  // Let's also query by name
  const byNames = await prisma.product.findMany({
    where: {
      name: {
        contains: 'Mealtime Oregano',
        mode: 'insensitive',
      },
    },
    include: {
      vendor: true,
      masterProduct: true,
    },
  });
  console.log('Query by Name:', byNames.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    vendorSku: p.vendorSku,
    basePrice: p.basePrice.toString(),
    taxPercent: p.taxPercent.toString(),
    vendorId: p.vendorId,
    vendorBusinessName: p.vendor?.businessName,
    masterProductId: p.masterProductId,
    masterSku: p.masterProduct?.sku,
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
