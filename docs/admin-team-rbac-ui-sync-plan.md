# Design & Implementation Plan: Admin Dashboard Team Tab RBAC UI Sync

This document follows the same pattern as [team-rbac-ui-sync-plan.md](team-rbac-ui-sync-plan.md), but targets the **Admin Panel** (`/admin/team`) rather than the Vendor and Brand portals.

---

## 1. The Problem (Root Cause)

The admin dashboard has three layered RBAC bugs that together cause the Team tab to render with full owner controls (Add Admin button, Add Admin Team Member form, per-row role select + remove buttons) for users who should NOT be able to manage the admin team.

### Bug 1 — `useAdminPermissions` defaults to `'owner'` on missing role

[src/hooks/useAdminPermissions.ts:27](src/hooks/useAdminPermissions.ts#L27)
```typescript
const raw = (session?.user as { adminTeamRole?: string } | undefined)?.adminTeamRole;
const role = (raw as AdminTeamRole) ?? 'owner';   // ← least-privilege violation
```

This means whenever `session.user.adminTeamRole` is `undefined` — which happens during the brief window before NextAuth hydrates the session client-side, or for any admin whose JWT was minted before the `adminTeamRole` field was added — the hook returns `canManageTeam: true`. The admin team page then renders its full owner UI for a few frames before the access-restricted view snaps in (or never snaps in if the JWT is permanently missing the field).

### Bug 2 — Sidebar "Team" link is always visible to every admin

[src/app/admin/layout.tsx:45](src/app/admin/layout.tsx#L45) lists the Team link unconditionally in `SIDEBAR_LINKS`. Managers, Editors, and Viewers all see the Team tab in the sidebar and can click it to land on the "Access restricted" page. This is correct from a security standpoint (server-side enforcement still blocks writes via `requireAdminPerm`) but it is **inconsistent with the new RBAC system** the Vendor and Brand portals follow — those portals hide controls the user cannot use rather than showing them and then bouncing.

### Bug 3 — Page-level guard and inner UI gates use two different signals

[src/app/admin/team/page.tsx](src/app/admin/team/page.tsx) gates the page itself by `canManage` (from `useAdminPermissions`) but gates the inner controls (Add Admin button at line 144, per-row select + trash at line 273) by a separate `isOwner` state derived from `me?.isOwner` in the API response. The two can disagree:
- `useAdminPermissions` falls back to `'owner'` → `canManage = true` → page renders.
- `isOwner` is `false` until `fetchTeam` resolves → controls hidden.
- Then `fetchTeam` returns → `isOwner = true` → controls appear.

For an actual owner the end state is correct, but the path there leaks information and creates flicker. For a non-owner the page-level guard *should* block but doesn't reliably (Bug 1).

---

## 2. Proposed Solution

Three small, surgical changes — one per bug above. No schema changes, no API changes. Server-side enforcement (`requireAdminPerm` in [src/lib/teamPermissions.ts](src/lib/teamPermissions.ts)) already works; this is purely a client-side UI sync.

### Step 1: Fix the hook fallback (least privilege)

[src/hooks/useAdminPermissions.ts](src/hooks/useAdminPermissions.ts)

- Change the default from `'owner'` to `'viewer'`. The hook returns the least-privileged role until the session confirms otherwise.
- Expose a `loading` flag so callers can render a skeleton instead of flashing owner UI during session hydration.

```typescript
export interface AdminPermissions {
  role: AdminTeamRole;
  loading: boolean;
  canRead: boolean;
  canWriteOrders: boolean;
  canWriteProducts: boolean;
  canWriteInventory: boolean;
  canWriteSettings: boolean;
  canManageTeam: boolean;
}

export function useAdminPermissions(): AdminPermissions {
  const { data: session, status } = useSession();
  const raw = (session?.user as { adminTeamRole?: string } | undefined)?.adminTeamRole;
  const role = (raw as AdminTeamRole) ?? 'viewer';   // ← least privilege
  const perms = MATRIX[role] ?? MATRIX.viewer;
  return { role, loading: status === 'loading', ...perms };
}
```

### Step 2: Hide the Team sidebar link from non-managers

[src/app/admin/layout.tsx](src/app/admin/layout.tsx)

- Call `useAdminPermissions()` inside `AdminLayout`.
- Filter `SIDEBAR_LINKS` so the Team row is only rendered when `canManageTeam` is true.

```typescript
const perms = useAdminPermissions();
const visibleLinks = SIDEBAR_LINKS.filter(
  link => link.name !== 'Team' || perms.canManageTeam
);
// then map over visibleLinks instead of SIDEBAR_LINKS
```

This matches how the Vendor/Brand portals are structured — UI you cannot use is hidden, not shown-and-blocked.

### Step 3: Single source of truth on the team page

[src/app/admin/team/page.tsx](src/app/admin/team/page.tsx)

- Drop the local `isOwner` state. Derive UI gating from `canManage` (which now reflects the session role correctly thanks to Step 1) for the "Add Admin" button and the form.
- Keep `me` lookup (`json.data.find(m => m.user.id === currentUserId)`) but only use it for the "You" badge on the row representing the current user — that is a self-identification concern, not a permission concern.
- While `perms.loading` is true, render the existing loading spinner instead of either the owner UI or the access-restricted screen.

```typescript
const perms = useAdminPermissions();
const canManage = perms.canManageTeam;

if (perms.loading) {
  return <Loader2 className="animate-spin" />;
}
if (!canManage) {
  return <AccessRestricted />;
}

// inside JSX — replace `isOwner` with `canManage`:
{canManage && <button>Add Admin</button>}
{canManage && member.user.id !== currentUserId && <ActionsCell />}
```

---

## 3. Detailed File Changes

### 1. [src/hooks/useAdminPermissions.ts](src/hooks/useAdminPermissions.ts)
- Add `loading: boolean` to the `AdminPermissions` interface.
- Change role fallback from `'owner'` to `'viewer'`.
- Return `loading: status === 'loading'` from the hook.

### 2. [src/app/admin/layout.tsx](src/app/admin/layout.tsx)
- Import `useAdminPermissions`.
- Call it inside the component.
- Filter `SIDEBAR_LINKS` before the map: omit the Team entry when `!perms.canManageTeam`.

### 3. [src/app/admin/team/page.tsx](src/app/admin/team/page.tsx)
- Remove the `isOwner` state and its setter.
- Use `canManage` (from `useAdminPermissions`) as the only gate for Add/Edit/Remove controls.
- Replace the `isOwner && !member.isOwner` guard on the action cell with `canManage && member.user.id !== currentUserId`.
- Render a loading spinner while `perms.loading` is true.

---

## 4. Verification Plan

### Manual Verification

1. **As Admin Owner:** Log in as the seeded admin owner. Sidebar shows the Team link. `/admin/team` renders the full UI: Add Admin button, form, per-row role select + trash on non-self rows, "You" badge on the self row.
2. **As Admin Manager / Editor / Viewer:** Log in (or change role and re-login so JWT refreshes). The Team link is **not** in the sidebar. Direct navigation to `/admin/team` shows the "Access restricted" screen with no flash of owner UI.
3. **Brief session-hydration window:** Hard refresh `/admin/team` while logged in as owner. Should see a loading spinner first, then the full UI — never the flash-then-restricted sequence that the previous code path produced when `adminTeamRole` was missing from a stale JWT.
4. **Server-side safety net:** Confirm POST/PATCH/DELETE to `/api/v1/admin/team` still return 403 for non-owners (already enforced by `requireAdminPerm` — unchanged).
