# Go-Live Remediation — Status & Production Runbook

**Date:** 2026-06-06
**Branch:** `master` (worked directly, per project convention)
**Verification:** `npx tsc --noEmit` → **0 errors** · `npm run lint` → **0 errors** (warnings only).

This closes the 7 P0 blockers + 8 functional bugs from [GO_LIVE_READINESS_AUDIT.md](GO_LIVE_READINESS_AUDIT.md). The **server/data layer is complete and type-safe** for every item. Some admin-facing **UI surfaces** still need wiring (the APIs they call are done) — listed in §3.

> ⚠️ **There is no local/staging DB — everything connects to the live production database via `npm run tunnel`.** Migrations are therefore **not auto-applied** by me. Follow §2 exactly, and **take a DB backup first.**

---

## 1. What was fixed (server/data — DONE & verified)

| Audit ID | Fix | Key files |
|----------|-----|-----------|
| **P0-1** Central Horeca1 SKU | New `MasterProduct` model + `Product.masterProductId` FK. Service **auto-links/creates** a master by (name, brand) on every product create, so the central catalog stays populated without breaking forms. Admin master-products CRUD API. Admin catalog view now groups by the real master link. | `prisma/schema.prisma`, `src/lib/sku.ts`, `src/modules/catalog/catalog.service.ts` (`findOrCreateMaster`, `assertLeafCategory`), `src/app/api/v1/master-products/route.ts`, `src/app/api/v1/admin/master-products/**` |
| **P0-2** Order internal controls | `modifyOrderQuantities`, `splitOrder`, `reassignOrderVendor` (pending-only, ledger-safe; reassign remaps by master SKU) + admin routes. Draft PO `saveDraft` + `submitDraft`. | `src/modules/order/order.service.ts`, `src/app/api/v1/admin/orders/[id]/{modify,split,reassign}/route.ts`, `src/app/api/v1/orders/[id]/submit/route.ts` |
| **P0-3** Admin status bypass | Admin PATCH now routes through `OrderService.updateStatus` — stock finalize/release, credit debit/reversal, commission accrual + correct event all fire. | `src/app/api/v1/admin/orders/[id]/route.ts` |
| **P0-4** Customer attributes | 13 new columns on `BusinessAccount` (subType, cuisine, businessSize, businessStructure, serviceModel, monthlyPurchaseBand, procurementFrequency, designation, leadStatus, creditType, manual/ai/behaviour tags). `businessType` no longer hardcoded. Wired into import, detail/list API, filters, bulk-update. | `prisma/schema.prisma`, `src/lib/provisionAccount.ts`, `src/modules/import-export/excel.service.ts`, `src/app/api/v1/admin/users/{route,[id]/route,import/route,bulk-update/route}.ts` |
| **P0-5** Pricelist brand assignment | Resolver matches `brandId` against the product's verified/auto brand mappings (+ name fallback). Brand-targeted pricelists now actually apply. | `src/modules/pricing/pricing.service.ts` |
| **P0-6** Bulk-update "any field" | Product bulk-update (admin+vendor) widened to name/sku/hsn/unit/packSize/barcode/tags/aliasNames/images/imageUrl/fssaiRef + category-set surgery. Customer bulk-update covers GST/PAN/billing + all new attributes. | `src/app/api/v1/{admin,vendor}/products/bulk-update/route.ts`, `src/app/api/v1/admin/users/bulk-update/route.ts` |
| **P0-7** Vendor KYC | The admin vendor GET uses `include` → **already returns** bank/PAN/FSSAI/pickup/authorized-person/etc. (Only the UI card is pending — §3.) | `src/app/api/v1/admin/vendors/[id]/route.ts` (no change needed) |
| **B-1** veg enum crash | `'non_veg'` → `'nonveg'` in both bulk-update schemas. | bulk-update routes |
| **B-2** conditional hook | `usePathname()` moved above early returns. | `src/components/auth/OutletCompletionBanner.tsx` |
| **B-3** category import depth | Import now rejects level-3 (parent-must-be-root guard). | `src/app/api/v1/admin/categories/import/route.ts` |
| **B-4** missing lifecycle events | `OrderProcessing/ReadyForDispatch/PartiallyDelivered/Returned` event types + listeners; explicit status→event map (removed the misleading cast). | `src/events/types.ts`, `src/events/listeners.ts`, `order.service.ts` |
| **B-5** scheme free-goods | Resolver exposes `schemeMinQty/schemeFreeQty`; `order.create` grants free units (bills `qty − free`). | `pricing.service.ts`, `order.service.ts` |
| **B-6** alias search | `aliasNames` added to product search OR-clause. | `src/modules/catalog/search.service.ts` |
| **B-7** brand team info-leak | GET now gated by `users.view`. | `src/app/api/v1/brand/team/route.ts` |
| **B-8** brand login dead-end | Login redirect + navbar link for `brand` role. | `LoginPageInner.tsx`, `Navbar.tsx` |
| Lint (9) | All fixed (`@ts-expect-error`, deferred setState ×3, `<a>`→`<Link>`, typed 3× `any`). | various |
| Req 1 | Delivery-role seed script (run once via tunnel). | `prisma/scripts/seed-delivery-role.ts` |
| Reorder | Orders page now calls the robust server reorder endpoint. | `src/app/orders/page.tsx` |

---

## 2. PRODUCTION DEPLOY RUNBOOK (live DB — do in order)

**Pre-req:** open the tunnel in a separate terminal — `npm run tunnel` — and set `DATABASE_URL` to the tunneled DB (localhost:5433).

1. **🔴 BACK UP THE DATABASE FIRST.** `pg_dump` (or droplet snapshot). Non-negotiable — no staging exists.
2. **Apply additive migrations** (safe — new tables/columns only, nothing dropped):
   ```bash
   npm run migrate:prod        # = prisma migrate deploy
   ```
   Applies `20260606_business_account_customer_attributes` and `20260606_master_product`.
3. **Dry-run the master backfill**, review counts:
   ```bash
   npx tsx prisma/scripts/backfill-master-products.ts --dry-run
   ```
4. **Run the backfill** (idempotent — re-runnable):
   ```bash
   npx tsx prisma/scripts/backfill-master-products.ts
   ```
   Confirm "Products still NULL master_product_id: 0".
5. **(Optional) Harden the FK to NOT NULL** once backfill shows 0 nulls:
   ```bash
   npx tsx prisma/scripts/backfill-master-products.ts --enforce-not-null
   ```
   (The app already enforces a master on every create, so this is belt-and-suspenders. Skip if any rows remain unlinked.)
6. **Seed the delivery role** (idempotent):
   ```bash
   npx tsx prisma/scripts/seed-delivery-role.ts
   ```
7. **Deploy the app** as usual (`ssh root@64.227.187.210 "bash /opt/horeca1/deploy.sh"`). The deploy's own `migrate deploy` is a no-op for already-applied migrations.

**Rollback:** the two migrations are additive; if needed, restore from the §2.1 backup. No data is dropped by these migrations.

---

## 3. Remaining UI surfaces (backend APIs are all DONE)

These are admin/customer-facing screens that still need wiring to the finished APIs. None block the data/logic; they make the features usable end-to-end:

- **Customer detail edit form** (`src/app/admin/customers/[id]/page.tsx`) — add inputs for the 13 new attributes + PAN/FSSAI/billing (API `PATCH /admin/users/:id` `companyProfile` already accepts them; GET already returns them).
- **Vendor KYC card** (`src/app/admin/vendors/[id]/page.tsx`) — render the KYC/bank/pickup/authorized-person fields the GET already returns.
- **Order ops buttons** (`src/app/admin/orders/[id]/page.tsx`) — Edit-qty / Split / Reassign actions calling `/admin/orders/:id/{modify,split,reassign}`.
- **Checkout order notes** (`src/app/checkout/page.tsx`) — per-vendor notes textarea → include `notes` in the `vendorOrders` payload (validator + service already persist it).
- **Draft PO** — "Save as Draft" (POST `/orders` with `saveDraft:true`) + a Drafts list with a "Submit" action (PATCH `/orders/:id/submit`).
- **Master SKU picker** (optional) — `/master-products?search=` powers a picker in the product forms for explicit mapping; not required since the service auto-links.

---

*All server changes verified with `tsc` + `eslint`. Apply §2 on prod after a backup. Then re-run the audit to flip the scorecard.*
