import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/events/emitter';
import { Errors } from '@/middleware/errorHandler';
import { provisionDefaultAccount } from '@/lib/provisionAccount';
import { runMappingForProduct, runMappingForBrand, embedBrandMasterProduct } from './brand-mapper';
function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Types ────────────────────────────────────────────────────

interface CreateBrandInput {
  userId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  tagline?: string;
  categories?: string[];
  bgColor?: string;
  showcaseImages?: string[];
}

interface UpdateBrandInput {
  name?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  tagline?: string;
  categories?: string[];
  bgColor?: string;
  showcaseImages?: string[];
}

interface CreateBrandProductInput {
  name: string;
  description?: string;
  imageUrl?: string;
  packSize?: string;
  unit?: string;
  sku?: string;
  categoryId?: string;        // primary (back-compat); auto-derived from categoryIds[0] when omitted
  categoryIds?: string[];     // multi-category
  sortOrder?: number;
}

// ── Service ──────────────────────────────────────────────────

export class BrandService {

  // ── Resolve brand from userId ──────────────────────────────
  async getBrandIdForUser(userId: string): Promise<string> {
    const brand = await prisma.brand.findUnique({ where: { userId }, select: { id: true } });
    if (!brand) throw Errors.notFound('Brand profile not found for this user');
    return brand.id;
  }

  // ── Public: list approved brands ──────────────────────────
  async list(input: { limit?: number; cursor?: string }) {
    const { limit = 20, cursor } = input;

    const brands = await prisma.brand.findMany({
      where: { isActive: true, approvalStatus: 'approved' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        bannerUrl: true,
        tagline: true,
        categories: true,
        bgColor: true,
        showcaseImages: true,
        _count: { select: { masterProducts: { where: { isActive: true } } } },
      },
    });

    const hasMore = brands.length > limit;
    if (hasMore) brands.pop();

    return {
      brands: brands.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logo: b.logoUrl,
        banner: b.bannerUrl,
        tagline: b.tagline,
        categories: b.categories,
        bgColor: b.bgColor,
        showcaseImages: b.showcaseImages,
        productCount: b._count.masterProducts,
      })),
      hasMore,
      nextCursor: hasMore ? brands[brands.length - 1].id : null,
    };
  }

  // ── Public: brand store page data ─────────────────────────
  // Returns canonical products + which distributors have them (verified/auto mappings).
  // When `pincode` is passed, distributors that don't service that pincode are still
  // returned but flagged via `coverage` so the UI can show an empty-state message.
  async getStoreBySlug(slug: string, opts?: { pincode?: string }) {
    const pincode = opts?.pincode;
    const brand = await prisma.brand.findUnique({
      where: { slug, isActive: true, approvalStatus: 'approved' },
      include: {
        masterProducts: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            categoryRel: { select: { id: true, name: true } },
            mappings: {
              where: { status: { in: ['auto_mapped', 'verified'] } },
              include: {
                distributorProduct: {
                  select: {
                    id: true,
                    name: true,
                    basePrice: true,
                    taxPercent: true,
                    imageUrl: true,
                    packSize: true,
                    unit: true,
                    inventory: { select: { qtyAvailable: true } },
                    priceSlabs: { orderBy: { minQty: 'asc' }, select: { minQty: true, maxQty: true, price: true } },
                    vendor: {
                      select: {
                        id: true,
                        businessName: true,
                        slug: true,
                        logoUrl: true,
                        serviceAreas: {
                          where: { isActive: true },
                          select: { pincode: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!brand) throw Errors.notFound('Brand not found');

    // Build vendor index (deduplicated)
    const vendorMap = new Map<string, {
      id: string; name: string; slug: string; logo: string | null;
      pincodes: string[]; productIds: string[];
      prices: Record<string, number>;
      servicesPincode: boolean;
    }>();

    const products = brand.masterProducts.map(mp => {
      const distributors = mp.mappings.map(m => {
        const v = m.distributorProduct.vendor;
        if (!v) return null;

        const priceWithTax = Number(m.distributorProduct.basePrice) *
          (1 + Number(m.distributorProduct.taxPercent) / 100);
        const vendorPincodes = v.serviceAreas.map(sa => sa.pincode);
        const servicesPincode = pincode ? vendorPincodes.includes(pincode) : true;

        if (!vendorMap.has(v.id)) {
          vendorMap.set(v.id, {
            id: v.id,
            name: v.businessName,
            slug: v.slug,
            logo: v.logoUrl,
            pincodes: vendorPincodes,
            productIds: [],
            prices: {},
            servicesPincode,
          });
        }
        const vendor = vendorMap.get(v.id)!;
        if (!vendor.productIds.includes(mp.id)) vendor.productIds.push(mp.id);
        vendor.prices[mp.id] = Math.round(priceWithTax * 100) / 100;

        return {
          vendorId: v.id,
          vendorName: v.businessName,
          price: Math.round(priceWithTax * 100) / 100,
          basePrice: Number(m.distributorProduct.basePrice),
          taxPercent: Number(m.distributorProduct.taxPercent),
          inStock: (m.distributorProduct.inventory?.qtyAvailable ?? 0) > 0,
          stock: m.distributorProduct.inventory?.qtyAvailable ?? 0,
          distributorProductId: m.distributorProduct.id,
          distributorProductName: m.distributorProduct.name,
          packSize: m.distributorProduct.packSize ?? '',
          unit: m.distributorProduct.unit ?? '',
          imageUrl: m.distributorProduct.imageUrl,
          priceSlabs: m.distributorProduct.priceSlabs.map(s => ({
            minQty: Number(s.minQty),
            maxQty: s.maxQty != null ? Number(s.maxQty) : null,
            price: Number(s.price),
          })),
          servicesPincode,
        };
      }).filter(Boolean);

      return {
        id: mp.id,
        name: mp.name,
        description: mp.description,
        image: mp.imageUrl,
        packSize: mp.packSize,
        unit: mp.unit,
        category: mp.categoryRel?.name ?? (mp as Record<string, unknown>).category as string | undefined ?? 'General',
        distributors,
      };
    });

    const allVendors = [...vendorMap.values()];
    const servicedVendors = pincode ? allVendors.filter(v => v.servicesPincode) : allVendors;

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logoUrl,
      banner: brand.bannerUrl,
      tagline: brand.tagline,
      description: brand.description,
      products,
      vendors: allVendors,
      coverage: {
        pincode: pincode ?? null,
        servicedVendorCount: servicedVendors.length,
        totalVendorCount: allVendors.length,
      },
    };
  }

  // ── Brand: analytics dashboard ────────────────────────────
  // Aggregates the brand's reach and order activity by joining the brand's
  // BrandProductMappings → distributorProductIds → OrderItem rows.
  async getAnalytics(brandId: string) {
    // 1) Mapped distributor products + serviced pincodes
    const mappings = await prisma.brandProductMapping.findMany({
      where: { brandId, status: { in: ['verified', 'auto_mapped'] } },
      select: {
        distributorProductId: true,
        brandMasterProduct: { select: { id: true, name: true, imageUrl: true, packSize: true } },
        distributorProduct: {
          select: {
            vendorId: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
                logoUrl: true,
                serviceAreas: { where: { isActive: true }, select: { pincode: true } },
              },
            },
          },
        },
      },
    });

    const distributorProductIds = mappings.map(m => m.distributorProductId);
    const distributorIds = new Set(mappings.map(m => m.distributorProduct.vendorId).filter((v): v is string => v != null));
    const pincodes = new Set<string>();
    for (const m of mappings) {
      for (const sa of m.distributorProduct.vendor?.serviceAreas ?? []) pincodes.add(sa.pincode);
    }

    const masterProductCount = await prisma.brandMasterProduct.count({
      where: { brandId, isActive: true },
    });

    // 2) Orders containing brand-mapped products (last 6 months for trend, last 30d for headline)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orderItems = distributorProductIds.length > 0
      ? await prisma.orderItem.findMany({
          where: {
            productId: { in: distributorProductIds },
            order: { createdAt: { gte: sixMonthsAgo }, status: { not: 'cancelled' } },
          },
          select: {
            productId: true,
            quantity: true,
            totalPrice: true,
            order: { select: { id: true, createdAt: true, vendorId: true } },
          },
        })
      : [];

    // 3) Headline stats (last 30d)
    let last30dOrders = 0;
    let last30dRevenue = 0;
    const last30dOrderIds = new Set<string>();
    for (const it of orderItems) {
      if (it.order.createdAt >= thirtyDaysAgo) {
        last30dOrderIds.add(it.order.id);
        last30dRevenue += Number(it.totalPrice);
      }
    }
    last30dOrders = last30dOrderIds.size;

    // 4) Top 5 master products by qty + revenue (all-time within 6mo window)
    const productIdToMaster = new Map<string, { id: string; name: string; imageUrl: string | null; packSize: string | null }>();
    for (const m of mappings) {
      productIdToMaster.set(m.distributorProductId, m.brandMasterProduct);
    }
    type AccRow = { id: string; name: string; imageUrl: string | null; packSize: string | null; qty: number; revenue: number };
    const masterAcc = new Map<string, AccRow>();
    for (const it of orderItems) {
      const master = productIdToMaster.get(it.productId);
      if (!master) continue;
      const existing = masterAcc.get(master.id) ?? {
        id: master.id, name: master.name, imageUrl: master.imageUrl, packSize: master.packSize,
        qty: 0, revenue: 0,
      };
      existing.qty += it.quantity;
      existing.revenue += Number(it.totalPrice);
      masterAcc.set(master.id, existing);
    }
    const topProducts = [...masterAcc.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 5) Top distributors by revenue
    type VendorRow = { id: string; name: string; logoUrl: string | null; orderCount: number; revenue: number };
    const vendorAcc = new Map<string, VendorRow>();
    const vendorOrderIds = new Map<string, Set<string>>();
    const vendorIdToInfo = new Map<string, { name: string; logoUrl: string | null }>();
    for (const m of mappings) {
      if (m.distributorProduct.vendor && m.distributorProduct.vendorId) {
        vendorIdToInfo.set(m.distributorProduct.vendorId, {
          name: m.distributorProduct.vendor.businessName,
          logoUrl: m.distributorProduct.vendor.logoUrl,
        });
      }
    }
    for (const it of orderItems) {
      const vendorId = it.order.vendorId;
      const info = vendorIdToInfo.get(vendorId);
      if (!info) continue;
      const existing = vendorAcc.get(vendorId) ?? {
        id: vendorId, name: info.name, logoUrl: info.logoUrl, orderCount: 0, revenue: 0,
      };
      existing.revenue += Number(it.totalPrice);
      vendorAcc.set(vendorId, existing);
      const orderSet = vendorOrderIds.get(vendorId) ?? new Set<string>();
      orderSet.add(it.order.id);
      vendorOrderIds.set(vendorId, orderSet);
    }
    for (const [id, row] of vendorAcc) {
      row.orderCount = vendorOrderIds.get(id)?.size ?? 0;
    }
    const topDistributors = [...vendorAcc.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 6) Monthly trend (last 6 months)
    const monthBuckets: Record<string, { month: string; orders: Set<string>; revenue: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthBuckets[key] = { month: key, orders: new Set(), revenue: 0 };
    }
    for (const it of orderItems) {
      const d = it.order.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthBuckets[key]) {
        monthBuckets[key].orders.add(it.order.id);
        monthBuckets[key].revenue += Number(it.totalPrice);
      }
    }
    const monthlyTrend = Object.values(monthBuckets).map(b => ({
      month: b.month,
      orders: b.orders.size,
      revenue: Math.round(b.revenue * 100) / 100,
    }));

    return {
      headline: {
        masterProductCount,
        mappedDistributorProductCount: distributorProductIds.length,
        distributorCount: distributorIds.size,
        servicedPincodeCount: pincodes.size,
        last30dOrders,
        last30dRevenue: Math.round(last30dRevenue * 100) / 100,
      },
      topProducts: topProducts.map(p => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
      })),
      topDistributors: topDistributors.map(v => ({
        ...v,
        revenue: Math.round(v.revenue * 100) / 100,
      })),
      monthlyTrend,
      pincodes: [...pincodes].sort(),
    };
  }

  // ── Brand: create profile ──────────────────────────────────
  async createBrand(input: CreateBrandInput) {
    const existing = await prisma.brand.findFirst({
      where: { OR: [{ userId: input.userId }, { name: input.name }] },
    });
    if (existing?.userId === input.userId) throw Errors.conflict('Brand profile already exists');
    if (existing?.name === input.name) throw Errors.conflict('Brand name already taken');

    const slug = slugify(input.name);

    // V2.2: provision a BusinessAccount (isBrand=true) so the Brand can be linked.
    // Idempotent — if the user already has one it's reused.
    const provision = await provisionDefaultAccount({
      userId: input.userId,
      kind: 'brand',
      businessName: input.name,
    });

    const brand = await prisma.brand.create({
      data: {
        userId: input.userId,
        businessAccountId: provision.businessAccountId,
        name: input.name,
        slug,
        description: input.description,
        logoUrl: input.logoUrl,
        bannerUrl: input.bannerUrl,
        website: input.website,
        tagline: input.tagline,
        categories: input.categories ?? [],
        bgColor: input.bgColor,
        showcaseImages: input.showcaseImages ?? [],
      },
    });

    emitEvent('BrandCreated', { brandId: brand.id, userId: input.userId, brandName: brand.name });
    return brand;
  }

  // ── Brand: get own profile ─────────────────────────────────
  async getMyProfile(userId: string) {
    const brand = await prisma.brand.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            masterProducts: { where: { isActive: true } },
            productMappings: { where: { status: { in: ['auto_mapped', 'verified'] } } },
          },
        },
      },
    });
    if (!brand) throw Errors.notFound('Brand profile not found');
    return brand;
  }

  // ── Brand: update profile ──────────────────────────────────
  async updateProfile(userId: string, input: UpdateBrandInput) {
    const brand = await prisma.brand.findUnique({ where: { userId } });
    if (!brand) throw Errors.notFound('Brand profile not found');

    return prisma.brand.update({
      where: { id: brand.id },
      data: {
        ...input,
        ...(input.name ? { slug: slugify(input.name) } : {}),
      },
    });
  }

  // ── Brand: list own master products ───────────────────────
  async listMyProducts(userId: string) {
    const brandId = await this.getBrandIdForUser(userId);
    return prisma.brandMasterProduct.findMany({
      where: { brandId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        categoryRel: { select: { id: true, name: true } },
        _count: {
          select: {
            mappings: { where: { status: { in: ['auto_mapped', 'verified'] } } },
          },
        },
      },
    });
  }

  // ── Brand: create master product ──────────────────────────
  async createMasterProduct(userId: string, input: CreateBrandProductInput) {
    const brandId = await this.getBrandIdForUser(userId);

    // Resolve primary categoryId: prefer explicit input.categoryId, otherwise
    // fall back to the first entry in categoryIds[]. Keeps single-category
    // consumers (brand store page, etc.) working unchanged.
    const categoryIds = input.categoryIds ?? (input.categoryId ? [input.categoryId] : []);
    const primaryCategoryId = input.categoryId ?? categoryIds[0] ?? null;

    const product = await prisma.brandMasterProduct.create({
      data: {
        brandId,
        slug: slugify(input.name),
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        packSize: input.packSize,
        unit: input.unit,
        sku: input.sku,
        sortOrder: input.sortOrder,
        categoryId: primaryCategoryId,
        categoryIds,
      },
    });

    emitEvent('BrandProductCreated', {
      brandMasterProductId: product.id,
      brandId,
      productName: product.name,
    });

    // Embed first so the AI signal is available, then auto-map. Non-blocking.
    embedBrandMasterProduct(product.id)
      .catch(console.error)
      .finally(() => runMappingForProduct(product.id).catch(console.error));

    return product;
  }

  // ── Brand: update master product ──────────────────────────
  async updateMasterProduct(userId: string, productId: string, input: Partial<CreateBrandProductInput>) {
    const brandId = await this.getBrandIdForUser(userId);
    const product = await prisma.brandMasterProduct.findFirst({
      where: { id: productId, brandId },
    });
    if (!product) throw Errors.notFound('Product not found');

    // Keep categoryId in sync when categoryIds changes (primary = first entry).
    const data: Record<string, unknown> = { ...input };
    if (input.categoryIds !== undefined) {
      data.categoryIds = input.categoryIds;
      // If caller didn't explicitly set categoryId, derive it from the array.
      if (input.categoryId === undefined) {
        data.categoryId = input.categoryIds[0] ?? null;
      }
    }

    const updated = await prisma.brandMasterProduct.update({
      where: { id: productId },
      data,
    });

    // Re-embed + re-map when name (or other text-affecting fields) changed.
    if (input.name || input.packSize !== undefined || input.unit !== undefined
        || input.categoryId !== undefined || input.categoryIds !== undefined) {
      embedBrandMasterProduct(productId)
        .catch(console.error)
        .finally(() => runMappingForProduct(productId).catch(console.error));
    }

    return updated;
  }

  // ── Brand: delete master product (hard, with mapping cleanup) ─────────
  // BrandProductMapping cascades on brandMasterProductId, so this fully removes
  // the row and any mappings. Vendor-side Product rows are not touched.
  async deleteMasterProduct(userId: string, productId: string) {
    const brandId = await this.getBrandIdForUser(userId);
    const product = await prisma.brandMasterProduct.findFirst({
      where: { id: productId, brandId },
      select: { id: true },
    });
    if (!product) throw Errors.notFound('Product not found');
    await prisma.brandMasterProduct.delete({ where: { id: productId } });
    return { id: productId, deleted: true };
  }

  // ── Brand: get product-level coverage (for portal mappings page) ──────
  async getDistributorCoverage(userId: string) {
    const brandId = await this.getBrandIdForUser(userId);

    // Get all master products with their mappings
    const masterProducts = await prisma.brandMasterProduct.findMany({
      where: { brandId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        mappings: {
          include: {
            distributorProduct: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                vendor: { select: { id: true, businessName: true, logoUrl: true } },
              },
            },
          },
        },
      },
    });

    return masterProducts.map(mp => ({
      masterProductId: mp.id,
      masterProductName: mp.name,
      packSize: mp.packSize,
      mappings: mp.mappings.map(m => ({
        id: m.id,
        status: m.status,
        confidenceScore: Number(m.confidenceScore),
        distributorProduct: {
          id: m.distributorProduct.id,
          name: m.distributorProduct.name,
          basePrice: Number(m.distributorProduct.basePrice),
          vendor: m.distributorProduct.vendor,
        },
      })),
    }));
  }

  // ── Brand: trigger manual re-mapping ──────────────────────
  // Awaits the mapper so the API response reflects final state — the frontend
  // re-fetches coverage immediately after, and "Run Auto-Mapping" needs to
  // feel synchronous to the brand. Returns before/after counts so we can also
  // surface what changed in the UI later if needed.
  async triggerMapping(userId: string) {
    const brandId = await this.getBrandIdForUser(userId);
    const before = await prisma.brandProductMapping.count({ where: { brandId } });
    try {
      await runMappingForBrand(brandId);
    } catch (err) {
      console.error('runMappingForBrand failed', err);
      throw err;
    }
    const after = await prisma.brandProductMapping.count({ where: { brandId } });
    return {
      message: after > before ? `Mapped ${after - before} new distributor product(s)` : 'No new matches found',
      before,
      after,
      newMappings: after - before,
    };
  }

  // ── Admin: list all brands ─────────────────────────────────
  async adminListBrands(status?: string) {
    return prisma.brand.findMany({
      where: status ? { approvalStatus: status as 'pending' | 'approved' | 'rejected' } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        _count: { select: { masterProducts: true, productMappings: true } },
      },
    });
  }

  // ── Admin: approve or reject brand ────────────────────────
  async adminApproveBrand(brandId: string, action: 'approved' | 'rejected', adminId: string, _reviewNote?: string) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw Errors.notFound('Brand not found');

    const updated = await prisma.brand.update({
      where: { id: brandId },
      data: { approvalStatus: action },
    });

    if (action === 'approved') {
      emitEvent('BrandApproved', { brandId, brandName: brand.name, approvedBy: adminId });
      // Kick off initial auto-mapping
      runMappingForBrand(brandId).catch(console.error);
    }
    // Note: rejection reviewNote is accepted but not yet persisted to Brand row —
    // schema has no rejection_note column. Stored in audit log via the API caller
    // for now; add a column if rejection reasons need to be displayed back.

    return updated;
  }

  // ── Admin: list pending mappings for review ────────────────
  async adminListPendingMappings(limit = 50) {
    return prisma.brandProductMapping.findMany({
      where: { status: 'pending_review' },
      take: limit,
      orderBy: { confidenceScore: 'desc' },
      include: {
        brandMasterProduct: {
          select: {
            id: true,
            name: true,
            packSize: true,
            brand: { select: { id: true, name: true, slug: true } },
          },
        },
        distributorProduct: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            vendor: { select: { id: true, businessName: true, logoUrl: true } },
          },
        },
      },
    });
  }

  // ── Admin: verify or reject a mapping ─────────────────────
  async adminReviewMapping(
    mappingId: string,
    action: 'verified' | 'rejected',
    reviewedBy: string,
    reviewNote?: string,
    /**
     * Optional re-target. If admin picks a DIFFERENT BrandMasterProduct than the
     * auto-mapper guessed, we move the mapping over by deleting the original row
     * and upserting onto the new (brandMasterProductId, distributorProductId)
     * unique pair as verified+manually_verified+1.0 confidence.
     */
    brandMasterProductId?: string,
  ) {
    const mapping = await prisma.brandProductMapping.findUnique({ where: { id: mappingId } });
    if (!mapping) throw Errors.notFound('Mapping not found');

    // Simple path: no re-target — just update in place.
    if (!brandMasterProductId || brandMasterProductId === mapping.brandMasterProductId) {
      return prisma.brandProductMapping.update({
        where: { id: mappingId },
        data: {
          status: action,
          matchedBy: 'manually_verified',
          confidenceScore: action === 'verified' ? 1.0 : mapping.confidenceScore,
          reviewedBy,
          reviewNote,
        },
      });
    }

    // Re-target only makes sense when verifying. Reject + re-target is nonsense.
    if (action !== 'verified') {
      throw Errors.badRequest('Re-target only allowed when verifying');
    }

    // Confirm the new master product exists, get its brandId for the FK.
    const newMaster = await prisma.brandMasterProduct.findUnique({
      where: { id: brandMasterProductId },
      select: { id: true, brandId: true, isActive: true },
    });
    if (!newMaster || !newMaster.isActive) throw Errors.notFound('Target brand master product not found');

    // Move the mapping atomically — delete the original, upsert the new
    // (brandMasterProductId, distributorProductId) pair.
    return prisma.$transaction(async (tx) => {
      await tx.brandProductMapping.delete({ where: { id: mappingId } });
      return tx.brandProductMapping.upsert({
        where: {
          brandMasterProductId_distributorProductId: {
            brandMasterProductId,
            distributorProductId: mapping.distributorProductId,
          },
        },
        create: {
          brandId: newMaster.brandId,
          brandMasterProductId,
          distributorProductId: mapping.distributorProductId,
          status: 'verified',
          matchedBy: 'manually_verified',
          confidenceScore: 1.0,
          reviewedBy,
          reviewNote,
        },
        update: {
          status: 'verified',
          matchedBy: 'manually_verified',
          confidenceScore: 1.0,
          reviewedBy,
          reviewNote,
          updatedAt: new Date(),
        },
      });
    });
  }
}
