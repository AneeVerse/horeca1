// POST /api/v1/vendor/credit/repay — record offline repayment (cash / NEFT / cheque)
// PROTECTED: Vendor only + creditLine.approve

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { creditWalletService } from '@/modules/credit/creditWallet.service';

const repaySchema = z.object({
  walletId: z.string().uuid(),
  amount: z.number().positive().max(50_000_000),
  method: z.enum(['CASH', 'NEFT', 'CHEQUE']),
  note: z.string().max(500).optional(),
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'creditLine.approve');
    const vendorId = await resolveVendorId(ctx, req);
    const body = repaySchema.parse(await req.json());

    const wallet = await prisma.creditWallet.findFirst({
      where: { id: body.walletId, vendorId },
    });
    if (!wallet) throw Errors.notFound('Credit wallet');

    const updated = await creditWalletService.applyRepayment(
      body.walletId,
      body.amount,
      body.method,
      undefined,
      undefined,
      body.note,
    );

    return NextResponse.json({
      success: true,
      data: {
        id: updated?.id,
        outstandingAmount: updated ? Number(updated.outstandingAmount) : null,
        availableCredit: updated ? Number(updated.availableCredit) : null,
        status: updated?.status,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
