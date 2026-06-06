/**
 * Pricing resolver — V2.2 Phase 4.
 *
 * Single source of truth for "what unit price should this customer see/pay
 * for this product?". Called from cart.addItem / cart.updateQuantity /
 * cart.getCart / order.create / order.subtotal — anywhere the legacy
 * code used `product.basePrice` or `priceSlab.price` directly.
 *
 * Priority chain (first match wins, falls through on no match):
 *
 *   1. PriceListAssignment.type='outlet'   matching customer.outletId
 *   2. PriceListAssignment.type='customer' matching customer.userId
 *                                      OR customer.businessAccountId
 *   3. PriceListAssignment.type='segment'  matching customer.tags
 *   4. PriceListAssignment.type='pincode'  matching customer.outletPincode
 *   5. PriceListAssignment.type='area'     matching outlet city/state
 *   6. PriceListAssignment.type='brand'    matching product.brand (id or name)
 *   7. Legacy VendorCustomer.priceListId   (the per-customer mapping
 *                                      that predates assignments)
 *   8. VendorCustomerPrice (per-product per-customer override)
 *   9. PriceSlab matching the quantity tier
 *  10. Product.basePrice (final fallback)
 *
 * Within whichever PriceList wins, the chosen PriceListItem decides
 * the math:
 *   • fixed | special — customPrice replaces basePrice
 *   • discount        — basePrice × (1 − discountPercent / 100)
 *   • scheme          — if quantity ≥ schemeMinQty, customPrice;
 *                        else fall through to the next priority level
 *
 * If the matched PriceList has NO PriceListItem for this product but a
 * non-zero global discountPercent, that global discount applies.
 *
 * The resolver takes no state. Caller passes context; tests can mock.
 */

import { Prisma } from '@prisma/client';
import type {
  PrismaClient,
  PriceList,
  PriceListItem,
  PriceListAssignment,
} from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export interface CustomerContext {
  userId: string;
  businessAccountId: string | null;
  outletId: string | null;
  outletPincode: string | null;
  outletCity: string | null;
  outletState: string | null;
  tags: readonly string[];
}

export interface ResolveInput {
  productId: string;
  vendorId: string;
  quantity: number;
  customer: CustomerContext;
}

export type ResolutionSource =
  | 'pricelist:outlet'
  | 'pricelist:customer'
  | 'pricelist:segment'
  | 'pricelist:pincode'
  | 'pricelist:area'
  | 'pricelist:brand'
  | 'pricelist:legacy-customer-mapping'
  | 'customer-product-override'
  | 'price-slab'
  | 'base-price';

export interface ResolutionResult {
  unitPrice: Prisma.Decimal;
  source: ResolutionSource;
  priceListId?: string;
  priceListItemId?: string;
  // B-5: present only when a 'scheme' pricelist item matched. The caller
  // (order.create) uses these to grant free goods ("buy X get Y free").
  schemeMinQty?: number | null;
  schemeFreeQty?: number | null;
}

/**
 * Resolve the unit price the customer should see/pay right now.
 *
 * Throws if the product doesn't exist or doesn't belong to vendorId.
 * Returns a Decimal so call sites can do exact arithmetic without
 * float drift.
 */
export async function resolveUnitPrice(
  input: ResolveInput,
  db: Db = defaultPrisma,
): Promise<ResolutionResult> {
  // Single round-trip: pull product + its brand + all candidate pricing
  // sources in parallel. We over-fetch (everything the priority chain
  // might consult) so we don't pay a second roundtrip per fallthrough.
  const [product, vendorCustomer, customerProductOverride, slabs, assignments] =
    await Promise.all([
      db.product.findFirst({
        where: { id: input.productId, vendorId: input.vendorId },
        select: {
          id: true, basePrice: true, brand: true,
          // P0-5: lets brand-targeted pricelists match by canonical brandId
          // (via the verified/auto brand mapping), not just the free-text brand.
          brandMappings: {
            where: { status: { in: ['verified', 'auto_mapped'] } },
            select: { brandId: true },
          },
        },
      }),
      db.vendorCustomer.findUnique({
        where: { vendorId_userId: { vendorId: input.vendorId, userId: input.customer.userId } },
        select: { priceListId: true, tags: true },
      }),
      db.vendorCustomerPrice.findUnique({
        where: {
          vendorId_customerId_productId: {
            vendorId: input.vendorId,
            customerId: input.customer.userId,
            productId: input.productId,
          },
        },
        select: { price: true },
      }),
      db.priceSlab.findMany({
        where: { productId: input.productId, vendorId: input.vendorId },
        orderBy: { minQty: 'desc' },
        select: { minQty: true, maxQty: true, price: true },
      }),
      // Every active assignment that COULD match this customer/product
      // pair. We filter in memory — way fewer rules in play per vendor
      // than products, and a clever OR query would be unreadable.
      db.priceListAssignment.findMany({
        where: {
          priceList: { vendorId: input.vendorId, isActive: true },
          OR: [
            { type: 'outlet', outletId: input.customer.outletId ?? undefined },
            { type: 'customer', userId: input.customer.userId },
            ...(input.customer.businessAccountId
              ? [{ type: 'customer' as const, businessAccountId: input.customer.businessAccountId }]
              : []),
            { type: 'segment' },  // segments matched in memory against tags
            ...(input.customer.outletPincode
              ? [{ type: 'pincode' as const, pincode: input.customer.outletPincode }]
              : []),
            { type: 'area' },     // area matched in memory against city/state
            { type: 'brand' },    // brand matched in memory against product.brand
          ],
        },
        include: {
          priceList: {
            select: {
              id: true,
              discountPercent: true,
              items: {
                where: { productId: input.productId },
                select: {
                  id: true,
                  customPrice: true,
                  pricingType: true,
                  discountPercent: true,
                  schemeMinQty: true,
                  schemeFreeQty: true,
                },
              },
            },
          },
        },
      }),
    ]);

  if (!product) {
    throw new Error(`resolveUnitPrice: product ${input.productId} not found under vendor ${input.vendorId}`);
  }

  const basePrice = product.basePrice;
  const productBrand = product.brand?.toLowerCase() ?? null;
  const mappedBrandIds = new Set((product.brandMappings ?? []).map((m) => m.brandId));
  const customerTags = new Set(
    [...(input.customer.tags ?? []), ...(vendorCustomer?.tags ?? [])].map((t) => t.toLowerCase()),
  );

  // Each priority level either returns a fully-resolved unit price or
  // returns null to fall through. Encapsulated in a helper so we can
  // unit-test the chain piece by piece.
  type Match = { assignment: PriceListAssignment & { priceList: PriceList & { items: PriceListItem[] } } };

  function matchesByType(type: PriceListAssignment['type']): Match[] {
    return assignments
      .filter((a) => a.type === type && eligible(a, type))
      .map((a) => ({ assignment: a as Match['assignment'] }));
  }

  function eligible(a: PriceListAssignment, type: PriceListAssignment['type']): boolean {
    switch (type) {
      case 'outlet':
        return !!input.customer.outletId && a.outletId === input.customer.outletId;
      case 'customer':
        return (
          (!!a.userId && a.userId === input.customer.userId) ||
          (!!a.businessAccountId && a.businessAccountId === input.customer.businessAccountId)
        );
      case 'segment':
        return !!a.segment && customerTags.has(a.segment.toLowerCase());
      case 'pincode':
        return !!a.pincode && a.pincode === input.customer.outletPincode;
      case 'area': {
        if (!a.area) return false;
        const needle = a.area.toLowerCase();
        return (
          input.customer.outletCity?.toLowerCase() === needle ||
          input.customer.outletState?.toLowerCase() === needle
        );
      }
      case 'brand':
        // P0-5: canonical brandId match (via the product's brand mapping),
        // with a free-text brand-name fallback for products not yet mapped.
        if (a.brandId && mappedBrandIds.has(a.brandId)) return true;
        if (a.brandName && productBrand) return a.brandName.toLowerCase() === productBrand;
        return false;
      default:
        return false;
    }
  }

  // Try to resolve via a single PriceList — picks the highest-priority
  // matching item, applies pricingType math, and returns a result. Null
  // means this list doesn't yield a usable price (e.g. scheme miss).
  function applyList(
    list: PriceList & { items: PriceListItem[] },
    sourceKey: ResolutionSource,
  ): ResolutionResult | null {
    const item = list.items[0]; // items already filtered to this productId
    if (item) {
      const result = applyPricingType(item, basePrice, input.quantity);
      if (result !== null) {
        return {
          unitPrice: result,
          source: sourceKey,
          priceListId: list.id,
          priceListItemId: item.id,
          // Surface scheme parameters so the order layer can grant free goods.
          ...(item.pricingType === 'scheme'
            ? { schemeMinQty: item.schemeMinQty, schemeFreeQty: item.schemeFreeQty }
            : {}),
        };
      }
      // scheme miss falls through to the next priority level
    }
    // No item for this product, but a global discountPercent might apply.
    if (Number(list.discountPercent) > 0) {
      const dp = new Prisma.Decimal(list.discountPercent);
      const discounted = basePrice.mul(new Prisma.Decimal(1).minus(dp.div(100)));
      return {
        unitPrice: round2(discounted),
        source: sourceKey,
        priceListId: list.id,
      };
    }
    return null;
  }

  // ── Priority chain ─────────────────────────────────────────────────
  const orderedTypes: Array<{ type: PriceListAssignment['type']; key: ResolutionSource }> = [
    { type: 'outlet',   key: 'pricelist:outlet' },
    { type: 'customer', key: 'pricelist:customer' },
    { type: 'segment',  key: 'pricelist:segment' },
    { type: 'pincode',  key: 'pricelist:pincode' },
    { type: 'area',     key: 'pricelist:area' },
    { type: 'brand',    key: 'pricelist:brand' },
  ];

  for (const { type, key } of orderedTypes) {
    const matches = matchesByType(type);
    for (const { assignment } of matches) {
      const r = applyList(assignment.priceList, key);
      if (r) return r;
    }
  }

  // 7. Legacy VendorCustomer.priceListId
  if (vendorCustomer?.priceListId) {
    const list = await db.priceList.findFirst({
      where: { id: vendorCustomer.priceListId, vendorId: input.vendorId, isActive: true },
      include: {
        items: {
          where: { productId: input.productId },
          select: { id: true, customPrice: true, pricingType: true, discountPercent: true, schemeMinQty: true, schemeFreeQty: true },
        },
      },
    });
    if (list) {
      const r = applyList(list as PriceList & { items: PriceListItem[] }, 'pricelist:legacy-customer-mapping');
      if (r) return r;
    }
  }

  // 8. Per-product customer override (existing system)
  if (customerProductOverride) {
    return {
      unitPrice: round2(new Prisma.Decimal(customerProductOverride.price)),
      source: 'customer-product-override',
    };
  }

  // 9. Quantity slabs — pick the highest minQty ≤ requested quantity
  for (const slab of slabs) {
    if (input.quantity >= slab.minQty && (slab.maxQty == null || input.quantity <= slab.maxQty)) {
      return {
        unitPrice: round2(new Prisma.Decimal(slab.price)),
        source: 'price-slab',
      };
    }
  }

  // 10. Default fallback
  return { unitPrice: round2(basePrice), source: 'base-price' };
}

// ── Pricing-type math ────────────────────────────────────────────────
// Returns null when the type doesn't yield a price (e.g. scheme miss
// when qty < schemeMinQty), so the caller can fall through.
function applyPricingType(
  item: Pick<PriceListItem, 'customPrice' | 'pricingType' | 'discountPercent' | 'schemeMinQty'>,
  basePrice: Prisma.Decimal,
  quantity: number,
): Prisma.Decimal | null {
  switch (item.pricingType) {
    case 'fixed':
    case 'special':
      return item.customPrice != null ? round2(new Prisma.Decimal(item.customPrice)) : null;
    case 'discount': {
      if (item.discountPercent == null) return null;
      const dp = new Prisma.Decimal(item.discountPercent);
      return round2(basePrice.mul(new Prisma.Decimal(1).minus(dp.div(100))));
    }
    case 'scheme': {
      if (item.customPrice == null || item.schemeMinQty == null) return null;
      if (quantity < item.schemeMinQty) return null;
      return round2(new Prisma.Decimal(item.customPrice));
    }
    default:
      return null;
  }
}

function round2(d: Prisma.Decimal): Prisma.Decimal {
  return d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
