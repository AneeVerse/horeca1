/**
 * No-DB verification of the Promo Engine money math: coupon validation,
 * scope filtering, proportional allocation, stacking suppression, and
 * wallet-redemption allocation. The Prisma calls inside the service are
 * satisfied by an in-memory stub, so this runs anywhere:
 *
 *   npx tsx prisma/scripts/test-promo-math.ts
 *
 * Exit code 0 = all checks passed, 1 = at least one failed.
 */
import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { promotionService, type CheckoutOrderDraft } from '../../src/modules/promotion/promotion.service';

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    passed++;
    console.log(`✓ ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

interface StubCoupon {
  id: string; code: string; name: string; vendorId: string | null;
  discountType: 'flat' | 'percentage'; discountValue: number;
  maxDiscount: number | null; minOrderValue: number | null;
  startDate: Date | null; endDate: Date | null;
  usageLimit: number | null; perUserLimit: number | null; usedCount: number;
  categoryIds: string[]; productIds: string[]; brandNames: string[];
  stacksWithVendorPromo: boolean; stacksWithCashback: boolean; isActive: boolean;
}

const baseCoupon: StubCoupon = {
  id: 'c1', code: 'TEST', name: 'Test coupon', vendorId: null,
  discountType: 'flat', discountValue: 500, maxDiscount: null, minOrderValue: null,
  startDate: null, endDate: null, usageLimit: null, perUserLimit: null, usedCount: 0,
  categoryIds: [], productIds: [], brandNames: [],
  stacksWithVendorPromo: true, stacksWithCashback: true, isActive: true,
};

function stubDb(coupon: StubCoupon | null, redemptionGroups: string[] = []): Prisma.TransactionClient {
  return {
    coupon: { findUnique: async () => coupon },
    couponRedemption: {
      findMany: async () => redemptionGroups.map((g) => ({ checkoutGroupId: g })),
    },
  } as unknown as Prisma.TransactionClient;
}

const drafts2: CheckoutOrderDraft[] = [
  {
    vendorId: 'v1', subtotal: 3000, promoDiscount: 0,
    items: [{ productId: 'p1', categoryId: 'catA', brand: 'BrandX', lineTotal: 3000 }],
  },
  {
    vendorId: 'v2', subtotal: 7000, promoDiscount: 0,
    items: [{ productId: 'p2', categoryId: 'catB', brand: 'BrandY', lineTotal: 7000 }],
  },
];

async function main() {
  // 1. Flat platform coupon splits proportionally across vendor orders
  {
    const app = await promotionService.applyCouponToCheckout(stubDb({ ...baseCoupon }), {
      code: 'test', userId: 'u1', drafts: drafts2,
    });
    check('flat ₹500 splits 150/350 across 3k/7k orders',
      app.perOrder[0] === 150 && app.perOrder[1] === 350 && app.totalDiscount === 500,
      JSON.stringify(app.perOrder));
  }

  // 2. Percentage coupon respects maxDiscount cap
  {
    const app = await promotionService.applyCouponToCheckout(
      stubDb({ ...baseCoupon, discountType: 'percentage', discountValue: 10, maxDiscount: 600 }),
      { code: 'TEST', userId: 'u1', drafts: drafts2 },
    );
    check('10% of 10k capped at ₹600', app.totalDiscount === 600, `got ${app.totalDiscount}`);
  }

  // 3. Vendor coupon only discounts that vendor's order
  {
    const app = await promotionService.applyCouponToCheckout(
      stubDb({ ...baseCoupon, vendorId: 'v2', discountValue: 400 }),
      { code: 'TEST', userId: 'u1', drafts: drafts2 },
    );
    check('vendor coupon hits only v2', app.perOrder[0] === 0 && app.perOrder[1] === 400,
      JSON.stringify(app.perOrder));
  }

  // 4. Product-scope narrows the eligible base
  {
    const app = await promotionService.applyCouponToCheckout(
      stubDb({ ...baseCoupon, discountType: 'percentage', discountValue: 10, productIds: ['p1'] }),
      { code: 'TEST', userId: 'u1', drafts: drafts2 },
    );
    check('product-scoped 10% applies to p1 only (₹300)',
      app.perOrder[0] === 300 && app.perOrder[1] === 0, JSON.stringify(app.perOrder));
  }

  // 5. MOV not met → rejected
  {
    let threw = '';
    try {
      await promotionService.applyCouponToCheckout(
        stubDb({ ...baseCoupon, minOrderValue: 20000 }),
        { code: 'TEST', userId: 'u1', drafts: drafts2 },
      );
    } catch (e) { threw = e instanceof Error ? e.message : 'threw'; }
    check('MOV ₹20k rejected on ₹10k checkout', threw.includes('20,000'), threw);
  }

  // 6. Usage limit exhausted → rejected
  {
    let threw = '';
    try {
      await promotionService.applyCouponToCheckout(
        stubDb({ ...baseCoupon, usageLimit: 5, usedCount: 5 }),
        { code: 'TEST', userId: 'u1', drafts: drafts2 },
      );
    } catch (e) { threw = e instanceof Error ? e.message : 'threw'; }
    check('total usage limit enforced', threw.includes('usage limit'), threw);
  }

  // 7. Per-user limit counts distinct checkout groups
  {
    let threw = '';
    try {
      await promotionService.applyCouponToCheckout(
        stubDb({ ...baseCoupon, perUserLimit: 2 }, ['g1', 'g2']),
        { code: 'TEST', userId: 'u1', drafts: drafts2 },
      );
    } catch (e) { threw = e instanceof Error ? e.message : 'threw'; }
    check('per-user limit enforced at 2 prior uses', threw.includes('maximum number'), threw);
  }

  // 8. Expired coupon → rejected
  {
    let threw = '';
    try {
      await promotionService.applyCouponToCheckout(
        stubDb({ ...baseCoupon, endDate: new Date(Date.now() - 86_400_000) }),
        { code: 'TEST', userId: 'u1', drafts: drafts2 },
      );
    } catch (e) { threw = e instanceof Error ? e.message : 'threw'; }
    check('expired coupon rejected', threw.includes('expired'), threw);
  }

  // 9. Rule 3 — non-stacking coupon suppresses vendor promos AND caps against full subtotal
  {
    const draftsWithPromo: CheckoutOrderDraft[] = [
      { vendorId: 'v1', subtotal: 1000, promoDiscount: 900,
        items: [{ productId: 'p1', categoryId: null, brand: null, lineTotal: 1000 }] },
    ];
    const stacking = await promotionService.applyCouponToCheckout(
      stubDb({ ...baseCoupon, discountValue: 300 }),
      { code: 'TEST', userId: 'u1', drafts: draftsWithPromo },
    );
    const nonStacking = await promotionService.applyCouponToCheckout(
      stubDb({ ...baseCoupon, discountValue: 300, stacksWithVendorPromo: false }),
      { code: 'TEST', userId: 'u1', drafts: draftsWithPromo },
    );
    check('stacking coupon capped by remaining value after promo (₹100)',
      stacking.totalDiscount === 100 && !stacking.suppressVendorPromos,
      `got ${stacking.totalDiscount}`);
    check('non-stacking coupon suppresses promo and takes full ₹300',
      nonStacking.totalDiscount === 300 && nonStacking.suppressVendorPromos,
      `got ${nonStacking.totalDiscount}`);
  }

  // 10. Wallet allocation — proportional, capped, with ₹1 online floor
  {
    const full = promotionService.allocateWallet(10000, [3000, 2000], 0);
    const floored = promotionService.allocateWallet(10000, [3000, 2000], 1);
    const partial = promotionService.allocateWallet(1000, [3000, 2000], 0);
    check('wallet covers full payable when balance allows',
      full[0] === 3000 && full[1] === 2000, JSON.stringify(full));
    check('online ₹1 floor leaves combined payable ≥ 1',
      Math.round((floored[0] + floored[1]) * 100) / 100 === 4999, JSON.stringify(floored));
    check('partial balance splits proportionally (600/400)',
      partial[0] === 600 && partial[1] === 400, JSON.stringify(partial));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
