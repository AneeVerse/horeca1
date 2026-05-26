// PATCH /api/v1/vendor/collections/:id — Update credit limit or status
// POST  /api/v1/vendor/collections/:id/payment — Record offline payment (credit entry)
// WHY: Vendor operations: freeze a customer's credit, update limit, or log a
//      cheque/NEFT payment to reduce outstanding balance.
// PROTECTED: Vendor only

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

function extractId(req: NextRequest) {
  return new URL(req.url).pathname.split('/').at(-1) ?? '';
}

// ─── PATCH: update credit limit or status ─────────────────────────────────────

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
    requirePermission(ctx, 'orders.edit');

    const accountId = extractId(req);
    const body = updateAccountSchema.parse(await req.json());

    const account = await prisma.creditAccount.findFirst({
      where: { id: accountId, vendorId },
    });
    if (!account) throw Errors.notFound('Credit account');

    const updated = await prisma.creditAccount.update({
      where: { id: accountId },
      data: {
        ...(body.creditLimit !== undefined && { creditLimit: body.creditLimit }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.graceDays !== undefined && { graceDays: body.graceDays }),
        ...(body.interestRatePct !== undefined && { interestRatePct: body.interestRatePct }),
        ...(body.penaltyRatePct !== undefined && { penaltyRatePct: body.penaltyRatePct }),
        ...(body.freezeOnOverdueDays !== undefined && { freezeOnOverdueDays: body.freezeOnOverdueDays }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});

// ─── POST: record offline payment or log dispute ──────────────────────────────

const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().max(500).optional(),
});

const logDisputeSchema = z.object({
  action: z.literal('dispute'),
  note: z.string().min(1).max(1000),
});

const postBodySchema = z.union([
  recordPaymentSchema,
  logDisputeSchema,
]);

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'orders.edit');

    const accountId = extractId(req);
    const body = postBodySchema.parse(await req.json());

    const account = await prisma.creditAccount.findFirst({
      where: { id: accountId, vendorId },
    });
    if (!account) throw Errors.notFound('Credit account');

    // ── Dispute log ──
    if ('action' in body && body.action === 'dispute') {
      await prisma.creditTransaction.create({
        data: {
          creditAccountId: accountId,
          vendorId,
          type: 'adjustment',
          amount: 0,
          balanceAfter: Number(account.creditUsed),
          notes: `[DISPUTE] ${body.note}`,
        },
      });
      return NextResponse.json({ success: true, data: { logged: true } });
    }

    // ── Record payment ──
    if (!('action' in body)) {
      if (Number(account.creditUsed) <= 0) throw Errors.badRequest('No outstanding balance to settle');

      const payment = Math.min(body.amount, Number(account.creditUsed));
      const newCreditUsed = Math.max(0, Number(account.creditUsed) - payment);

      await prisma.$transaction([
        prisma.creditAccount.update({
          where: { id: accountId },
          data: { creditUsed: newCreditUsed },
        }),
        prisma.creditTransaction.create({
          data: {
            creditAccountId: accountId,
            vendorId,
            type: 'credit',
            amount: payment,
            balanceAfter: newCreditUsed,
            notes: body.notes ?? 'Offline payment recorded by vendor',
          },
        }),
      ]);

      return NextResponse.json({ success: true, data: { paid: payment, balanceAfter: newCreditUsed } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});
