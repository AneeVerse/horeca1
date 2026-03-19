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
    const results = await Promise.all(
      items.map(async (item) => {
        const inv = await db.inventory.findUnique({ where: { productId: item.productId } });
        const available = inv ? inv.qtyAvailable - inv.qtyReserved : 0;
        return {
          productId: item.productId,
          available: available >= item.quantity,
          qtyAvailable: available,
        };
      })
    );
    return results;
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
