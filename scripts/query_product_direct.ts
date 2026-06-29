import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const productId = '9f639bc8-f708-44af-8a22-6533fac9e4fd';
  console.log('Querying product:', productId);
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  console.log(JSON.stringify(product, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
