/**
 * One-time: migrate the legacy CreditAccount rows into the unified CreditWallet.
 * Run AFTER the 20260607_credit_wallet migration is applied, via the tunnel:
 *   npx tsx prisma/scripts/migrate-creditaccount-to-wallet.ts --dry-run
 *   npx tsx prisma/scripts/migrate-creditaccount-to-wallet.ts
 * Idempotent — skips a (user,vendor) that already has a wallet.
 */
import 'dotenv/config';
import { PrismaClient, Prisma, CreditWalletStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DRY = process.argv.includes('--dry-run');

const STATUS: Record<string, CreditWalletStatus> = {
  active: 'ACTIVE', pending: 'ACTIVE', suspended: 'BLOCKED', closed: 'BLACKLISTED',
};

async function main() {
  const accounts = await prisma.creditAccount.findMany();
  console.log(`CreditAccounts found: ${accounts.length}${DRY ? ' (DRY RUN)' : ''}`);
  let created = 0, skipped = 0;

  for (const a of accounts) {
    const exists = await prisma.creditWallet.findFirst({ where: { userId: a.userId, vendorId: a.vendorId } });
    if (exists) { skipped++; continue; }

    const limit = a.creditLimit;
    const used = a.creditUsed;
    const available = limit.minus(used);
    if (DRY) { created++; continue; }

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.create({
        data: {
          userId: a.userId,
          vendorId: a.vendorId,
          status: STATUS[a.status] ?? 'ACTIVE',
          creditLimit: limit,
          usedCredit: used,
          outstandingAmount: used, // legacy creditUsed == amount owed
          availableCredit: available,
          overrideGracePeriod: a.graceDays || null,
          overrideBlacklistDays: a.freezeOnOverdueDays || null,
          overrideInterestRate: Number(a.interestRatePct) > 0 ? a.interestRatePct : null,
        },
      });
      await tx.creditWalletTxn.create({
        data: { walletId: wallet.id, type: 'CREDIT_ASSIGN', amount: limit, balanceAfterTxn: available, note: 'Migrated from legacy CreditAccount' },
      });
      if (used.greaterThan(0)) {
        await tx.creditWalletTxn.create({
          data: { walletId: wallet.id, type: 'ORDER_DEBIT', amount: used, balanceAfterTxn: available, note: 'Migrated outstanding from legacy CreditAccount' },
        });
      }
      await tx.creditWalletAuditLog.create({
        data: { walletId: wallet.id, action: 'MIGRATED', performedBy: 'SYSTEM', newValue: JSON.stringify({ from: 'CreditAccount', accountId: a.id, limit: Number(limit), used: Number(used) }), remarks: 'Legacy credit account migrated to unified wallet' },
      });
    });
    created++;
  }
  console.log(`Wallets created: ${created}, skipped (already had a wallet): ${skipped}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
