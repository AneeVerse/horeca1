import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('Initializing pg Pool...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  console.log('Initializing PrismaPg with pool...');
  const adapter = new PrismaPg(pool);

  console.log('Initializing PrismaClient with adapter...');
  const prisma = new PrismaClient({ adapter });

  try {
    const productId = '9f639bc8-f708-44af-8a22-6533fac9e4fd';
    console.log('Querying product via Prisma with pg.Pool adapter:', productId);
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    console.log('Success! Product found:', product?.name);
  } catch (err) {
    console.error('Prisma query failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
