// GET  /api/v1/vendor/collections — List all credit accounts for this vendor with aging data
// POST /api/v1/vendor/collections — Activate a new credit account for a customer
// WHY: Vendors need visibility into customer outstanding balances, who is overdue, and
//      total exposure so they can act (send reminders, record payments, freeze credit).
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId, resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { creditWalletService } from '@/modules/credit/creditWallet.service';

function agingBucket(daysOverdue: number) {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);

    const wallets = await prisma.creditWallet.findMany({
      where: { vendorId },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, businessName: true } },
        penalties: { where: { status: 'APPLIED' }, select: { type: true, amount: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();

    const data = wallets.map((w) => {
      const creditUsed = Number(w.outstandingAmount);
      const daysOverdue = w.overdueDays;
      const effectiveDaysOverdue = Math.max(0, daysOverdue);
      const overdueAmount = creditUsed > 0 && effectiveDaysOverdue > 0 ? creditUsed : 0;

      const accruedInterest = w.penalties
        .filter((p) => p.type === 'INTEREST')
        .reduce((s, p) => s + Number(p.amount), 0);
      const accruedPenalty = w.penalties
        .filter((p) => p.type === 'LATE_FEE')
        .reduce((s, p) => s + Number(p.amount), 0);

      const legacyStatus =
        w.status === 'BLACKLISTED' ? 'suspended' : w.status === 'BLOCKED' ? 'suspended' : 'active';

      return {
        id: w.id,
        status: legacyStatus,
        creditLimit: Number(w.creditLimit),
        creditUsed,
        creditAvailable: Number(w.availableCredit),
        overdueAmount,
        daysOverdue: effectiveDaysOverdue,
        aging: agingBucket(effectiveDaysOverdue),
        accruedInterest,
        accruedPenalty,
        totalDue: creditUsed + accruedInterest + accruedPenalty,
        graceDays: w.overrideGracePeriod ?? 0,
        interestRatePct: w.overrideInterestRate != null ? Number(w.overrideInterestRate) : 0,
        penaltyRatePct: w.overridePenaltyAmount != null ? Number(w.overridePenaltyAmount) : 0,
        freezeOnOverdueDays: w.overrideBlacklistDays ?? 0,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        user: w.user,
        walletStatus: w.status,
        currentDueDate: w.currentDueDate,
      };
    });

    // Summary aggregates for the stats bar
    const totalOutstanding = data.reduce((s, a) => s + a.creditUsed, 0);
    const totalOverdue = data.reduce((s, a) => s + a.overdueAmount, 0);
    const totalLimit = data.reduce((s, a) => s + a.creditLimit, 0);
    const totalInterestPenalty = data.reduce((s, a) => s + a.accruedInterest + a.accruedPenalty, 0);
    const dueToday = data.filter((a) => a.daysOverdue === 0 && a.creditUsed > 0).reduce((s, a) => s + a.creditUsed, 0);

    return NextResponse.json({
      success: true,
      data: {
        accounts: data,
        summary: { totalOutstanding, totalOverdue, dueToday, totalLimit, totalInterestPenalty, count: data.length },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

const createAccountSchema = z.object({
  userId: z.string().uuid(),
  creditLimit: z.number().positive(),
});

// Legacy endpoint kept for backward compatibility, but repointed to the
// CreditWallet engine: the old prisma.creditAccount.upsert wrote to the
// retired table that checkout never reads, so credit assigned here was
// invisible to the customer. New UI should call POST /api/v1/vendor/credit.
export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'creditLine.approve');

    const { userId, creditLimit } = createAccountSchema.parse(await req.json());

    const wallet = await creditWalletService.assignCredit(
      userId, vendorId, creditLimit, {}, ctx.userId, 'Credit assigned by vendor (collections)',
    );

    return NextResponse.json({ success: true, data: wallet });
  } catch (error) {
    return errorResponse(error);
  }
});
