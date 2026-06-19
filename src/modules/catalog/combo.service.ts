/**
 * ComboService — vendor product combos / bundles.
 * Created from a product selection in the Bulk Update Engine. Every item is
 * re-validated against the vendor so a forged productId can never slip into a
 * combo belonging to another vendor.
 */

import { prisma } from '@/lib/prisma';

export interface CreateComboInput {
  vendorId: string;
  name: string;
  comboPrice: number;
  validFrom?: Date | null;
  validTo?: Date | null;
  items: { productId: string; qty: number }[];
}

const round = (n: number) => Math.round(n * 100) / 100;

export class ComboService {
  async listForVendor(vendorId: string) {
    return prisma.productCombo.findMany({
      where: { vendorId },
      include: {
        items: { include: { product: { select: { id: true, name: true, basePrice: true, imageUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFromSelection(input: CreateComboInput) {
    const ids = input.items.map((i) => i.productId);
    const owned = await prisma.product.findMany({
      where: { id: { in: ids }, vendorId: input.vendorId },
      select: { id: true, basePrice: true },
    });
    if (owned.length === 0) throw new Error('No products from this vendor in the selection');

    const priceById = new Map(owned.map((p) => [p.id, Number(p.basePrice)]));
    const items = input.items.filter((i) => priceById.has(i.productId));
    // Summed list price (× qty) → strikethrough reference for the bundle.
    const originalPrice = round(items.reduce((sum, i) => sum + (priceById.get(i.productId) ?? 0) * i.qty, 0));

    return prisma.productCombo.create({
      data: {
        vendorId: input.vendorId,
        name: input.name,
        comboPrice: round(input.comboPrice),
        originalPrice,
        validFrom: input.validFrom ?? null,
        validTo: input.validTo ?? null,
        items: { create: items.map((i) => ({ productId: i.productId, qty: i.qty })) },
      },
      include: { items: true },
    });
  }
}
