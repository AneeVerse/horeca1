import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/modules/notification/notification.service';
import { getVendorProductNotificationUserIds } from '@/lib/vendorNotificationRecipients';

type Recipient = { userId: string; referenceId: string; referenceType: 'product' };

/** Resolve who should receive a product-rejection alert (vendor owner, team, suggester). */
export async function resolveProductRejectionRecipients(
  productId: string,
  vendorId?: string | null
): Promise<Recipient[]> {
  const byUser = new Map<string, string>();

  const addVendor = async (vId: string, refProductId: string) => {
    const userIds = await getVendorProductNotificationUserIds(vId);
    for (const userId of userIds) {
      if (!byUser.has(userId)) byUser.set(userId, refProductId);
    }
  };

  if (vendorId) {
    await addVendor(vendorId, productId);
    return [...byUser].map(([userId, referenceId]) => ({
      userId,
      referenceId,
      referenceType: 'product' as const,
    }));
  }

  // Vendor listing id without vendorId in payload — resolve from DB.
  const vendorProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, vendorId: true },
  });
  if (vendorProduct?.vendorId) {
    await addVendor(vendorProduct.vendorId, vendorProduct.id);
    if (byUser.size > 0) {
      return [...byUser].map(([userId, referenceId]) => ({
        userId,
        referenceId,
        referenceType: 'product' as const,
      }));
    }
  }

  // Master catalog rejection — notify suggester + vendors listing this master SKU.
  const master = await prisma.masterProduct.findUnique({
    where: { id: productId },
    select: { suggestedBy: true },
  });
  if (master?.suggestedBy) {
    byUser.set(master.suggestedBy, productId);
  }

  const linkedListings = await prisma.product.findMany({
    where: { masterProductId: productId },
    select: { id: true, vendorId: true },
  });
  for (const listing of linkedListings) {
    if (listing.vendorId) {
      await addVendor(listing.vendorId, listing.id);
    }
  }

  return [...byUser].map(([userId, referenceId]) => ({
    userId,
    referenceId,
    referenceType: 'product' as const,
  }));
}

/** Send in-app + email when admin rejects a product in the approvals flow. */
export async function sendProductRejectedNotifications(input: {
  productId: string;
  productName: string;
  vendorId?: string | null;
  reason?: string | null;
}): Promise<void> {
  const recipients = await resolveProductRejectionRecipients(input.productId, input.vendorId);
  if (recipients.length === 0) {
    console.warn('[Notifications] ProductRejected: no recipients for product', input.productId);
    return;
  }

  const reasonLine = input.reason?.trim()
    ? `Reason: ${input.reason.trim()}`
    : 'Please review the product details.';
  const body = `"${input.productName}" needs changes. ${reasonLine} Open the product to fix and resubmit for review.`;
  const emailSubject = `Horeca1: Product rejected — ${input.productName}`;
  const notifications = new NotificationService();

  await Promise.all(
    recipients.flatMap(({ userId, referenceId, referenceType }) => [
      notifications.send({
        userId,
        type: 'approval',
        channel: 'in_app',
        title: 'Product needs changes',
        body,
        referenceId,
        referenceType,
      }),
      notifications.send({
        userId,
        type: 'approval',
        channel: 'email',
        title: emailSubject,
        body,
        referenceId,
        referenceType,
      }),
    ])
  );
}
