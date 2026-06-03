import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { emitEvent } from '@/events/emitter';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { Errors } from '@/middleware/errorHandler';
import {
  createAccrual as createCommissionAccrual,
  findApplicableRule as findApplicableCommissionRule,
} from '@/modules/commission/commission.service';

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

        // 3. Resolve customer-specific pricing (VendorCustomer → PriceList → PriceListItem)
        // Falls back to standard base/slab pricing when no custom pricing is configured.
        // V2.2 Phase 1: also reads salespersonId so the order can be snapshotted
        // with the rep at creation time. Commission attribution is then immune
        // to the customer being later reassigned to a different rep.
        const vendorCustomer = await tx.vendorCustomer.findUnique({
          where: { vendorId_userId: { vendorId: vo.vendorId, userId } },
          select: {
            salespersonId: true,
            priceList: {
              select: {
                discountPercent: true,
                items: { select: { productId: true, customPrice: true } },
              },
            },
          },
        });
        const customPriceMap = new Map<string, number>(
          vendorCustomer?.priceList?.items.map((i) => [i.productId, Number(i.customPrice)]) ?? []
        );
        const globalDiscount = Number(vendorCustomer?.priceList?.discountPercent ?? 0);

        // 4. Calculate subtotal (GST-inclusive gross prices — DB prices are ex-GST taxable rates)
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

          // Apply customer-specific price override (item-level beats global discount)
          if (customPriceMap.has(item.productId)) {
            taxableUnitPrice = customPriceMap.get(item.productId)!;
          } else if (globalDiscount > 0) {
            taxableUnitPrice = Math.round(taxableUnitPrice * (1 - globalDiscount / 100) * 100) / 100;
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

        // 4a. Apply best active promotion (pct_discount or flat_discount)
        let promoDiscount = 0;
        let appliedPromoId: string | null = null;
        const now = new Date();
        const activePromos = await tx.promotion.findMany({
          where: {
            vendorId: vo.vendorId,
            isActive: true,
            type: { in: ['pct_discount', 'flat_discount'] },
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: now } }] },
              { OR: [{ endDate: null }, { endDate: { gte: now } }] },
            ],
          },
          orderBy: { discountPct: 'desc' },
        });
        for (const promo of activePromos) {
          const minVal = promo.minOrderValue ? Number(promo.minOrderValue) : 0;
          if (subtotal < minVal) continue;
          if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) continue;
          if (promo.type === 'pct_discount' && promo.discountPct) {
            promoDiscount = Math.round(subtotal * Number(promo.discountPct) / 100 * 100) / 100;
          } else if (promo.type === 'flat_discount' && promo.discountFlat) {
            promoDiscount = Math.min(Number(promo.discountFlat), subtotal);
          }
          appliedPromoId = promo.id;
          await tx.promotion.update({ where: { id: promo.id }, data: { usageCount: { increment: 1 } } });
          break;
        }
        const totalAmount = Math.max(0, subtotal - promoDiscount);

        // 4b. Credit check — only when paymentMethod is 'credit'
        if (input.paymentMethod === 'credit') {
          const creditAcc = await tx.creditAccount.findUnique({
            where: { userId_vendorId: { userId, vendorId: vo.vendorId } },
          });
          if (!creditAcc || creditAcc.status !== 'active') {
            throw Errors.badRequest('No active credit account with this vendor');
          }

          // Auto-freeze: if overdue days exceed vendor's configured threshold, suspend the account
          if (creditAcc.freezeOnOverdueDays > 0) {
            const oldestOverdue = await tx.creditTransaction.findFirst({
              where: {
                creditAccountId: creditAcc.id,
                type: 'debit',
                dueDate: { lt: new Date() },
              },
              orderBy: { dueDate: 'asc' },
            });
            if (oldestOverdue?.dueDate) {
              const daysOverdue = Math.floor(
                (Date.now() - oldestOverdue.dueDate.getTime()) / 86_400_000
              );
              if (daysOverdue >= creditAcc.freezeOnOverdueDays) {
                await tx.creditAccount.update({
                  where: { id: creditAcc.id },
                  data: { status: 'suspended' },
                });
                throw Errors.badRequest(
                  `Credit account suspended — ${daysOverdue} days overdue (limit: ${creditAcc.freezeOnOverdueDays} days). Please clear outstanding dues to resume credit orders.`
                );
              }
            }
          }

          const available = Number(creditAcc.creditLimit) - Number(creditAcc.creditUsed);
          if (available < totalAmount) {
            throw Errors.badRequest(
              `Insufficient credit. Available: ₹${available.toFixed(2)}, required: ₹${totalAmount.toFixed(2)}`
            );
          }
        }

        // 4. Generate order number
        const orderNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

        // 5. Create order — salespersonId snapshotted from VendorCustomer
        // (null if no rep assigned) so commission attribution survives later
        // reassignment of the customer's salesperson.
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
            promoDiscount,
            promotionId: appliedPromoId,
            totalAmount,
            paymentMethod: input.paymentMethod,
            deliverySlotId: vo.deliverySlotId,
            notes: vo.notes,
            salespersonId: vendorCustomer?.salespersonId ?? null,
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

  // Partial accept: vendor ships a subset of items/quantities.
  // Unfulfilled qty is released back to inventory; order total is recalculated.
  async partialAccept(
    orderId: string,
    vendorId: string,
    itemLines: Array<{ itemId: string; fulfilledQty: number }>,
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, vendorId, status: 'pending' },
        include: { items: true },
      });
      if (!order) throw Errors.notFound('Order or order is not pending');

      const orderItemMap = new Map(order.items.map(i => [i.id, i]));

      // Validate each supplied line
      for (const line of itemLines) {
        const item = orderItemMap.get(line.itemId);
        if (!item) throw Errors.badRequest(`Item ${line.itemId} does not belong to this order`);
        if (line.fulfilledQty < 0) throw Errors.badRequest('Fulfilled qty cannot be negative');
        if (line.fulfilledQty > item.quantity) {
          throw Errors.badRequest(
            `Fulfilled qty ${line.fulfilledQty} exceeds ordered qty ${item.quantity} for "${item.productName}"`,
          );
        }
      }

      // Build fulfilled map — items not in the list default to their full ordered qty
      const fulfilledMap = new Map(itemLines.map(l => [l.itemId, l.fulfilledQty]));
      for (const item of order.items) {
        if (!fulfilledMap.has(item.id)) fulfilledMap.set(item.id, item.quantity);
      }

      // Must fulfil at least one unit in total
      const totalFulfilled = Array.from(fulfilledMap.values()).reduce((s, q) => s + q, 0);
      if (totalFulfilled === 0) {
        throw Errors.badRequest('At least one item must be fulfilled. Use Reject to cancel entirely.');
      }

      const isPartial = order.items.some(i => (fulfilledMap.get(i.id) ?? i.quantity) < i.quantity);

      // Release inventory for unfulfilled quantities
      const toRelease = order.items
        .map(i => ({ productId: i.productId, quantity: i.quantity - (fulfilledMap.get(i.id) ?? i.quantity) }))
        .filter(r => r.quantity > 0);
      if (toRelease.length > 0) await this.inventoryService.releaseStock(toRelease, tx);

      // Recalculate order total proportionally & update each item's fulfilledQty
      let newSubtotal = 0;
      for (const item of order.items) {
        const fulfilled = fulfilledMap.get(item.id) ?? item.quantity;
        const itemTotal = Math.round(Number(item.totalPrice) * (fulfilled / item.quantity) * 100) / 100;
        newSubtotal += itemTotal;
        await tx.orderItem.update({ where: { id: item.id }, data: { fulfilledQty: fulfilled } });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'confirmed',
          isPartial,
          subtotal: newSubtotal,
          totalAmount: newSubtotal,
          acceptedAt: new Date(),
        },
      });

      emitEvent('OrderConfirmed', { orderId, userId: updated.userId, vendorId });
      return updated;
    });
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

  async updateStatus(
    orderId: string,
    vendorId: string,
    status: string,
    reason?: string,
    proof?: { proofType?: string; proofUrl?: string | null; notes?: string },
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, vendorId },
        include: {
          items: {
            select: {
              productId: true,
              quantity: true,
              // categoryId needed to resolve category-scoped commission rules
              // at delivery time. Tiny extra row; cheap to include.
              product: { select: { categoryId: true } },
            },
          },
        },
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
      if (status === 'delivered') {
        extraData.deliveredAt = now;
        if (proof?.proofType) extraData.deliveryProofType = proof.proofType;
        if (proof?.proofUrl) extraData.deliveryProofUrl = proof.proofUrl;
        if (proof?.notes) extraData.deliveryNotes = proof.notes;
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: status as never, ...extraData },
      });

      // Credit side-effects — debit when confirmed, release when cancelled
      if (order.paymentMethod === 'credit') {
        const creditAcc = await tx.creditAccount.findUnique({
          where: { userId_vendorId: { userId: order.userId, vendorId } },
        });
        if (creditAcc) {
          const orderTotal = Number(order.totalAmount);
          if (status === 'confirmed') {
            const newUsed = Number(creditAcc.creditUsed) + orderTotal;
            await tx.creditAccount.update({
              where: { id: creditAcc.id },
              data: { creditUsed: newUsed },
            });
            // Default payment due 30 days from confirmation
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() + 30);
            await tx.creditTransaction.create({
              data: {
                creditAccountId: creditAcc.id,
                orderId,
                vendorId,
                type: 'debit',
                amount: orderTotal,
                balanceAfter: newUsed,
                dueDate,
              },
            });
          } else if (status === 'cancelled') {
            // Reverse any debit written when order was confirmed
            const debit = await tx.creditTransaction.findFirst({
              where: { orderId, type: 'debit', vendorId },
            });
            if (debit) {
              const newUsed = Math.max(0, Number(creditAcc.creditUsed) - Number(debit.amount));
              await tx.creditAccount.update({ where: { id: creditAcc.id }, data: { creditUsed: newUsed } });
              await tx.creditTransaction.create({
                data: {
                  creditAccountId: creditAcc.id,
                  orderId,
                  vendorId,
                  type: 'credit',
                  amount: Number(debit.amount),
                  balanceAfter: newUsed,
                  notes: `Reversal — order ${orderId} cancelled`,
                },
              });
            }
          }
        }
      }

      // V2.2 Phase 1 — Commission accrual hook.
      //
      // When an order is delivered AND a salesperson was attributed at order
      // creation, find the most-specific active commission rule and write
      // a pending CommissionAccrual. Idempotent — the (orderId, salespersonId)
      // unique constraint stops double-write if updateStatus is retried.
      //
      // The hook runs INSIDE the same transaction as the status update so
      // an accrual is either written-with-delivery or not at all (no race
      // window where the order is delivered but accrual missing). The
      // service falls back silently if no rule matches — the brief says
      // commissions are opt-in, not mandatory.
      if (status === 'delivered' && order.salespersonId) {
        const vendorCustomer = await tx.vendorCustomer.findUnique({
          where: { vendorId_userId: { vendorId, userId: order.userId } },
          select: { id: true },
        });
        // Category ids from the items. Brand resolution is deferred —
        // Product.brand is a free-text name today; brand-scoped commission
        // rules will activate once the brand-mapping layer is the source
        // of truth (separate Phase task).
        const categoryIds = Array.from(
          new Set(
            order.items
              .map((i) => i.product?.categoryId)
              .filter((id): id is string => !!id),
          ),
        );
        const rule = await findApplicableCommissionRule(
          {
            vendorId,
            salespersonId: order.salespersonId,
            order: {
              id: order.id,
              totalAmount: order.totalAmount,
              createdAt: order.createdAt,
              userId: order.userId,
            },
            vendorCustomerId: vendorCustomer?.id ?? null,
            brandIds: [],
            categoryIds,
          },
          tx,
        );
        if (rule) {
          await createCommissionAccrual(
            {
              order: {
                id: order.id,
                vendorId,
                totalAmount: order.totalAmount,
                createdAt: order.createdAt,
                salespersonId: order.salespersonId,
              },
              rule,
            },
            tx,
          );
        }
      }

      const eventName = `Order${status.charAt(0).toUpperCase() + status.slice(1)}` as 'OrderConfirmed';
      emitEvent(eventName, { orderId, userId: updated.userId, vendorId });

      return updated;
    });
  }
}
