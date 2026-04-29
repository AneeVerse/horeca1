// PATCH /api/v1/admin/returns/:id — Update return request status
// PROTECTED: Admin only
// On status='refunded', actually calls Razorpay's refund API for online-paid orders
// and flips Order.paymentStatus='refunded'. Cash/credit orders skip the Razorpay call.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { getRazorpay } from '@/lib/razorpay';
import { logAction } from '@/lib/auditLog';

const updateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'refunded']),
  adminNote: z.string().optional(),
  refundAmount: z.number().positive().optional(),
});

export const PATCH = adminOnly(async (req: NextRequest, ctx) => {
  try {
    const segments = req.nextUrl.pathname.split('/');
    const returnId = segments[segments.length - 1];

    const existing = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          select: {
            id: true,
            paymentMethod: true,
            paymentStatus: true,
            totalAmount: true,
            payments: {
              where: { status: 'captured' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, razorpayPaymentId: true },
            },
          },
        },
      },
    });
    if (!existing) throw Errors.notFound('Return request');

    const body = await req.json();
    const data = updateSchema.parse(body);

    // ── Refund path: actually move money before flipping the row ──────────
    let razorpayRefundId: string | null = null;
    const order = existing.order;
    const capturedPayment = order.payments[0] ?? null;
    const isFreshRefund = data.status === 'refunded' && existing.status !== 'refunded';

    if (isFreshRefund) {
      const refundAmount = data.refundAmount ?? Number(existing.refundAmount ?? order.totalAmount);
      if (!(refundAmount > 0)) {
        throw Errors.badRequest('Refund amount must be greater than zero');
      }

      const isRazorpay = order.paymentMethod === 'razorpay'
        && !!capturedPayment?.razorpayPaymentId;

      if (isRazorpay) {
        // Razorpay refund — amount is in paise, must be a whole number
        const amountPaise = Math.round(refundAmount * 100);
        const refund = await getRazorpay().payments.refund(capturedPayment!.razorpayPaymentId!, {
          amount: amountPaise,
          notes: { returnRequestId: returnId, adminUserId: ctx.userId },
        });
        razorpayRefundId = (refund as { id?: string }).id ?? null;
      }
      // Cash / credit / wallet orders: nothing to call externally; the order
      // is just flagged as refunded for finance to reconcile manually.
    }

    // ── DB updates in a single transaction ────────────────────────────────
    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: data.status,
          adminNote: data.adminNote,
          refundAmount: data.refundAmount,
        },
      });

      if (isFreshRefund) {
        await tx.order.update({
          where: { id: existing.orderId },
          data: { paymentStatus: 'refunded' },
        });
        if (capturedPayment?.id && razorpayRefundId) {
          await tx.payment.update({
            where: { id: capturedPayment.id },
            data: { status: 'refunded' },
          });
        }
      }

      return r;
    });

    logAction(ctx, req, {
      action: 'return.processed',
      entity: 'ReturnRequest',
      entityId: returnId,
      before: { status: existing.status, refundAmount: existing.refundAmount },
      after: { status: updated.status, refundAmount: updated.refundAmount, razorpayRefundId },
    });

    return NextResponse.json({ success: true, data: { ...updated, razorpayRefundId } });
  } catch (error) {
    return errorResponse(error);
  }
});
