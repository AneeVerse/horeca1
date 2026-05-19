// GET  /api/v1/vendor/brand-mappings — Vendor's own mappings, split by state.
//   Returns:
//     - unmapped:      products with NO live AND NO pending mapping (vendor must pick a brand SKU)
//     - pendingReview: products with one OR MORE auto-detected candidates awaiting confirm/reject;
//                      each row groups ALL candidates for the same product so the vendor can see
//                      every suggestion the auto-mapper produced (not just the latest one).
//     - mapped:        one row per LIVE mapping (auto_mapped or verified). A vendor product may
//                      appear more than once here if it's linked to multiple brand catalogs
//                      (e.g. private-label SKU listed under two distinct brand storefronts).
// POST /api/v1/vendor/brand-mappings — Vendor manually links one of their products to a brand SKU.
//   BODY: { distributorProductId, brandMasterProductId }
// REQUIRES: role=vendor (or admin), products:write permission for POST

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { resolveVendorContext } from '@/lib/resolveVendorId';
import { requireVendorPerm } from '@/lib/teamPermissions';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { logAction, AUDIT_ACTIONS } from '@/lib/auditLog';
import type { AuthContext } from '@/middleware/auth';

const createMappingSchema = z.object({
  distributorProductId: z.string().uuid(),
  brandMasterProductId: z.string().uuid(),
});

export const GET = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { vendorId } = await resolveVendorContext(ctx, req);

    // Fetch every active approved product for this vendor, with ALL its mappings
    // in any reviewable state. We deliberately DO NOT `take: 1` — the auto-mapper
    // can produce multiple plausible candidates per product (e.g. "Tomato Ketchup
    // 1kg" against Knorr + Heinz + Maggi catalogs) and the vendor needs to see
    // every suggestion so they can confirm the correct one and reject the rest.
    const products = await prisma.product.findMany({
      where: { vendorId, isActive: true, approvalStatus: 'approved' },
      select: {
        id: true, name: true, brand: true, packSize: true, imageUrl: true, basePrice: true,
        brandMappings: {
          where: { status: { in: ['auto_mapped', 'verified', 'pending_review'] } },
          include: {
            brandMasterProduct: {
              select: {
                id: true, name: true, packSize: true, imageUrl: true, sku: true,
                brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
              },
            },
          },
          orderBy: { confidenceScore: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    type Suggestion = {
      mappingId: string;
      confidenceScore: number;
      brandMasterProduct: {
        id: string; name: string; packSize: string | null; imageUrl: string | null; sku: string | null;
        brand: { id: string; name: string; slug: string; logoUrl: string | null };
      };
    };

    const unmapped: Array<{ productId: string; name: string; brand: string | null; packSize: string | null; imageUrl: string | null; basePrice: number }> = [];
    const pendingReview: Array<{
      productId: string; productName: string; productImage: string | null;
      brand: string | null; packSize: string | null; basePrice: number;
      suggestions: Suggestion[];
    }> = [];
    const mapped: Array<{
      mappingId: string; productId: string; productName: string; productImage: string | null;
      status: 'auto_mapped' | 'verified'; confidenceScore: number;
      brandMasterProduct: Suggestion['brandMasterProduct'];
    }> = [];

    for (const p of products) {
      const liveMappings = p.brandMappings.filter(m => m.status === 'auto_mapped' || m.status === 'verified');
      const pendingMappings = p.brandMappings.filter(m => m.status === 'pending_review');

      // Each LIVE mapping = its own row (a vendor product can legitimately appear under
      // multiple brand storefronts; the vendor needs per-link controls).
      for (const m of liveMappings) {
        mapped.push({
          mappingId: m.id,
          productId: p.id,
          productName: p.name,
          productImage: p.imageUrl,
          status: m.status as 'auto_mapped' | 'verified',
          confidenceScore: Number(m.confidenceScore),
          brandMasterProduct: m.brandMasterProduct,
        });
      }

      // Pending suggestions: ONE row per product, with ALL candidates nested. Vendor picks one
      // (or none). Sorted highest-confidence first so the most likely match leads.
      if (pendingMappings.length > 0) {
        pendingReview.push({
          productId: p.id,
          productName: p.name,
          productImage: p.imageUrl,
          brand: p.brand,
          packSize: p.packSize,
          basePrice: Number(p.basePrice),
          suggestions: pendingMappings.map(m => ({
            mappingId: m.id,
            confidenceScore: Number(m.confidenceScore),
            brandMasterProduct: m.brandMasterProduct,
          })),
        });
      }

      // Unmapped: nothing live, nothing pending — vendor needs to manually pick a brand SKU.
      if (liveMappings.length === 0 && pendingMappings.length === 0) {
        unmapped.push({
          productId: p.id,
          name: p.name,
          brand: p.brand,
          packSize: p.packSize,
          imageUrl: p.imageUrl,
          basePrice: Number(p.basePrice),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { unmapped, pendingReview, mapped },
    });
  } catch (error) {
    return errorResponse(error);
  }
});

export const POST = vendorOnly(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { vendorId, teamRole } = await resolveVendorContext(ctx, req);
    requireVendorPerm(teamRole, 'products:write');

    const body = await req.json();
    const { distributorProductId, brandMasterProductId } = createMappingSchema.parse(body);

    // Guard: distributor product must belong to caller's vendor (IDOR check)
    const product = await prisma.product.findFirst({
      where: { id: distributorProductId, vendorId },
      select: { id: true, name: true },
    });
    if (!product) throw Errors.notFound('Product not found in your inventory');

    // Brand master product must exist + be active + brand approved
    const masterProduct = await prisma.brandMasterProduct.findFirst({
      where: { id: brandMasterProductId, isActive: true, brand: { isActive: true, approvalStatus: 'approved' } },
      select: { id: true, brandId: true, name: true, brand: { select: { name: true } } },
    });
    if (!masterProduct) throw Errors.notFound('Brand master product not found');

    // Upsert: if a rejected mapping exists, override it; if verified, no-op
    const mapping = await prisma.brandProductMapping.upsert({
      where: {
        brandMasterProductId_distributorProductId: {
          brandMasterProductId,
          distributorProductId,
        },
      },
      create: {
        brandId: masterProduct.brandId,
        brandMasterProductId,
        distributorProductId,
        confidenceScore: 1.0,
        status: 'verified',
        matchedBy: 'manually_verified',
        reviewedBy: ctx.userId,
      },
      update: {
        status: 'verified',
        matchedBy: 'manually_verified',
        confidenceScore: 1.0,
        reviewedBy: ctx.userId,
        reviewNote: null,
        updatedAt: new Date(),
      },
    });

    logAction(ctx, req, {
      action: AUDIT_ACTIONS.brandMappingVerified,
      entity: 'BrandProductMapping',
      entityId: mapping.id,
      metadata: {
        distributorProductId,
        brandMasterProductId,
        brandName: masterProduct.brand.name,
        masterName: masterProduct.name,
        actor: 'vendor',
      },
    });

    return NextResponse.json({ success: true, data: mapping }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
