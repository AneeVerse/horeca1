import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      sku: true,
      metadata: true,
    }
  });

  console.log('Most recent products metadata:');
  for (const p of products) {
    console.log(`Product: ${p.name} (SKU: ${p.sku})`);
    console.log('Metadata:', JSON.stringify(p.metadata, null, 2));
    console.log('----------------------------------------------------');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
