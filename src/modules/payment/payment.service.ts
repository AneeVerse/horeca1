import { prisma } from '@/lib/prisma';
import { getRazorpay } from '@/lib/razorpay';
import { emitEvent } from '@/events/emitter';
import { Errors } from '@/middleware/errorHandler';
import crypto from 'crypto';

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
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
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
}
