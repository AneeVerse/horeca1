// GET  /api/v1/vendor/wallet — Vendor wallet balance + transaction history + payout info
// POST /api/v1/vendor/wallet — Admin-only: credit/debit adjustment
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';

export const GET = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const vendorId = await resolveVendorId(ctx, req);
    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor');
    const take = 30;

    // Ensure wallet exists (auto-create on first access)
    const wallet = await prisma.vendorWallet.upsert({
      where: { vendorId },
      create: { vendorId, balance: 0, pendingAmount: 0 },
      update: {},
    });

    const txns = await prisma.vendorWalletTxn.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = txns.length > take;
    const items = txns.slice(0, take);
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Next settlement date: every Monday
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const nextSettlement = new Date(now);
    nextSettlement.setDate(now.getDate() + daysUntilMonday);

    // Payout history — last 10 VendorSettlement records for this vendor
    const settlements = await prisma.vendorSettlement.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        netAmount: true,
        status: true,
        bankReference: true,
        periodStart: true,
        periodEnd: true,
        settledAt: true,
        createdAt: true,
      },
    });

    const payouts = settlements.map((s) => ({
      id: s.id,
      amount: Number(s.netAmount),
      status: s.status,
      reference: s.bankReference ?? null,
      periodStart: s.periodStart.toISOString().split('T')[0],
      periodEnd: s.periodEnd.toISOString().split('T')[0],
      settledAt: s.settledAt ? s.settledAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
    }));

    // Pending payout — sum of order_credit txns in the last 2 days
    // (these are earned but not yet settled)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const recentCredits = await prisma.vendorWalletTxn.aggregate({
      where: {
        walletId: wallet.id,
        type: 'order_credit',
        createdAt: { gte: twoDaysAgo },
      },
      _sum: { amount: true },
    });
    const pendingPayout = Number(recentCredits._sum.amount ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        wallet: {
          balance: wallet.balance,
          pendingAmount: wallet.pendingAmount,
          nextSettlementDate: nextSettlement.toISOString().split('T')[0],
        },
        transactions: items,
        nextCursor,
        payouts,
        pendingPayout,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
