import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { assertLeafCategory } from '../src/modules/catalog/catalog.service';

async function main() {
  const id = '70bf48a0-cf37-4dbd-82b4-8ef53e51f4b3';
  const categoryId = 'da6e350a-2b18-4671-b1e1-b606cc7a2f06';

  console.log('Testing assertLeafCategory...');
  try {
    await assertLeafCategory([categoryId]);
    console.log('assertLeafCategory passed!');
  } catch (err: any) {
    console.error('assertLeafCategory failed:', err.message || err);
  }

  const body = {
    hsn: '111111',
    categoryId,
  };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // simulate product categories deletion/creation
      const updated = await tx.product.update({
        where: { id },
        data: body,
      });
      return updated;
    });
    console.log('Full transaction successful:', updated);
  } catch (err: any) {
    console.error('Full transaction failed:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
