// POST /api/v1/wallet/razorpay-webhook — Razorpay payment.captured -> apply repayment.
// Public endpoint, but HMAC-signature verified + idempotent (applyRepayment dedupes
// on razorpayPaymentId, backed by a unique index).
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { creditWalletService } from '@/modules/credit/creditWallet.service';
import { errorResponse } from '@/middleware/errorHandler';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!signature || !secret) {
      return NextResponse.json({ success: false, error: 'Missing signature/secret' }, { status: 400 });
    }

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    if (event.event === 'payment.captured') {
      const entity = event.payload?.payment?.entity;
      const razorpayOrderId = entity?.order_id;
      const razorpayPaymentId = entity?.id;
      const amount = Number(entity?.amount ?? 0) / 100;

      if (razorpayOrderId && razorpayPaymentId) {
        // Backup path: the client-driven /verify-repayment normally applies this
        // first. applyRepayment finalizes the matching PENDING row to SUCCESS and
        // is idempotent on razorpayPaymentId (unique index) — so a webhook that
        // arrives after /verify (or a Razorpay replay) is a safe no-op.
        const repayment = await prisma.creditWalletRepayment.findFirst({
          where: { razorpayOrderId },
        });
        if (repayment) {
          await creditWalletService.applyRepayment(repayment.walletId, amount || Number(repayment.amount), 'RAZORPAY', razorpayOrderId, razorpayPaymentId);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
