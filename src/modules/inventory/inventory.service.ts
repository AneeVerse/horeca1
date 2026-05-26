import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/events/emitter';
import { Errors } from '@/middleware/errorHandler';
import type { PrismaClient } from '@prisma/client';

type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export class InventoryService {
  async getStock(productId: string) {
    const inv = await prisma.inventory.findUnique({ where: { productId } });
    if (!inv) throw Errors.notFound('Inventory');
    return inv;
  }

  async updateStock(productId: string, vendorId: string, data: { qtyAvailable?: number; lowStockThreshold?: number }) {
    const inv = await prisma.inventory.update({
      where: { productId },
      data,
    });

    if (data.qtyAvailable !== undefined && data.qtyAvailable <= inv.lowStockThreshold) {
      emitEvent('StockUpdated', {
        productId,
        vendorId,
        qtyAvailable: data.qtyAvailable,
        lowStockThreshold: inv.lowStockThreshold,
      });
    }

    return inv;
  }

  async bulkCheck(items: Array<{ productId: string; quantity: number }>, tx?: TxClient) {
    const db = tx || prisma;
    const ids = items.map(i => i.productId);
    // Single round-trip instead of N parallel findUnique calls (which all
    // hit the same Postgres connection pool and bottleneck on big carts)
    const [inventories, products] = await Promise.all([
      db.inventory.findMany({
        where: { productId: { in: ids } },
        select: { productId: true, qtyAvailable: true, qtyReserved: true },
      }),
      db.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      }),
    ]);
    const invByProductId = new Map(inventories.map(inv => [inv.productId, inv]));
    const nameByProductId = new Map(products.map(p => [p.id, p.name]));
    return items.map(item => {
      const inv = invByProductId.get(item.productId);
      const available = inv ? inv.qtyAvailable - inv.qtyReserved : 0;
      return {
        productId: item.productId,
        productName: nameByProductId.get(item.productId) ?? 'Item',
        available: available >= item.quantity,
        qtyAvailable: available,
      };
    });
  }

  async reserveStock(items: Array<{ productId: string; quantity: number }>, tx?: TxClient) {
    const db = tx || prisma;
    for (const item of items) {
      await db.inventory.update({
        where: { productId: item.productId },
        data: { qtyReserved: { increment: item.quantity } },
      });
    }
  }

  async releaseStock(items: Array<{ productId: string; quantity: number }>, tx?: TxClient) {
    const db = tx || prisma;
    for (const item of items) {
      await db.inventory.update({
        where: { productId: item.productId },
        data: { qtyReserved: { decrement: item.quantity } },
      });
    }
  }

  // Called when an order is delivered: deduct the goods that left the warehouse
  // from both the available pool and the reserved pool.
  async finalizeStock(items: Array<{ productId: string; quantity: number }>, tx?: TxClient) {
    const db = tx || prisma;
    for (const item of items) {
      await db.inventory.update({
        where: { productId: item.productId },
        data: {
          qtyAvailable: { decrement: item.quantity },
          qtyReserved: { decrement: item.quantity },
        },
      });
    }
  }

  // Bulk stock update — set absolute qtyAvailable per product.
  // Validates each productId belongs to vendorId before writing.
  async bulkUpdateStock(
    vendorId: string,
    items: Array<{ productId: string; qtyAvailable: number }>,
  ) {
    const ids = items.map(i => i.productId);
    const owned = await prisma.inventory.findMany({
      where: { productId: { in: ids }, vendorId },
      select: { productId: true },
    });
    const ownedSet = new Set(owned.map(r => r.productId));
    const invalid = ids.filter(id => !ownedSet.has(id));
    if (invalid.length > 0) {
      throw new Error(`Products not owned by this vendor: ${invalid.join(', ')}`);
    }

    return prisma.$transaction(
      items.map(item =>
        prisma.inventory.update({
          where: { productId: item.productId },
          data: { qtyAvailable: item.qtyAvailable },
        }),
      ),
    );
  }
}
