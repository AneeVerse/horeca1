import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/events/emitter';
import { Errors } from '@/middleware/errorHandler';

export class CreditService {
  async check(userId: string, vendorId: string) {
    const account = await prisma.creditAccount.findUnique({
      where: { userId_vendorId: { userId, vendorId } },
    });

    if (!account) {
      return { credit_limit: 0, credit_used: 0, available: 0, status: 'none' as const };
    }

    return {
      credit_limit: Number(account.creditLimit),
      credit_used: Number(account.creditUsed),
      available: Number(account.creditLimit) - Number(account.creditUsed),
      status: account.status,
    };
  }

  async apply(userId: string, orderId: string, amount: number) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw Errors.notFound('Order');

    const account = await prisma.creditAccount.findUnique({
      where: { userId_vendorId: { userId, vendorId: order.vendorId } },
    });
    if (!account || account.status !== 'active') {
      throw Errors.forbidden('Credit account not active');
    }

    const available = Number(account.creditLimit) - Number(account.creditUsed);
    if (amount > available) {
      throw Errors.insufficientCredit(available, amount);
    }

    await prisma.$transaction([
      prisma.creditAccount.update({
        where: { id: account.id },
        data: { creditUsed: { increment: amount } },
      }),
      prisma.creditTransaction.create({
        data: {
          creditAccountId: account.id,
          orderId,
          vendorId: order.vendorId,
          type: 'debit',
          amount,
          balanceAfter: available - amount,
        },
      }),
    ]);

    emitEvent('CreditApplied', {
      creditAccountId: account.id,
      orderId,
      userId,
      vendorId: order.vendorId,
      amount,
    });

    return { success: true, remaining: available - amount };
  }

  async signup(userId: string, vendorId: string, requestedLimit: number) {
    return prisma.creditAccount.create({
      data: { userId, vendorId, creditLimit: requestedLimit, status: 'pending' },
    });
  }

  async approve(accountId: string, vendorId: string, creditLimit: number) {
    return prisma.creditAccount.update({
      where: { id: accountId, vendorId },
      data: { creditLimit, status: 'active' },
    });
  }
}
