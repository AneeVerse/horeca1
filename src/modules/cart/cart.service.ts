import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';

/**
 * V2.2: cart is keyed by (userId, businessAccountId, outletId). Every method
 * accepts a CartContext so switching account or outlet loads the correct
 * cart. The legacy unique on (userId) was dropped in Step C.
 *
 * Resolve the CartContext from the session in route handlers via
 * resolveCartContext() (below) so the new fields fall back gracefully for
 * legacy users mid-migration.
 */

export interface CartContext {
  userId: string;
  businessAccountId: string;
  outletId: string;
}

export class CartService {
  async getCart(ctx: CartContext) {
    const cart = await prisma.cart.findFirst({
      where: { userId: ctx.userId, businessAccountId: ctx.businessAccountId, outletId: ctx.outletId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, imageUrl: true, basePrice: true, originalPrice: true,
                taxPercent: true, minOrderQty: true, packSize: true,
                unit: true, creditEligible: true,
                priceSlabs: { orderBy: { minQty: 'asc' as const }, select: { minQty: true, maxQty: true, price: true } },
                inventory: { select: { qtyAvailable: true } },
              },
            },
            vendor: { select: { id: true, businessName: true, slug: true, minOrderValue: true, logoUrl: true } },
          },
        },
      },
    });

    if (!cart) return { vendorGroups: [], total: 0 };

    // Group items by vendor
    const vendorMap = new Map<string, { vendor: (typeof cart.items)[0]['vendor']; items: typeof cart.items; subtotal: number }>();

    for (const item of cart.items) {
      const group = vendorMap.get(item.vendorId) || {
        vendor: item.vendor,
        items: [],
        subtotal: 0,
      };
      group.items.push(item);
      group.subtotal += Number(item.unitPrice) * item.quantity;
      vendorMap.set(item.vendorId, group);
    }

    const vendorGroups = Array.from(vendorMap.values()).map((g) => ({
      vendor: g.vendor,
      items: g.items,
      subtotal: g.subtotal,
      meetsMov: g.subtotal >= Number(g.vendor.minOrderValue),
    }));

    const total = vendorGroups.reduce((sum, g) => sum + g.subtotal, 0);

    return { vendorGroups, total };
  }

  async addItem(ctx: CartContext, productId: string, vendorId: string, quantity: number) {
    // Ensure cart exists for this (user, account, outlet).
    let cart = await prisma.cart.findFirst({
      where: { userId: ctx.userId, businessAccountId: ctx.businessAccountId, outletId: ctx.outletId },
      select: { id: true },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: ctx.userId, businessAccountId: ctx.businessAccountId, outletId: ctx.outletId },
        select: { id: true },
      });
    }

    // Get product price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { priceSlabs: { orderBy: { minQty: 'asc' } } },
    });
    if (!product) throw Errors.notFound('Product');
    if (product.approvalStatus !== 'approved' || !product.isActive) {
      throw Errors.forbidden('This product is not available for purchase');
    }
    if (quantity < product.minOrderQty) throw Errors.badRequest(`Minimum order quantity for this product is ${product.minOrderQty}`);

    let unitPrice = Number(product.basePrice);
    for (const slab of product.priceSlabs) {
      if (quantity >= slab.minQty && (slab.maxQty === null || quantity <= slab.maxQty)) {
        unitPrice = Number(slab.price);
      }
    }

    return prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity, unitPrice },
      create: { cartId: cart.id, productId, vendorId, quantity, unitPrice },
    });
  }

  async updateQuantity(ctx: CartContext, itemId: string, quantity: number) {
    const cart = await prisma.cart.findFirst({
      where: { userId: ctx.userId, businessAccountId: ctx.businessAccountId, outletId: ctx.outletId },
      select: { id: true },
    });
    if (!cart) throw Errors.notFound('Cart');

    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw Errors.notFound('Cart item');

    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { priceSlabs: { orderBy: { minQty: 'asc' } } },
    });

    if (quantity < product!.minOrderQty) throw Errors.badRequest(`Minimum order quantity for this product is ${product!.minOrderQty}`);

    let unitPrice = Number(product!.basePrice);
    for (const slab of product!.priceSlabs) {
      if (quantity >= slab.minQty && (slab.maxQty === null || quantity <= slab.maxQty)) {
        unitPrice = Number(slab.price);
      }
    }

    return prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity, unitPrice },
    });
  }

  async removeItem(ctx: CartContext, itemId: string) {
    const cart = await prisma.cart.findFirst({
      where: { userId: ctx.userId, businessAccountId: ctx.businessAccountId, outletId: ctx.outletId },
      select: { id: true },
    });
    if (!cart) throw Errors.notFound('Cart');

    return prisma.cartItem.delete({ where: { id: itemId, cartId: cart.id } });
  }

  async clearCart(ctx: CartContext) {
    const cart = await prisma.cart.findFirst({
      where: { userId: ctx.userId, businessAccountId: ctx.businessAccountId, outletId: ctx.outletId },
      select: { id: true },
    });
    if (!cart) return;
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}

/**
 * Resolve a CartContext from an AuthContext. Fails fast if the user does not
 * have an active business account + outlet on the session (legacy users
 * mid-migration should be redirected to the onboarding-outlet step).
 */
export function resolveCartContext(ctx: {
  userId: string;
  activeBusinessAccountId: string | null;
  activeOutletId: string | null;
}): CartContext {
  if (!ctx.activeBusinessAccountId || !ctx.activeOutletId) {
    throw Errors.badRequest('No active outlet selected. Pick an outlet before working with the cart.');
  }
  return {
    userId: ctx.userId,
    businessAccountId: ctx.activeBusinessAccountId,
    outletId: ctx.activeOutletId,
  };
}
