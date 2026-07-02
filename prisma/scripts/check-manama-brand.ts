import { prisma } from '../../src/lib/prisma';

async function main() {
  const brands = await prisma.brand.findMany({
    where: { name: { contains: 'Manama', mode: 'insensitive' } },
    select: {
      id: true, name: true, slug: true, approvalStatus: true, isActive: true,
      user: { select: { email: true } },
      _count: { select: { masterProducts: true, authorizedDistributors: true } },
    },
  });
  console.log('Brands:', JSON.stringify(brands, null, 2));

  const slug = 'the-manama-store-c504bf93';
  const bySlug = await prisma.brand.findFirst({ where: { slug } });
  console.log('\nLookup slug', slug, ':', bySlug ? 'FOUND' : 'NOT FOUND');

  const auths = await prisma.brandAuthorizedDistributor.findMany({
    where: { brand: { name: { contains: 'Manama', mode: 'insensitive' } } },
    include: { vendor: { select: { businessName: true } } },
  });
  console.log('\nAuthorized distributors:', JSON.stringify(auths, null, 2));

  const corrupt = await prisma.brandMasterProduct.findMany({
    where: { brand: { name: { contains: 'Manama', mode: 'insensitive' } } },
    select: { name: true, sku: true, packSize: true, unit: true },
    take: 10,
  });
  console.log('\nMaster products sample:', JSON.stringify(corrupt, null, 2));
}

main().finally(() => prisma.$disconnect());
