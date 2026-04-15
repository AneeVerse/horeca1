import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/events/emitter';
import { Errors } from '@/middleware/errorHandler';

interface ListVendorsInput {
  pincode?: string;
  categoryId?: string;
  sort?: 'rating' | 'name' | 'min_order_value';
  order?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export class VendorService {
  async list(input: ListVendorsInput) {
    const { pincode, categoryId, sort = 'rating', order = 'desc', cursor, limit = 20 } = input;

    const where: Record<string, unknown> = { isActive: true, isVerified: true };

    if (pincode) {
      where.serviceAreas = { some: { pincode, isActive: true } };
    }

    if (categoryId) {
      where.products = { some: { categoryId, isActive: true } };
    }

    const vendors = await prisma.vendor.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { [sort === 'min_order_value' ? 'minOrderValue' : sort]: order },
      select: {
        id: true,
        businessName: true,
        slug: true,
        logoUrl: true,
        rating: true,
        minOrderValue: true,
        creditEnabled: true,
        description: true,
        products: {
          where: { isActive: true },
          select: { category: { select: { name: true } } },
          distinct: ['categoryId'],
        },
      },
    });

    const hasMore = vendors.length > limit;
    if (hasMore) vendors.pop();

    // Flatten products→category into a simple categories string array
    const vendorsWithCategories = vendors.map(({ products, ...rest }) => ({
      ...rest,
      categories: [...new Set(products.map(p => p.category?.name).filter(Boolean))],
    }));

    return {
      vendors: vendorsWithCategories,
      pagination: {
        next_cursor: hasMore ? vendorsWithCategories[vendorsWithCategories.length - 1]?.id : null,
        has_more: hasMore,
      },
    };
  }

  async getById(id: string) {
    // Accept either UUID or slug so frontend links work regardless of format
    const vendor = await prisma.vendor.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        serviceAreas: { where: { isActive: true }, select: { pincode: true } },
        deliverySlots: { where: { isActive: true } },
        products: {
          where: { isActive: true },
          select: { category: { select: { name: true } } },
          distinct: ['categoryId'],
        },
      },
    });

    if (!vendor) throw Errors.notFound('Vendor');

    // Flatten products→category into a simple categories string array
    const { products, ...rest } = vendor;
    return {
      ...rest,
      categories: [...new Set(products.map(p => p.category?.name).filter(Boolean))],
    };
  }

  async getBySlug(slug: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { slug },
      include: {
        serviceAreas: { where: { isActive: true }, select: { pincode: true } },
        deliverySlots: { where: { isActive: true } },
        products: {
          where: { isActive: true },
          select: { category: { select: { name: true } } },
          distinct: ['categoryId'],
        },
      },
    });

    if (!vendor) throw Errors.notFound('Vendor');

    const { products, ...rest } = vendor;
    return {
      ...rest,
      categories: [...new Set(products.map(p => p.category?.name).filter(Boolean))],
    };
  }

  async getMyVendors(userId: string) {
    return prisma.customerVendor.findMany({
      where: { userId },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logoUrl: true,
            rating: true,
            minOrderValue: true,
          },
        },
      },
      orderBy: { lastOrderedAt: 'desc' },
    });
  }

  async follow(userId: string, vendorId: string) {
    return prisma.customerVendor.upsert({
      where: { userId_vendorId: { userId, vendorId } },
      update: { isFavorite: true },
      create: { userId, vendorId, isFavorite: true },
    });
  }

  async unfollow(userId: string, vendorId: string) {
    return prisma.customerVendor.delete({
      where: { userId_vendorId: { userId, vendorId } },
    });
  }

  async checkServiceability(pincode: string) {
    const areas = await prisma.serviceArea.findMany({
      where: { pincode, isActive: true },
      select: { vendorId: true },
    });

    const vendorIds = Array.from(new Set(areas.map((a) => a.vendorId)));

    return { serviceable: vendorIds.length > 0, vendor_count: vendorIds.length, vendorIds };
  }
}
