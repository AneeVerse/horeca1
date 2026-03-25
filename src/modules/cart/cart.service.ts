import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';

export class CartService {
  async getCart(userId: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true, basePrice: true, packSize: true } },
            vendor: { select: { id: true, businessName: true, slug: true, minOrderValue: true } },
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

  async addItem(userId: string, productId: string, vendorId: string, quantity: number) {
    // Ensure cart exists
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    // Get product price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { priceSlabs: { orderBy: { minQty: 'asc' } } },
    });
    if (!product) throw Errors.notFound('Product');
    if (product.approvalStatus !== 'approved') throw Errors.forbidden('This product is not available for purchase');

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

  async updateQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw Errors.notFound('Cart');

    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw Errors.notFound('Cart item');

    // Recalculate price based on new quantity
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { priceSlabs: { orderBy: { minQty: 'asc' } } },
    });

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

  async removeItem(userId: string, itemId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw Errors.notFound('Cart');

    return prisma.cartItem.delete({ where: { id: itemId, cartId: cart.id } });
  }

  async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}
