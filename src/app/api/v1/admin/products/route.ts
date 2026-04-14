// GET  /api/v1/admin/products — List all products across all vendors
// POST /api/v1/admin/products — Admin creates a product (auto-approved)
// WHY: Admin needs a global view of all products for moderation, search, and
//      the ability to create products on behalf of any vendor.
// PROTECTED: Admin only
// SUPPORTS (GET): ?approvalStatus=&search=&vendorId=&categoryId=&cursor=&limit=20

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { errorResponse } from '@/middleware/errorHandler';
import { requireAdminPerm } from '@/lib/teamPermissions';

// Validation schema for admin product creation
// vendorId is optional — admin can create catalog products without a vendor
const createProductSchema = z.object({
  vendorId: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  basePrice: z.number().positive(),
  categoryId: z.string().uuid().optional(),
  originalPrice: z.number().positive().optional(),
  packSize: z.string().optional(),
  unit: z.string().optional(),
  sku: z.string().optional(),
  hsn: z.string().optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  promoPrice: z.number().positive().optional(),
  promoStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  promoEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  minOrderQty: z.number().int().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  creditEligible: z.boolean().optional(),
  priceSlabs: z.array(z.object({
    minQty: z.number().int().min(1),
    maxQty: z.number().int().min(1).optional(),
    price: z.number().positive(),
    promoPrice: z.number().positive().optional(),
  })).optional(),
});

// GET — list catalog products (deduplicated by name)
// Admin sees unique products with vendor count, not per-vendor copies
export const GET = adminOnly(async (req: NextRequest, _ctx) => {
  try {
    const params = req.nextUrl.searchParams;
    const approvalStatus = params.get('approvalStatus') || undefined;
    const search = params.get('search') || undefined;
    const categoryId = params.get('categoryId') || undefined;
    const cursor = params.get('cursor') || undefined;
    const limit = Math.min(Number(params.get('limit')) || 20, 50);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (approvalStatus) where.approvalStatus = approvalStatus;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allProducts = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, businessName: true } },
        category: { select: { id: true, name: true } },
        inventory: { select: { qtyAvailable: true } },
      },
    });

    // ── APPROVAL QUEUE: no deduplication ────────────────────────────────────
    // When filtering by approvalStatus (e.g. "pending"), admin needs to see
    // every vendor's individual submission. Deduplication by name would hide
    // a vendor's pending "Basmati Rice" if another vendor already has one.
    if (approvalStatus) {
      let startIdx = 0;
      if (cursor) startIdx = allProducts.findIndex(p => p.id === cursor) + 1;

      const page = allProducts.slice(startIdx, startIdx + limit + 1);
      const hasMore = page.length > limit;
      if (hasMore) page.pop();

      const products = page.map(p => ({
        ...p,
        vendorCount: 1,
        vendors: p.vendor ? [p.vendor.businessName] : [],
        vendorStock: [{ vendor: p.vendor?.businessName ?? '', qty: p.inventory?.qtyAvailable ?? 0 }],
        totalStock: p.inventory?.qtyAvailable ?? 0,
      }));

      const nextCursor = hasMore ? products[products.length - 1].id : null;
      const totalCount = allProducts.length;
      const pendingCount = allProducts.filter(p => p.approvalStatus === 'pending').length;
      const approvedCount = allProducts.filter(p => p.approvalStatus === 'approved').length;
      const rejectedCount = allProducts.filter(p => p.approvalStatus === 'rejected').length;

      return NextResponse.json({
        success: true,
        data: {
          products,
          nextCursor,
          hasMore,
          stats: { total: totalCount, approved: approvedCount, pending: pendingCount, rejected: rejectedCount },
        },
      });
    }

    // ── CATALOG VIEW: deduplicate by name ───────────────────────────────────
    // No approvalStatus filter → admin is browsing the full catalog.
    // Group products with the same name, count how many vendors carry them.
    const catalogMap = new Map<string, {
      product: (typeof allProducts)[0];
      vendorCount: number;
      vendors: string[];
      vendorStock: { vendor: string; qty: number }[];
      totalStock: number;
    }>();

    for (const p of allProducts) {
      const key = p.name.toLowerCase().trim();
      const qty = p.inventory?.qtyAvailable ?? 0;
      const existing = catalogMap.get(key);
      if (existing) {
        if (p.vendor && !existing.vendors.includes(p.vendor.businessName)) {
          existing.vendorCount++;
          existing.vendors.push(p.vendor.businessName);
          existing.vendorStock.push({ vendor: p.vendor.businessName, qty });
          existing.totalStock += qty;
        }
      } else {
        catalogMap.set(key, {
          product: p,
          vendorCount: p.vendor ? 1 : 0,
          vendors: p.vendor ? [p.vendor.businessName] : [],
          vendorStock: p.vendor ? [{ vendor: p.vendor.businessName, qty }] : [],
          totalStock: qty,
        });
      }
    }

    const catalogEntries = Array.from(catalogMap.values());

    let startIdx = 0;
    if (cursor) startIdx = catalogEntries.findIndex(e => e.product.id === cursor) + 1;

    const page = catalogEntries.slice(startIdx, startIdx + limit + 1);
    const hasMore = page.length > limit;
    if (hasMore) page.pop();

    const products = page.map(e => ({
      ...e.product,
      vendorCount: e.vendorCount,
      vendors: e.vendors,
      vendorStock: e.vendorStock,
      totalStock: e.totalStock,
    }));

    const nextCursor = hasMore ? products[products.length - 1].id : null;
    const totalCount = catalogEntries.length;
    const approvedCount = catalogEntries.filter(e => e.product.approvalStatus === 'approved').length;
    const pendingCount = catalogEntries.filter(e => e.product.approvalStatus === 'pending').length;
    const rejectedCount = catalogEntries.filter(e => e.product.approvalStatus === 'rejected').length;

    return NextResponse.json({
      success: true,
      data: {
        products,
        nextCursor,
        hasMore,
        stats: { total: totalCount, approved: approvedCount, pending: pendingCount, rejected: rejectedCount },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

// POST — admin creates a product (auto-approved)
// If vendorId is provided, it's assigned to that vendor with inventory + slabs
// If no vendorId, it's a catalog product that any vendor can adopt
export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'products:write');
    const body = await req.json();
    const data = createProductSchema.parse(body);

    const { priceSlabs, vendorId, slug: providedSlug, ...productData } = data;

    // Auto-generate slug from name if not provided
    const slug = providedSlug || productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);

    // Build unchecked create data (raw IDs — vendorId is optional after migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createData: any = {
      ...productData,
      slug,
      approvalStatus: 'approved',
      approvedBy: ctx.userId,
      approvedAt: new Date(),
    };
    if (vendorId) createData.vendorId = vendorId;

    const product = await prisma.product.create({ data: createData });

    // Only create price slabs and inventory if vendor is assigned
    if (vendorId) {
      if (priceSlabs && priceSlabs.length > 0) {
        await prisma.priceSlab.createMany({
          data: priceSlabs.map((slab, idx) => ({
            productId: product.id,
            vendorId,
            minQty: slab.minQty,
            maxQty: slab.maxQty ?? null,
            price: slab.price,
            promoPrice: slab.promoPrice ?? null,
            sortOrder: idx,
          })),
        });
      }

      await prisma.inventory.create({
        data: {
          productId: product.id,
          vendorId,
          qtyAvailable: 0,
          lowStockThreshold: 10,
        },
      });
    }

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
