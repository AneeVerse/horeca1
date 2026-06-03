/**
 * PATCH /api/v1/vendor/products/bulk-update
 * ─────────────────────────────────────────
 * Generic programmatic bulk update for products belonging to the caller's
 * vendor. Closes the "Bulk Update ANY field" gap in Section 4 of the V2.2
 * checklist — the existing /bulk-price endpoint only touched basePrice +
 * price slabs.
 *
 * Body shape:
 *   {
 *     filter: { productIds?, categoryId?, brand?, isActive? },   // at least 1
 *     set: { ...whitelisted fields... }                          // at least 1
 *   }
 *
 * Multi-tenant: every selector AND every update is scoped to the resolved
 * vendorId. A forged productId belonging to another vendor is simply
 * filtered out by the WHERE clause — no 403 leakage.
 *
 * Whitelist: the `set` block accepts only the fields below. Schema-level
 * write of any other field is impossible because Prisma's update() rejects
 * unknown keys at runtime AND we only forward whitelisted keys to it.
 *
 * Price adjustments use a special sub-shape (type + value) so the same
 * endpoint can do both "set to fixed price" and "raise by 5%" without
 * needing a separate /bulk-price call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { vendorOnly } from '@/middleware/rbac';
import { errorResponse, Errors } from '@/middleware/errorHandler';
import { resolveVendorId } from '@/lib/resolveVendorId';
import { requirePermission } from '@/lib/permissions/engine';

// ── Schemas ─────────────────────────────────────────────────────────────

const filterSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().min(1).max(150).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (f) => !!(f.productIds || f.categoryId || f.brand || typeof f.isActive === 'boolean'),
  { message: 'Provide at least one filter criterion (productIds | categoryId | brand | isActive)' },
);

// Price-adjustment block — shared by basePrice + originalPrice fields so
// callers can say "+5%" or "set to ₹120" with a single shape.
const priceAdjustSchema = z.object({
  type: z.enum(['percent', 'fixed', 'set']),  // percent = delta %, fixed = ₹ delta, set = absolute
  value: z.number(),
  roundTo: z.number().int().min(0).max(2).default(2).optional(),
});
type PriceAdjust = z.infer<typeof priceAdjustSchema>;

const setSchema = z.object({
  // Simple direct writes
  isActive:        z.boolean().optional(),
  minOrderQty:     z.number().int().min(1).max(10000).optional(),
  taxPercent:      z.number().min(0).max(100).optional(),
  creditEligible:  z.boolean().optional(),
  isFeatured:      z.boolean().optional(),
  vegNonVeg:       z.enum(['veg', 'non_veg', 'egg']).nullable().optional(),
  storageType:     z.string().max(50).nullable().optional(),
  shelfLifeDays:   z.number().int().min(0).max(3650).nullable().optional(),
  description:     z.string().max(2000).nullable().optional(),
  brand:           z.string().max(150).optional(),
  countryOfOrigin: z.string().max(100).optional(),

  // Price adjustments
  basePrice:       priceAdjustSchema.optional(),
  originalPrice:   priceAdjustSchema.optional(),
  // When true, basePrice adjustment is also applied to every priceSlab.price
  applyToSlabs:    z.boolean().default(false).optional(),

  // Convenience flag — wipes promo fields so a stale deal can be cleared
  // across many products in one call.
  clearPromo:      z.boolean().optional(),
}).refine(
  (s) => Object.keys(s).length > 0,
  { message: 'Provide at least one field in set' },
);

const bodySchema = z.object({
  filter: filterSchema,
  set: setSchema,
});

function round(n: number, places = 2): number {
  return Math.round(n * 10 ** places) / 10 ** places;
}

function applyAdjustment(current: number, adj: PriceAdjust): number {
  const places = adj.roundTo ?? 2;
  if (adj.type === 'set') return Math.max(0.01, round(adj.value, places));
  if (adj.type === 'percent') return Math.max(0.01, round(current + current * (adj.value / 100), places));
  return Math.max(0.01, round(current + adj.value, places)); // 'fixed' = ₹ delta
}

export const PATCH = vendorOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.edit');
    const vendorId = await resolveVendorId(ctx, req);
    const body = bodySchema.parse(await req.json());

    // Build the WHERE clause — vendorId is non-negotiable. Every other
    // criterion narrows the set further. AND semantics (all must match).
    const where: Record<string, unknown> = { vendorId };
    if (body.filter.productIds) where.id = { in: body.filter.productIds };
    if (body.filter.categoryId) where.categoryId = body.filter.categoryId;
    if (body.filter.brand) where.brand = body.filter.brand;
    if (typeof body.filter.isActive === 'boolean') where.isActive = body.filter.isActive;

    // Decide whether we need product rows in-memory (only true when a price
    // adjustment is involved — direct field writes can use updateMany in a
    // single SQL statement and skip the per-row read).
    const needsRowFetch = body.set.basePrice || body.set.originalPrice || body.set.applyToSlabs;

    // Pre-flight count so the caller knows what they would have hit even
    // if the eventual updates affect zero rows.
    const matchedCount = await prisma.product.count({ where });
    if (matchedCount === 0) {
      return NextResponse.json({ success: true, data: { matched: 0, updated: 0 } });
    }

    // Direct-field updates → one statement.
    const direct: Record<string, unknown> = {};
    if (body.set.isActive        !== undefined) direct.isActive = body.set.isActive;
    if (body.set.minOrderQty     !== undefined) direct.minOrderQty = body.set.minOrderQty;
    if (body.set.taxPercent      !== undefined) direct.taxPercent = body.set.taxPercent;
    if (body.set.creditEligible  !== undefined) direct.creditEligible = body.set.creditEligible;
    if (body.set.isFeatured      !== undefined) direct.isFeatured = body.set.isFeatured;
    if (body.set.vegNonVeg       !== undefined) direct.vegNonVeg = body.set.vegNonVeg;
    if (body.set.storageType     !== undefined) direct.storageType = body.set.storageType;
    if (body.set.shelfLifeDays   !== undefined) direct.shelfLifeDays = body.set.shelfLifeDays;
    if (body.set.description     !== undefined) direct.description = body.set.description;
    if (body.set.brand           !== undefined) direct.brand = body.set.brand;
    if (body.set.countryOfOrigin !== undefined) direct.countryOfOrigin = body.set.countryOfOrigin;
    if (body.set.clearPromo) {
      direct.promoPrice = null;
      direct.promoStartTime = null;
      direct.promoEndTime = null;
    }

    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Direct-field updateMany — atomic single statement.
      if (Object.keys(direct).length > 0) {
        const r = await tx.product.updateMany({ where, data: direct });
        updatedCount = Math.max(updatedCount, r.count);
      }

      // 2. Price adjustments — need per-row read + per-row write because
      //    the new value depends on the old. Bounded by matchedCount which
      //    we already know; the 500-id cap on filter.productIds plus
      //    category/brand/active filters keep this from accidentally
      //    rewriting tens of thousands of rows.
      if (needsRowFetch) {
        const products = await tx.product.findMany({
          where,
          select: {
            id: true,
            basePrice: true,
            originalPrice: true,
            ...(body.set.applyToSlabs ? { priceSlabs: { select: { id: true, price: true } } } : {}),
          },
        });
        for (const p of products) {
          const update: Record<string, unknown> = {};
          if (body.set.basePrice) {
            update.basePrice = applyAdjustment(Number(p.basePrice), body.set.basePrice);
          }
          if (body.set.originalPrice) {
            const current = p.originalPrice ? Number(p.originalPrice) : Number(p.basePrice);
            update.originalPrice = applyAdjustment(current, body.set.originalPrice);
          }
          if (Object.keys(update).length > 0) {
            await tx.product.update({ where: { id: p.id }, data: update });
          }
          // Slab adjustments mirror the basePrice block.
          if (body.set.applyToSlabs && body.set.basePrice && 'priceSlabs' in p && Array.isArray(p.priceSlabs)) {
            for (const slab of p.priceSlabs) {
              await tx.priceSlab.update({
                where: { id: slab.id },
                data: { price: applyAdjustment(Number(slab.price), body.set.basePrice) },
              });
            }
          }
        }
        updatedCount = Math.max(updatedCount, products.length);
      }
    });

    return NextResponse.json({ success: true, data: { matched: matchedCount, updated: updatedCount } });
  } catch (err) {
    return errorResponse(err instanceof z.ZodError ? Errors.badRequest(err.issues[0]?.message ?? 'Invalid input') : err);
  }
});
