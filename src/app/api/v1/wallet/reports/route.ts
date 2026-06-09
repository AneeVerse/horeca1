// GET /api/v1/wallet/reports?type=overdue|utilization|interest|audit|all — admin only.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';

export const GET = adminOnly(async (req: NextRequest) => {
  try {
    const type = new URL(req.url).searchParams.get('type') || 'all';
    const data: Record<string, unknown> = {};
    const want = (t: string) => type === t || type === 'all';

    if (want('overdue')) {
      const rows = await prisma.creditWallet.findMany({
        where: { outstandingAmount: { gt: 0 }, currentDueDate: { lt: new Date() } },
        include: { user: { select: { fullName: true, phone: true } }, vendor: { select: { businessName: true } } },
        orderBy: { overdueDays: 'desc' },
      });
      data.overdue = rows.map((w) => ({
        customer: w.user.fullName,
        phone: w.user.phone,
        vendor: w.vendor?.businessName ?? 'H1 Wallet',
        creditLimit: Number(w.creditLimit),
        outstanding: Number(w.outstandingAmount),
        dueDate: w.currentDueDate,
        overdueDays: w.overdueDays,
        status: w.status,
        highlightRed: w.overdueDays > 15,
      }));
    }

    if (want('utilization')) {
      const wallets = await prisma.creditWallet.findMany({
        select: { creditLimit: true, usedCredit: true, outstandingAmount: true, status: true },
      });
      const repay = await prisma.creditWalletRepayment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } });
      data.utilization = {
        totalCreditIssued: wallets.reduce((a, w) => a + Number(w.creditLimit), 0),
        totalCreditUtilized: wallets.reduce((a, w) => a + Number(w.usedCredit), 0),
        totalRepayments: Number(repay._sum.amount ?? 0),
        outstandingAmount: wallets.reduce((a, w) => a + Number(w.outstandingAmount), 0),
        activeCustomers: wallets.filter((w) => w.status === 'ACTIVE').length,
        blacklistedCustomers: wallets.filter((w) => w.status === 'BLACKLISTED').length,
      };
    }

    if (want('interest')) {
      const rows = await prisma.creditWalletPenalty.findMany({
        where: { type: 'INTEREST' },
        include: { wallet: { include: { user: { select: { fullName: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      data.interest = rows.map((p) => ({
        customer: p.wallet.user.fullName,
        interestApplied: Number(p.amount),
        date: p.appliedDate,
        outstandingBaseAmount: Number(p.wallet.overdueBaseAmount ?? p.wallet.outstandingAmount),
      }));
    }

    if (want('audit')) {
      const rows = await prisma.creditWalletAuditLog.findMany({
        include: { wallet: { include: { user: { select: { fullName: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
      data.audit = rows.map((l) => ({
        customer: l.wallet.user.fullName,
        action: l.action,
        performedBy: l.performedBy,
        previousValue: l.previousValue,
        newValue: l.newValue,
        remarks: l.remarks,
        timestamp: l.createdAt,
      }));
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
});
