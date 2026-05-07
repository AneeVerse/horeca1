// GET  /api/v1/vendor/brand-mappings — Vendor's own mappings (split by status)
//   Returns:
//     - unmapped: vendor's products with NO active mapping (manual matching needed)
//     - pendingReview: rule_based mappings ≥0.70 <0.90 awaiting vendor confirmation
//     - mapped: verified + auto_mapped (active live mappings)
// POST /api/v1/vendor/brand-mappings — Vendor manually maps one of their products to a brand SKU
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

    // All vendor's active approved products
    const products = await prisma.product.findMany({
      where: { vendorId, isActive: true, approvalStatus: 'approved' },
      select: {
        id: true, name: true, brand: true, packSize: true, imageUrl: true, basePrice: true,
        brandMappings: {
          where: { status: { in: ['auto_mapped', 'verified', 'pending_review'] } },
          include: {
            brandMasterProduct: {
              select: {
                id: true, name: true, packSize: true, imageUrl: true,
                brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const unmapped = products
      .filter(p => p.brandMappings.length === 0)
      .map(p => ({
        productId: p.id,
        name: p.name,
        brand: p.brand,
        packSize: p.packSize,
        imageUrl: p.imageUrl,
        basePrice: Number(p.basePrice),
      }));

    const pendingReview = products
      .filter(p => p.brandMappings[0]?.status === 'pending_review')
      .map(p => ({
        mappingId: p.brandMappings[0].id,
        productId: p.id,
        productName: p.name,
        productImage: p.imageUrl,
        confidenceScore: Number(p.brandMappings[0].confidenceScore),
        brandMasterProduct: p.brandMappings[0].brandMasterProduct,
      }));

    const mapped = products
      .filter(p => ['auto_mapped', 'verified'].includes(p.brandMappings[0]?.status ?? ''))
      .map(p => ({
        mappingId: p.brandMappings[0].id,
        productId: p.id,
        productName: p.name,
        productImage: p.imageUrl,
        status: p.brandMappings[0].status,
        confidenceScore: Number(p.brandMappings[0].confidenceScore),
        brandMasterProduct: p.brandMappings[0].brandMasterProduct,
      }));

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
