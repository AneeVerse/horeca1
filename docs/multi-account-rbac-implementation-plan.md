# Multi-Account Access (HCID) & RBAC — Implementation Plan (V2.2)

> **Audience**: Engineering. This document is the technical blueprint for the V2.2 architectural refactor. Companion: [`multi-account-rbac-client-report.md`](./multi-account-rbac-client-report.md) (non-engineering audience).
>
> **Status**: Approved scope, pre-implementation. No code changed yet.

---

## 1. Context

Horeca1 today is a user-centric system: `User → Vendor` (1:1) and `User → Brand` (1:1), with `LinkedAccount` providing limited vendor-to-vendor switching. This blocks:

- One human accessing multiple businesses with one login.
- Vendors being also customers without separate accounts.
- Multi-outlet chains (Eve Powai vs Eve Worli under Chrome Hospitality).
- A real permission matrix UI — RBAC today is a hardcoded 4-tier matrix in `src/lib/teamPermissions.ts`.

V2.2 introduces the layered hierarchy:

```
User (HCID)  →  BusinessAccount  →  Outlet  →  Orders / Cart / Procurement
                ↑                   (owns physical address)
                is_customer / is_vendor / is_brand flags
```

RBAC becomes JSON: `Role.permissions = {module: {action: bool}}` with a permission-matrix editor UI per account.

---

## 2. Decided Behaviors (locked-in)

| Decision | Resolution |
|----------|-----------|
| Delivery shape | Single big-bang refactor (one PR + one migration) |
| Outlet ↔ address | Outlet owns its address fields (line, city, state, pincode, lat/lng) |
| Existing data | Auto-provision a BusinessAccount per Vendor / Brand / customer; backfill SavedAddress → Outlet rows |
| Scope | Core HCID + BusinessAccount + Outlet + RBAC matrix |
| Outlet picking | **Active-outlet-in-session** — outlet lives in the JWT; vendor browsing/cart/checkout all read it. No in-checkout picker. |
| Cart key | `(userId, businessAccountId, outletId)` composite unique — each outlet has its own persistent cart |
| QuickOrderList scope | `(businessAccountId, vendorId)` — cross-outlet within an account |
| "Pay selected POs" | Deferred to V2.3 (T-106) |
| Permission merge | Union (additive) across all UserRole rows applicable to active `(account, outlet)`. Roles only grant. |
| Brand identity | Folded into BusinessAccount via `is_brand` flag + 1:1 `Brand` extension |
| Horeca1 admin team | Kept separate from BusinessAccount RBAC; permission storage moves to the same JSON engine |
| HCID identifier | `User.id` (UUID); display ID `User.hcidDisplay = "HC-XXXX-XXXX"` added |
| LinkedAccount | Deleted; replaced by `BusinessAccountMember` |

---

## 3. Data Model

### 3.1 New entities (added to [prisma/schema.prisma](../prisma/schema.prisma))

```prisma
model BusinessAccount {
  id              String   @id @default(uuid()) @db.Uuid
  legalName       String   @map("legal_name") @db.VarChar(255)
  displayName     String?  @map("display_name") @db.VarChar(255)
  gstin           String?  @db.VarChar(20)
  pan             String?  @db.VarChar(20)
  businessType    String?  @map("business_type") @db.VarChar(50)
  isCustomer      Boolean  @default(true)  @map("is_customer")
  isVendor        Boolean  @default(false) @map("is_vendor")
  isBrand         Boolean  @default(false) @map("is_brand")
  status          BusinessAccountStatus @default(active)
  primaryOutletId String?  @unique @map("primary_outlet_id") @db.Uuid
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  members         BusinessAccountMember[]
  outlets         Outlet[]
  roles           Role[]
  userRoles       UserRole[]
  vendor          Vendor?
  brand           Brand?
  orders          Order[]
  carts           Cart[]
  quickOrderLists QuickOrderList[]
  customerVendors CustomerVendor[]

  @@map("business_accounts")
}

enum BusinessAccountStatus { active suspended deactivated }

model BusinessAccountMember {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  businessAccountId String   @map("business_account_id") @db.Uuid
  isPrimary         Boolean  @default(false) @map("is_primary")
  invitedBy         String?  @map("invited_by") @db.Uuid
  acceptedAt        DateTime? @map("accepted_at") @db.Timestamptz
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz

  user            User            @relation("UserAccountMembership", fields: [userId], references: [id], onDelete: Cascade)
  businessAccount BusinessAccount @relation(fields: [businessAccountId], references: [id], onDelete: Cascade)
  inviter         User?           @relation("AccountInvites", fields: [invitedBy], references: [id])

  @@unique([userId, businessAccountId])
  @@index([userId])
  @@index([businessAccountId])
  @@map("business_account_members")
}

model Outlet {
  id                    String   @id @default(uuid()) @db.Uuid
  businessAccountId     String   @map("business_account_id") @db.Uuid
  name                  String   @db.VarChar(255)
  code                  String?  @db.VarChar(50)
  addressLine           String   @map("address_line") @db.Text
  flatInfo              String?  @map("flat_info") @db.VarChar(255)
  landmark              String?  @db.VarChar(255)
  city                  String?  @db.VarChar(100)
  state                 String?  @db.VarChar(100)
  pincode               String?  @db.VarChar(10)
  latitude              Float?
  longitude             Float?
  placeId               String?  @map("place_id") @db.VarChar(500)
  isActive              Boolean  @default(true) @map("is_active")
  requiresAddressUpdate Boolean  @default(false) @map("requires_address_update")
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  businessAccount BusinessAccount @relation(fields: [businessAccountId], references: [id], onDelete: Cascade)
  orders          Order[]
  carts           Cart[]
  userRoles       UserRole[]
  savedAddresses  SavedAddress[]

  @@index([businessAccountId])
  @@index([pincode])
  @@map("outlets")
}

model Role {
  id                String   @id @default(uuid()) @db.Uuid
  businessAccountId String?  @map("business_account_id") @db.Uuid  // null = system template
  name              String   @db.VarChar(100)
  description       String?  @db.Text
  permissions       Json
  isTemplate        Boolean  @default(false) @map("is_template")
  scope             RoleScope @default(account)
  createdBy         String?  @map("created_by") @db.Uuid
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  businessAccount BusinessAccount? @relation(fields: [businessAccountId], references: [id], onDelete: Cascade)
  userRoles       UserRole[]

  @@unique([businessAccountId, name])
  @@index([isTemplate, scope])
  @@map("roles")
}

enum RoleScope { account vendor brand admin delivery }

model UserRole {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  businessAccountId String   @map("business_account_id") @db.Uuid
  outletId          String?  @map("outlet_id") @db.Uuid   // null = all outlets
  roleId            String   @map("role_id") @db.Uuid
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz

  user            User            @relation("UserRoles", fields: [userId], references: [id], onDelete: Cascade)
  businessAccount BusinessAccount @relation(fields: [businessAccountId], references: [id], onDelete: Cascade)
  outlet          Outlet?         @relation(fields: [outletId], references: [id], onDelete: Cascade)
  role            Role            @relation(fields: [roleId], references: [id], onDelete: Restrict)

  @@unique([userId, businessAccountId, outletId, roleId])
  @@index([userId])
  @@index([businessAccountId])
  @@map("user_roles")
}
```

### 3.2 Modified entities

- **User**: add `hcidDisplay String? @unique` and the new back-relations (`accountMemberships`, `accountInvites`, `userRoles`). Keep existing `role` enum during transition.
- **Vendor**: add `businessAccountId String @unique`. Keep `userId` during the transition window.
- **Brand**: same — `businessAccountId String @unique`.
- **Cart**: add `businessAccountId String` + `outletId String`, change `@@unique([userId])` → `@@unique([userId, businessAccountId, outletId])`.
- **Order**: add `businessAccountId String`, `outletId String`, `deliveryAddressSnapshot Json` (full snapshotted address at order time).
- **QuickOrderList**: add `businessAccountId String`. Scope effectively becomes `(businessAccountId, vendorId)`. Keep original `userId` as `createdById` audit metadata.
- **CustomerVendor**: add `businessAccountId String`. Drop `@@unique([userId, vendorId])`, replace with `@@unique([businessAccountId, vendorId])`.
- **SavedAddress**: add nullable `outletId String?` FK. Legacy table preserved; new code uses Outlet.
- **CreditAccount**, **Wallet**: **NOT TOUCHED** in V2.2. Add TODO comments referencing V2.3 ticket T-101.

### 3.3 Deleted entities

- **LinkedAccount** — fully replaced by `BusinessAccountMember`.

---

## 4. Migration Plan

The migration is split into three discrete steps to avoid NOT-NULL races on populated tables. Committed at `prisma/migrations/<timestamp>_hcid_architecture/`.

### Step A — additive schema (`migration.sql`, part 1)

1. Create all new tables: `business_accounts`, `business_account_members`, `outlets`, `roles`, `user_roles`.
2. Add new enums: `BusinessAccountStatus`, `RoleScope`.
3. Add new columns as **NULLABLE**:
   - `User.hcid_display`
   - `Vendor.business_account_id`, `Brand.business_account_id`
   - `Cart.business_account_id`, `Cart.outlet_id`
   - `Order.business_account_id`, `Order.outlet_id`, `Order.delivery_address_snapshot`
   - `QuickOrderList.business_account_id`
   - `CustomerVendor.business_account_id`
   - `SavedAddress.outlet_id`

### Step B — data backfill (`data_migrate.ts`)

Node script, runnable via `npx ts-node prisma/migrations/<ts>_hcid_architecture/data_migrate.ts`. Idempotent (safe to re-run on partial failure).

1. **Backfill `User.hcidDisplay`** for every user: `HC-{base32(crypto.randomBytes(5))}`, collision-checked.
2. **For every Vendor row**:
   - INSERT BusinessAccount `{legalName: vendor.businessName, gstin: vendor.gstNumber, isCustomer: true, isVendor: true}`.
   - INSERT primary Outlet from `vendor.addressLine/city/state/addressPincode` (lat/lng nullable if missing, flag `requiresAddressUpdate`).
   - Set `BusinessAccount.primaryOutletId`.
   - INSERT BusinessAccountMember linking `vendor.userId` ↔ new account as `isPrimary: true`.
   - Set `Vendor.businessAccountId`.
   - INSERT UserRole assigning owner the seeded "Vendor Admin" role template.
3. **For every Brand row**: same shape with `isBrand: true`, `isCustomer: false`. Synthetic "Brand HQ" outlet with NULL lat/lng + `requiresAddressUpdate: true`.
4. **For every User with role=customer and no membership**: create personal BusinessAccount + primary Outlet from their default SavedAddress (placeholder outlet if none, flagged).
5. **For every VendorTeamMember / BrandTeamMember**: convert to BusinessAccountMember + UserRole (TeamRole → seeded role mapping: owner→Owner template, manager→Manager template, etc.).
6. **For every SavedAddress**: create one Outlet per address under the owning account, set `SavedAddress.outletId`.
7. **For every Order**: stamp `businessAccountId` from `Order.userId → primary BusinessAccountMember`, stamp `outletId` from primary outlet (or synthetic "Legacy" outlet if ambiguous), snapshot delivery address from the user's matching SavedAddress.
8. **For every Cart**: stamp `businessAccountId`, `outletId` from owner's primary.
9. **For every QuickOrderList / CustomerVendor**: stamp `businessAccountId`.
10. **Seed system role templates** (insert into `Role` with `businessAccountId = NULL`, `isTemplate = true`):
    - **Customer scope**: Owner, Procurement Manager, Store Manager, Chef, Accountant, Viewer
    - **Vendor scope**: Vendor Admin, Sales Rep, Order Manager, Warehouse Manager, Finance Executive
    - **Brand scope**: Brand Admin, Brand Manager, Marketing Executive
    - **Admin scope**: Super Admin, Ops Admin, Finance Admin, Support Agent

### Step C — enforce constraints + drop legacy (`migration.sql`, part 2)

1. `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` for every new tenant column.
2. Add composite unique on `Cart`: `(user_id, business_account_id, outlet_id)`.
3. Add FKs and indexes on all new columns.
4. Drop the existing `Cart.@@unique([userId])` constraint.
5. Drop the `CustomerVendor.@@unique([userId, vendorId])` constraint, replace with `(businessAccountId, vendorId)`.
6. Drop the `LinkedAccount` table.

### Pre-deploy

`pg_dump -Fc -d horeca1 -f /opt/horeca1/backups/pre-hcid-$(date +%s).dump` committed into the deploy script. Tested restore on a local copy.

---

## 5. Permission Engine

### 5.1 Registry — [`src/lib/permissions/registry.ts`](../src/lib/permissions/registry.ts) (NEW)

```ts
export const MODULES = {
  dashboard:     ['view'],
  products:      ['view', 'create', 'edit', 'delete', 'approve'],
  brandStore:    ['view', 'edit'],
  orders:        ['view', 'create', 'edit', 'delete', 'approve'],
  repeatOrders:  ['view', 'create', 'edit'],
  inventory:     ['view', 'create', 'edit', 'delete'],
  grn:           ['view', 'create', 'edit'],
  dispatch:      ['view', 'create', 'edit'],
  deliveries:    ['view', 'edit', 'approve'],
  payments:      ['view', 'create', 'approve'],
  creditLine:    ['view', 'approve'],
  customers:     ['view', 'create', 'edit', 'delete'],
  vendors:       ['view', 'create', 'edit', 'delete', 'approve'],
  brands:        ['view', 'create', 'edit', 'delete', 'approve'],
  users:         ['view', 'create', 'edit', 'delete'],
  outlets:       ['view', 'create', 'edit', 'delete'],
  analytics:     ['view'],
  promotions:    ['view', 'create', 'edit', 'delete'],
  support:       ['view', 'edit'],
  logistics:     ['view', 'edit'],
  auditLogs:     ['view'],
  settings:      ['view', 'edit'],
} as const;

export type Module = keyof typeof MODULES;
export type Action = typeof MODULES[Module][number];
export type PermissionKey = `${Module}.${Action}`;
```

### 5.2 Engine — [`src/lib/permissions/engine.ts`](../src/lib/permissions/engine.ts) (NEW)

Replaces [`src/lib/teamPermissions.ts`](../src/lib/teamPermissions.ts).

```ts
flatten(permissions: PermissionsJson): Set<PermissionKey>
hasPermission(session, key: PermissionKey): boolean
requirePermission(key: PermissionKey)(handler)
requireAnyPermission(...keys: PermissionKey[])(handler)
mergePermissions(...sets: Set<PermissionKey>[]): Set<PermissionKey>  // UNION
```

A UserRole row applies if `userId = current AND businessAccountId = active AND (outletId IS NULL OR outletId = activeOutletId)`. Permissions are union-merged across applicable rows. Locked-in design choice — roles only grant, never restrict.

### 5.3 Middleware — [`src/middleware/rbac.ts`](../src/middleware/rbac.ts)

Rewrite around `requirePermission(key)`. Keep `withAuth` signature. During the cutover, every route file has its `vendorOnly`/`brandOnly`/`adminOnly` wrapper replaced with the appropriate `requirePermission` key.

---

## 6. Auth & Session Refactor

### 6.1 JWT payload (in [`src/auth.ts`](../src/auth.ts))

```ts
{
  id: user.id,                              // HCID
  hcidDisplay: user.hcidDisplay,
  role: user.role,                          // back-compat only
  activeBusinessAccountId: string,
  activeBusinessAccountType: { isCustomer, isVendor, isBrand },
  activeOutletId: string,                   // required
  permissions: PermissionKey[],             // flattened union for active context
  availableAccounts: { id, displayName, isVendor, isBrand }[],  // capped at 20
  availableAccountsTruncated: boolean,
  totalAccountCount: number,
}
```

20-account cap rationale: cookie size (~4KB max), 20 × ~80 bytes = 1.6 KB. Switcher UI shows "Showing 20 of N" with link to `/account` for the full list via API.

### 6.2 Login & switching

- OTP / credentials → JWT created with `activeBusinessAccountId` defaulting to the primary membership and `activeOutletId` to the account's `primaryOutletId`.
- If user has >1 membership: post-login Account Selector modal appears once; choosing rotates JWT via `POST /api/v1/auth/switch-business-account`.
- If user has >1 outlet: Outlet Switcher available in the navbar; calls `POST /api/v1/auth/switch-outlet`.
- On `jwt` callback refresh (24h `updateAge`), permissions are re-loaded so role edits propagate.

### 6.3 Helper rename map

| Removed | Added | Path |
|---------|-------|------|
| `resolveVendorId.ts` | `resolveBusinessAccountContext.ts` | [src/lib/](../src/lib/) |
| `resolveBrandId.ts` | merged into above | — |
| `teamPermissions.ts` | `permissions/engine.ts` | [src/lib/](../src/lib/) |
| `useAccountSwitcher.ts` | `useBusinessAccountSwitcher.ts` | [src/hooks/](../src/hooks/) |
| — | `resolveOutletContext` | [src/lib/](../src/lib/) |

---

## 7. Tenant Scope Refactor (~93 query sites)

Every `where: { vendorId }` / `where: { brandId }` becomes `where: { businessAccountId }`, with `outletId` added where outlet-relevant.

### 7.1 Service layer (24 sites)

| File | Sites |
|------|-------|
| [src/modules/vendor/vendor.service.ts](../src/modules/vendor/vendor.service.ts) | 2 |
| [src/modules/catalog/catalog.service.ts](../src/modules/catalog/catalog.service.ts) | 4 |
| [src/modules/order/order.service.ts](../src/modules/order/order.service.ts) | 2 (rename `listByVendor` → `listByBusinessAccount`) |
| [src/modules/credit/credit.service.ts](../src/modules/credit/credit.service.ts) | 3 (kept on userId+vendorId; TODO for V2.3) |
| [src/modules/brand/brand.service.ts](../src/modules/brand/brand.service.ts) | 8 |
| [src/modules/cart/cart.service.ts](../src/modules/cart/cart.service.ts) | 3 (re-key cart) |
| [src/modules/list/list.service.ts](../src/modules/list/list.service.ts) | 2 |

### 7.2 API routes (69 sites across 30 files)

Top hits:

| File | Sites |
|------|-------|
| [src/app/api/v1/vendor/dashboard/route.ts](../src/app/api/v1/vendor/dashboard/route.ts) | 5 |
| [src/app/api/v1/vendor/settings/route.ts](../src/app/api/v1/vendor/settings/route.ts) | 3 |
| [src/app/api/v1/vendor/products/route.ts](../src/app/api/v1/vendor/products/route.ts) | 2 |
| [src/app/api/v1/vendor/orders/route.ts](../src/app/api/v1/vendor/orders/route.ts) | 1 |
| … 26 more files | |

**Process**: run `grep -rn "vendorId\|brandId" src/app/api/v1/ src/modules/` against the working branch; checklist every hit; tick off as refactored.

**CI guard** (added to lint step): `grep -r "where: { vendorId" src/` outside allowlisted files MUST return zero — catches anyone using the old pattern.

---

## 8. API Surface

### 8.1 New routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/account` | List user's accounts |
| POST | `/api/v1/account` | Create new account (also creates BusinessAccountMember + primary Outlet) |
| GET/PATCH/DELETE | `/api/v1/account/[id]` | Account CRUD |
| GET/POST | `/api/v1/account/[id]/outlets` | List/create outlets |
| PATCH/DELETE | `/api/v1/account/[id]/outlets/[outletId]` | Outlet update/delete |
| GET/POST | `/api/v1/account/[id]/roles` | List/create roles (GET supports `?templates=true`) |
| PATCH/DELETE | `/api/v1/account/[id]/roles/[roleId]` | Role update/delete |
| GET/POST | `/api/v1/account/[id]/users` | List members / invite |
| PATCH/DELETE | `/api/v1/account/[id]/users/[userId]` | Update UserRole assignments / remove |
| POST | `/api/v1/auth/switch-business-account` | Rotates JWT |
| POST | `/api/v1/auth/switch-outlet` | Rotates JWT |
| GET | `/api/v1/permissions/registry` | Module/action registry for matrix UI |

### 8.2 Removed routes

- `/api/v1/auth/link-account/route.ts`
- `/api/v1/auth/linked-accounts/route.ts`
- `/api/v1/auth/switch-account/route.ts` (replaced by switch-business-account)

---

## 9. UI Work

### 9.1 Account & Outlet Switcher

Replaces [src/components/account-switcher/AccountSwitcherDropdown.tsx](../src/components/account-switcher/AccountSwitcherDropdown.tsx). Two distinct controls per client spec:

- **[ Switch Account ]** — account list (capped at 20 from JWT, "Showing 20 of N" if truncated, "View all accounts" → `/account` page).
- **[ Select Delivery Address / Outlet ]** — popup listing outlets in active account. Outlets with `requiresAddressUpdate` show a "Address needed" chip; selection routes through address-completion modal.

Hook: rename [src/hooks/useAccountSwitcher.ts](../src/hooks/useAccountSwitcher.ts) → `useBusinessAccountSwitcher.ts`. Cart context auto-refreshes on switch (cart is per `(account, outlet)`).

### 9.2 Account management pages — `src/app/account/[id]/` (NEW)

- `page.tsx` — overview (legal name, GST, business type, outlets summary)
- `outlets/page.tsx` — outlet list + create/edit/delete
- `users/page.tsx` — member list + invite + per-outlet role assignment
- `roles/page.tsx` — **permission matrix editor**:
  - Header row: View | Create | Edit | Delete | Approve
  - Rows: modules from `MODULES` registry
  - Cells: checkboxes toggling `permissions[module][action]`
  - "Duplicate from template" dropdown + "Save as new role"

Reuse patterns from [src/app/admin/team/](../src/app/admin/team/) and [src/app/vendor/(dashboard)/settings/team/](../src/app/vendor/) — both have list+invite+role-assign UI we can model on.

### 9.3 Checkout (no in-checkout outlet picker)

Modify [src/app/checkout/page.tsx](../src/app/checkout/page.tsx):

- Read outlet from `session.activeOutletId`. No additional picker step.
- On order submit, snapshot the outlet address into `Order.deliveryAddressSnapshot`.
- If an outlet's pincode isn't served by some vendor in cart, flag those items inline with "Switch outlet to checkout these items" CTA opening the OutletSwitcher.
- Vendor stores filter by `session.activeOutletId.pincode` against `ServiceArea` — moves into `resolveOutletContext` so every storefront read is auto-gated.

### 9.4 Post-login Account Selector

New: [src/components/auth/PostLoginAccountSelector.tsx](../src/components/auth/) — modal shown once after login if `availableAccounts.length > 1`.

---

## 10. Critical Files Cheat Sheet

| Action | Path |
|--------|------|
| Modify | [prisma/schema.prisma](../prisma/schema.prisma) |
| Add | `prisma/migrations/<ts>_hcid_architecture/migration.sql` |
| Add | `prisma/migrations/<ts>_hcid_architecture/data_migrate.ts` |
| Modify | [src/auth.ts](../src/auth.ts) |
| Delete | [src/lib/resolveVendorId.ts](../src/lib/resolveVendorId.ts) |
| Delete | [src/lib/resolveBrandId.ts](../src/lib/resolveBrandId.ts) |
| Add | `src/lib/resolveBusinessAccountContext.ts` |
| Add | `src/lib/resolveOutletContext.ts` |
| Delete | [src/lib/teamPermissions.ts](../src/lib/teamPermissions.ts) |
| Add | `src/lib/permissions/registry.ts` |
| Add | `src/lib/permissions/engine.ts` |
| Modify | [src/middleware/rbac.ts](../src/middleware/rbac.ts) |
| Modify | [src/components/account-switcher/AccountSwitcherDropdown.tsx](../src/components/account-switcher/AccountSwitcherDropdown.tsx) |
| Rename + modify | [src/hooks/useAccountSwitcher.ts](../src/hooks/useAccountSwitcher.ts) → `useBusinessAccountSwitcher.ts` |
| Modify | [src/types/index.ts](../src/types/index.ts) (add BusinessAccount, Outlet, Role, UserRole, PermissionKey) |
| Modify | [src/context/AddressContext.tsx](../src/context/AddressContext.tsx) (refactor → OutletContext) |
| Modify | [src/app/checkout/page.tsx](../src/app/checkout/page.tsx) |
| Add | `src/app/account/[id]/page.tsx` + 3 nested pages |
| Add | 8 new API route files under `src/app/api/v1/account/` |
| Add | `src/app/api/v1/auth/switch-business-account/route.ts` |
| Add | `src/app/api/v1/auth/switch-outlet/route.ts` |
| Add | `src/app/api/v1/permissions/registry/route.ts` |
| Modify | ~30 files under `src/app/api/v1/` (tenant scope) |
| Modify | ~7 files under `src/modules/` (tenant scope) |

---

## 11. Existing Utilities to Reuse

- **OTP/credentials providers** in [src/auth.ts](../src/auth.ts) — keep verbatim; only `jwt`/`session` callbacks change.
- **Switch-token rotation idiom** from current LinkedAccount flow — reuse one-time-token pattern for `switch-business-account`.
- **Audit log** ([src/lib/auditLog.ts](../src/lib/auditLog.ts)) — fire-and-forget for every role change, member add, outlet edit. Add new `AUDIT_ACTIONS` constants.
- **Rate limiter** ([src/lib/rateLimit.ts](../src/lib/rateLimit.ts)) — apply to switch endpoints (3/min) and role-edit endpoints.
- **withAuth wrapper** ([src/middleware/auth.ts](../src/middleware/auth.ts)) — signature unchanged.

---

## 12. Cross-Doc Reconciliation: Brand Store

- Brand identity = BusinessAccount with `isBrand = true` + 1:1 Brand extension. Brand login provisions both in one step.
- Existing tables [BrandMasterProduct](../prisma/schema.prisma) and [BrandProductMapping](../prisma/schema.prisma) stay; they get `businessAccountId` denormalized via the Brand relation.
- Brand teams use the same Role + UserRole engine. Seeded templates: Brand Admin, Brand Manager, Marketing Executive.
- Brand "Brand HQ" outlet has NULL coords + `requiresAddressUpdate: true`. Brand-scope routes never read `outletId` for business logic.
- V2.3-deferred: distributor invite UI, brand catalog editor, mapping suggestion engine. Schema is V2.2-ready.

---

## 13. Verification

1. **Backup**: `pg_dump -Fc` of prod DB to `/opt/horeca1/backups/`; verify restore on local copy.
2. **Local migration smoke**: restore prod dump locally, run migration + `data_migrate.ts`. Verify row counts:
   - `SELECT COUNT(*) FROM business_accounts;` ≥ count(distinct user) of (vendors + brands + customers with addresses)
   - `SELECT COUNT(*) FROM outlets;` ≥ count(SavedAddress) + 1 per vendor + 1 per brand
   - `SELECT COUNT(*) FROM user_roles;` ≥ count(VendorTeamMember + BrandTeamMember + 1 owner per account)
   - `SELECT COUNT(*) FROM orders WHERE business_account_id IS NULL;` = 0
3. **Type + lint gates**: `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors).
4. **Multi-account login**: seed a user belonging to 2 BusinessAccounts. Log in via OTP → Account Selector modal → switch → verify cart/orders refresh.
5. **Outlet-aware checkout**: customer with 2 outlets adds items → checkout → places order. Verify `Order.outletId` and `Order.deliveryAddressSnapshot` stamped.
6. **RBAC matrix**: create a custom role with only `orders.view`. Assign to test user. Verify GET 200, PATCH 403. Verify UI hides Edit buttons.
6a. **Migration role mapping (CRITICAL — most likely silent failure)**:
   - Pre-migration: snapshot every `VendorTeamMember` + `BrandTeamMember` row.
   - Post-migration: for each snapshot, assert correct `UserRole` exists.
   - Log in as one user from each TeamRole tier (owner/manager/editor/viewer) for both vendor and brand contexts. Execute one read + one write per tier. Owner/manager/editor write; viewer 403.
6b. **Permission merge unit test**:
   - Seed user with Owner (account-wide) + Cashier (outlet Powai, orders.view only) UserRole rows.
   - Switch active outlet to Powai. Assert `session.permissions` contains `orders.delete` (Owner wins via union).
   - Switch to BKC. Assert same.
7. **Tenant isolation regression**:
   - User in Account A tries to GET an order from Account B by ID → 403.
   - Repeat for products, outlets, members, roles.
8. **Switcher UX**:
   - Two distinct controls visible.
   - "Showing 20 of N" appears when user has >20 accounts.
9. **Legacy compat sanity**: existing vendor logs in (single account post-migration) → vendor dashboard exactly as before. Existing customer → outlet auto-picked from default SavedAddress.
10. **Audit log**: every role create/edit/delete + member invite + outlet create appears in `audit_logs`.
11. **Deploy**: backup → `ssh root@64.227.187.210 "bash /opt/horeca1/deploy.sh"` → health-check → rollback runbook ready (`pg_restore` + `git revert` + redeploy).

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Big-bang on prod, no test suite | `pg_dump` before deploy + tested rollback runbook + 11-step verification checklist |
| 93 tenant query sites → easy to miss one → cross-tenant leak | CI grep gate: `grep -r "where: { vendorId" src/` outside allowlist returns zero |
| Session shape change forces re-login | Acceptable; communicated in release notes; 7-day JWT bounds impact |
| Migration data quality (missing lat/lng) | `requiresAddressUpdate: true` flag prompts user on first login; service-area helpers short-circuit on NULL coords |
| `CreditAccount` stays `userId+vendorId` | TODO + regression test that credit still works post-migration; V2.3 ticket T-101 |
| Permission map cached in JWT goes stale | Role edits bump account `updatedAt`; JWT `updateAge: 24h` refreshes within a day; `/api/v1/auth/refresh-session` for instant refresh |
| Brand entity semantics differ from Customer/Vendor | Synthetic "Brand HQ" outlet, NULL coords, never used for delivery math |
| Admin team out of unified RBAC | AdminTeamMember kept; permission storage moves to same JSON engine for consistency |
| Outlet `(0,0)` lat/lng poisoning service-area math | Coords nullable; every distance helper guards on NULL or `requiresAddressUpdate` |
| User with >20 BusinessAccounts | JWT cap; switcher "Showing 20 of N" + `/account` full-list page |
| Cart swaps invisibly on outlet switch | Confirmation toast: "Switched to {Outlet}. Your cart for this outlet is loaded." |
| Migration adds NOT NULL to live tables | Three-step add-nullable → backfill → ALTER NOT NULL pattern enforced for every column |

---

## 15. Deferred (V2.3+ tickets)

- **T-101**: BusinessAccount-level credit (refactor CreditAccount; outlet sub-limits).
- **T-102**: Delivery Executive Module (assigned deliveries, POD upload, route view).
- **T-103**: Enterprise procurement (multi-level approvals, group exposure, parent-child accounts).
- **T-104**: Conditional permissions (e.g. "edit orders < ₹50k") — backend rules engine.
- **T-105**: Human-readable HCID rebranding pass (display HC-XXXX-XXXX prominently).
- **T-106**: "Pay selected POs" (new `placed_unpaid` state + reconciliation).
- **T-107**: Brand Store Phase 2 (distributor invite UI, catalog editor, mapping suggestion engine).
- **T-108**: Guest cart + login merge (merge target = active `(businessAccountId, outletId)`).
- **T-109**: Migrate the 49 vendor/brand/admin routes that still call `resolveVendorContext` / `resolveBrandContext` / `requireVendorPerm` to the new `resolveBusinessAccountContext` + `requirePermission(key)` middleware. Legacy resolvers (`resolveVendorId.ts`, `resolveBrandId.ts`, `teamPermissions.ts`) are retained as compat shims in V2.2 so the routes keep working unchanged; deleting them in V2.3 forces the migration. ~3 days of mechanical work; high regression risk, do it in dedicated focused PRs grouped by service area (vendor → brand → admin).

---

## 16. Implementation Order

> First commit creates this file and the [client report](./multi-account-rbac-client-report.md). Stop and get sign-off on the docs before any code touches schema or runtime.

1. Schema changes + Prisma migration generation (Step A: additive nullable).
2. Data migration script + local test on prod dump (Step B: backfill).
3. Schema migration Step C: enforce NOT NULL + drop legacy.
4. Permissions registry + engine + middleware.
5. Auth.ts JWT/session refactor.
6. resolveBusinessAccountContext + delete old resolvers.
7. Refactor every tenant query site (modules first, then API routes).
8. New API routes for accounts/outlets/roles/users.
9. UI: switcher, account pages, permission matrix, outlet-aware checkout.
10. Delete LinkedAccount table + old switch-account routes.
11. Type check + lint + verification checklist.
12. Update change-footprint numbers in the client report from the final diff.
13. Backup prod, deploy, verify on production, monitor for 24h.
