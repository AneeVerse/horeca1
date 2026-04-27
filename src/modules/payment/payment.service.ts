import { prisma } from '@/lib/prisma';
import { getRazorpay } from '@/lib/razorpay';
import { emitEvent } from '@/events/emitter';
import { Errors } from '@/middleware/errorHandler';
import crypto from 'crypto';

function timingSafeEqHex(expectedHex: string, providedHex: string): boolean {
  if (expectedHex.length !== providedHex.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expectedHex, 'utf8'), Buffer.from(providedHex, 'utf8'));
}

// Narrow helper — the Razorpay webhook payload shape we care about
interface RazorpayWebhookPaymentEntity {
  id: string;
  order_id: string;
  status: string;
  amount: number;
  method?: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: RazorpayWebhookPaymentEntity;
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
      };
    };
  };
}

function isWebhookPayload(value: unknown): value is RazorpayWebhookPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['event'] === 'string' && typeof v['payload'] === 'object' && v['payload'] !== null;
}

export class PaymentService {
  async initiate(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw Errors.notFound('Order');

    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(Number(order.totalAmount) * 100), // paise
      currency: 'INR',
      receipt: order.orderNumber,
    });

    await prisma.payment.create({
      data: {
        orderId,
        vendorId: order.vendorId,
        userId,
        razorpayOrderId: razorpayOrder.id,
        amount: order.totalAmount,
        status: 'created',
      },
    });

    return {
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verify(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
    // Verify signature
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (!timingSafeEqHex(expectedSignature, razorpaySignature)) {
      throw Errors.unauthorized('Invalid payment signature');
    }

    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId },
    });
    if (!payment) throw Errors.notFound('Payment');

    // Update payment and order
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { razorpayPaymentId, razorpaySignature, status: 'captured' },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'paid' },
      }),
    ]);

    emitEvent('PaymentReceived', {
      orderId: payment.orderId,
      paymentId: payment.id,
      userId: payment.userId,
      vendorId: payment.vendorId,
      amount: Number(payment.amount),
    });

    return { success: true, payment_status: 'captured' };
  }

  // handleWebhook — called by the unauthenticated POST /api/v1/payments/webhook route.
  // Razorpay fires this server-to-server so payments are captured even if the user
  // closed the browser before /verify was called.
  //
  // WHY separate RAZORPAY_WEBHOOK_SECRET:
  //   The webhook secret is set in the Razorpay dashboard and is different from the
  //   API key secret. Using the wrong secret would let anyone forge events.
  async handleWebhook(rawBody: string, signature: string): Promise<{ processed: boolean; event: string }> {
    // 1. Verify HMAC-SHA256 signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('hex');

    if (!timingSafeEqHex(expectedSig, signature)) {
      throw Errors.unauthorized('Invalid webhook signature');
    }

    // 2. Parse and narrow the body
    const parsed: unknown = JSON.parse(rawBody);
    if (!isWebhookPayload(parsed)) {
      // Unrecognised shape — ack with 200 so Razorpay stops retrying
      return { processed: false, event: 'unknown' };
    }

    const { event, payload } = parsed;

    // 3. Handle payment.captured
    if (event === 'payment.captured') {
      const entity = payload.payment?.entity;
      if (!entity) return { processed: false, event };

      const payment = await prisma.payment.findFirst({
        where: { razorpayOrderId: entity.order_id },
      });

      if (!payment) {
        // No matching payment record — ack silently
        return { processed: false, event };
      }

      // Idempotency: already captured by /verify or a prior webhook delivery
      if (payment.status === 'captured') {
        return { processed: true, event };
      }

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            razorpayPaymentId: entity.id,
            status: 'captured',
            method: entity.method ?? null,
          },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'paid',
            status: 'confirmed',
          },
        }),
      ]);

      emitEvent('PaymentReceived', {
        orderId: payment.orderId,
        paymentId: payment.id,
        userId: payment.userId,
        vendorId: payment.vendorId,
        amount: Number(payment.amount),
      });

      emitEvent('OrderConfirmed', {
        orderId: payment.orderId,
        userId: payment.userId,
        vendorId: payment.vendorId,
      });

      return { processed: true, event };
    }

    // 4. Handle payment.failed
    if (event === 'payment.failed') {
      const entity = payload.payment?.entity;
      if (!entity) return { processed: false, event };

      const payment = await prisma.payment.findFirst({
        where: { razorpayOrderId: entity.order_id },
      });

      if (!payment) return { processed: false, event };

      // Idempotency: skip if already in a terminal state
      if (payment.status === 'captured' || payment.status === 'failed') {
        return { processed: true, event };
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });

      emitEvent('PaymentFailed', {
        orderId: payment.orderId,
        userId: payment.userId,
        vendorId: payment.vendorId,
        reason: 'Payment failed via Razorpay webhook',
      });

      return { processed: true, event };
    }

    // 5. Handle refund.processed
    if (event === 'refund.processed') {
      const refundEntity = payload.refund?.entity;
      if (!refundEntity) return { processed: false, event };

      // Find the payment by razorpay payment id stored at capture time
      const payment = await prisma.payment.findFirst({
        where: { razorpayPaymentId: refundEntity.payment_id },
      });

      if (!payment) return { processed: false, event };

      // Mark as refunded if not already
      if (payment.status !== 'refunded') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'refunded' },
        });
      }

      return { processed: true, event };
    }

    // Unhandled event type — ack with 200 so Razorpay stops retrying
    return { processed: false, event };
  }
}
