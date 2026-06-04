# Horeca1 V2.2 — Sequenced Completion Plan

_Living document. Updated as phases complete. Last touched: 2026-06-02._

## Context

User shared three big briefs (Vendor Module, Go-Live Checklist, Wallet, Promo Engine) and asked for a full code review then "complete step by step from top — not middle — and only move to the next section when the current one is fully production-ready."

This file is the **map**: an audit of the codebase against every section of the V2.2 checklist + every line item in the Vendor Module, Wallet, and Promo briefs, plus a sequenced rollout so one section ships fully before the next begins.

Sister docs:
- [ROADMAP.md](ROADMAP.md) — production roadmap (what's shipped)
- [V2_2_UI_UX_AUDIT.md](V2_2_UI_UX_AUDIT.md) — UX-flow audit (what works visually)
- [Horeca1_Vendor_Module_Spec.md](Horeca1_Vendor_Module_Spec.md) — vendor module raw spec

---

## Audit — Where Every V2.2 Section Stands Today

Symbols: ✅ = production-ready · ⚠️ = partial, needs closure · ❌ = missing entirely

| # | Section | State | Notes |
|---|---|---|---|
| 1 | User & Access Control | ✅ | OTP, HCID, RBAC matrix all live |
| 2 | Customer Management | ✅ | Bulk upload/update/tags, outlets, filters all live |
| 3 | Brand & Vendor Management | ⚠️ | Core done. **Gap: salesman commission tracking** ⬅ Phase 1 |
| 4 | Central Item Management | ⚠️ | Bulk-update only works for price/slabs — not GST/MOQ/status/etc |
| 5 | Category Management | ⚠️ | 2-level works; DB doesn't enforce 1-parent rule |
| 6 | PriceList Management | ❌ | Customer assignment only. Missing outlet/area/segment/brand assign + bulk update |
| 7 | Order Management | ⚠️ | Missing: approve state, admin edit/split/reassign, repeat order, draft PO, multi-dispatch, OTP delivery proof |
| 8 | DiSCCO Wallet + Credit | ❌ | CreditAccount exists but balance-only. Repayments/penalties/Razorpay/state-machine all missing |
| 9 | Promotion Management | ❌ | Promotion model exists vendor-only. Coupons/referrals/cashback/stacking all missing |
| 10 | Basic Dashboards | ⚠️ | Live, brief-level metrics incomplete |
| 11 | Notifications | ⚠️ | Infra + OTP/order triggers live; payment/credit/promo reminders missing |

---

## Proposed Sequence

```
Phase 0   Sections 1 + 2                     ✅ DONE
Phase 1   Section 3 — Salesman Commission     ~1-2 days   ⬅ STARTING NOW (structure-only)
Phase 2   Section 4 — Generic Bulk-Update     ~2 days
Phase 3   Section 5 — Category enforcement    ~0.5 day  (bundle with Phase 2)
Phase 4   Section 6 — PriceList completion    ~4-5 days
Phase 5   Section 7 — Order processing        ~5-7 days
Phase 6   Section 8 — Wallet + Credit         ~7-10 days
Phase 7   Section 9 — Promotion engine        ~5-7 days
Phase 8   Section 11 — Reminder triggers      ~1-2 days
Phase 9   Section 10 — Dashboard polish       ~2-3 days
```

**Each phase ends with:** schema migration applied on prod (if any) → `tsc` + lint clean → manual UI walkthrough → deploy to droplet → memory entry. Then — and only then — start the next phase.

---

## Definition of "production-ready" per phase

- All happy-path flows manually walked through on `https://freshville.store`
- Edge cases listed in the section's brief covered
- No new TS / lint errors introduced
- Multi-tenant scoping verified (admin impersonation + own-vendor + team-member paths)
- Audit log entries written for destructive admin actions
- Notifications fire on state changes the brief calls for
- Mobile viewport sanity check (≤ 414px)

---

# PHASE 1 — Section 3: Salesman Commission (Structure-only)

**Scope:** model + endpoints + admin UI. **No** automated payout disbursement.

**Behaviour:** vendor adds salespersons, defines commission rules, assigns salesperson to customers; every order routed via that customer auto-creates a `CommissionAccrual` row when the order is `delivered`; vendor + admin can view accrual reports and move accruals through approval states — but no money actually moves out. Payout-actuation can be flipped on later by a single commit (add a payout pipeline that reads from `CommissionAccrual where status='approved'`).

## Schema changes — [prisma/schema.prisma](prisma/schema.prisma)

### 1) New model `Salesperson`
Represents a vendor's sales rep. May or may not be a User (rep might just be a field officer who never logs in).
```prisma
model Salesperson {
  id           String  @id @default(uuid()) @db.Uuid
  vendorId     String  @map("vendor_id") @db.Uuid
  name         String  @db.VarChar(255)
  phone        String? @db.VarChar(15)
  email        String?
  code         String? @db.VarChar(30)   // vendor's internal employee id
  userId       String? @map("user_id") @db.Uuid   // if rep also has a login
  isActive     Boolean @default(true)
  createdAt    DateTime @default(now()) @db.Timestamptz
  updatedAt    DateTime @default(now()) @updatedAt @db.Timestamptz

  vendor       Vendor  @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  user         User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@unique([vendorId, code])
  @@index([vendorId])
  @@map("salespersons")
}
```

### 2) New model `CommissionRule`
```prisma
model CommissionRule {
  id              String  @id @default(uuid()) @db.Uuid
  vendorId        String  @map("vendor_id") @db.Uuid
  salespersonId   String  @map("salesperson_id") @db.Uuid
  scope           CommissionRuleScope   // default | customer | brand | category
  scopeRefId      String? @map("scope_ref_id") @db.Uuid
  ratePercent     Decimal? @db.Decimal(5, 2)
  rateFixed       Decimal? @db.Decimal(12, 2)
  minOrderValue   Decimal? @db.Decimal(12, 2)
  validFrom       DateTime?
  validTo         DateTime?
  isActive        Boolean @default(true)
  createdAt       DateTime @default(now()) @db.Timestamptz
  updatedAt       DateTime @default(now()) @updatedAt @db.Timestamptz

  vendor          Vendor      @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  salesperson     Salesperson @relation(fields: [salespersonId], references: [id], onDelete: Cascade)

  @@index([vendorId, salespersonId, isActive])
  @@map("commission_rules")
}

enum CommissionRuleScope {
  default
  customer
  brand
  category
}
```
Constraint (enforced in service layer): exactly one of `ratePercent`, `rateFixed` must be set.

### 3) New model `CommissionAccrual`
```prisma
model CommissionAccrual {
  id              String  @id @default(uuid()) @db.Uuid
  orderId         String  @map("order_id") @db.Uuid
  vendorId        String  @map("vendor_id") @db.Uuid
  salespersonId   String  @map("salesperson_id") @db.Uuid
  ruleId          String? @map("rule_id") @db.Uuid
  baseAmount      Decimal @db.Decimal(12, 2)
  ratePercent     Decimal? @db.Decimal(5, 2)
  rateFixed       Decimal? @db.Decimal(12, 2)
  accruedAmount   Decimal @db.Decimal(12, 2)
  period          String  @db.VarChar(7)   // 'YYYY-MM' for report grouping
  status          CommissionAccrualStatus @default(pending)
  approvedBy      String? @map("approved_by") @db.Uuid
  approvedAt      DateTime?
  notes           String? @db.Text
  createdAt       DateTime @default(now()) @db.Timestamptz

  order           Order        @relation(fields: [orderId], references: [id])
  vendor          Vendor       @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  salesperson     Salesperson  @relation(fields: [salespersonId], references: [id])
  rule            CommissionRule? @relation(fields: [ruleId], references: [id], onDelete: SetNull)
  approver        User?        @relation(fields: [approvedBy], references: [id], onDelete: SetNull)

  @@unique([orderId, salespersonId])
  @@index([vendorId, period, status])
  @@map("commission_accruals")
}

enum CommissionAccrualStatus {
  pending
  approved
  paid
  cancelled
}
```
Note: `paid` is a manual state vendor sets when they actually disburse (offline payment). No automated disbursement code in V2.2.

### 4) Add `salespersonId` to existing models
- `VendorCustomer.salespersonId` — replaces the `salesExecutive` free-text. Keep the string for one release cycle so admin import scripts don't break; new code reads `salespersonId` first, falls back to string.
- `Order.salespersonId` — snapshot at order creation so commission survives even if VendorCustomer is later reassigned.

Migration script: best-effort match existing `salesExecutive` strings against `Salesperson.name` per vendor and populate the FK; rows that don't match are left null.

## Permission registry — [src/lib/permissions/registry.ts](src/lib/permissions/registry.ts)

Add two new modules:
- `salespersons` — actions: `view`, `create`, `edit`, `delete`
- `commissions` — actions: `view`, `approve`, `edit` (edit = move state, override accrual amount)

Update `SCOPE_MODULES.vendor` to include both. Bump `MODULES` registry. Existing role templates (Vendor Admin / Manager / etc) get the new permissions via seed-data migration.

## Endpoints — `src/app/api/v1/vendor/`

| Route | Methods | Auth |
|---|---|---|
| `/salespersons` | GET (list), POST (create) | `salespersons.view` / `.create` |
| `/salespersons/[id]` | GET, PATCH, DELETE | `salespersons.view/.edit/.delete` |
| `/commission-rules` | GET, POST | `commissions.view/.edit` |
| `/commission-rules/[id]` | PATCH, DELETE | `commissions.edit` |
| `/commissions` | GET (filters: period, salespersonId, status, customer) | `commissions.view` |
| `/commissions/summary` | GET (totals per salesperson per period) | `commissions.view` |
| `/commissions/[id]/approve` | POST | `commissions.approve` |
| `/commissions/[id]/cancel` | POST | `commissions.approve` |
| `/commissions/[id]/paid` | POST (mark manually paid + reference note) | `commissions.approve` |

Service layer: new [src/modules/commission/commission.service.ts](src/modules/commission/commission.service.ts) with `findApplicableRule()`, `createAccrual()`, `summarize()`.

## Accrual generation hook

In [src/modules/order/order.service.ts](src/modules/order/order.service.ts), on order-status transition to `delivered`:
1. If `order.salespersonId` is null → skip.
2. Call `commission.service.findApplicableRule(vendorId, salespersonId, order)` — picks the most-specific active rule (customer > brand > category > default), honouring `validFrom` / `validTo` / `minOrderValue`.
3. If found, create `CommissionAccrual` with status='pending'.

Idempotent — `@@unique([orderId, salespersonId])` prevents double-write if the status hook fires twice.

## Frontend

### Vendor portal (`/vendor`)
- New sidebar entry **Sales Team** (icon: `Users` or `BadgeCheck`)
- `/vendor/sales-team` page with three tabs:
  - **Salespersons** — table + add/edit dialog
  - **Rules** — table of rules, dialog to add (scope picker → ref dropdown → rate type → value)
  - **Commissions** — filter bar (period, salesperson, status) + table of accruals with action buttons (Approve / Cancel / Mark Paid)
- Existing **Customers** tab on vendor portal: replace the free-text `salesExecutive` input with a dropdown of `Salesperson`s.

### Admin (`/admin/customers`)
- Salesman filter at top: dropdown of salespersons (across vendors). Reuses the existing `salesRep` filter shape.

### No new customer-facing UI
Salesperson attribution is invisible to the buying customer.

## Verification checklist

1. As vendor: create 2 salespersons (Ramesh, Suresh), one with code, one with phone only.
2. Create a default rule for Ramesh at 5%, a customer-specific rule for Suresh at 7%.
3. Assign Ramesh to a customer (Cafe X), Suresh to another (Hotel Y).
4. Place orders as both customers, deliver them.
5. Verify two CommissionAccrual rows created with the right rates.
6. Approve Ramesh's accrual → status=`approved`.
7. Mark approved accrual `paid` with note "UPI ref txn123" → verify status=`paid` + note saved.
8. Check the summary endpoint returns the right totals per salesperson per period.
9. Sanity: as a Vendor Viewer (no commissions.approve), the Approve button is hidden + the endpoint rejects.
10. Multi-tenant: another vendor on the same droplet cannot see Ramesh's commissions.

## Rollback

Each commit phase is independent:
1. Schema migration (additive only — `salesExecutive` string preserved one cycle)
2. Endpoints (no consumer yet)
3. UI (consumer of endpoints)
4. Accrual hook in order service (last)

If the accrual hook misbehaves on prod, comment out the call in `order.service.ts`, redeploy. No data lost — accruals are append-only.

## Commit chunks (proposed)

1. `feat(commission): schema for Salesperson, CommissionRule, CommissionAccrual + Order/VendorCustomer FKs`
2. `feat(commission): permission registry adds salespersons + commissions modules`
3. `feat(commission): vendor API endpoints — salespersons + rules + accrual reports`
4. `feat(commission): vendor portal Sales Team page (3 tabs)`
5. `feat(commission): /admin/customers salesperson filter`
6. `feat(commission): accrual auto-generation on order.delivered`

Each chunk lands separately with its own diff so any regression is bisectable. Same pause-before-commit discipline as every other session.

---

## Phase Tracking

| Phase | Status | Started | Completed | Commit range |
|---|---|---|---|---|
| 0 | ✅ Done | — | 2026-06-02 | `aa89e18..bef4f61` |
| 1 | ✅ Deployed | 2026-06-02 | 2026-06-02 | `aa40fd3..e91ab6f` (6 commits + plan) |
| 1.5 | ✅ Admin Add-Vendor full KYC wizard | 2026-06-03 | 2026-06-03 | `9b78b0b` (+ `cdd2934` switcher fix) |
| 2 | ✅ Deployed | 2026-06-03 | 2026-06-03 | `5a72d9c` (bulk-update + count + UI) |
| 3 | ✅ Deployed (bundled with Phase 2) | 2026-06-03 | 2026-06-03 | category 1-parent enforcement |
| 3.5 | ✅ Admin import UX + edits land | 2026-06-03 | 2026-06-03 | `54adec8..9741958` |
| 3.6 | ✅ Admin customers bulk + import | 2026-06-03 | 2026-06-03 | `72851af` |
| 4 | ✅ Code complete | 2026-06-03 | 2026-06-03 | `2c73ed2..884c17e` (5 chunks — schema, resolver, cart/order, API, UI) |
| 5 | Not started | — | — | — |
| 6 | Not started | — | — | — |
| 7 | Not started | — | — | — |
| 8 | Not started | — | — | — |
| 9 | Not started | — | — | — |

---

## Phase 2 + 3 deliverables (2026-06-03)

**Phase 2 — Generic Bulk-Update**
- Backend: `PATCH /api/v1/vendor/products/bulk-update` — accepts `{filter, set}` body. Whitelisted `set` fields:
  - Direct writes: `isActive`, `minOrderQty`, `taxPercent`, `creditEligible`, `isFeatured`, `vegNonVeg`, `storageType`, `shelfLifeDays`, `description`, `brand`, `countryOfOrigin`
  - Price adjustments: `basePrice` + `originalPrice` with `{type: 'set'|'percent'|'fixed', value, roundTo?}`; optional `applyToSlabs` to fan adjustments through `priceSlabs`
  - Convenience: `clearPromo` wipes `promoPrice` + `promoStartTime` + `promoEndTime` in one call
- Filter shape: `{ productIds?, categoryId?, brand?, isActive? }`. At least one criterion required.
- Multi-tenant: every read + every update scoped to caller's `vendorId`. Forged ids from other vendors filter out, no 403 leakage.
- Direct-field writes use `updateMany` (single SQL); price adjustments require per-row reads + writes (bounded by filter).
- Backend: `GET /api/v1/vendor/products/count` — lightweight count for the live "N products match" indicator on the UI.
- Frontend: `/vendor/bulk-update` page — filter card + grouped set fields (Status / Pricing / Catalog metadata). Confirm dialog before apply. Sidebar entry between Bulk Upload and Brand Mappings.

**Phase 3 — Category 2-level enforcement**
- Server-side guard on `POST /api/v1/admin/categories` and `PATCH /api/v1/admin/categories/[id]`:
  - Parent must exist and itself be a root (`parent.parentId IS NULL`)
  - A category cannot be its own parent (self-loop blocked)
  - A category with children cannot be reparented (would create level-3 grandchildren)
- App-level enforcement chosen over DB CHECK constraint because Postgres `CHECK` can't reference another row's column; a TRIGGER would work but adds operational overhead for marginal gain. Application enforcement is sufficient since all writes go through these two endpoints.

**Known follow-ups (next phase)**
- Bulk-update for **Inventory** stock quantities — Inventory is a separate model; better fits a dedicated bulk action on `/vendor/inventory`. Phase 4 PriceList work will revisit.
- Extending the Excel `bulk-import` to write `isActive`, `minOrderQty`, `creditEligible`, `description`, `vegNonVeg`, `storageType` columns — current scope is intentionally limited to creating products; "update on existing SKU" already happens via the importer but only for the original column set. Will fold into Phase 4 since pricelist work touches the same import pipeline.

---

# PHASE 4 — Section 6: PriceList Management

**Scope:** unlimited price lists per vendor + assignment by Customer / Outlet / Pincode / Area / Customer-segment / Brand + four pricing types (Fixed / Discount-% / Special / Scheme) + bulk price upload + a **runtime price-resolver** that cart and checkout both call so the assignment + override layer is honoured everywhere a price is shown.

**Why this is the marquee phase:** without the resolver, every other piece (assignments, pricing types, bulk upload) is just paperwork — products still display Product.basePrice. The resolver is the single binding point that turns the data model into actual differential pricing.

## Schema — [prisma/schema.prisma](prisma/schema.prisma)

### 1) New enum `PricingType`
```
enum PricingType {
  fixed     // hard set: PriceListItem.customPrice replaces basePrice
  discount  // multiplicative: basePrice × (1 − discountPercent / 100)
  special   // same write semantics as fixed, but flagged as "promo/limited"
            // so the UI can badge it differently. No different math.
  scheme    // qty-gated: kicks in when cart qty ≥ schemeMinQty; price drops
            // to customPrice; schemeFreeQty optionally adds N free units
}
```

### 2) New enum `PriceListAssignmentType`
```
enum PriceListAssignmentType {
  customer   // points at a specific User (1:1 customer relationship)
  outlet     // points at a specific Outlet (deliver-to address)
  pincode    // free-text pincode string
  area       // free-text area / city / state string
  segment    // free-text tag, matched against VendorCustomer.tags
  brand      // Brand row id OR brand-name string fallback
  // (no `distributor` — out of scope per V2.2 clarifications)
}
```

### 3) New model `PriceListAssignment`
```
PriceListAssignment
  id          Uuid @id
  priceListId Uuid    FK → PriceList.id   onDelete: Cascade
  type        PriceListAssignmentType
  // Exactly one of the targeting columns is populated per row. The
  // service-layer resolver checks the appropriate column based on
  // `type`. We don't FK every column because brand+pincode+area+segment
  // don't have referential targets in our schema today.
  userId           Uuid?    FK → User.id              onDelete: Cascade
  businessAccountId Uuid?   FK → BusinessAccount.id   onDelete: Cascade
  outletId         Uuid?    FK → Outlet.id            onDelete: Cascade
  brandId          Uuid?    FK → Brand.id             onDelete: Cascade
  pincode          String?  @db.VarChar(10)
  area             String?  @db.VarChar(100)
  segment          String?  @db.VarChar(100)
  brandName        String?  @db.VarChar(150)   // fallback when brand isn't in our Brand table
  createdAt        DateTime
  @@index([priceListId, type])
  @@index([userId])
  @@index([outletId])
  @@index([pincode])
```

### 4) Extend `PriceListItem`
```
+ pricingType      PricingType  @default(fixed)
+ discountPercent  Decimal?  @db.Decimal(5, 2)
+ schemeMinQty     Int?
+ schemeFreeQty    Int?
// existing customPrice column reused; for type='discount' it's null
```

### 5) Opposite-side relations
`User`, `BusinessAccount`, `Outlet`, `Brand`, `PriceList` all add a back-relation `priceListAssignments PriceListAssignment[]` so `findFirst` queries with `assignments: { some: ... }` work both ways.

## Runtime resolver — `src/modules/pricing/pricing.service.ts` (NEW)

Single exported function `resolveUnitPrice` invoked everywhere a product price is computed (cart add, cart update, cart read, checkout subtotal, order line-write).

**Signature:**
```
resolveUnitPrice(input: {
  productId: string;
  vendorId: string;
  quantity: number;
  customer: {
    userId: string;
    businessAccountId: string;
    outletId: string;
    outletPincode: string | null;
    outletCity: string | null;
    outletState: string | null;
    tags: readonly string[];             // VendorCustomer.tags for the (vendor, user) pair
  };
}): Promise<{ unitPrice: Decimal; source: ResolutionSource }>
```

**Priority chain** (first match wins, falls through to next on no match):

1. **Outlet-specific** assignment matching customer's `outletId`
2. **Customer-specific** assignment matching `userId` OR `businessAccountId`
3. **Customer-segment** assignment whose `segment` value is in `customer.tags`
4. **Pincode** assignment matching `outletPincode`
5. **Area** assignment matching `outletCity` or `outletState`
6. **Brand** assignment matching the product's `brand` field
7. **Legacy `VendorCustomer.priceListId`** (the existing customer-pricelist mapping)
8. **`VendorCustomerPrice`** per-product override (existing system)
9. **Quantity slabs** from `PriceSlab` (existing)
10. **`Product.basePrice`** (final fallback)

Within whichever PriceList wins, the resolver applies the matching `PriceListItem`:
- `fixed` / `special` → `customPrice` is the new unit price
- `discount` → `basePrice × (1 - discountPercent / 100)`
- `scheme` → if `quantity >= schemeMinQty`, use `customPrice`; else fall through

If no `PriceListItem` row exists for the product but the PriceList itself has a global `discountPercent`, that applies on `basePrice`.

**Idempotent + cacheable:** resolver takes no state. Caller passes context. Tests can mock the customer record cleanly.

## Service integration

### `cart.service.ts` (MODIFY)
- `addItem(productId, quantity)` and `updateQuantity` → call `resolveUnitPrice` instead of reading `product.basePrice` directly. Result stored in `CartItem.unitPrice`.
- `getCart()` → re-resolves every line so price changes (e.g. admin lowers a pricelist) reflect on next read without needing a cart mutation. Stale `unitPrice` on the row is rewritten via `updateMany`.

### `order.service.ts` (MODIFY)
- Subtotal calc and `OrderItem.unitPrice` writes go through `resolveUnitPrice` using the order's `(userId, businessAccountId, outletId)` context. Order rows preserve the resolved snapshot — admin changing a pricelist later doesn't retroactively change historical orders.

## API endpoints

### `GET /api/v1/vendor/price-lists` (MODIFY)
- Each list now includes `assignments` (array of assignment rows) so the UI can show how each list is targeted without an N+1.
- Includes `_count.items` and `_count.assignments`.

### `GET/PATCH /api/v1/vendor/price-lists/[id]` (MODIFY)
- GET returns full assignments + items array.
- PATCH accepts:
  - `items: Array<{ productId|sku, customPrice?, pricingType, discountPercent?, schemeMinQty?, schemeFreeQty? }>` — upserts on `(priceListId, productId)`. SKU is resolved to productId on the server scoped to the caller's vendor (no cross-vendor leak).
  - `assignments: Array<{ type, userId?|outletId?|pincode?|area?|segment?|brandId?|brandName? }>` — transactional clear-and-recreate so the list always reflects the body. Server validates the right column is set per type.

### `POST /api/v1/vendor/price-lists/[id]/bulk-upload` (NEW)
- Accepts a JSON array `rows: Array<{ sku?: string; productId?: string; customPrice?: number; pricingType?: PricingType; discountPercent?: number; schemeMinQty?: number; schemeFreeQty?: number }>`
- Resolves each row's SKU → productId scoped to vendorId; rows that don't match are returned in `errors` (not silently dropped).
- Upserts in a single `$transaction`. Returns `{ updated, created, skipped, errors }`.
- Mirrors the design of the existing product `bulk-import` so vendors can paste an Excel sheet of pricing rules in one go.

## Vendor portal UI — `/vendor/price-lists/[id]` (MODIFY)

- Per-item row gets a **Pricing Type** dropdown. Picking `discount` reveals a `%` input; picking `scheme` reveals `schemeMinQty` + `schemeFreeQty` inputs; `fixed`/`special` keep the existing `customPrice` field.
- New **Assignments** card listing all attached rules with delete + add. Add-rule shows a type-picker → contextual control (customer dropdown / outlet dropdown / pincode text / area text / segment-tag input / brand picker).
- New **Bulk Upload** strip — drag-drop or pick a `.xlsx`/`.csv`, parse client-side using existing `XLSX` lib, preview rows + errors, then submit to the new bulk-upload endpoint.

## Multi-tenant + RBAC hardening

- Every server-side read/write scopes by `vendorId` resolved via `resolveVendorContext`.
- `commissions.*` perms stay independent of pricing perms. Pricing CRUD uses `products.edit` (existing) since pricing is a sub-concern of catalog.
- The assignment FK columns use `onDelete: Cascade` — when a customer / outlet / brand goes away the matching assignments are auto-cleared. Pincode / area / segment columns are free-text so they can't dangle; manual cleanup if needed.

## Verification checklist

1. Migration applied locally + on prod tunnel.
2. As vendor: create a PriceList "Mumbai 5%", assign by `pincode='400001'`, add one product with `pricingType='discount', discountPercent=5`.
3. As customer in Mumbai (outlet pincode 400001): visit the vendor store. Product shows 5% less than `basePrice`.
4. Add to cart → cart line `unitPrice` is the discounted value.
5. Change outlet to a non-400001 pincode → reload product page → original `basePrice` is back.
6. Bulk-upload a CSV with 20 rows of mixed pricing types → all 20 land + invalid rows surface as errors.
7. Scheme: PriceList with item `pricingType='scheme', customPrice=80, schemeMinQty=10`. Quantity 5 → basePrice. Quantity 10 → 80. Quantity 15 → 80.
8. Multi-tenant: vendor B's customer can't see vendor A's pricelists in API responses; per-vendor scoping verified.
9. Orders placed today preserve their `unitPrice` even after the pricelist is later edited.

## Commit chunks (planned)

1. `feat(pricelist): schema + migration for assignments + pricing types`
2. `feat(pricelist): PricingService resolveUnitPrice`
3. `feat(pricelist): cart + order services use the resolver`
4. `feat(pricelist): vendor API — GET/PATCH/bulk-upload with assignments + pricing types`
5. `feat(pricelist): vendor portal UI — pricing-type picker + assignments card + bulk upload`

This row updates as each phase completes — commit hash + date.

---

## Future-phase placeholders

Detailed plans for Phases 2-9 will be written into this file when we begin each phase. The audit table at the top documents the scope; estimates in the sequence section are rough. We re-plan each phase fresh when we get there so decisions made in Phase N inform Phase N+1.
