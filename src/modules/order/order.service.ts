import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { emitEvent } from '@/events/emitter';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { Errors } from '@/middleware/errorHandler';

interface VendorOrderInput {
  vendorId: string;
  items: Array<{ productId: string; quantity: number }>;
  deliverySlotId?: string;
  notes?: string;
}

interface CreateOrderInput {
  vendorOrders: VendorOrderInput[];
  paymentMethod: string;
}

/**
 * V2.2: every order is stamped with the user's active BusinessAccount + Outlet
 * and a snapshot of the outlet's address at order time. Cart lookup is also
 * scoped to (userId, businessAccountId, outletId).
 */
export interface OrderContext {
  userId: string;
  businessAccountId: string;
  outletId: string;
}

export class OrderService {
  private inventoryService = new InventoryService();

  async create(ctx: OrderContext, input: CreateOrderInput) {
    const { userId, businessAccountId, outletId } = ctx;

    // Snapshot the outlet address once outside the transaction — same value
    // is written onto every PO in this checkout batch.
    const outlet = await prisma.outlet.findFirst({
      where: { id: outletId, businessAccountId },
      select: {
        name: true, addressLine: true, flatInfo: true, landmark: true,
        city: true, state: true, pincode: true, latitude: true, longitude: true,
        placeId: true, requiresAddressUpdate: true,
      },
    });
    if (!outlet) throw Errors.badRequest('Active outlet not found for this account');
    if (outlet.requiresAddressUpdate) {
      throw Errors.badRequest('Active outlet needs its address completed before placing orders');
    }
    const deliveryAddressSnapshot: Prisma.InputJsonValue = { ...outlet };
    return prisma.$transaction(async (tx) => {
      const orders: Array<{
        id: string;
        orderNumber: string;
        vendorId: string;
        totalAmount: unknown;
        items: Array<{ productId: string; quantity: number }>;
      }> = [];

      for (const vo of input.vendorOrders) {
        // 1. Validate stock
        const stockCheck = await this.inventoryService.bulkCheck(vo.items, tx);
        const outOfStock = stockCheck.find((s) => !s.available);
        if (outOfStock) {
          throw Errors.outOfStock(outOfStock.productName, outOfStock.qtyAvailable);
        }

        // 2. Validate MOV
        const vendor = await tx.vendor.findUnique({ where: { id: vo.vendorId } });
        if (!vendor) throw Errors.notFound('Vendor');

        // 2b. Validate delivery slot — must belong to this vendor, be active, and not past cutoff
        if (vo.deliverySlotId) {
          const slot = await tx.deliverySlot.findUnique({ where: { id: vo.deliverySlotId } });
          if (!slot || slot.vendorId !== vo.vendorId || !slot.isActive) {
            throw Errors.badRequest('Invalid delivery slot for this vendor');
          }
          // Slots are stored as IST wall-clock (HH:mm). Force the comparison into
          // IST so a UTC server doesn't accept orders past the Mumbai cutoff —
          // or refuse them too early.
          const istParts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).formatToParts(new Date());
          const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
          const istDay = dayMap[istParts.find(p => p.type === 'weekday')?.value ?? ''] ?? -1;
          const istHour = Number(istParts.find(p => p.type === 'hour')?.value ?? 0);
          const istMin = Number(istParts.find(p => p.type === 'minute')?.value ?? 0);
          if (istDay === slot.dayOfWeek) {
            const [hh, mm] = slot.cutoffTime.split(':').map(Number);
            const nowMins = istHour * 60 + istMin;
            const cutoffMins = (hh || 0) * 60 + (mm || 0);
            if (nowMins >= cutoffMins) {
              throw Errors.badRequest(`Cutoff time ${slot.cutoffTime} IST for this slot has passed`);
            }
          }
        }

        // 3. Calculate subtotal (GST-inclusive gross prices — DB prices are ex-GST taxable rates)
        let subtotal = 0;
        const itemDetails = [];

        for (const item of vo.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: { priceSlabs: { orderBy: { minQty: 'asc' } } },
          });
          if (!product) throw Errors.notFound('Product');

          // Find applicable price slab (ex-GST taxable rate)
          let taxableUnitPrice = Number(product.basePrice);
          for (const slab of product.priceSlabs) {
            if (item.quantity >= slab.minQty && (slab.maxQty === null || item.quantity <= slab.maxQty)) {
              taxableUnitPrice = Number(slab.price);
            }
          }

          // Apply GST to get gross (customer-facing) price
          const taxPercent = Number(product.taxPercent) || 0;
          const grossUnitPrice = Math.round(taxableUnitPrice * (1 + taxPercent / 100) * 100) / 100;
          const totalPrice = Math.round(grossUnitPrice * item.quantity * 100) / 100;
          subtotal += totalPrice;

          itemDetails.push({
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: grossUnitPrice,
            totalPrice,
          });
        }

        if (subtotal < Number(vendor.minOrderValue)) {
          throw Errors.belowMOV(vendor.businessName, Number(vendor.minOrderValue), subtotal);
        }

        // 4. Generate order number
        const orderNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

        // 5. Create order
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            vendorId: vo.vendorId,
            businessAccountId,
            outletId,
            deliveryAddressSnapshot,
            status: 'pending',
            subtotal,
            totalAmount: subtotal,
            paymentMethod: input.paymentMethod,
            deliverySlotId: vo.deliverySlotId,
            notes: vo.notes,
            items: { create: itemDetails },
          },
          include: { items: true },
        });

        // 6. Reserve inventory
        await this.inventoryService.reserveStock(vo.items, tx);

        orders.push(order);
      }

      // 7. Clear the (user, account, outlet)-scoped cart
      const cart = await tx.cart.findFirst({
        where: { userId, businessAccountId, outletId },
        select: { id: true },
      });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      // 8. Emit events after transaction
      setImmediate(() => {
        for (const order of orders) {
          emitEvent('OrderCreated', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            userId,
            vendorId: order.vendorId,
            totalAmount: Number(order.totalAmount),
            items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          });
        }
      });

      return { orders };
    }, { isolationLevel: 'Serializable' });
  }

  async list(userId: string, options: { status?: string; vendorId?: string; cursor?: string; limit?: number }) {
    const { status, vendorId, cursor, limit = 20 } = options;
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;

    const orders = await prisma.order.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
        items: {
          include: {
            product: { select: { imageUrl: true, images: true } },
          },
        },
      },
    });

    const hasMore = orders.length > limit;
    if (hasMore) orders.pop();

    return {
      orders,
      pagination: { next_cursor: hasMore ? orders[orders.length - 1]?.id : null, has_more: hasMore },
    };
  }

  async getById(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            product: { select: { imageUrl: true, images: true } },
          },
        },
        vendor: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
        payments: true,
      },
    });
    if (!order) throw Errors.notFound('Order');
    return order;
  }

  // Valid status transitions — any move not in this map is rejected.
  private static readonly VALID_TRANSITIONS: Readonly<Record<string, string[]>> = {
    pending:    ['confirmed', 'cancelled'],
    confirmed:  ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped:    ['delivered'],
    delivered:  [],
    cancelled:  [],
  };

  async updateStatus(orderId: string, vendorId: string, status: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, vendorId },
        include: { items: { select: { productId: true, quantity: true } } },
      });
      if (!order) throw Errors.notFound('Order');

      const validNext = OrderService.VALID_TRANSITIONS[order.status as string] ?? [];
      if (!validNext.includes(status)) {
        throw Errors.badRequest(
          `Cannot move order from "${order.status}" to "${status}". ` +
          `Allowed next states: ${validNext.length ? validNext.join(', ') : 'none'}.`
        );
      }

      // Inventory side-effects
      if (status === 'cancelled') {
        // Release reserved stock so it becomes available for other orders
        await this.inventoryService.releaseStock(
          order.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
          tx,
        );
      }
      if (status === 'delivered') {
        // Goods have left the warehouse — deduct from physical available stock
        await this.inventoryService.finalizeStock(
          order.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
          tx,
        );
      }

      // Timestamp fields
      const now = new Date();
      const extraData: Record<string, unknown> = {};
      if (status === 'confirmed') extraData.acceptedAt = now;
      if (status === 'cancelled') {
        extraData.rejectedAt = now;
        if (reason) extraData.rejectionReason = reason;
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: status as never, ...extraData },
      });

      const eventName = `Order${status.charAt(0).toUpperCase() + status.slice(1)}` as 'OrderConfirmed';
      emitEvent(eventName, { orderId, userId: updated.userId, vendorId });

      return updated;
    });
  }
}
