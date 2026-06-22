import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';
import { emitEvent } from '@/events/emitter';
import { runMappingForVendorProduct, embedDistributorProduct } from '@/modules/brand/brand-mapper';
import { nextMasterSku } from '@/lib/sku';
import { sendProductRejectedNotifications } from '@/lib/productRejectionNotifications';

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Every vendor Product maps to a Horeca1 master SKU (P0-1). When a caller doesn't
 * supply one, link to (or create) the canonical master keyed on (name, brand) so
 * the same logical item across vendors collapses to one master — without forcing
 * a picker into every create path. `categoryId` must already be a leaf.
 */
export async function findOrCreateMaster(input: { name: string; brand: string | null; categoryId: string }): Promise<string> {
  const existing = await prisma.masterProduct.findFirst({
    where: {
      name: { equals: input.name, mode: 'insensitive' },
      brand: input.brand ? { equals: input.brand, mode: 'insensitive' } : null,
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  return prisma.$transaction(async (tx) => {
    const sku = await nextMasterSku(tx);
    const master = await tx.masterProduct.create({
      data: { sku, name: input.name, brand: input.brand, categoryId: input.categoryId },
      select: { id: true },
    });
    return master.id;
  });
}

// Mirrors the slug rule in /api/v1/vendor/categories/suggest so a name maps to
// the same slug everywhere and we match (instead of duplicate) an already-
// suggested category.
function categorySlugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s]+/g, '-').replace(/-+/g, '-');
}

/**
 * Resolve a category name to a category id, creating one when no match exists.
 * Used by product import (admin + vendor) so an unknown category in a sheet
 * becomes a tracked record instead of being silently dropped to null.
 *   • autoApprove=true  (admin)  → created approved + active immediately.
 *   • autoApprove=false (vendor) → created pending + inactive, CategorySuggested
 *     emitted for the approvals queue.
 * Matching is case-insensitive on name, then slug, and includes pending
 * categories so we never create a duplicate of an already-suggested one.
 * Returns null for empty names (caller treats category as absent, as before).
 */
export async function findOrCreateCategoryByName(input: {
  name: string | null | undefined;
  autoApprove: boolean;
  suggestedBy?: string;
  parentId?: string | null;
}): Promise<string | null> {
  const name = input.name?.trim();
  if (!name) return null;

  const slug = categorySlugify(name);
  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { slug }] },
    select: { id: true },
  });
  if (existing) return existing.id;

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      parentId: input.parentId ?? null,
      approvalStatus: input.autoApprove ? 'approved' : 'pending',
      isActive: input.autoApprove,
      suggestedBy: input.suggestedBy ?? null,
    },
    select: { id: true, name: true },
  });

  if (!input.autoApprove) {
    emitEvent('CategorySuggested', {
      categoryId: category.id,
      categoryName: category.name,
      suggestedBy: input.suggestedBy ?? '',
    });
  }

  return category.id;
}

/**
 * Enforce the "Item MUST map to a sub-category" rule (Req 5): every id must be an
 * existing TERMINAL category — i.e. the most-specific node, one with no children
 * of its own. This rejects mapping to a parent/intermediate category (you must
 * pick its sub-category), and once a 2-level tree exists it effectively requires
 * level-2 — while NOT breaking a still-flat catalog that only has top-level
 * categories yet. Used by product + master-product create/update so the rule is
 * enforced uniformly server-side, not just in the UI.
 */
export async function assertLeafCategory(categoryIds: string[], db: Db = prisma): Promise<void> {
  if (categoryIds.length === 0) return;
  const unique = [...new Set(categoryIds)];
  const cats = await db.category.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, parentId: true, _count: { select: { children: true } } },
  });
  const found = new Set(cats.map((c) => c.id));
  for (const id of unique) {
    if (!found.has(id)) throw Errors.badRequest(`Category not found: ${id}`);
  }
  for (const c of cats) {
    if (c._count.children > 0) {
      throw Errors.badRequest(`"${c.name}" has sub-categories under it — pick a more specific sub-category.`);
    }
  }
}

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
    fssaiRef?: string;
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
    masterProductId?: string;
    basedOnProductId?: string;
    basedOnBrandMasterProductId?: string;
  }) {
    const { basedOnProductId, basedOnBrandMasterProductId, categoryIds, ...productData } = data;

    // Resolve the category set: prefer the explicit multi-category array, fall
    // back to the single legacy categoryId, then inherit the master's category.
    // The first entry is the "primary" — mirrored into Product.categoryId and
    // flagged isPrimary=true in the join table so existing single-category
    // queries (filtering, breadcrumbs) keep working unchanged.
    let resolvedCategoryIds = categoryIds && categoryIds.length > 0
      ? categoryIds
      : (data.categoryId ? [data.categoryId] : []);
    if (resolvedCategoryIds.length === 0 && productData.masterProductId) {
      const m = await prisma.masterProduct.findUnique({
        where: { id: productData.masterProductId },
        select: { categoryId: true },
      });
      if (m) resolvedCategoryIds = [m.categoryId];
    }
    // Req 5: a product MUST map to at least one leaf (level-2) sub-category.
    if (resolvedCategoryIds.length === 0) {
      throw Errors.badRequest('Product must be mapped to at least one sub-category.');
    }
    await assertLeafCategory(resolvedCategoryIds);
    productData.categoryId = resolvedCategoryIds[0];

    // Req 5: a product MUST map to at least one leaf (level-2) sub-category.
    if (resolvedCategoryIds.length === 0) {
      throw Errors.badRequest('Product must be mapped to at least one sub-category.');
    }
    await assertLeafCategory(resolvedCategoryIds);
    productData.categoryId = resolvedCategoryIds[0];

    // If based on an existing approved product, inherit master SKU and auto-approve.
    let approvalStatus: 'pending' | 'approved' = 'pending';
    if (basedOnProductId) {
      const source = await prisma.product.findFirst({
        where: { id: basedOnProductId, approvalStatus: 'approved' },
        select: { id: true, name: true, brand: true, imageUrl: true, images: true, masterProductId: true },
      });
      if (source) {
        approvalStatus = 'approved';
        if (source.masterProductId) productData.masterProductId = source.masterProductId;
        productData.name = source.name;
        if (source.brand) productData.brand = source.brand;
        if (source.imageUrl) productData.imageUrl = source.imageUrl;
        if (source.images && Array.isArray(source.images) && (source.images as string[]).length > 0) {
          productData.images = source.images as string[];
        }
      }
    }

    // If based on a brand canonical product, inherit master link when available.
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
          sku: true,
          masterProductId: true,
          brand: { select: { name: true } },
        },
      });
      if (mp) {
        approvalStatus = 'approved';
        if (mp.masterProductId) {
          productData.masterProductId = mp.masterProductId;
        } else if (mp.sku) {
          const linked = await prisma.masterProduct.findFirst({
            where: { sku: { equals: mp.sku, mode: 'insensitive' }, approvalStatus: 'approved' },
            select: { id: true },
          });
          if (linked) productData.masterProductId = linked.id;
        }
        brandMaster = { id: mp.id, brandId: mp.brandId, name: mp.name, brandName: mp.brand.name };
        productData.brand = mp.brand.name;
      }
    }

    // Master catalog match → instant approved listing with admin-assigned SKU.
    if (productData.masterProductId) {
      const master = await prisma.masterProduct.findFirst({
        where: { id: productData.masterProductId, approvalStatus: 'approved', isActive: true },
        select: { id: true, name: true, brand: true, sku: true, categoryId: true, imageUrl: true, images: true, uom: true },
      });
      if (!master) throw Errors.badRequest('Master product not found or not approved.');
      approvalStatus = 'approved';
      productData.name = master.name;
      if (master.brand) productData.brand = master.brand;
      productData.sku = master.sku;
      if (master.imageUrl && !productData.imageUrl) productData.imageUrl = master.imageUrl;
      if (master.images.length > 0 && (!productData.images || productData.images.length === 0)) {
        productData.images = master.images;
      }
      if (resolvedCategoryIds.length === 0) {
        resolvedCategoryIds = [master.categoryId];
        productData.categoryId = master.categoryId;
      }

      const dup = await prisma.product.findFirst({
        where: {
          vendorId,
          masterProductId: productData.masterProductId,
          slug: { not: { startsWith: TOMBSTONE_PREFIX } },
        },
        select: { id: true, name: true },
      });
      if (dup) {
        throw Errors.conflict(`You already list "${dup.name}" for this master SKU. Edit the existing product instead.`);
      }
    } else if (approvalStatus === 'pending') {
      // New vendor submission — admin reviews and assigns SKU before it goes live.
      delete productData.masterProductId;
      delete productData.sku;

      const dupSlug = await prisma.product.findFirst({
        where: {
          vendorId,
          slug: productData.slug,
        },
        select: { id: true, name: true, slug: true },
      });
      if (dupSlug && !dupSlug.slug.startsWith(TOMBSTONE_PREFIX)) {
        throw Errors.conflict(`You already have a product named "${dupSlug.name}". Edit it instead.`);
      }
    }

    // Vendor single-add loophole: a brand typed freely (not picked from the
    // approved list) must still become a tracked record so it reaches the
    // approvals queue — mirrors what product import does. Only for genuinely new
    // submissions; the master / brand-canonical paths already carry an approved
    // brand. Lazy import avoids a static import cycle with the brand module.
    if (approvalStatus === 'pending' && productData.brand) {
      const { findOrCreateBrandByName } = await import('@/modules/brand/brand.service');
      await findOrCreateBrandByName({ name: productData.brand, autoApprove: false });
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

  /**
   * Decide whether a vendor product qualifies for instant approval (catalog match).
   * Mirrors the auto-approve branches in createProduct.
   */
  private async evaluateInstantApproval(input: {
    vendorId: string;
    masterProductId?: string | null;
    basedOnProductId?: string;
    basedOnBrandMasterProductId?: string;
    excludeProductId?: string;
  }): Promise<'approved' | 'pending'> {
    const { vendorId, excludeProductId } = input;
    let masterProductId = input.masterProductId ?? null;

    if (input.basedOnProductId) {
      const source = await prisma.product.findFirst({
        where: { id: input.basedOnProductId, approvalStatus: 'approved' },
        select: { masterProductId: true },
      });
      if (source) {
        if (source.masterProductId) masterProductId = source.masterProductId;
        return 'approved';
      }
    }

    if (input.basedOnBrandMasterProductId) {
      const mp = await prisma.brandMasterProduct.findFirst({
        where: {
          id: input.basedOnBrandMasterProductId,
          isActive: true,
          brand: { isActive: true, approvalStatus: 'approved' },
        },
        select: { masterProductId: true, sku: true },
      });
      if (mp) {
        if (mp.masterProductId) {
          masterProductId = mp.masterProductId;
        } else if (mp.sku) {
          const linked = await prisma.masterProduct.findFirst({
            where: { sku: { equals: mp.sku, mode: 'insensitive' }, approvalStatus: 'approved' },
            select: { id: true },
          });
          if (linked) masterProductId = linked.id;
        }
        return 'approved';
      }
    }

    if (masterProductId) {
      const master = await prisma.masterProduct.findFirst({
        where: { id: masterProductId, approvalStatus: 'approved', isActive: true },
        select: { id: true },
      });
      if (!master) return 'pending';

      const dup = await prisma.product.findFirst({
        where: {
          vendorId,
          masterProductId,
          slug: { not: { startsWith: TOMBSTONE_PREFIX } },
          ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
        },
        select: { id: true },
      });
      if (dup) return 'pending';

      return 'approved';
    }

    return 'pending';
  }

  async updateProduct(productId: string, vendorId: string, data: Record<string, unknown>) {
    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId },
    });
    if (!product) throw Errors.notFound('Product');

    const isResubmit = product.approvalStatus === 'rejected';

    // Pull categoryIds out of the main update payload — ProductCategory is a
    // separate table. When provided, replace the existing set and sync
    // Product.categoryId to the first entry (the new primary).
    const categoryIds = Array.isArray(data.categoryIds) ? (data.categoryIds as string[]) : undefined;
    delete data.categoryIds;
    if (categoryIds !== undefined) {
      // Changing the category set still has to obey the leaf rule (Req 5).
      // Empty array would orphan the product, so reject it on update too.
      if (categoryIds.length === 0) {
        throw Errors.badRequest('Product must remain mapped to at least one sub-category.');
      }
      await assertLeafCategory(categoryIds);
      data.categoryId = categoryIds[0] ?? null;
    }

    if (isResubmit) {
      const mergedMasterId =
        (typeof data.masterProductId === 'string' ? data.masterProductId : null) ??
        product.masterProductId;
      const basedOnProductId =
        typeof data.basedOnProductId === 'string' ? data.basedOnProductId : undefined;
      const basedOnBrandMasterProductId =
        typeof data.basedOnBrandMasterProductId === 'string'
          ? data.basedOnBrandMasterProductId
          : undefined;

      const approvalStatus = await this.evaluateInstantApproval({
        vendorId,
        masterProductId: mergedMasterId,
        basedOnProductId,
        basedOnBrandMasterProductId,
        excludeProductId: productId,
      });

      if (approvalStatus === 'approved' && mergedMasterId) {
        const master = await prisma.masterProduct.findFirst({
          where: { id: mergedMasterId, approvalStatus: 'approved', isActive: true },
          select: {
            id: true,
            name: true,
            brand: true,
            sku: true,
            categoryId: true,
            imageUrl: true,
            images: true,
          },
        });
        if (master) {
          data.name = master.name;
          if (master.brand) data.brand = master.brand;
          data.sku = master.sku;
          data.masterProductId = master.id;
          if (master.imageUrl && !data.imageUrl) data.imageUrl = master.imageUrl;
          if (
            master.images.length > 0 &&
            (!Array.isArray(data.images) || (data.images as string[]).length === 0)
          ) {
            data.images = master.images;
          }
          if (!data.categoryId && !categoryIds?.length) {
            data.categoryId = master.categoryId;
          }
        }
      }

      data.approvalStatus = approvalStatus;
      data.approvalNote = null;
      data.approvedBy = null;
      data.approvedAt = null;
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

    if (isResubmit) {
      if (updated.approvalStatus === 'approved') {
        emitEvent('ProductApproved', {
          productId: updated.id,
          vendorId,
          productName: updated.name,
          approvedBy: '',
        });
        embedDistributorProduct(updated.id)
          .catch(() => {})
          .finally(() => runMappingForVendorProduct(updated.id).catch(() => {}));
      } else if (updated.approvalStatus === 'pending') {
        emitEvent('ProductSubmitted', {
          productId: updated.id,
          vendorId,
          productName: updated.name,
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
    await sendProductRejectedNotifications({
      productId: product.id,
      vendorId: product.vendorId,
      productName: product.name,
      reason: note,
    });
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
