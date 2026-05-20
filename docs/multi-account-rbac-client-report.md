# HoReCa Hub — Multi-Account Access & RBAC: V2.2 Plan Report

> **Audience**: Client / business stakeholder. Plain language summary of what's being built, why, and what changes.
> **Companion**: [`multi-account-rbac-implementation-plan.md`](./multi-account-rbac-implementation-plan.md) (engineering team).
>
> **Date prepared**: 2026-05-20 — Status: Pre-implementation, scope approved.

---

## 1. What You Asked For

Your specification (the **"Multi-Account Customer Access Architecture & RBAC"** document) laid out a clear vision for HoReCa Hub V2.2:

- Move from **"1 login = 1 business"** to **"1 identity (HCID) = many businesses"** — similar to how netbanking, Slack, or Zoho lets one human access multiple organizations.
- Recognise that a **business is not the same as an address**. A restaurant chain like "Chrome Hospitality" can have multiple outlets ("Eve Powai", "Eve Worli", "Lyla") — and these are children of the business, not separate businesses.
- Treat every **vendor as automatically also a customer**. No more parallel ecosystems where the same person needs two logins.
- Replace the current four-tier role system with a real **Role-Based Access Control (RBAC) matrix** — a grid of Modules × Actions (View, Create, Edit, Delete, Approve) — that admins can edit visually.
- Support **predefined role templates** for common roles (Owner, Procurement Manager, Vendor Admin, Brand Manager, etc.) plus the ability to **duplicate and customise** them.
- Build it in a way that **doesn't need restructuring later** for enterprise procurement, BNPL/credit, multi-branch operations, or franchise workflows.

---

## 2. Our Interpretation & Confirmed Decisions

Before the engineering plan was finalised, we confirmed eight decisions with you. They are now locked in:

### Foundation decisions

| # | Decision | What we chose |
|---|----------|---------------|
| 1 | **Delivery shape** | One large release containing the full refactor (vs. phased) |
| 2 | **Outlet ↔ address relationship** | Each Outlet owns its own physical address |
| 3 | **Migration of existing data** | Auto-provision a Business Account for every existing vendor, brand, and customer — nobody re-registers |
| 4 | **Scope** | Core HCID + Business Account + Outlet + RBAC matrix. Delivery module and credit refactor deferred to V2.3 |

### Behavioural decisions

| # | Decision | What we chose |
|---|----------|---------------|
| 5 | **When user picks the active outlet** | Once per session, like the active account — vendor browsing, cart, and checkout all use it automatically. No extra picker at checkout. |
| 6 | **Quick Order List scope** | Belongs to a Business Account, tied to a specific vendor — usable by anyone in the account |
| 7 | **"Pay selected POs" feature** | Deferred to V2.3 (it requires a new payment flow that's a project on its own) |
| 8 | **Permission merge rule** | If a user has two roles in one account, permissions add up (Owner + Cashier-at-Powai = Owner permissions everywhere). Roles only grant access — never restrict it. |

---

## 3. What's Being Built in V2.2

In plain language, here's what changes for users:

### For everyone
- **One login, many businesses.** A single phone/email lets you access every business account you belong to.
- **Two switchers in the top bar**:
  - **Switch Account** — pick which business you're currently working in.
  - **Switch Outlet** — pick which branch/outlet of that business you're operating from.
- **Each outlet has its own cart.** Switching outlets loads the cart for that outlet; nothing is lost.
- **HCID identifier** — every user gets a friendly identifier like `HC-A4F2-9X3K` shown on their profile.

### For business owners (customers, vendors, brands)
- A new **Account Management** section under `/account/[id]`:
  - **Overview**: legal name, GST, business type, outlets summary.
  - **Outlets**: create, edit, delete branches of your business.
  - **Users**: invite team members, assign them roles per outlet.
  - **Roles**: a **permission matrix** UI — rows are modules (Orders, Inventory, Payments, etc.), columns are actions (View, Create, Edit, Delete, Approve). Check the boxes to define what a role can do. Save. Done.
- **Predefined role templates** ready to use:
  - Customer-side: Owner, Procurement Manager, Store Manager, Chef, Accountant, Viewer
  - Vendor-side: Vendor Admin, Sales Rep, Order Manager, Warehouse Manager, Finance Executive
  - Brand-side: Brand Admin, Brand Manager, Marketing Executive
  - Horeca1 internal: Super Admin, Ops Admin, Finance Admin, Support Agent
- **Custom roles**: duplicate any template → rename → edit permissions → save. You build your own org chart.

### For vendors specifically
- Vendor is now a kind of Business Account — same model, same RBAC. A vendor with a Mumbai Warehouse and a Pune Warehouse can model them as two Outlets and switch between them.
- Every vendor is also automatically marked as a customer (so vendors can buy from each other if they want, without a second login).

### For brands
- Brand entities use the same Business Account foundation, with brand-specific catalog tables on top.
- Brand teams use the same RBAC system as everyone else (consistent UX across the platform).

### For checkout
- The vendor stores you see are filtered by your active outlet's pincode (no more separate pincode modal).
- Checkout uses your active outlet directly. The delivery address is **snapshotted** onto the order at submit time, so changing an outlet's address later doesn't affect historical orders.
- If your cart has items from a vendor that doesn't serve your active outlet, you'll see an inline prompt to switch outlet rather than a silent failure.

---

## 4. What's Deferred to V2.3+

These items are in the original spec but were too large to fit in V2.2. They get their own focused releases later:

| Deferred item | Why it's not in V2.2 |
|---------------|---------------------|
| **Delivery Executive Module** (assigned deliveries, POD upload, route view) | A self-contained feature; better as a focused release with its own UX research |
| **Business-Account-level Credit / BNPL** (parent limits + outlet sub-limits) | Requires reworking the credit reconciliation logic; high regression risk if bundled with the identity refactor |
| **Enterprise procurement** (multi-level approvals, parent-child accounts, group exposure) | Needs more requirements gathering with target enterprise customers |
| **"Pay selected POs"** (cart checkbox for partial payment) | Adds a new order state and payment flow — a separate project |
| **Brand Store Phase 2** (distributor invite UI, catalog editor, mapping engine) | Schema is V2.2-ready; UI features are a separate build |
| **Conditional permissions** ("edit orders under ₹50k") | Belongs in business logic, not the permission system |
| **Department / nested permissions** | Not needed for V2.2; would slow this release |

---

## 5. Change Footprint — By the Numbers

| Area | Change |
|------|--------|
| **Database — new tables** | 5 (`business_accounts`, `business_account_members`, `outlets`, `roles`, `user_roles`) |
| **Database — modified tables** | 9 (`User`, `Vendor`, `Brand`, `Cart`, `Order`, `QuickOrderList`, `CustomerVendor`, `SavedAddress`, plus dropped unique constraints) |
| **Database — deleted tables** | 1 (`LinkedAccount` — replaced by the new membership model) |
| **Database — new columns** | ~17 across existing tables |
| **Database — new enums** | 2 (`BusinessAccountStatus`, `RoleScope`) |
| **Migrations** | 1 schema migration (split into 3 SQL steps) + 1 one-time data backfill script |
| **Backend — API routes modified** | ~30 files (tenant scoping refactor) |
| **Backend — API routes added** | ~12 new route files (account/outlet/role/user/permission management) |
| **Backend — API routes removed** | 3 (old link-account / linked-accounts / switch-account) |
| **Backend — service files refactored** | ~7 modules (`vendor`, `catalog`, `order`, `cart`, `brand`, `list`, `credit`) |
| **Backend — new helper files** | 4 (permissions registry, permissions engine, account resolver, outlet resolver) |
| **Backend — deleted/replaced helpers** | 3 (`resolveVendorId`, `resolveBrandId`, `teamPermissions`) |
| **Frontend — new pages** | ~6 under `/account/[id]/` (overview, outlets, users, roles) |
| **Frontend — modified pages** | Checkout, vendor stores, navbar |
| **Frontend — components rewritten** | Account switcher (now Account + Outlet) |
| **Total estimated files touched** | **~130 modified, ~25 new** (exact counts populated when the PR is opened) |

> The exact numbers will be re-counted from the final diff and pasted in before this report is shared with you for final sign-off.

---

## 6. Migration & Rollout

The migration is designed so **no existing user has to do anything**. On the morning the release ships:

- Every existing **vendor** automatically becomes a Business Account (with `is_vendor: true, is_customer: true`). The vendor's stored address becomes their primary Outlet.
- Every existing **brand** automatically becomes a Business Account (with `is_brand: true`) plus a synthetic "Brand HQ" outlet (the brand owner is prompted on next login to add a real address, but nothing breaks if they don't).
- Every existing **customer** with at least one saved address gets a Business Account whose primary Outlet is their default saved address. Customers without a saved address get a placeholder outlet they're prompted to complete.
- Every existing **team member** (vendor staff, brand staff) gets a User Role assignment with permissions equivalent to their current role (owner/manager/editor/viewer all map cleanly to seeded templates).
- Every existing **order** is stamped with the right Business Account and Outlet (best-effort; ambiguous cases go to a "Legacy" outlet under the customer's account).

Users will likely be **logged out once** on the release day because the session payload changes — they sign back in normally and continue. This is communicated in advance.

---

## 7. Risks & How We're Handling Them

| Risk (client-relevant) | Mitigation |
|----------------------|-----------|
| **Production cutover** — single release touching identity, tenancy, and RBAC at once | Full database backup (`pg_dump`) before deploy; tested rollback procedure; 11-step verification checklist before declaring success |
| **All users re-login once on release day** | Communicated in advance via in-app banner; 7-day JWT means impact is bounded; no data loss, just a re-auth |
| **Some outlets have missing GPS coordinates** (legacy customers without complete address) | Outlets are flagged `requires_address_update`; user is prompted to complete on first login; service-area checks safely skip incomplete outlets rather than producing wrong results |
| **Old role → new role mapping could miss permissions** (the most likely silent failure) | Dedicated verification step: log in as one user from each old role tier and confirm they have the correct access end-to-end before declaring the migration done |
| **No automated test suite for the platform** | Eleven-step manual verification checklist, including a regression pass for tenant isolation; rollback procedure ready if anything fails post-deploy |

---

## 8. Timeline Estimate

Roughly **13 engineering days** for the full V2.2 pass. This is a single engineer's working time and assumes no major requirements changes mid-flight:

| Phase | Duration |
|-------|----------|
| Schema design + Prisma migration drafts | ~2 days |
| Data migration script + local test on production database copy | ~1 day |
| Permissions engine + middleware + registry | ~1 day |
| Auth / JWT / session refactor | ~1 day |
| Tenant scope refactor (~93 query sites across the codebase) | ~3 days |
| New API routes for accounts/outlets/roles/users | ~1 day |
| UI work: switcher, account pages, permission matrix, checkout | ~2 days |
| Cleanup (delete LinkedAccount, old routes) + type-check + lint | ~0.5 days |
| Manual verification + bug-fix | ~1.5 days |
| Production deploy + 24h monitoring | ~0.5 days |

Estimates are intentionally conservative because the platform has no automated test suite — manual verification adds real time. They're refined as work progresses.

---

## 9. Verification Approach

Before we declare V2.2 ready for production, we'll confirm all of the following work end-to-end:

1. A user with multiple business accounts can switch between them, and the cart, orders, and permissions all change accordingly.
2. A user with multiple outlets in one account can switch outlets, and their cart for each outlet is preserved separately.
3. An owner of a business account can create a custom role using the permission matrix, assign it to a team member, and the member sees only the modules they're allowed.
4. A vendor team member with the new "Manager" role has equivalent access to what they had as a "Manager" before the migration. (Critical regression check.)
5. A customer placing an order has the right outlet stamped on the order, and the delivery address is snapshotted (so editing the outlet later doesn't change historical orders).
6. A user in Account A cannot see or edit data belonging to Account B by guessing IDs. (Tenant isolation regression.)
7. The Account Switcher shows up to 20 accounts; users with more see a "View all accounts" link.
8. Existing single-account vendors and customers experience no behavioural change on first login post-migration (other than the one re-auth).
9. The audit log captures every role create/edit/delete, member invite, and outlet creation.
10. The deploy completes cleanly, the health check passes, and the rollback procedure has been dry-run on a copy.
11. Type-check and lint both pass with zero errors.

---

## 10. What We Need From You

Before we begin coding (Step 1 of the implementation order), please confirm:

1. **Sign off on this report** — anything missing, anything wrong, anything to add?
2. **Sign off on the deferred items** (Section 4) — confirm these are okay to push to V2.3, not V2.2.
3. **Confirm any specific role templates** beyond the standard set in Section 3 that you want pre-seeded for your specific customers.
4. **Confirm any specific outlets to pre-load** for existing chains (Chrome Hospitality's outlets, for example) — or leave the migration to auto-create them from existing addresses and let owners rename later.
5. **Confirm the timeline** is acceptable, or let us know if any V2.3-deferred item must move into V2.2.

Once we have your sign-off, engineering work begins immediately and you'll see PR progress within a few days.

---

## 11. Reference Documents

- The original specification you provided: **"Multi-Account Customer Access Architecture (HCID System) + Role Based Access (RBAC)"**.
- Companion engineering blueprint: [`multi-account-rbac-implementation-plan.md`](./multi-account-rbac-implementation-plan.md).
- Project context and tech stack: [`../CLAUDE.md`](../CLAUDE.md).
- Current product status and roadmap: [`../CLAUDE.md`](../CLAUDE.md) (Current Status section).
