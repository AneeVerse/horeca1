# Horeca1 V2.2 — UI/UX Spec Audit

## Context

Audit of the V2.2 UX spec ("Horeca1 Customer Journey Flow / Vendor-Centric Marketplace UX") against the current `master` codebase. Goal: list every flow as **WORKING / PARTIAL / MISSING**, point at the file that proves it, and describe the fix when not working. No code changes in this pass — this doc is the deliverable.

Sources: 3 parallel Explore agents covering (1) discovery + entry, (2) cart/checkout/payment, (3) lists/reorder/admin.

---

## Scoreboard

| # | Flow / Requirement | Status |
|---|---|---|
| 1 | Guest pincode gate | ✅ WORKING |
| 2 | Search results — 3 blocks (Categories / Products / Vendors) | ✅ WORKING |
| 3 | Category page — 2 blocks (Quick-access products + Vendor list) | ✅ WORKING |
| 4 | Homepage vendor sections (Frequently / Nearby / Recommended / Top Rated) | ⚠️ PARTIAL |
| 5 | Vendor-first nav (My Vendors / Nearby Vendors entry points) | ✅ WORKING |
| 6 | Vendor store header (name, schedule, rating, MOV, my-list link, credit) | ⚠️ PARTIAL |
| 7 | Vendor store catalog nav (Hyperpure 1-column grid) | ⚠️ PARTIAL |
| 8 | Product card (image, share, save-to-list, slabs, credit, ADD) | ✅ WORKING |
| 9 | Sticky cart bar | ✅ WORKING |
| 10 | Cart — vendor-grouped POs | ✅ WORKING |
| 11 | Partial PO payment (per-PO checkbox) | ✅ WORKING |
| 12 | Combined Razorpay (one txn for N POs) | ✅ WORKING |
| 13 | MOV enforcement at cart | ✅ WORKING |
| 14 | OOS — alternate vendor suggestions | ⚠️ PARTIAL |
| 15 | Delivery-slot awareness on vendor store | ⚠️ PARTIAL |
| 16 | Payment options (DiSCCO / Online / Wallet / Bank / PO Number) | ⚠️ PARTIAL |
| 17 | Order confirmation screen | ⚠️ PARTIAL |
| 18 | Bulk slab "ADD" → quantity selector update (Hyperpure pattern) | ⚠️ PARTIAL |
| 19 | Quick Order Lists — core | ✅ WORKING |
| 20 | Add-to-List from product card | ✅ WORKING |
| 21 | Create list (planning mode) | ✅ WORKING |
| 22 | Order from list — qty reset to 0, prev-qty reference | ✅ WORKING |
| 23 | "Save past order as Order List" CTA | ❌ MISSING |
| 24 | Reorder #1 — Homepage quick action | ✅ WORKING |
| 25 | Reorder #2 — Order detail → Reorder (with prev-qty column) | ⚠️ PARTIAL |
| 26 | Reorder #3 — Vendor Store "Previously Ordered" tab | ❌ MISSING |
| 27 | 4-tap repeat order target | ⚠️ PARTIAL |
| 28 | Post-payment "Place another order" CTA | ❌ MISSING |
| 29 | Profile completion banner (skippable) | ✅ WORKING |
| 30 | Item ↔ multi-category mapping (primary + additional) | ✅ WORKING (schema; admin UI to verify) |
| 31 | Vendor approval — Accept / Reject / **Edit** | ⚠️ PARTIAL |
| 32 | Language switcher | ⏸ DEFERRED (Phase 4.3) |
| 33 | Vendor store hero banner same size as homepage hero (desktop) | ✅ WORKING |
| 34 | Color scheme matches Figma | 🔍 OUT OF SCOPE (visual review needed) |

**Totals:** 17 working · 11 partial · 4 missing · 1 deferred · 1 visual-review.

---

## Working — quick references

| Flow | Evidence |
|---|---|
| Pincode gate | [src/components/layout/InitialPincodeOverlay.tsx](src/components/layout/InitialPincodeOverlay.tsx) — Places + GPS + manual; `serviceability` API check before close |
| Search 3 blocks | [src/app/search/page.tsx:84-258](src/app/search/page.tsx#L84-L258) — Vendors, Products, Categories |
| Category 2 blocks | [src/app/category/[slug]/page.tsx:216-330](src/app/category/[slug]/page.tsx#L216-L330) |
| Vendor-grouped cart | [src/context/CartContext.tsx:53-85](src/context/CartContext.tsx#L53-L85) |
| Per-PO checkbox + skip | [src/app/cart/page.tsx:149-183](src/app/cart/page.tsx#L149-L183), 689-700 (desktop), 639-650 (mobile) |
| Combined Razorpay | [src/modules/payment/payment.service.ts:57-127](src/modules/payment/payment.service.ts#L57-L127) — one Razorpay order, N linked horeca orders, atomic verify |
| MOV warning | [src/app/cart/page.tsx:742-758](src/app/cart/page.tsx#L742-L758) |
| Quick Order Lists | [src/app/order-lists/page.tsx](src/app/order-lists/page.tsx), [src/app/order-lists/[id]/page.tsx](src/app/order-lists/[id]/page.tsx) — qty resets to 0, prev qty shown via "Re-fill Last Qty" |
| Save-to-list from card | [src/components/features/vendor/VendorProductCard.tsx:163-194](src/components/features/vendor/VendorProductCard.tsx#L163-L194) |
| Multi-category schema | `prisma/schema.prisma:322-333` — `ProductCategory` with `isPrimary` |
| Profile banner | [src/components/features/homepage/CompleteProfileBanner.tsx](src/components/features/homepage/CompleteProfileBanner.tsx) — 7-day snooze, dismissible |

---

## Not working (partial / missing) — fix list

### 4. Homepage vendor sections — PARTIAL
**Have:** `NearbyVendors`, `ContinueOrdering`, `FeaturedDeals`.
**Missing:** dedicated "Frequently Ordered Vendors" rollup, dedicated "Top Rated Vendors" rollup. Spec lists 4 sections; we ship 2 vendor rails.
**Fix:**
- Add `FrequentlyOrderedVendors` component → API: top N vendors by order count for the logged-in user (last 90 days). Hide if logged out.
- Add `TopRatedVendors` component → API: vendors with `rating >= 4.5` AND `orderCount >= 10`, filtered by serviceability.
- Mount in [src/app/page.tsx](src/app/page.tsx) between `ContinueOrdering` and `NearbyVendors`.

### 6. Vendor store header — PARTIAL
**Gap:** Store-credit badge missing in header (only shown per-product card).
**Fix:** In [src/components/features/vendor/VendorStoreHeader.tsx](src/components/features/vendor/VendorStoreHeader.tsx) (desktop ~L182, mobile ~L60), render a "Credit Available" pill when `vendor.creditEnabled && session.creditAccount.availableLimit > 0`. Reuse `<CreditBadge/>` from product card.

### 7. Catalog nav — PARTIAL
**Gap:** Catalog grid is responsive multi-column; spec asks Hyperpure-style **1-column** category list (image left, name right, count, chevron) on the category sidebar. All-items grid can stay multi-column.
**Fix:** Update `VendorCatalogNav` to render category list as single-column rows on desktop too. Sub-category drill expands inline.

### 14. OOS alternate vendor — PARTIAL
**Have:** API works — [src/app/api/v1/products/[id]/alternates/route.ts](src/app/api/v1/products/[id]/alternates/route.ts) returns up to 3 alt vendors.
**Gap:** Zero UI consumption. OOS tag shows on card (VendorProductCard:219-222) but never offers alternates.
**Fix:**
- On `VendorProductCard`, when product is OOS, replace ADD with a "Find at another vendor →" button that fetches `/alternates` and opens a sheet/modal.
- On product detail page, render an `AlternateVendorsSection` below the OOS notice.

### 15. Delivery-slot awareness on vendor store — PARTIAL
**Have:** Desktop `VendorStoreHeader.tsx:192-195` shows `vendor.deliverySchedule`.
**Gap:** Mobile header is hardcoded "Open till 8PM" with no real slot data; no cutoff/"order by X for next slot" messaging anywhere on browse.
**Fix:**
- Pull next active `DeliverySlot` (cutoff time + slot window) in vendor page server component; pass to header.
- Mobile header: replace hardcoded line with `Next delivery: <slot>` and `Order by <cutoff>`.
- Add a thin top-of-store strip when within 60 min of cutoff: "⏰ 47 min left for tomorrow 9-11 AM slot".

### 16. Payment options — PARTIAL
**Have:** DiSCCO Credit, Razorpay Online, Bank Transfer, PO Number — wired in [src/app/checkout/page.tsx:63-68](src/app/checkout/page.tsx#L63-L68).
**Gaps:**
1. **Wallet** missing in checkout (only listed in cart with hardcoded ₹0.00). No real balance fetch, no Wallet → Order debit flow.
2. Cart and checkout list **different payment-method sets** — cart shows Cheque/COD that checkout doesn't, checkout shows Bank/PO that cart doesn't. Confusing.
3. Bank Transfer + PO Number are listed but lack input UI (no account-details panel, no PO-number entry field).
4. DiSCCO panel shows available + used — verify "upcoming due dates" is rendered, not just current.
**Fix:**
- Build wallet flow: `WalletService.debit(userId, amount, orderId)` → reserve in pre-payment, finalize on order confirm. Fetch real balance on checkout mount.
- Make cart payment-method strip a teaser; final selection happens **only** in checkout. Or remove from cart entirely.
- Add input UIs: Bank Transfer reveals vendor account details + UTR field on submit; PO Number reveals text input + validation against per-customer/per-vendor allowlist.
- Confirm DiSCCO panel uses `CreditTransaction` to show next 3 due dates.

### 17. Order confirmation screen — PARTIAL
**Have:** Generic "Your Order has been accepted!" + track link in [src/app/cart/page.tsx:196-226](src/app/cart/page.tsx#L196-L226).
**Gaps:** No per-vendor order numbers, no vendor-confirmation-pending status, no expected delivery slot, no invoice download.
**Fix:** Move success UI to a dedicated `/order-success?ids=...` page that:
- Lists each order (one per vendor) with order number + "Vendor confirmation pending" pill.
- Shows the chosen delivery slot per vendor.
- "Download Invoice" link per order (route already exists).
- "Place Another Order" CTA (covers gap #28).

### 18. Bulk slab → quantity selector — PARTIAL
**Have:** Bulk tier buttons (`+ Add` per slab) directly add slab `minQty` to cart. ([src/components/features/vendor/VendorProductCard.tsx:267-291](src/components/features/vendor/VendorProductCard.tsx#L267-L291))
**Gap:** Spec asks for Hyperpure flow: tap bulk slab → quantity selector **opens at slab qty** → user can adjust ± → confirm. Today is single-tap commit, no adjust step.
**Fix:** Tapping a slab `+ Add` should open the per-card qty stepper preloaded to `tier.minQty`, and only call `addToCart` after the stepper's confirm tap (or after debounce). Cart UI already has +/- (line 787-812); reuse.

### 23. "Save past order as Order List" — MISSING
**Gap:** [src/app/orders/[id]/page.tsx:427-430](src/app/orders/[id]/page.tsx#L427-L430) only has "Reorder All Items".
**Fix:** Add "Save as Order List" button. On click → POST `/api/v1/lists` with `vendorId` + items mapped from `OrderItem[]`. Toast on success → "Saved to My Order Lists".

### 25. Reorder #2 (Order detail → Reorder) — PARTIAL
**Gap:** `handleReorder()` puts items straight in cart. Spec wants list-style review screen with qty=0 default and **"Previously ordered qty"** column for reference.
**Fix:** Reorder button should route to `/order-lists/from-order/[orderId]` — a transient list view that:
- Renders all line items with qty input (default 0).
- Right-aligned column shows "Last ordered: X kg".
- "Add to Cart" CTA at bottom.

### 26. Reorder #3 (Vendor Store "Previously Ordered" tab) — MISSING
**Gap:** Vendor store has `all` / `frequent` / `deals` tabs but no `previously-ordered` tab.
**Fix:** Add `prev-ordered` tab in `VendorCatalogNav`. New API: `/api/v1/vendors/[id]/previously-ordered` returns distinct products ordered by current user from this vendor (last 12 mo) with last-ordered qty + date. Render as standard product grid + small "Last ordered: 2 kg on Mar 12" caption.

### 27. 4-tap repeat order target — PARTIAL
**Path today:** Orders → tap order → Reorder → Cart → Checkout → Pay (~5–6 taps).
**Fix:** Fixing #25 (list view with qty pre-fill) collapses Cart step. Add "Pay Now" shortcut on Order List detail that creates POs for all populated rows in one tap, jumping straight to Razorpay.

### 28. Post-payment "Place another order" — MISSING
**Fix:** Covered by the new `/order-success` page (#17). Add primary CTA "Place Another Order" → routes to last vendor's store. Secondary "View My Orders".

### 31. Vendor approval — PARTIAL
**Have:** Document-level Verify/Reject ([src/app/admin/vendors/[id]/page.tsx:756-770](src/app/admin/vendors/[id]/page.tsx#L756-L770)), vendor-level Verify/Revoke (L319-341).
**Gaps:** No explicit **Reject** action on vendor itself (with reason note + email to vendor). No **Edit** path on approval screen — admin can't tweak fields before approving.
**Fix:**
- Add `RejectVendorDialog` with reason textarea → status `rejected`, audit-logged, triggers vendor email.
- On approval list ([src/app/admin/approvals/page.tsx](src/app/admin/approvals/page.tsx)), add inline "Edit" link → opens vendor edit form pre-populated; save persists then approves in one go.

### 34. Color scheme matches Figma — VISUAL REVIEW NEEDED
Cannot audit by code-read alone. Action: side-by-side review of homepage / vendor store / cart against Figma; record token diffs; update Tailwind tokens in `tailwind.config` + component classes.

---

## Files to touch (consolidated)

| Area | File |
|---|---|
| Homepage rollups | [src/app/page.tsx](src/app/page.tsx), new `FrequentlyOrderedVendors.tsx`, `TopRatedVendors.tsx` |
| Store credit pill in header | [src/components/features/vendor/VendorStoreHeader.tsx](src/components/features/vendor/VendorStoreHeader.tsx) |
| 1-col catalog nav | `VendorCatalogNav` component |
| OOS alternates UI | [src/components/features/vendor/VendorProductCard.tsx](src/components/features/vendor/VendorProductCard.tsx), product detail page |
| Delivery-slot awareness | `VendorStoreHeader.tsx`, vendor page server loader, new cutoff strip |
| Wallet + payment cleanup | [src/app/checkout/page.tsx](src/app/checkout/page.tsx), [src/app/cart/page.tsx](src/app/cart/page.tsx), `src/modules/payment/*`, new `WalletService` methods |
| Order success page | new `src/app/order-success/page.tsx`; redirect from cart success |
| Bulk slab stepper | `VendorProductCard.tsx` (tier handlers) |
| Save-as-list + reorder list-view | [src/app/orders/[id]/page.tsx](src/app/orders/[id]/page.tsx), new `/order-lists/from-order/[id]` |
| Vendor "Previously Ordered" tab | `VendorCatalogNav`, new API route, vendor page |
| Vendor reject + edit | [src/app/admin/vendors/[id]/page.tsx](src/app/admin/vendors/[id]/page.tsx), [src/app/admin/approvals/page.tsx](src/app/admin/approvals/page.tsx) |

## Reusable utilities found (don't reinvent)

- `dal.vendors.checkServiceability()` — pincode gating, used by search + category
- `resolveVendorContext` / `resolveBrandContext` — multi-tenancy guard for any new admin/vendor route
- `PaymentService.initiate / verify` — already supports N-order combined Razorpay; wallet should follow same shape
- `CartContext.buildGroups()` — vendor grouping logic; reuse for any new "preview POs" UI
- `<CreditBadge/>` (in VendorProductCard) — extract for header reuse
- `logAction` + `AUDIT_ACTIONS` — required for vendor reject / edit
- `prisma.productCategory` with `isPrimary` — already supports multi-category mapping; admin UI just needs to expose it

## Verification (when fixes ship)

For each fix, the manual check is the same shape: run `npm run dev`, walk the spec's flow at `localhost:3000`, hit `npx tsc --noEmit && npm run lint` before commit. Specific golden-paths:

1. Pincode → Search "ketchup" → see 3 blocks → tap vendor → store loads.
2. Add 2 items from Vendor A + 2 from Vendor B → cart → uncheck Vendor A's PO → checkout shows only Vendor B → pay via Razorpay → success page lists Vendor B order with delivery slot + invoice link + "Place Another" CTA. Cart still has Vendor A's PO untouched.
3. Open OOS product → "Find at another vendor" → modal shows ≤3 alts → tap one → its store opens.
4. Order detail → "Save as Order List" → toast → /order-lists shows new list with vendor name suffix.
5. Vendor store → "Previously Ordered" tab → past items appear with last-ordered caption.
6. Admin → vendor → Reject with reason → vendor user sees "Rejected" status + email arrives in console (Resend fallback).
7. Bulk slab tap → stepper opens preloaded with slab qty → adjust to qty+5 → confirm → cart reflects qty+5.
