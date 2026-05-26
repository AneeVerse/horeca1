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
    vendorIdOrSlug: string,
    options: { categoryId?: string; search?: string; cursor?: string; limit?: number; includeInactive?: boolean }
  ) {
    const { categoryId, search, cursor, limit = 20, includeInactive } = options;

    // Accept either UUID or slug (matches VendorService.getById behaviour).
    // Postgres throws P2007 ("invalid input syntax for type uuid") if a non-UUID
    // string is used directly in a `where: { vendorId }` filter on the products table.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let vendorId = vendorIdOrSlug;
    if (!UUID_RE.test(vendorIdOrSlug)) {
      const v = await prisma.vendor.findFirst({
        where: { slug: vendorIdOrSlug },
        select: { id: true },
      });
      if (!v) throw Errors.notFound('Vendor');
      vendorId = v.id;
    }

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
        // parent + parentId let the Vendor Store sidebar render the Hyperpure-style
        // hierarchical "Categories >> Sub-Categories" navigation per UI/UX Notes.
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            parent: { select: { id: true, name: true, slug: true } },
          },
        },
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
    categoryIds?: string[];
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
    aliasNames?: string[];
    shelfLifeDays?: number;
    countryOfOrigin?: string;
    vegNonVeg?: 'veg' | 'nonveg' | 'egg';
    storageType?: string;
    basePrice: number;
    originalPrice?: number;
    taxPercent?: number;
    minOrderQty?: number;
    creditEligible?: boolean;
    basedOnProductId?: string;
    basedOnBrandMasterProductId?: string;
  }) {
    const { basedOnProductId, basedOnBrandMasterProductId, categoryIds, ...productData } = data;

    // Resolve the category set: prefer the explicit multi-category array, fall
    // back to the single legacy categoryId so existing callers keep working.
    // The first entry is the "primary" — mirrored into Product.categoryId and
    // flagged isPrimary=true in the join table so existing single-category
    // queries (filtering, breadcrumbs) keep working unchanged.
    const resolvedCategoryIds = categoryIds && categoryIds.length > 0
      ? categoryIds
      : (data.categoryId ? [data.categoryId] : []);
    productData.categoryId = resolvedCategoryIds[0] ?? productData.categoryId;

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

    // If based on a brand canonical product, auto-approve too — the vendor is
    // explicitly saying "I distribute this branded item", which is a strong
    // quality signal equivalent to picking an existing approved vendor product.
    let brandMaster: { id: string; brandId: string; name: string; brandName: string } | null = null;
    if (basedOnBrandMasterProductId) {
      const mp = await prisma.brandMasterProduct.findFirst({
        where: {
          id: basedOnBrandMasterProductId,
          isActive: true,
          brand: { isActive: true, approvalStatus: 'approved' },
        },
        select: {
          id: true,
          brandId: true,
          name: true,
          brand: { select: { name: true } },
        },
      });
      if (mp) {
        approvalStatus = 'approved';
        brandMaster = { id: mp.id, brandId: mp.brandId, name: mp.name, brandName: mp.brand.name };
        // Force brand field to the canonical brand name so the link is unambiguous
        productData.brand = mp.brand.name;
      }
    }

    const created = await prisma.product.create({
      data: { ...productData, vendorId, basePrice: productData.basePrice, approvalStatus },
    });

    // Write the multi-category join rows. First entry is isPrimary=true to match
    // Product.categoryId. skipDuplicates guards against the caller passing the
    // same id twice.
    if (resolvedCategoryIds.length > 0) {
      await prisma.productCategory.createMany({
        data: resolvedCategoryIds.map((categoryId, idx) => ({
          productId: created.id,
          categoryId,
          isPrimary: idx === 0,
        })),
        skipDuplicates: true,
      });
    }

    // When the vendor explicitly picked the brand catalog entry, create a verified
    // mapping immediately. No need to wait on embedding or the fuzzy auto-mapper —
    // the user told us the link is right. Idempotent via the unique pair.
    if (brandMaster) {
      await prisma.brandProductMapping.upsert({
        where: {
          brandMasterProductId_distributorProductId: {
            brandMasterProductId: brandMaster.id,
            distributorProductId: created.id,
          },
        },
        create: {
          brandId: brandMaster.brandId,
          brandMasterProductId: brandMaster.id,
          distributorProductId: created.id,
          status: 'verified',
          matchedBy: 'manually_verified',
          confidenceScore: 1.0,
        },
        update: {
          status: 'verified',
          matchedBy: 'manually_verified',
          confidenceScore: 1.0,
          updatedAt: new Date(),
        },
      });
    }

    // Fire-and-forget: embed first, THEN run brand mapping so the AI signal is available.
    // Skip the auto-mapper when we already created a verified mapping above.
    if (approvalStatus === 'approved' && !brandMaster) {
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

    // Pull categoryIds out of the main update payload — ProductCategory is a
    // separate table. When provided, replace the existing set and sync
    // Product.categoryId to the first entry (the new primary).
    const categoryIds = Array.isArray(data.categoryIds) ? (data.categoryIds as string[]) : undefined;
    delete data.categoryIds;
    if (categoryIds !== undefined) {
      data.categoryId = categoryIds[0] ?? null;
    }

    const updated = await prisma.product.update({ where: { id: productId }, data });

    if (categoryIds !== undefined) {
      await prisma.productCategory.deleteMany({ where: { productId } });
      if (categoryIds.length > 0) {
        await prisma.productCategory.createMany({
          data: categoryIds.map((categoryId, idx) => ({
            productId,
            categoryId,
            isPrimary: idx === 0,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updated;
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
