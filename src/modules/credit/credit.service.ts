// LEGACY SHIM — the CreditAccount-backed CreditService has been retired in favour
// of CreditWalletService. Do NOT add new prisma.creditAccount reads/writes — use
// creditWalletService instead.
// of the unified CreditWallet (see creditWallet.service.ts). Nothing in the app
// imports this anymore (the /credit/check, /apply and /signup routes were
// repointed to CreditWallet). It is kept as a thin, build-safe adapter that
// delegates to the unified system so any stray importer keeps working without
// touching the dead CreditAccount tables.
import { prisma } from '@/lib/prisma';
import { creditWalletService } from '@/modules/credit/creditWallet.service';

const num = (d: { toString(): string } | number | null) => (d == null ? 0 : Number(d));

export class CreditService {
  /** Read available credit for (user, vendor). vendorId null/'h1' → H1 wallet. */
  async check(userId: string, vendorId: string | null) {
    const where = { userId, vendorId: vendorId && vendorId !== 'h1' ? vendorId : null };
    const wallet = await prisma.creditWallet.findFirst({ where });
    if (!wallet) {
      return { credit_limit: 0, credit_used: 0, available: 0, status: 'none' as const };
    }
    return {
      credit_limit: num(wallet.creditLimit),
      credit_used: num(wallet.usedCredit),
      available: num(wallet.availableCredit),
      status: wallet.status,
    };
  }

  /** Eligibility for a Horeca1 credit line (≥ N successful orders). */
  async checkEligibility(userId: string) {
    return creditWalletService.checkEligibility(userId);
  }
}
