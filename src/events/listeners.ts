import { eventBus } from './emitter';
import { NotificationService } from '@/modules/notification/notification.service';

const notifications = new NotificationService();

/**
 * Register all event listeners for the HoReCa1 event bus.
 * Call once on application startup (e.g. from instrumentation.ts).
 */
export function registerEventListeners(): void {
  // ── Order lifecycle ─────────────────────────────────────────────

  eventBus.on('OrderCreated', async (payload) => {
    await notifications.send({
      userId: payload.vendorId,
      type: 'order',
      channel: 'in_app',
      title: 'New Order Received',
      body: `Order #${payload.orderNumber} has been placed (₹${payload.totalAmount.toLocaleString('en-IN')}).`,
      referenceId: payload.orderId,
      referenceType: 'order',
    });
  });

  eventBus.on('OrderConfirmed', async (payload) => {
    await notifications.send({
      userId: payload.userId,
      type: 'order',
      channel: 'in_app',
      title: 'Order Confirmed',
      body: `Your order ${payload.orderId} has been confirmed by the vendor.`,
      referenceId: payload.orderId,
      referenceType: 'order',
    });
  });

  eventBus.on('OrderShipped', async (payload) => {
    await notifications.send({
      userId: payload.userId,
      type: 'order',
      channel: 'in_app',
      title: 'Order Out for Delivery',
      body: `Your order ${payload.orderId} is out for delivery.`,
      referenceId: payload.orderId,
      referenceType: 'order',
    });
  });

  eventBus.on('OrderDelivered', async (payload) => {
    await notifications.send({
      userId: payload.userId,
      type: 'order',
      channel: 'in_app',
      title: 'Order Delivered',
      body: `Your order ${payload.orderId} has been delivered. Thank you for your purchase!`,
      referenceId: payload.orderId,
      referenceType: 'order',
    });
  });

  eventBus.on('OrderCancelled', async (payload) => {
    const reasonSuffix = payload.reason ? ` Reason: ${payload.reason}` : '';

    // Notify customer
    await notifications.send({
      userId: payload.userId,
      type: 'order',
      channel: 'in_app',
      title: 'Order Cancelled',
      body: `Your order ${payload.orderId} has been cancelled.${reasonSuffix}`,
      referenceId: payload.orderId,
      referenceType: 'order',
    });

    // Notify vendor
    await notifications.send({
      userId: payload.vendorId,
      type: 'order',
      channel: 'in_app',
      title: 'Order Cancelled',
      body: `Order ${payload.orderId} has been cancelled.${reasonSuffix}`,
      referenceId: payload.orderId,
      referenceType: 'order',
    });
  });

  // ── Payments ────────────────────────────────────────────────────

  eventBus.on('PaymentReceived', async (payload) => {
    await notifications.send({
      userId: payload.vendorId,
      type: 'payment',
      channel: 'in_app',
      title: 'Payment Received',
      body: `Payment of ₹${payload.amount.toLocaleString('en-IN')} received for order ${payload.orderId}.`,
      referenceId: payload.paymentId,
      referenceType: 'payment',
    });
  });

  eventBus.on('PaymentFailed', async (payload) => {
    await notifications.send({
      userId: payload.userId,
      type: 'payment',
      channel: 'in_app',
      title: 'Payment Failed',
      body: `Payment for order ${payload.orderId} failed. ${payload.reason}`,
      referenceId: payload.orderId,
      referenceType: 'payment',
    });
  });

  // ── User / Vendor onboarding ────────────────────────────────────

  eventBus.on('UserRegistered', async (payload) => {
    console.log(`[Listener] UserRegistered — ${payload.email} (role: ${payload.role})`);

    await notifications.send({
      userId: payload.userId,
      type: 'account',
      channel: 'in_app',
      title: 'Welcome to HoReCa Hub!',
      body: 'Your account has been created. Start exploring vendors and place your first order.',
      referenceId: payload.userId,
      referenceType: 'user',
    });
  });

  eventBus.on('VendorOnboarded', async (payload) => {
    await notifications.send({
      userId: payload.userId,
      type: 'account',
      channel: 'in_app',
      title: 'Vendor Verified',
      body: `Congratulations! "${payload.businessName}" has been verified and is now live on HoReCa Hub.`,
      referenceId: payload.vendorId,
      referenceType: 'vendor',
    });
  });

  // ── Credit ──────────────────────────────────────────────────────

  eventBus.on('CreditApplied', async (payload) => {
    await notifications.send({
      userId: payload.userId,
      type: 'credit',
      channel: 'in_app',
      title: 'Credit Applied',
      body: `₹${payload.amount.toLocaleString('en-IN')} credit has been applied to order ${payload.orderId}.`,
      referenceId: payload.creditAccountId,
      referenceType: 'credit',
    });
  });

  // ── Inventory ───────────────────────────────────────────────────

  eventBus.on('StockUpdated', async (payload) => {
    if (payload.qtyAvailable > payload.lowStockThreshold) return;

    await notifications.send({
      userId: payload.vendorId,
      type: 'inventory',
      channel: 'in_app',
      title: 'Low Stock Alert',
      body: `Product ${payload.productId} is running low — only ${payload.qtyAvailable} units left (threshold: ${payload.lowStockThreshold}).`,
      referenceId: payload.productId,
      referenceType: 'product',
    });
  });

  console.log('[Events] All event listeners registered');
}
