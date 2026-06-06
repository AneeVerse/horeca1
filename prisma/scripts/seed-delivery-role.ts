/**
 * Seed the `delivery`-scope AccountRole template (Req 1: delivery sub-users).
 *
 * The original HCID migration (data_migrate.ts) seeded account/vendor/brand/admin
 * templates but NOT delivery, so delivery operators can't be provisioned. This
 * standalone, idempotent script adds it. Kept OUT of prisma/seed.ts (which is the
 * demo-data seed) so it can be run safely against prod via the tunnel:
 *
 *   npx tsx prisma/scripts/seed-delivery-role.ts
 *
 * The `delivery` RoleScope + its permission modules already exist in
 * src/lib/permissions/registry.ts.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const name = 'Delivery Agent';
  const existing = await prisma.accountRole.findFirst({
    where: { businessAccountId: null, name, isTemplate: true },
    select: { id: true },
  });

  const permissions = {
    dashboard: { view: true },
    orders: { view: true },
    dispatch: { view: true, edit: true },
    deliveries: { view: true, edit: true },
  };

  if (existing) {
    await prisma.accountRole.update({ where: { id: existing.id }, data: { permissions, scope: 'delivery' } });
    console.log('→ Delivery Agent template already present — refreshed.');
  } else {
    await prisma.accountRole.create({
      data: {
        businessAccountId: null,
        name,
        description: 'Field logistics — view assigned orders and manage dispatch / deliveries.',
        permissions,
        isTemplate: true,
        scope: 'delivery',
      },
    });
    console.log('✔ Delivery Agent role template created.');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
