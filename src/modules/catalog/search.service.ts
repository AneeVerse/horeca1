import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class SearchService {
  async search(query: string, pincode?: string, cursor?: string, limit = 20) {
    // Text search across product name, category name, and vendor name
    const vendorFilter: Prisma.ProductWhereInput = pincode
      ? { vendor: { isActive: true, serviceAreas: { some: { pincode, isActive: true } } } }
      : {};

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      approvalStatus: 'approved',
      ...vendorFilter,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { category: { name: { contains: query, mode: 'insensitive' } } },
        { vendor: { businessName: { contains: query, mode: 'insensitive' } } },
        { tags: { has: query.toLowerCase() } },
      ],
    };

    const products = await prisma.product.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        vendor: {
          select: { id: true, businessName: true, slug: true, logoUrl: true, rating: true, minOrderValue: true },
        },
        priceSlabs: { orderBy: { sortOrder: 'asc' } },
        inventory: { select: { qtyAvailable: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    const hasMore = products.length > limit;
    if (hasMore) products.pop();

    // Extract unique vendors and categories for the 3-block response
    const vendorMap = new Map<string, (typeof products)[0]['vendor']>();
    const categoryMap = new Map<string, NonNullable<(typeof products)[0]['category']>>();

    for (const p of products) {
      if (p.vendor) vendorMap.set(p.vendor.id, p.vendor);
      if (p.category) categoryMap.set(p.category.id, p.category);
    }

    return {
      products,
      vendors: Array.from(vendorMap.values()),
      categories: Array.from(categoryMap.values()),
      pagination: {
        next_cursor: hasMore ? products[products.length - 1]?.id : null,
        has_more: hasMore,
      },
    };
  }
}
