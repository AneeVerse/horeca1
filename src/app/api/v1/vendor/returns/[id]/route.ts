// PATCH /api/v1/vendor/returns/:id — Vendor approves or rejects a return request
// WHY: Vendor has operational ownership of their orders — they decide the resolution.
//      Admin can override, but vendor does first review.
//      On approval with a refundAmount: if the original order was paid via credit,
//      we write a credit transaction to reduce the customer's outstanding balance.
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

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNote: z.string().max(1000).optional(),
  refundAmount: z.number().min(0).optional(),
  resolutionType: z.enum(['refund', 'credit_note', 'replacement']).optional().default('refund'),
  creditNoteAmount: z.number().positive().optional(),
});

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);
    requirePermission(ctx, 'orders.edit');

    const returnId = extractId(req);
    const body = reviewSchema.parse(await req.json());

    // Verify the return belongs to one of this vendor's orders
    const returnReq = await prisma.returnRequest.findFirst({
      where: { id: returnId, order: { vendorId } },
      include: {
        order: {
          select: { id: true, status: true, userId: true, paymentMethod: true },
        },
      },
    });
    if (!returnReq) throw Errors.notFound('Return request');
    if (returnReq.status !== 'pending') {
      throw Errors.badRequest(`Return is already ${returnReq.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Build resolution-specific data
      const resolutionData: {
        resolutionType?: string;
        creditNoteNumber?: string;
        creditNoteAmount?: number;
        refundAmount?: number;
      } = {};

      if (body.status === 'approved') {
        resolutionData.resolutionType = body.resolutionType;

        if (body.resolutionType === 'credit_note') {
          const creditNoteNumber = `CN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
          resolutionData.creditNoteNumber = creditNoteNumber;
          if (body.creditNoteAmount !== undefined) {
            resolutionData.creditNoteAmount = body.creditNoteAmount;
          }
        } else if (body.resolutionType === 'refund' && body.refundAmount !== undefined) {
          resolutionData.refundAmount = body.refundAmount;
        }
        // replacement: only store resolutionType, no financial data
      }

      const result = await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: body.status,
          adminNote: body.adminNote,
          ...resolutionData,
        },
      });

      // Ledger adjustment for refund on a credit order
      if (
        body.status === 'approved' &&
        body.resolutionType === 'refund' &&
        body.refundAmount &&
        body.refundAmount > 0 &&
        returnReq.order.paymentMethod === 'credit'
      ) {
        const creditAcc = await tx.creditAccount.findUnique({
          where: {
            userId_vendorId: { userId: returnReq.order.userId, vendorId },
          },
        });
        if (creditAcc) {
          const refund = Math.min(body.refundAmount, Number(creditAcc.creditUsed));
          const newUsed = Math.max(0, Number(creditAcc.creditUsed) - refund);
          await tx.creditAccount.update({
            where: { id: creditAcc.id },
            data: { creditUsed: newUsed },
          });
          await tx.creditTransaction.create({
            data: {
              creditAccountId: creditAcc.id,
              orderId: returnReq.order.id,
              vendorId,
              type: 'credit',
              amount: refund,
              balanceAfter: newUsed,
              notes: `Return approved — refund of ₹${refund.toFixed(2)} applied`,
            },
          });
        }
      }

      // Credit note: issue a credit transaction on the customer's credit account
      if (
        body.status === 'approved' &&
        body.resolutionType === 'credit_note' &&
        body.creditNoteAmount &&
        body.creditNoteAmount > 0
      ) {
        const creditNoteNumber = resolutionData.creditNoteNumber!;
        const creditAcc = await tx.creditAccount.findUnique({
          where: {
            userId_vendorId: { userId: returnReq.order.userId, vendorId },
          },
        });
        if (creditAcc) {
          const newUsed = Math.max(0, Number(creditAcc.creditUsed) - body.creditNoteAmount);
          await tx.creditAccount.update({
            where: { id: creditAcc.id },
            data: { creditUsed: newUsed },
          });
          await tx.creditTransaction.create({
            data: {
              creditAccountId: creditAcc.id,
              orderId: returnReq.order.id,
              vendorId,
              type: 'credit',
              amount: body.creditNoteAmount,
              balanceAfter: newUsed,
              notes: `Credit note ${creditNoteNumber}`,
            },
          });
        }
      }

      return result;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return errorResponse(error);
  }
});
