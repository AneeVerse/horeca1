import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';

export class CatalogService {
  async getVendorProducts(
    vendorId: string,
    options: { categoryId?: string; search?: string; cursor?: string; limit?: number }
  ) {
    const { categoryId, search, cursor, limit = 20 } = options;

    const where: Record<string, unknown> = { vendorId, isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const products = await prisma.product.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { name: 'asc' },
      include: {
        priceSlabs: { orderBy: { sortOrder: 'asc' } },
        inventory: { select: { qtyAvailable: true, qtyReserved: true } },
      },
    });

    const hasMore = products.length > limit;
    if (hasMore) products.pop();

    return {
      products: products.map((p) => ({
        ...p,
        in_stock: p.inventory ? p.inventory.qtyAvailable - p.inventory.qtyReserved > 0 : false,
        qty_available: p.inventory ? p.inventory.qtyAvailable - p.inventory.qtyReserved : 0,
      })),
      pagination: {
        next_cursor: hasMore ? products[products.length - 1]?.id : null,
        has_more: hasMore,
      },
    };
  }

  async getCategories(parentId?: string) {
    return prisma.category.findMany({
      where: { isActive: true, parentId: parentId || null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async getCategoryVendors(categoryId: string, pincode?: string) {
    const where: Record<string, unknown> = {
      isActive: true,
      isVerified: true,
      products: { some: { categoryId, isActive: true } },
    };

    if (pincode) {
      where.serviceAreas = { some: { pincode, isActive: true } };
    }

    return prisma.vendor.findMany({
      where,
      orderBy: { rating: 'desc' },
      select: {
        id: true,
        businessName: true,
        slug: true,
        logoUrl: true,
        rating: true,
        minOrderValue: true,
      },
    });
  }

  async getCollections() {
    return prisma.collection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        products: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
          take: 10,
        },
      },
    });
  }

  async createProduct(vendorId: string, data: {
    name: string;
    slug: string;
    categoryId?: string;
    description?: string;
    imageUrl?: string;
    packSize?: string;
    unit?: string;
    basePrice: number;
    creditEligible?: boolean;
  }) {
    return prisma.product.create({
      data: { ...data, vendorId, basePrice: data.basePrice },
    });
  }

  async updateProduct(productId: string, vendorId: string, data: Record<string, unknown>) {
    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId },
    });
    if (!product) throw Errors.notFound('Product');

    return prisma.product.update({ where: { id: productId }, data });
  }
}
