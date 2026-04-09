import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/events/emitter';
import { Errors } from '@/middleware/errorHandler';
import { runMappingForProduct, runMappingForBrand } from './brand-mapper';
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
}

interface UpdateBrandInput {
  name?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  tagline?: string;
}

interface CreateBrandProductInput {
  name: string;
  description?: string;
  imageUrl?: string;
  packSize?: string;
  unit?: string;
  sku?: string;
  categoryId?: string;
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
        productCount: b._count.masterProducts,
      })),
      hasMore,
      nextCursor: hasMore ? brands[brands.length - 1].id : null,
    };
  }

  // ── Public: brand store page data ─────────────────────────
  // Returns canonical products + which distributors have them (verified/auto mappings)
  async getStoreBySlug(slug: string) {
    const brand = await prisma.brand.findUnique({
      where: { slug, isActive: true, approvalStatus: 'approved' },
      include: {
        masterProducts: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            category: { select: { id: true, name: true } },
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
                    inventory: { select: { qtyAvailable: true } },
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
    }>();

    const products = brand.masterProducts.map(mp => {
      const distributors = mp.mappings.map(m => {
        const v = m.distributorProduct.vendor;
        if (!v) return null;

        const priceWithTax = Number(m.distributorProduct.basePrice) *
          (1 + Number(m.distributorProduct.taxPercent) / 100);

        if (!vendorMap.has(v.id)) {
          vendorMap.set(v.id, {
            id: v.id,
            name: v.businessName,
            slug: v.slug,
            logo: v.logoUrl,
            pincodes: v.serviceAreas.map(sa => sa.pincode),
            productIds: [],
            prices: {},
          });
        }
        const vendor = vendorMap.get(v.id)!;
        if (!vendor.productIds.includes(mp.id)) vendor.productIds.push(mp.id);
        vendor.prices[mp.id] = Math.round(priceWithTax * 100) / 100;

        return {
          vendorId: v.id,
          price: Math.round(priceWithTax * 100) / 100,
          inStock: (m.distributorProduct.inventory?.qtyAvailable ?? 0) > 0,
          distributorProductId: m.distributorProduct.id,
        };
      }).filter(Boolean);

      return {
        id: mp.id,
        name: mp.name,
        description: mp.description,
        image: mp.imageUrl,
        packSize: mp.packSize,
        category: mp.category?.name ?? 'General',
        distributors,
      };
    });

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logoUrl,
      banner: brand.bannerUrl,
      tagline: brand.tagline,
      description: brand.description,
      products,
      vendors: [...vendorMap.values()],
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

    const brand = await prisma.brand.create({
      data: {
        userId: input.userId,
        name: input.name,
        slug,
        description: input.description,
        logoUrl: input.logoUrl,
        bannerUrl: input.bannerUrl,
        website: input.website,
        tagline: input.tagline,
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
        category: { select: { id: true, name: true } },
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

    const product = await prisma.brandMasterProduct.create({
      data: { brandId, ...input },
    });

    emitEvent('BrandProductCreated', {
      brandMasterProductId: product.id,
      brandId,
      productName: product.name,
    });

    // Kick off auto-mapping in background (non-blocking)
    runMappingForProduct(product.id).catch(console.error);

    return product;
  }

  // ── Brand: update master product ──────────────────────────
  async updateMasterProduct(userId: string, productId: string, input: Partial<CreateBrandProductInput>) {
    const brandId = await this.getBrandIdForUser(userId);
    const product = await prisma.brandMasterProduct.findFirst({
      where: { id: productId, brandId },
    });
    if (!product) throw Errors.notFound('Product not found');

    const updated = await prisma.brandMasterProduct.update({
      where: { id: productId },
      data: input,
    });

    // Re-run mapping if name changed
    if (input.name) runMappingForProduct(productId).catch(console.error);

    return updated;
  }

  // ── Brand: delete master product (soft) ───────────────────
  async deleteMasterProduct(userId: string, productId: string) {
    const brandId = await this.getBrandIdForUser(userId);
    const product = await prisma.brandMasterProduct.findFirst({ where: { id: productId, brandId } });
    if (!product) throw Errors.notFound('Product not found');
    return prisma.brandMasterProduct.update({ where: { id: productId }, data: { isActive: false } });
  }

  // ── Brand: get distributor coverage (which vendors carry their products) ──
  async getDistributorCoverage(userId: string) {
    const brandId = await this.getBrandIdForUser(userId);

    const mappings = await prisma.brandProductMapping.findMany({
      where: { brandId, status: { in: ['auto_mapped', 'verified'] } },
      include: {
        brandMasterProduct: { select: { name: true } },
        distributorProduct: {
          select: {
            id: true,
            name: true,
            basePrice: true,
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

    // Group by vendor
    const byVendor = new Map<string, {
      vendorId: string; vendorName: string; logo: string | null;
      pincodes: string[]; products: string[];
    }>();

    for (const m of mappings) {
      const v = m.distributorProduct.vendor;
      if (!v) continue;
      if (!byVendor.has(v.id)) {
        byVendor.set(v.id, {
          vendorId: v.id,
          vendorName: v.businessName,
          logo: v.logoUrl,
          pincodes: v.serviceAreas.map(sa => sa.pincode),
          products: [],
        });
      }
      byVendor.get(v.id)!.products.push(m.brandMasterProduct.name);
    }

    return [...byVendor.values()];
  }

  // ── Brand: trigger manual re-mapping ──────────────────────
  async triggerMapping(userId: string) {
    const brandId = await this.getBrandIdForUser(userId);
    runMappingForBrand(brandId).catch(console.error);
    return { message: 'Auto-mapping started in background' };
  }

  // ── Admin: list all brands ─────────────────────────────────
  async adminListBrands(status?: string) {
    return prisma.brand.findMany({
      where: status ? { approvalStatus: status as 'pending' | 'approved' | 'rejected' } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, fullName: true } },
        _count: { select: { masterProducts: true, productMappings: true } },
      },
    });
  }

  // ── Admin: approve or reject brand ────────────────────────
  async adminApproveBrand(brandId: string, action: 'approved' | 'rejected', adminId: string) {
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

    return updated;
  }

  // ── Admin: list pending mappings for review ────────────────
  async adminListPendingMappings(limit = 50) {
    return prisma.brandProductMapping.findMany({
      where: { status: 'pending_review' },
      take: limit,
      orderBy: { confidenceScore: 'desc' },
      include: {
        brand: { select: { name: true } },
        brandMasterProduct: { select: { name: true, packSize: true } },
        distributorProduct: {
          select: {
            name: true,
            brand: true,
            packSize: true,
            vendor: { select: { businessName: true } },
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
  ) {
    const mapping = await prisma.brandProductMapping.findUnique({ where: { id: mappingId } });
    if (!mapping) throw Errors.notFound('Mapping not found');

    return prisma.brandProductMapping.update({
      where: { id: mappingId },
      data: {
        status: action,
        matchedBy: 'manually_verified',
        reviewedBy,
        reviewNote,
      },
    });
  }
}
