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

    const accounts = await prisma.creditAccount.findMany({
      where: { vendorId },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, businessName: true } },
        transactions: {
          where: { type: 'debit', dueDate: { not: null } },
          select: { dueDate: true, amount: true },
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();

    const data = accounts.map((acc) => {
      const overdueDebits = acc.transactions.filter(
        (t) => t.dueDate && t.dueDate < now,
      );
      const oldestDue = overdueDebits[0]?.dueDate ?? null;
      const daysOverdue = oldestDue
        ? Math.floor((now.getTime() - oldestDue.getTime()) / 86_400_000)
        : 0;

      // Grace period — overdue only counts after grace days pass
      const effectiveDaysOverdue = Math.max(0, daysOverdue - acc.graceDays);
      const overdueAmount = Number(acc.creditUsed) > 0 && effectiveDaysOverdue > 0
        ? Number(acc.creditUsed)
        : 0;

      // Accrued interest: monthly rate applied pro-rata (per day)
      const interestRate = Number(acc.interestRatePct) / 100;
      const accruedInterest = overdueAmount > 0 && interestRate > 0
        ? Math.round(overdueAmount * interestRate * (effectiveDaysOverdue / 30) * 100) / 100
        : 0;

      // Accrued penalty: flat daily rate on overdue amount
      const penaltyRate = Number(acc.penaltyRatePct) / 100;
      const accruedPenalty = overdueAmount > 0 && penaltyRate > 0
        ? Math.round(overdueAmount * penaltyRate * effectiveDaysOverdue * 100) / 100
        : 0;

      return {
        id: acc.id,
        status: acc.status,
        creditLimit: Number(acc.creditLimit),
        creditUsed: Number(acc.creditUsed),
        creditAvailable: Math.max(0, Number(acc.creditLimit) - Number(acc.creditUsed)),
        overdueAmount,
        daysOverdue: effectiveDaysOverdue,
        aging: agingBucket(effectiveDaysOverdue),
        accruedInterest,
        accruedPenalty,
        totalDue: overdueAmount + accruedInterest + accruedPenalty,
        graceDays: acc.graceDays,
        interestRatePct: Number(acc.interestRatePct),
        penaltyRatePct: Number(acc.penaltyRatePct),
        freezeOnOverdueDays: acc.freezeOnOverdueDays,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
        user: acc.user,
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

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'orders.edit');

    const { userId, creditLimit } = createAccountSchema.parse(await req.json());

    const account = await prisma.creditAccount.upsert({
      where: { userId_vendorId: { userId, vendorId } },
      update: { creditLimit, status: 'active' },
      create: { userId, vendorId, creditLimit, status: 'active' },
    });

    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    return errorResponse(error);
  }
});
