# Admin Team — Align with the New Multi-Account RBAC System

> **Status**: Proposal. Awaiting sign-off before any code changes.
> Supersedes the cosmetic-only [admin-team-rbac-ui-sync-plan.md](admin-team-rbac-ui-sync-plan.md), which patched the legacy hook without addressing the real gap.

---

## 1. What you're seeing on `/admin/team`

The page renders fine for the seeded owner, but it does **not** look or behave like the team UI in the customer/vendor profile flow. It still uses the **legacy** RBAC stack, not the new one. The two stacks are listed below side-by-side so we can decide explicitly which behaviours the admin page should adopt.

| Concern | Legacy stack (today's `/admin/team`) | New stack (used in profile/customer/vendor) |
|---|---|---|
| Members table | [`AdminTeamMember`](../prisma/schema.prisma) — one row, one role | `BusinessAccountMember` + `UserRole[]` — many roles per user, per outlet |
| Role shape | Hardcoded enum `owner \| manager \| editor \| viewer` | `Role` row with JSON `permissions: { module: { action: bool } }` |
| Permission check | [`requireAdminPerm`](../src/lib/teamPermissions.ts) — fixed matrix | [`requirePermission('users.create')`](../src/lib/permissions/engine.ts) — registry-driven |
| Client hook | [`useAdminPermissions`](../src/hooks/useAdminPermissions.ts) returns booleans `canManageTeam` etc. | `session.permissions: PermissionKey[]` + `hasPermission(session, key)` |
| Invite UX | fullName + email + password + role enum (creates the user inline) | identifier (email *or* phone) + role-with-scope + optional outlet (invitee must already exist; self-serve sign-up is V2.3) |
| Row UX | one role select per row, trash button | multiple role chips (one per outlet), "Primary" badge, trash on non-primary |
| Backing routes | `/api/v1/admin/team` + `/api/v1/admin/team/[id]` | `/api/v1/account/[id]/users` + `/api/v1/account/[id]/roles` + `/api/v1/account/[id]/outlets` |
| Reference component | [src/app/admin/team/page.tsx](../src/app/admin/team/page.tsx) | [src/components/auth/TeamMembersOverlay.tsx](../src/components/auth/TeamMembersOverlay.tsx) |

The implementation plan ([multi-account-rbac-implementation-plan.md §2 row "Horeca1 admin team"](multi-account-rbac-implementation-plan.md)) commits to:

> Kept separate from BusinessAccount RBAC; **permission storage moves to the same JSON engine**.

So the agreed direction is: admin team **stays structurally separate** from `BusinessAccount` (Horeca1 staff aren't an account), but the **permission model and UI pattern unify** with the new engine. Today's page does neither — it's still on the hardcoded matrix and the old UI.

---

## 2. Three concrete options — pick one

### Option A — Minimum: just match the UI (no engine change)

Rebuild `/admin/team` to look and feel like [`TeamMembersOverlay.tsx`](../src/components/auth/TeamMembersOverlay.tsx), but keep the legacy `AdminTeamMember` table and `requireAdminPerm` middleware underneath.

- **Visible result**: same card layout, role chips, "Primary" badge, invite-by-identifier modal, role dropdown with scope label.
- **Underneath**: still 4 fixed roles, no outlet scoping (admin staff don't have outlets), no JSON permissions.
- **Effort**: ~1 day. Pure UI rewrite of [src/app/admin/team/page.tsx](../src/app/admin/team/page.tsx). No API change. No DB change.
- **Trade-off**: cosmetically consistent, but a future "create a custom admin role" or "give Amit only orders.approve" still won't work — we'd revisit Option B/C later.

### Option B — Right: admin uses the JSON permission engine, no BusinessAccount

Move admin staff onto the new `Role` table (with `scope = 'admin'`, `businessAccountId = NULL`) and the JSON permissions engine. Keep `AdminTeamMember` as the membership table (admin staff are not BusinessAccount members) but replace its `role` enum with a FK to `Role`. Admin routes switch from `requireAdminPerm('team:manage')` to `requirePermission('users.create')`.

- **Visible result**: same UI as Option A, **plus** a working "create custom admin role" / permission-matrix editor for admin, identical to the one being built for customer/vendor accounts under [src/app/account/[id]/roles](../src/app/account/[id]/roles).
- **Underneath**: admin permissions in JWT as `permissions: PermissionKey[]` — one engine codebase-wide.
- **Effort**: ~2–3 days.
  - Schema: `AdminTeamMember.roleId` (FK to Role) added; `role` enum kept for one release as a read-only fallback then dropped.
  - Seed: 4 system Admin Role templates (`scope='admin'`, no `businessAccountId`) — Super Admin / Ops Admin / Finance Admin / Support Agent. Mapping table from old enum.
  - Migration: backfill `AdminTeamMember.roleId` from the existing enum.
  - Auth: extend [src/auth.ts](../src/auth.ts) jwt callback so admin users get `permissions` flattened from their assigned Role (it already loads `adminTeamRole`; this swaps the source).
  - Middleware: every admin route swaps `adminOnly + requireAdminPerm('x:y')` → `adminOnly + requirePermission('x.y')`.
  - UI: rebuild [src/app/admin/team/page.tsx](../src/app/admin/team/page.tsx) on the new APIs.
  - Sidebar: link visibility flips from `perms.canManageTeam` to `hasPermission(session, 'users.create')`.
- **Trade-off**: real consistency. One engine, one mental model, future custom roles for free. Bigger change but bounded.

### Option C — Defer: do nothing, document the divergence

Leave `/admin/team` on the legacy stack until the V2.3 cleanup ticket T-109 ([multi-account-rbac-implementation-plan.md §15](multi-account-rbac-implementation-plan.md)) lands and migrates everything off `teamPermissions.ts` at once.

- **Visible result**: looks the same as today. Inconsistent with profile/customer/vendor UI.
- **Effort**: 0. Just stop touching it.
- **Trade-off**: the inconsistency you're flagging stays. The vendor/brand `/team` pages have the same gap and will all be fixed together later.

---

## 3. Recommendation

**Option B.** Option A buys cosmetic consistency for a day's work but leaves the same problem one engine refactor away — and we'd have to touch the same files again. Option C is honest but ignores the user-visible inconsistency you're flagging. Option B is the change the migration plan already commits to ("permission storage moves to the same JSON engine"); doing it now is just pulling that work forward from V2.3.

If you pick B, the same migration will be applied to vendor and brand `/team` pages in the same PR series, since they share the legacy stack — that's the only way the three portals end up looking and behaving the same.

---

## 4. What I need from you before writing code

1. **Pick A, B, or C.** (My vote: B.)
2. **If B**: confirm the seeded admin role templates (Super Admin / Ops Admin / Finance Admin / Support Agent) are the right four, and which permission keys each gets by default. I can draft the matrix and bring it back for review before any DB change.
3. **If B**: confirm scope. Do you want vendor `/team` and brand `/team` migrated in the same PR series, or admin-only first?
4. **If A**: confirm we accept that "custom admin role" won't be possible until the V2.3 cleanup.

No code will change until you reply on this doc.
