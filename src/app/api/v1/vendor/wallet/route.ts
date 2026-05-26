// GET  /api/v1/vendor/wallet — Vendor wallet balance + transaction history
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
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
