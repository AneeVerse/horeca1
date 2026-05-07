# Brand Store — End-to-End Test Plan

After Phase 1 deploy, run through this script in order. Each step builds on the previous one — don't skip ahead.

**Setup** — open three browser sessions (different profiles or incognito):
- **Admin** logged in at `/admin/dashboard` (super admin)
- **Brand owner** account (or admin impersonates a brand)
- **Customer** account (or guest with pincode set)
- **Vendor** account (one of your existing approved vendors)

Once a real brand exists in the DB, the homepage "Shop by Brand" carousel and `/brands` page populate automatically. Until then, both surfaces show empty state — no mock data.

---

## 1. Brand creation (admin)

1. Admin → `/admin/brands` → **Add Brand** button.
2. Fill the form: brand name "Amul" + email `brand-amul@test.com` + password + tagline + website.
3. After save, click the new brand's **Edit** button → `/admin/brands/{id}`.
4. Upload a **logo** (file picker → ImageKit), a **banner**, and 1-3 **showcase images** (the first one shows on the brand card).
5. Pick a **bgColor** preset (or custom). Add 4-8 **categories** (Butter, Cheese, Ghee, Paneer …).
6. Save. Verify approval status shows `approved` (admin-created brands auto-approve).

**Pass**: brand exists in `/admin/brands` list with logo + green status badge.

---

## 2. Brand portal — master catalog

1. From `/admin/brands`, click **Portal** for the new brand → admin impersonation cookie set, you're now in `/brand/portal`.
2. **Dashboard** — should show real stats (0 products, 0 mappings, 0 % coverage initially).
3. **My Products** → **+ Add Product**:
   - Click the image dropzone → upload a product photo (file picker → ImageKit upload).
   - Name: "Amul Butter 100g"
   - Pack size: "100g", Unit: "g", Category: "Butter", SKU: "AMUL-BUT-100"
   - Save. The new product appears in the list with the uploaded image.
4. Add 2-3 more master products (Amul Cheese 200g, Amul Ghee 1L …).
5. **Distributor Map** → click **Run Auto-Mapping**. The auto-mapper scans all approved distributor products against your brand catalog. If any vendor sells "Amul" products, mappings appear immediately.
6. **Settings** → tweak the brand profile — verify image upload + categories tag editor + bgColor picker live-preview strip all work.

**Pass**: brand catalog is real, images are real ImageKit URLs (check the URL in the network panel).

---

## 3. Vendor side — manual mapping

1. Switch to a vendor account → `/vendor/brand-mappings` (new menu item between Products and Inventory).
2. **Stats row** shows `Unmapped`, `Awaiting your review`, `Mapped` counts.
3. **Suggested matches awaiting your review** (pending_review): if the auto-mapper found a 0.70-0.89 confidence match against an Amul SKU, you'll see it here with **Confirm** / **Wrong** buttons. Click **Confirm** → row disappears, mapped count goes up.
4. **Products without a brand match** lists unmapped vendor products.
5. Click **Match to brand SKU** on any product → modal opens, search "amul" → pick "Amul Butter 100g" → success toast → product moves out of unmapped, into mapped.
6. The **Active mappings** dropdown at the bottom shows all live links.

**Pass**: at least one vendor product is now linked to one brand master SKU, status `verified`, `manually_verified`.

---

## 4. Customer discovery — homepage + search

1. Open `/` as a customer with a pincode set (use one of the vendor's service pincodes).
2. **Homepage "Shop by Brand"** carousel — should show your real Amul brand card (with the showcase image you uploaded). Click → `/brand/amul`.
3. Open `/brands` (See all link). Real brands list. No mock data.
4. Use the navbar search → type "amul". The search results page shows a **Brands** block above Vendors with the Amul card.

**Pass**: brand storefront fetches and renders real data. No hardcoded fallback. Empty grid + "No brands yet" message if 0 approved brands in DB.

---

## 5. Brand storefront — pincode awareness

1. On `/brand/amul`:
   - With a **serviceable** pincode set: see "Showing N distributors that deliver to {pincode}" green strip. Vendor list filtered.
   - Set pincode 110001 (or any pincode no vendor services) → amber empty-state banner: "No distributors in 110001 yet … we'll notify you when …" with a "Show all distributors anyway" link.
   - Click the link → strip flips, all distributors shown with an "Some may not deliver to {pincode}" note.

**Pass**: `?pincode=` query in network panel; coverage object in API response.

---

## 6. Customer flow — name override on discovery surfaces

1. Search the navbar for a vendor product name that's mapped to Amul (e.g. you mapped "Sharad's Amul Butter Pack 100g" to "Amul Butter 100g").
2. The search result tile shows **"Amul Butter 100g"** (canonical) with a small **"by Amul"** link.
3. Click into the vendor's store → product card shows the canonical name + brand pill.
4. Open the PDP → title is "Amul Butter 100g" + "by Amul" link → click goes to `/brand/amul`.
5. Add to cart → open `/cart`. The cart line item should show the **distributor's actual product name** (e.g. "Sharad's Amul Butter Pack 100g") — this is intentional. Transactional records keep the seller's wording.
6. Place an order → `/orders/{id}` line item also shows the distributor name. Admin sees the same on `/admin/orders/{id}`.

**Pass**: brand canonical name appears on ALL discovery surfaces but NEVER on cart/order/invoice (transactional integrity).

---

## 7. End-to-end order

1. Customer, serviceable pincode → `/brand/amul` → click an Amul product (lands on Vendors tab) → click a vendor card → vendor store → ADD to cart → checkout → pay (Razorpay test mode).
2. Order success page → confirms PO created with the distributor.
3. Admin `/admin/orders/{id}` → see the order with distributor's product name.
4. Vendor `/vendor/orders/{id}` → see the order with their own product name.
5. Brand portal `/brand/portal/mappings` → mapping count went up (or stayed same; this is a customer order, not a new mapping).

**Pass**: end-to-end works without any "Brand Store" parallel cart / checkout / payment system. Reuses existing infra.

---

## 8. Negative / edge cases

- Vendor maps a product to wrong brand SKU → can't undo from UI yet; workaround: admin rejects from `/admin/brands` Mappings tab. Track for Phase 2.
- Brand approves but has 0 master products → `/brand/{slug}` shows the brand identity (banner, logo, tagline) and an empty product grid. No crash.
- 2 vendors both map to same brand SKU → both show on the brand storefront, lowest-price logic decides default ADD vendor (Phase 2 — currently customer must pick from Vendors tab).
- Pincode unset → storefront shows all distributors, no pincode banner.
- Brand status `pending` or `rejected` → `/brand/{slug}` returns 404.

---

## 9. Mock data audit — already complete

After Phase 1 deploy, ZERO hardcoded brand fallbacks remain:
- ✅ `src/components/features/ShopByStorePromo.tsx` — fetches `/api/v1/brands?limit=12`, hides section when empty
- ✅ `src/app/brands/page.tsx` — fetches `/api/v1/brands?limit=100`, shows "No brands yet" empty state
- ✅ `src/components/features/brand/BrandStore.tsx` — already API-driven (was cleaned in earlier deploy)
- ✅ Brand storefront product data — real `BrandMasterProduct` rows + real `BrandProductMapping` joins, no fakes

If something looks fake, check the network panel — every brand surface hits a real API.

---

## What to report back

After running through this once, tell me:
1. Which step (if any) failed or surprised you
2. Any UI/UX rough edges (spacing, copy, wrong colour, slow render)
3. Any feature that worked but felt like it needed one more step

I'll roll the fixes into the Phase 2 work.
