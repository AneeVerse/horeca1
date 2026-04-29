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
    const inventories = await db.inventory.findMany({
      where: { productId: { in: ids } },
      select: { productId: true, qtyAvailable: true, qtyReserved: true },
    });
    const invByProductId = new Map(inventories.map(inv => [inv.productId, inv]));
    return items.map(item => {
      const inv = invByProductId.get(item.productId);
      const available = inv ? inv.qtyAvailable - inv.qtyReserved : 0;
      return {
        productId: item.productId,
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
}
