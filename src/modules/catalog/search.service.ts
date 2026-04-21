import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Shape returned by Prisma.$queryRaw for trgm fuzzy match
interface TrgmRow {
  id: string;
}

// Full product shape returned by findMany (with all includes below)
type ProductWithIncludes = Prisma.ProductGetPayload<{
  include: {
    vendor: { select: { id: true; businessName: true; slug: true; logoUrl: true; rating: true; minOrderValue: true } };
    priceSlabs: { orderBy: { sortOrder: 'asc' } };
    inventory: { select: { qtyAvailable: true } };
    category: { select: { id: true; name: true; slug: true } };
  };
}>;

const PRODUCT_INCLUDE = {
  vendor: {
    select: { id: true, businessName: true, slug: true, logoUrl: true, rating: true, minOrderValue: true },
  },
  priceSlabs: { orderBy: { sortOrder: 'asc' as const } },
  inventory: { select: { qtyAvailable: true } },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

export class SearchService {
  async search(query: string, pincode?: string, cursor?: string, limit = 20) {
    const vendorFilter: Prisma.ProductWhereInput = pincode
      ? { vendor: { isActive: true, serviceAreas: { some: { pincode, isActive: true } } } }
      : {};

    // ── Phase 1: exact ILIKE match ──────────────────────────────────────────
    // Fast path — hits existing btree/GIN indexes, very high confidence results.
    const exactWhere: Prisma.ProductWhereInput = {
      isActive: true,
      approvalStatus: 'approved',
      ...vendorFilter,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { category: { name: { contains: query, mode: 'insensitive' } } },
        { vendor: { businessName: { contains: query, mode: 'insensitive' } } },
        { tags: { has: query.toLowerCase() } },
      ],
    };

    const exactProducts = await prisma.product.findMany({
      where: exactWhere,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: PRODUCT_INCLUDE,
    });

    // ── Phase 2: fuzzy trgm match (only when phase 1 returns fewer than 5) ──
    // Catches typos like "panner" → "paneer". Uses pg_trgm similarity operator %.
    // $queryRaw with Prisma.sql keeps parameters fully escaped — no string interp.
    let products: ProductWithIncludes[];

    if (exactProducts.length < 5) {
      const fuzzyRows = await prisma.$queryRaw<TrgmRow[]>(
        Prisma.sql`
          SELECT id
          FROM   products
          WHERE  name % ${query}
             AND is_active = true
             AND approval_status = 'approved'
          ORDER  BY similarity(name, ${query}) DESC
          LIMIT  20
        `
      );

      const exactIds = new Set(exactProducts.map((p) => p.id));
      const newFuzzyIds = fuzzyRows.map((r) => r.id).filter((id) => !exactIds.has(id));

      if (newFuzzyIds.length > 0) {
        const fuzzyWhere: Prisma.ProductWhereInput = {
          id: { in: newFuzzyIds },
          isActive: true,
          approvalStatus: 'approved',
          ...vendorFilter,
        };

        const fuzzyProducts = await prisma.product.findMany({
          where: fuzzyWhere,
          include: PRODUCT_INCLUDE,
        });

        // Phase 1 results first (highest confidence), then deduped phase 2 results
        products = [...exactProducts, ...fuzzyProducts];
      } else {
        products = exactProducts;
      }
    } else {
      products = exactProducts;
    }

    // Honour the original limit + cursor pagination contract
    const hasMore = products.length > limit;
    if (hasMore) products.pop();

    // Extract unique vendors and categories for the 3-block response
    const vendorMap = new Map<string, ProductWithIncludes['vendor']>();
    const categoryMap = new Map<string, NonNullable<ProductWithIncludes['category']>>();

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
