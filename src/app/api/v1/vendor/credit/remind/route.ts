// POST /api/v1/vendor/credit/remind — Send outstanding credit payment reminder via MSG91 SMS
// PROTECTED: Vendor only + creditLine.view

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';
import { NotificationService } from '@/modules/notification/notification.service';
import { SMS_TEMPLATES } from '@/lib/providers/smsTemplates';

const notifications = new NotificationService();

const remindSchema = z.object({
  customerId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export const POST = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'creditLine.view');
    const vendorId = await resolveVendorId(ctx, req);
    const body = remindSchema.parse(await req.json());

    const targetUserId = body.customerId || body.userId;
    if (!targetUserId) {
      throw Errors.badRequest('Either customerId or userId is required.');
    }

    const wallet = await prisma.creditWallet.findFirst({
      where: {
        vendorId,
        userId: targetUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!wallet) {
      throw Errors.notFound('No credit wallet found for this customer with your business.');
    }

    const outstanding = Number(wallet.outstandingAmount);
    if (outstanding <= 0) {
      throw Errors.badRequest('Customer does not have any outstanding balance.');
    }

    if (!wallet.user.phone) {
      throw Errors.badRequest('This customer does not have a registered phone number to receive SMS reminders.');
    }

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId },
      select: { businessName: true },
    });
    const vendorName = vendor?.businessName || 'your vendor';

    const baseUrl = process.env.AUTH_URL || 'http://localhost:3000';
    const paymentLink = `${baseUrl}/wallet`;

    const formattedOutstanding = `₹${outstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const messageBody = `your outstanding payment of ${formattedOutstanding} for ${vendorName} is due. Please clear it immediately at: ${paymentLink}`;

    await notifications.send({
      userId: targetUserId,
      type: 'payment_reminder',
      channel: 'sms',
      title: 'Payment Reminder',
      body: messageBody,
      smsTemplateId: SMS_TEMPLATES.generalPurpose,
      smsVariables: { content: messageBody },
      referenceId: wallet.id,
      referenceType: 'credit_wallet',
    });

    return NextResponse.json({
      success: true,
      message: `Reminder successfully sent to ${wallet.user.fullName} (${wallet.user.phone})`,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
