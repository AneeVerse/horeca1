// PATCH /api/v1/vendor/collections/:id — Update credit limit (CreditWallet)
// POST  /api/v1/vendor/collections/:id — Record offline payment or log dispute
// Legacy route id = CreditWallet id (repointed from CreditAccount).
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { creditWalletService } from '@/modules/credit/creditWallet.service';

function extractId(req: NextRequest) {
  return new URL(req.url).pathname.split('/').at(-1) ?? '';
}

const updateAccountSchema = z.object({
  creditLimit: z.number().positive().optional(),
  status: z.enum(['active', 'suspended', 'closed']).optional(),
  graceDays: z.number().int().min(0).max(365).optional(),
  interestRatePct: z.number().min(0).max(100).optional(),
  penaltyRatePct: z.number().min(0).max(100).optional(),
  freezeOnOverdueDays: z.number().int().min(0).max(365).optional(),
});

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'creditLine.approve');

    const walletId = extractId(req);
    const body = updateAccountSchema.parse(await req.json());

    const wallet = await prisma.creditWallet.findFirst({
      where: { id: walletId, vendorId },
    });
    if (!wallet) throw Errors.notFound('Credit wallet');

    if (body.creditLimit != null) {
      await creditWalletService.assignCredit(
        wallet.userId,
        vendorId,
        body.creditLimit,
        {
          gracePeriodDays: body.graceDays,
          interestRatePct: body.interestRatePct,
          penaltyAmount: body.penaltyRatePct,
          blacklistDays: body.freezeOnOverdueDays,
        },
        ctx.userId,
        'Credit updated via collections (legacy route)',
      );
    }

    return NextResponse.json({ success: true, data: { id: walletId } });
  } catch (error) {
    return errorResponse(error);
  }
});

const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().max(500).optional(),
});

const logDisputeSchema = z.object({
  action: z.literal('dispute'),
  note: z.string().min(1).max(1000),
});

const postBodySchema = z.union([recordPaymentSchema, logDisputeSchema]);

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'creditLine.approve');

    const walletId = extractId(req);
    const body = postBodySchema.parse(await req.json());

    const wallet = await prisma.creditWallet.findFirst({
      where: { id: walletId, vendorId },
    });
    if (!wallet) throw Errors.notFound('Credit wallet');

    if ('action' in body && body.action === 'dispute') {
      await prisma.creditWalletTxn.create({
        data: {
          walletId,
          type: 'REPAYMENT',
          amount: 0,
          balanceAfterTxn: wallet.availableCredit,
          note: `[DISPUTE] ${body.note}`,
        },
      });
      return NextResponse.json({ success: true, data: { logged: true } });
    }

    if (!('action' in body)) {
      if (Number(wallet.outstandingAmount) <= 0) {
        throw Errors.badRequest('No outstanding balance to settle');
      }

      const updated = await creditWalletService.applyRepayment(
        walletId,
        body.amount,
        'CASH',
        undefined,
        undefined,
        body.notes ?? 'Offline payment recorded by vendor (collections)',
      );

      return NextResponse.json({
        success: true,
        data: {
          paid: body.amount,
          balanceAfter: updated ? Number(updated.outstandingAmount) : 0,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
