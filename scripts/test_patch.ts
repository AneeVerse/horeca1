import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const id = '70bf48a0-cf37-4dbd-82b4-8ef53e51f4b3';
  const body = { hsn: '111111' };

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: body,
    });
    console.log('Update successful:', updated);
  } catch (err: any) {
    console.error('Update failed with error:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
