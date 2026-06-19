/**
 * One-time: set Order.paymentStatus = 'paid' for orders that were debited via
 * DiSCCO / H1 credit wallet at checkout but never had paymentStatus updated.
 *
 *   npx tsx prisma/scripts/backfill-credit-payment-status.ts --dry-run
 *   npx tsx prisma/scripts/backfill-credit-payment-status.ts
 *
 * Idempotent — only updates orders still marked unpaid with a matching ORDER_DEBIT
 * and no subsequent REVERSAL (cancelled orders are skipped).
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DRY = process.argv.includes('--dry-run');

async function main() {
  const debits = await prisma.creditWalletTxn.findMany({
    where: { type: 'ORDER_DEBIT', referenceId: { not: null } },
    select: { referenceId: true, walletId: true },
  });

  const reversed = new Set(
    (
      await prisma.creditWalletTxn.findMany({
        where: { type: 'REVERSAL', referenceId: { not: null } },
        select: { referenceId: true },
      })
    ).map((t) => t.referenceId as string),
  );

  const orderIds = [...new Set(
    debits
      .map((d) => d.referenceId as string)
      .filter((id) => id && !reversed.has(id)),
  )];

  const unpaid = await prisma.order.findMany({
    where: { id: { in: orderIds }, paymentStatus: 'unpaid', status: { not: 'cancelled' } },
    select: { id: true, orderNumber: true, paymentMethod: true },
  });

  console.log(`ORDER_DEBIT orders (active): ${orderIds.length}`);
  console.log(`Still unpaid (to fix): ${unpaid.length}${DRY ? ' (DRY RUN)' : ''}`);

  if (unpaid.length === 0) return;

  for (const o of unpaid) {
    console.log(`  ${o.orderNumber} (${o.id}) method=${o.paymentMethod ?? '—'}`);
  }

  if (DRY) return;

  const { count } = await prisma.order.updateMany({
    where: { id: { in: unpaid.map((o) => o.id) } },
    data: { paymentStatus: 'paid' },
  });
  console.log(`Updated ${count} order(s) to paymentStatus=paid`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
