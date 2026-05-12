import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';
import { emitEvent } from '@/events/emitter';
import { runMappingForVendorProduct, embedDistributorProduct } from '@/modules/brand/brand-mapper';

// Tombstone prefix used when a product can't be hard-deleted (has order/cart/list refs)
// and we instead rename its slug to free the [vendorId, slug] unique constraint so the
// vendor can re-add a product with the same name. Rows with this prefix are hidden from
// listings, suggestions, and duplicate-name checks.
export const TOMBSTONE_PREFIX = '_deleted_';

export class CatalogService {
  async getVendorProducts(
    vendorId: string,
    options: { categoryId?: string; search?: string; cursor?: string; limit?: number; includeInactive?: boolean }
  ) {
    const { categoryId, search, cursor, limit = 20, includeInactive } = options;

    const where: Record<string, unknown> = {
      vendorId,
      slug: { not: { startsWith: TOMBSTONE_PREFIX } },
    };
    if (!includeInactive) {
      where.isActive = true;
      where.approvalStatus = 'approved';
    }
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
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, businessName: true, logoUrl: true } },
        brandMappings: {
          where: { status: { in: ['verified', 'auto_mapped'] } },
          select: {
            brandMasterProduct: {
              select: {
                name: true,
                brand: { select: { name: true, slug: true } },
              },
            },
          },
          take: 1,
        },
      },
    });

    const hasMore = products.length > limit;
    if (hasMore) products.pop();

    return {
      products: products.map((p) => ({
        ...p,
        categoryName: p.category?.name || '',
        categorySlug: p.category?.slug || '',
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
      where: { isActive: true, approvalStatus: 'approved', parentId: parentId || null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true, approvalStatus: 'approved' },
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
    images?: string[];
    packSize?: string;
    unit?: string;
    sku?: string;
    hsn?: string;
    brand?: string;
    barcode?: string;
    tags?: string[];
    basePrice: number;
    originalPrice?: number;
    taxPercent?: number;
    minOrderQty?: number;
    creditEligible?: boolean;
    basedOnProductId?: string;
  }) {
    const { basedOnProductId, ...productData } = data;

    // If based on an existing approved product, auto-approve and lock name/brand/images
    let approvalStatus: 'pending' | 'approved' = 'pending';
    if (basedOnProductId) {
      const source = await prisma.product.findFirst({
        where: { id: basedOnProductId, approvalStatus: 'approved' },
        select: { id: true, name: true, brand: true, imageUrl: true, images: true },
      });
      if (source) {
        approvalStatus = 'approved';
        // Force name, brand, images from the approved source — vendors cannot override these
        productData.name = source.name;
        if (source.brand) productData.brand = source.brand;
        if (source.imageUrl) productData.imageUrl = source.imageUrl;
        if (source.images && Array.isArray(source.images) && (source.images as string[]).length > 0) {
          productData.images = source.images as string[];
        }
      }
    }

    const created = await prisma.product.create({
      data: { ...productData, vendorId, basePrice: productData.basePrice, approvalStatus },
    });

    // Fire-and-forget: embed first, THEN run brand mapping so the AI signal is available.
    if (approvalStatus === 'approved') {
      embedDistributorProduct(created.id)
        .catch(() => {})
        .finally(() => runMappingForVendorProduct(created.id).catch(() => {}));
    }

    return created;
  }

  async updateProduct(productId: string, vendorId: string, data: Record<string, unknown>) {
    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId },
    });
    if (!product) throw Errors.notFound('Product');

    // Vendors cannot change name, brand, or images on approved products
    if (product.approvalStatus === 'approved') {
      delete data.name;
      delete data.brand;
      delete data.imageUrl;
      delete data.images;
    }

    return prisma.product.update({ where: { id: productId }, data });
  }

  // Hard-delete the product. If FK references block deletion (existing order/cart/list
  // items that don't cascade), fall back to tombstoning: rename slug so the [vendorId,slug]
  // unique constraint frees up and the vendor can re-add a product with the same name.
  // Returns { hardDeleted: true } when fully gone, or { hardDeleted: false } when tombstoned.
  async deleteProduct(productId: string, vendorId?: string): Promise<{ hardDeleted: boolean }> {
    const product = await prisma.product.findFirst({
      where: { id: productId, ...(vendorId ? { vendorId } : {}) },
      select: { id: true, slug: true, name: true, vendorId: true },
    });
    if (!product) throw Errors.notFound('Product');

    try {
      await prisma.product.delete({ where: { id: productId } });
      return { hardDeleted: true };
    } catch (e) {
      // Prisma FK-violation: P2003 (referenced rows exist with no cascade).
      // Sole expected blockers are order_items, cart_items, quick_order_list_items.
      const code = (e as { code?: string })?.code;
      if (code !== 'P2003') throw e;

      const ts = Date.now();
      await prisma.product.update({
        where: { id: productId },
        data: {
          slug: `${TOMBSTONE_PREFIX}${ts}_${product.slug}`.slice(0, 255),
          name: `[Deleted] ${product.name}`.slice(0, 255),
          isActive: false,
        },
      });
      return { hardDeleted: false };
    }
  }

  async approveProduct(productId: string, adminUserId: string, note?: string) {
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: 'approved',
        approvedBy: adminUserId,
        approvedAt: new Date(),
        approvalNote: note || null,
      },
      include: { vendor: { select: { id: true, userId: true } } },
    });
    if (product.vendorId) {
      emitEvent('ProductApproved', {
        productId: product.id,
        vendorId: product.vendorId,
        productName: product.name,
        approvedBy: adminUserId,
      });
    }
    // Fire-and-forget: embed then run brand mapping once approved.
    embedDistributorProduct(product.id)
      .catch(() => {})
      .finally(() => runMappingForVendorProduct(product.id).catch(() => {}));
    return product;
  }

  async rejectProduct(productId: string, adminUserId: string, note: string) {
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: 'rejected',
        approvedBy: adminUserId,
        approvedAt: new Date(),
        approvalNote: note,
      },
      include: { vendor: { select: { id: true, userId: true } } },
    });
    if (product.vendorId) {
      emitEvent('ProductRejected', {
        productId: product.id,
        vendorId: product.vendorId,
        productName: product.name,
        rejectedBy: adminUserId,
        reason: note,
      });
    }
    return product;
  }

  async approveCategory(categoryId: string, adminUserId: string, note?: string) {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        approvalStatus: 'approved',
        approvedBy: adminUserId,
        approvedAt: new Date(),
        approvalNote: note || null,
      },
    });
    emitEvent('CategoryApproved', {
      categoryId: category.id,
      categoryName: category.name,
      approvedBy: adminUserId,
      suggestedBy: category.suggestedBy || undefined,
    });
    return category;
  }

  async rejectCategory(categoryId: string, adminUserId: string, note: string) {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        approvalStatus: 'rejected',
        approvedBy: adminUserId,
        approvedAt: new Date(),
        approvalNote: note,
      },
    });
    emitEvent('CategoryRejected', {
      categoryId: category.id,
      categoryName: category.name,
      rejectedBy: adminUserId,
      suggestedBy: category.suggestedBy || undefined,
      reason: note,
    });
    return category;
  }
}
