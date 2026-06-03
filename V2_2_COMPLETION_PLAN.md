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
| 1 | Not started | — | — | — |
| 2 | Not started | — | — | — |
| 3 | Not started | — | — | — |
| 4 | Not started | — | — | — |
| 5 | Not started | — | — | — |
| 6 | Not started | — | — | — |
| 7 | Not started | — | — | — |
| 8 | Not started | — | — | — |
| 9 | Not started | — | — | — |

This row updates as each phase completes — commit hash + date.

---

## Future-phase placeholders

Detailed plans for Phases 2-9 will be written into this file when we begin each phase. The audit table at the top documents the scope; estimates in the sequence section are rough. We re-plan each phase fresh when we get there so decisions made in Phase N inform Phase N+1.
