/**
 * Read-only production sanity pass. Counts only — performs NO writes.
 * Uses DATABASE_URL from .env (prod via SSH tunnel). Run: npx tsx scripts/qa_prod_healthcheck.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const url = (process.env.DATABASE_URL ?? '').replace(/:[^:@/]+@/, ':****@');
  console.log(`Datasource: ${url}\n`);

  const [users, vendors, brands, customers, businessAccounts, outlets, products, orders, roleTemplates] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.brand.count(),
    prisma.businessAccount.count({ where: { isCustomer: true } }),
    prisma.businessAccount.count(),
    prisma.outlet.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.accountRole.count({ where: { isTemplate: true } }),
  ]);

  console.log('── Counts ──');
  console.log(`  users=${users}  vendors=${vendors}  brands=${brands}  customerAccts=${customers}`);
  console.log(`  businessAccounts=${businessAccounts}  outlets=${outlets}  products=${products}  orders=${orders}`);
  console.log(`  roleTemplates=${roleTemplates}\n`);

  // Data-integrity probes (hcid_display is NOT NULL at DB level, so it can't be queried for null)
  const [prodNoMaster, prodNoCategory] = await Promise.all([
    prisma.product.count({ where: { masterProductId: null } }),
    prisma.product.count({ where: { categoryId: null } }),
  ]);

  console.log('── Integrity probes ──');
  console.log(`  role templates present:        ${roleTemplates >= 14 ? '✓ (' + roleTemplates + ')' : '⚠ (' + roleTemplates + ')'}`);
  console.log(`  products w/o master SKU:       ${prodNoMaster}  ${prodNoMaster === 0 ? '✓' : '⚠ (reassignment would fail for these — see Finding #4)'}`);
  console.log(`  products w/o category:         ${prodNoCategory}  ${prodNoCategory === 0 ? '✓' : '⚠ (cannot get a master SKU until categorised)'}`);
}

main()
  .catch((e) => { console.error('healthcheck failed:', e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
