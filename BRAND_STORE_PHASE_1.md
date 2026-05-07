# Horeca1 Brand Store — Phase 1 Plan

## Context

The client wants a **Brand Store** layer that lets brand owners create their own canonical product catalog, see which distributors carry their products (auto + manual mapping), and lets customers discover brands → see distributor availability by pincode → order through the existing vendor-grouped cart flow.

Key business reasons for Phase 1:
- **Brand discovery** — buyers find products by brand identity (Amul, Veeba, Knorr) instead of digging through distributor stores
- **Network effects** — every brand-distributor mapping enriches both surfaces
- **Primary sales** — distributors can place restock orders to brands directly later (out of scope this phase, but the data model must support it)
- **Zero extra work for distributors** — they continue listing products as today, just map their SKUs to brand SKUs once

A lot of the foundation already exists in master. This plan is a **delta** — only what's missing or broken to satisfy the brief.

---

## What's already shipped (do not rebuild)

| Piece | Where | Status |
|---|---|---|
| `Brand` + `BrandTeamMember` + role=`brand` + RBAC | `prisma/schema.prisma`, `src/middleware/rbac.ts`, `src/lib/teamPermissions.ts` | ✅ |
| Brand portal (dashboard / products / mappings / settings) | `src/app/brand/portal/*` | ✅ |
| Brand profile + image upload (logo, banner, showcase, bgColor, categories) | `/brand/portal/settings`, `/api/v1/brand/profile` | ✅ |
| `BrandMasterProduct` CRUD (URL-only image, no file picker) | `/api/v1/brand/products`, `src/app/brand/portal/products/page.tsx` | ⚠️ partial |
| `BrandProductMapping` model + statuses (`auto_mapped`, `pending_review`, `verified`, `rejected`) | `prisma/schema.prisma:776-804` | ✅ |
| Auto-mapper (rule-based: brand-name +0.35, Jaccard +0.40, pack +0.15, brand-field +0.10; thresholds 0.90 / 0.70) | `src/modules/brand/brand-mapper.ts` | ✅ |
| Admin review queue (verify / reject) | `/admin/brands` Mappings tab, `/api/v1/admin/brands/mappings/*` | ✅ |
| Brand-side coverage view ("Distributor Map") | `/brand/portal/mappings`, `/api/v1/brand/coverage` | ✅ |
| Public brand storefront (`/brand/[slug]`) showing All Items + Vendors tabs | `src/app/brand/[brandId]/page.tsx`, `BrandService.getStoreBySlug` | ⚠️ partial |
| Public brand list `/brands` + homepage `ShopByStorePromo` | `src/app/brands/page.tsx`, `src/components/features/ShopByStorePromo.tsx` | ✅ |
| Cart vendor grouping (multi-vendor → multi-PO) | `src/app/cart/page.tsx`, `CartContext` | ✅ |
| Auto-mapping triggered on brand product create / update / brand approval | `BrandService.createMasterProduct`, etc. | ✅ |

---

## Gaps to close in Phase 1

| # | Gap | Severity |
|---|---|---|
| 1 | **No distributor-side manual mapping UI** — distributors cannot pick a brand SKU and link it to one of their products. The brief calls this the FIRST-TIME manual mapping flow and it's the single biggest hole. | 🔴 P0 |
| 2 | **Brand name does not override distributor name** on customer surfaces when a verified mapping exists. The brief is explicit: "Brand Store Item Name will be displayed both in the Brand Store & Distributor Store (it will over-ride the Vendor's Item Name)". | 🔴 P0 |
| 3 | **Brand storefront ignores customer pincode** — `getStoreBySlug` returns ALL mapped distributors regardless of service area. Brief asks for "if no Brand Distributor in the pincode, still show the Brand Store but say 'Sorry currently we do not have Distributors in your Pincode'". | 🔴 P0 |
| 4 | **Add-to-cart on brand storefront is awkward** — clicking a product flips to a "Vendors" tab; no inline ADD button with vendor picker on the product card. | 🟠 P1 |
| 5 | **Search returns no Brand results** — typing "Amul" shows Amul products and vendors but no link to `/brand/amul`. | 🟠 P1 |
| 6 | **Brand master products: image is URL-only** — no file picker, inconsistent with the rest of the brand portal. | 🟡 P2 |

Out of scope (defer to Phase 2): brand-creates-distributors, full reach/sales analytics, embeddings-based fuzzy auto-mapper, brand-set pricing tiers.

---

## Implementation plan

### Gap 1 — Distributor-side manual mapping UI (P0)

**New page**: `src/app/vendor/(dashboard)/brand-mappings/page.tsx`
- Two columns: "My products without a brand match" (left) and "Suggested matches awaiting your review" (right, the auto-mapper's `pending_review` rows for this vendor)
- For each unmapped product: "Match to a brand SKU" button → opens a searchable picker over `BrandMasterProduct` (filter by name, brand)
- Action: `POST /api/v1/vendor/brand-mappings` `{ distributorProductId, brandMasterProductId }`
- Mappings created from this UI are written with `status='verified'`, `matchedBy='manually_verified'`, `confidenceScore=1.0`, `reviewedBy=session.userId`.
- For pending_review rows already in the queue: actions "This is correct" → status=verified / "Wrong product" → status=rejected.
- **Auto-mapped rows are NOT shown** — distributors trust the auto-mapper above 0.90 confidence (zero-extra-work promise from brief). If a distributor disagrees with an auto-mapping, they can dispute via a "Dispute mapping" button on each auto-mapped row in the Distributor Map view (this remains a future-phase nicety).

**New API**: `src/app/api/v1/vendor/brand-mappings/route.ts` (POST), and `[id]/route.ts` (PATCH for accept/reject of pending). Wrap with `vendorOnly` middleware + `resolveVendorContext` to enforce vendor scoping (distributor product must belong to the calling vendor — guard against IDOR). Reuse `requireVendorPerm(role, 'products:write')`.

**Side-effect on creating a distributor product**: the auto-mapper already runs on brand product create/update. To match the brief's "FIRST TIME" flow, also trigger `runMappingForVendorProduct(productId)` from `VendorProductService.create` so newly added distributor products get scored against existing brand catalogs immediately. Add this method to `brand-mapper.ts`.

**Files to add/touch**:
- `src/app/vendor/(dashboard)/brand-mappings/page.tsx` (new)
- `src/app/api/v1/vendor/brand-mappings/route.ts` (new)
- `src/app/api/v1/vendor/brand-mappings/[id]/route.ts` (new)
- `src/modules/brand/brand-mapper.ts` — add `runMappingForVendorProduct(productId)`
- `src/modules/inventory/product.service.ts` (or wherever vendor product create lives) — fire-and-forget call to the new mapper method
- Add nav link in `src/app/vendor/(dashboard)/layout.tsx` ("Brand Mappings" with badge count of pending_review)

### Gap 2 — Brand name override on discovery surfaces only (P0)

Scope: discovery surfaces only. Cart, order history, and invoices keep the distributor's actual product name (so transactional records match what the distributor sold).

The cleanest way is to compute a `displayName` in the data-access layer (DAL) so every discovery consumer benefits without per-component logic.

**Backend**: extend `Product` queries that hit discovery surfaces to include the active mapping:
```ts
brandMappings: {
  where: { status: { in: ['verified', 'auto_mapped'] } },
  select: { brandMasterProduct: { select: { name: true, brand: { select: { name: true, slug: true } } } } },
  take: 1,
}
```

**DAL transformer** (`src/lib/dal.ts` `toVendorProduct`): if `brandMappings[0]` is present, set `displayName = brandMappings[0].brandMasterProduct.name` and add `brandName`/`brandSlug` to the product type. Else `displayName = name`.

**Frontend** — apply override only here:
- `src/components/features/vendor/VendorProductCard.tsx` — title + share text + alternate-vendor sheet
- `src/app/search/page.tsx` — product result rows
- `src/app/product/[id]/page.tsx` — PDP
- Add a small "by [Brand]" pill under the title where helpful, linking to `/brand/[brandSlug]`

**Do NOT override** in:
- `src/app/cart/page.tsx` — line items keep distributor name (transactional record)
- `src/app/orders/[id]/page.tsx` — order history keeps distributor name
- Invoice PDF generation
- Vendor portal / admin portal — they always see the underlying distributor product

This means `displayName` is a discovery-only concept; cart/order code paths continue rendering `product.name` directly.

### Gap 3 — Pincode awareness on brand storefront (P0)

**Service**: change signature `BrandService.getStoreBySlug(slug, opts: { pincode?: string })`. After building the vendor map, when a pincode is passed, filter the vendors array and the per-product `distributors` array by `vendor.serviceAreas.includes(pincode)`. Always return `coverage: { servicedByCount, totalDistributorCount }` so the UI can show "3 of 8 distributors deliver to 400001".

**API**: `/api/v1/brands/[slug]/route.ts` reads `?pincode=` from query and passes it through.

**Frontend** `src/app/brand/[brandId]/page.tsx` (the BrandStore client component):
- Read `pincode` from `AddressContext` (`useAddress()`)
- Append `?pincode=` to the brand fetch
- When zero serviceable distributors: show a soft empty-state above the product grid:
  > "We don't deliver to your pincode yet. Browse the catalog below — we'll notify you when a distributor in {pincode} stocks these products."
- When some serviceable: show "Showing {n} distributors that deliver to {pincode}" with a "Show all distributors" toggle that re-fetches without the pincode.

### Gap 4 — Inline add-to-cart on brand storefront (P1)

Replace the "tap a product → flips to vendors tab" pattern with a `BrandProductCard` that:
- Shows brand name (canonical) + image + pack size + lowest in-stock price among serviceable distributors
- Inline ADD button — adds from the **lowest-price serviceable distributor** by default (deterministic; no surprise vendor selection)
- "From {n} distributors" pill underneath that opens a vendor picker sheet (re-uses logic from `VendorProductCard.tsx` alternate-vendor modal — see lines 332-358)
- If no serviceable distributors: button disabled with "Not in your pincode yet"

`BrandService.getStoreBySlug` already returns the price-per-vendor map — pick min price + qtyAvailable>0 client-side.

The Vendors tab can stay as a discovery affordance, but the primary action becomes ADD on the product card.

### Gap 5 — Brand block in search (P1)

**Service**: extend `SearchService.search(query, pincode, cursor, limit)`:
- Add a parallel query for `Brand` (status=approved, isActive=true) where name ILIKE %q% OR slug ILIKE %q% OR any tag in `categories[]` ILIKE %q%
- Return `{ products, vendors, categories, brands }` — `brands` capped at 5

**Frontend** `src/app/search/page.tsx`: add a 4th block above products. Each row uses the existing `BrandStoreCard` component — clicks to `/brand/[slug]`.

### Gap 6 — File upload for brand master product image (P2)

In `src/app/brand/portal/products/page.tsx`, replace the URL text input in the create/edit modal with the same `ImageUploadField` pattern used in `src/app/admin/brands/[id]/page.tsx` (POSTs to `/api/v1/upload?folder=brands`). Trivial change — keep the URL fallback below the dropzone.

---

## Critical files (consolidated)

| Area | File |
|---|---|
| Distributor mapping UI | `src/app/vendor/(dashboard)/brand-mappings/page.tsx` *(new)* |
| Distributor mapping API | `src/app/api/v1/vendor/brand-mappings/route.ts`, `[id]/route.ts` *(new)* |
| Auto-mapper trigger on vendor product create | `src/modules/brand/brand-mapper.ts`, `src/modules/inventory/product.service.ts` |
| Name override transformer | `src/lib/dal.ts` (`toVendorProduct`) |
| Customer surfaces using `displayName` | `VendorProductCard.tsx`, `search/page.tsx`, `product/[id]/page.tsx`, `cart/page.tsx`, `orders/[id]/page.tsx` |
| Pincode-aware brand storefront | `src/modules/brand/brand.service.ts` (`getStoreBySlug`), `src/app/api/v1/brands/[slug]/route.ts`, `src/app/brand/[brandId]/page.tsx` |
| Inline add-to-cart on brand store | New `BrandProductCard` component or refactor of existing brand product grid |
| Brand block in search | `src/modules/catalog/search.service.ts`, `src/app/search/page.tsx` |
| Master product image upload | `src/app/brand/portal/products/page.tsx` |

---

## Reusable utilities (don't reinvent)

- **`brand-mapper.ts`** — already does rule-based scoring; just needs a vendor-product-trigger entry point
- **`runMappingForBrand(brandId)`** — wired to brand approval and the manual "Run Auto-Mapping" button
- **`resolveVendorContext(session, req)` / `requireVendorPerm`** — multi-tenant guard for the new vendor mapping API
- **`useCart()` + `addToCart(productId, vendorId, qty)`** — the brand store add-to-cart path must use this verbatim; cart vendor grouping already enforces multi-PO at checkout
- **`useAddress()`** — provides pincode for the storefront filter
- **`BrandStoreCard` component** — drop into the search results block as-is
- **`ImageUploadField` pattern** in `src/app/admin/brands/[id]/page.tsx` — copy for the master product modal
- **`logAction` + `AUDIT_ACTIONS`** — required when distributors verify/reject mappings (add `BRAND_MAPPING_VERIFIED`, `BRAND_MAPPING_REJECTED` constants)
- **`emitEvent('BrandProductMapped', ...)`** — already used elsewhere in `BrandService`

---

## Verification plan

For each Gap, the manual check at `localhost:3000` after `npm run dev` (and `npx tsc --noEmit && npm run lint` before commit):

1. **Distributor mapping**: Log in as a vendor → /vendor/brand-mappings → see your unmapped products listed → click a product, search "Amul", pick "Amul Butter 100g" → mapping appears with status=verified. Reload the brand store /brand/amul as a customer → that distributor now appears under Amul Butter 100g.

2. **Name override**: Pick a distributor product mapped to a brand. Search the distributor name in nav search — the result tile shows the brand canonical name with a "by Amul" pill. Open the cart with that item — line item shows the brand name. Open `/admin/orders/[id]` — admin still sees the underlying distributor product info (no override on internal screens).

3. **Pincode brand storefront**: Set pincode 400001 (an unserviced one) in the address overlay → /brand/amul → soft empty-state shown, product grid still visible, ADD buttons disabled. Set pincode 400701 (a serviced one) → ADD buttons enable, "Showing N distributors that deliver to 400701" caption.

4. **Brand search**: Type "amul" in nav search → see a Brands block above Products with the Amul brand card → click → `/brand/amul`.

5. **Master product image upload**: Brand portal → My Products → Add Product → click the image dropzone, pick a file → upload spinner → URL populates → save → product list shows the new image. URL fallback still works for paste-in.

6. **End-to-end**: Brand creates 1 master product. Two distributors map their inventory to it. Customer with serviceable pincode hits /brand/[slug], sees the master product with brand name, taps ADD (gets cheapest serviceable distributor), proceeds to checkout — single PO to that distributor, payment via existing Razorpay flow, order success page shows the brand name on the line item.

---

## Decisions locked in (from clarification)

1. **Trust the auto-mapper** — distributor mapping UI surfaces only `pending_review` rows. ≥0.90 confidence stays auto-mapped without distributor confirmation.
2. **Brand-creates-distributors deferred to Phase 2** — brand portal stays read-only on the distributor network for now.
3. **Name override on discovery surfaces only** — search, vendor store, brand store, PDP show brand canonical name. Cart, order history, invoices keep the distributor's actual product name.
