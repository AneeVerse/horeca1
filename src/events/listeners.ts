import { eventBus } from './emitter';
import { NotificationService } from '@/modules/notification/notification.service';

const notifications = new NotificationService();

let registered = false;

/**
 * Register all event listeners for the HoReCa1 event bus.
 * Call once on application startup (e.g. from instrumentation.ts).
 * Guarded against duplicate registration (e.g. during hot reload).
 */
export function registerEventListeners(): void {
  if (registered) {
    console.log('[Events] Listeners already registered, skipping');
    return;
  }
  registered = true;
  // ── Order lifecycle ─────────────────────────────────────────────

  eventBus.on('OrderCreated', async (payload) => {
    try {
      await notifications.send({
        userId: payload.vendorId,
        type: 'order',
        channel: 'in_app',
        title: 'New Order Received',
        body: `Order #${payload.orderNumber} has been placed (₹${payload.totalAmount.toLocaleString('en-IN')}).`,
        referenceId: payload.orderId,
        referenceType: 'order',
      });
    } catch (error) {
      console.error('[Events] OrderCreated listener failed:', error);
    }
  });

  eventBus.on('OrderConfirmed', async (payload) => {
    try {
      await notifications.send({
        userId: payload.userId,
        type: 'order',
        channel: 'in_app',
        title: 'Order Confirmed',
        body: `Your order ${payload.orderId} has been confirmed by the vendor.`,
        referenceId: payload.orderId,
        referenceType: 'order',
      });
    } catch (error) {
      console.error('[Events] OrderConfirmed listener failed:', error);
    }
  });

  eventBus.on('OrderShipped', async (payload) => {
    try {
      await notifications.send({
        userId: payload.userId,
        type: 'order',
        channel: 'in_app',
        title: 'Order Out for Delivery',
        body: `Your order ${payload.orderId} is out for delivery.`,
        referenceId: payload.orderId,
        referenceType: 'order',
      });
    } catch (error) {
      console.error('[Events] OrderShipped listener failed:', error);
    }
  });

  eventBus.on('OrderDelivered', async (payload) => {
    try {
      await notifications.send({
        userId: payload.userId,
        type: 'order',
        channel: 'in_app',
        title: 'Order Delivered',
        body: `Your order ${payload.orderId} has been delivered. Thank you for your purchase!`,
        referenceId: payload.orderId,
        referenceType: 'order',
      });
    } catch (error) {
      console.error('[Events] OrderDelivered listener failed:', error);
    }
  });

  eventBus.on('OrderCancelled', async (payload) => {
    try {
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
    } catch (error) {
      console.error('[Events] OrderCancelled listener failed:', error);
    }
  });

  // ── Payments ────────────────────────────────────────────────────

  eventBus.on('PaymentReceived', async (payload) => {
    try {
      await notifications.send({
        userId: payload.vendorId,
        type: 'payment',
        channel: 'in_app',
        title: 'Payment Received',
        body: `Payment of ₹${payload.amount.toLocaleString('en-IN')} received for order ${payload.orderId}.`,
        referenceId: payload.paymentId,
        referenceType: 'payment',
      });
    } catch (error) {
      console.error('[Events] PaymentReceived listener failed:', error);
    }
  });

  eventBus.on('PaymentFailed', async (payload) => {
    try {
      await notifications.send({
        userId: payload.userId,
        type: 'payment',
        channel: 'in_app',
        title: 'Payment Failed',
        body: `Payment for order ${payload.orderId} failed. ${payload.reason}`,
        referenceId: payload.orderId,
        referenceType: 'payment',
      });
    } catch (error) {
      console.error('[Events] PaymentFailed listener failed:', error);
    }
  });

  // ── User / Vendor onboarding ────────────────────────────────────

  eventBus.on('UserRegistered', async (payload) => {
    try {
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
    } catch (error) {
      console.error('[Events] UserRegistered listener failed:', error);
    }
  });

  eventBus.on('VendorOnboarded', async (payload) => {
    try {
      await notifications.send({
        userId: payload.userId,
        type: 'account',
        channel: 'in_app',
        title: 'Vendor Verified',
        body: `Congratulations! "${payload.businessName}" has been verified and is now live on HoReCa Hub.`,
        referenceId: payload.vendorId,
        referenceType: 'vendor',
      });
    } catch (error) {
      console.error('[Events] VendorOnboarded listener failed:', error);
    }
  });

  // ── Credit ──────────────────────────────────────────────────────

  eventBus.on('CreditApplied', async (payload) => {
    try {
      await notifications.send({
        userId: payload.userId,
        type: 'credit',
        channel: 'in_app',
        title: 'Credit Applied',
        body: `₹${payload.amount.toLocaleString('en-IN')} credit has been applied to order ${payload.orderId}.`,
        referenceId: payload.creditAccountId,
        referenceType: 'credit',
      });
    } catch (error) {
      console.error('[Events] CreditApplied listener failed:', error);
    }
  });

  // ── Inventory ───────────────────────────────────────────────────

  eventBus.on('StockUpdated', async (payload) => {
    try {
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
    } catch (error) {
      console.error('[Events] StockUpdated listener failed:', error);
    }
  });

  console.log('[Events] All event listeners registered');
}
