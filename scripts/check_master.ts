import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const master = await prisma.masterProduct.findUnique({
    where: { sku: 'H1-SKU-00146' },
    include: {
      vendorProducts: {
        include: {
          vendor: true,
        },
      },
    },
  });
  console.log('Master Product H1-SKU-00146:', {
    id: master?.id,
    sku: master?.sku,
    name: master?.name,
    brand: master?.brand,
    categoryId: master?.categoryId,
    vendorProducts: master?.vendorProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      vendorSku: p.vendorSku,
      basePrice: p.basePrice.toString(),
      vendorId: p.vendorId,
      vendorBusinessName: p.vendor?.businessName,
    })),
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
