# Design & Implementation Plan: Team Dashboard RBAC Client UI Sync

This document outlines the root cause and proposed fix for the client-side Role-Based Access Control (RBAC) and UI synchronization bugs in the Vendor and Brand Portal team management screens.

---

## 1. The Problem (Root Cause)

In both the Vendor Panel (`src/app/vendor/(dashboard)/team/page.tsx`) and Brand Portal (`src/app/brand/portal/team/page.tsx`), the page-level logic determines the currently logged-in user's role and permission to manage the team using the following pattern:

**Vendor Team Page:**
```typescript
const selfRow = json.data[0]; // owner is always first
setMyTeamRole(selfRow?.isOwner ? 'owner' : (selfRow?.role ?? 'viewer'));
```

**Brand Team Page:**
```typescript
setIsOwner(json.data[0]?.isOwner ?? false);
```

### Why this is a bug:
1. The backend APIs (`/api/v1/vendor/team` and `/api/v1/brand/team`) build the team members list by prepending the owner row at index `0` of the returned array.
2. The owner row *always* has `isOwner: true` in the API response.
3. As a result:
   - On the Vendor Team Page, `selfRow` is always the owner row, so `myTeamRole` is always set to `'owner'`.
   - On the Brand Team Page, `json.data[0]` is always the owner row, so `isOwner` is always set to `true`.
4. This causes the UI to render the management controls (such as the "Add Member" button, role select dropdowns, and "Remove" trash-can buttons) for **all users** (including Managers, Editors, Viewers, and masquerading Admins), even though the backend correctly blocks unauthorized write operations.

---

## 2. Proposed Solution

We will integrate NextAuth's client-side `useSession()` hook in both client-side components to resolve the logged-in user's role and permissions properly:

### Step 1: Read current session info
```typescript
import { useSession } from 'next-auth/react';

// Inside component:
const { data: session } = useSession();
const currentUserId = (session?.user as { id?: string })?.id;
const currentUserRole = (session?.user as { role?: string })?.role;
```

### Step 2: Compare with returned team list
When fetching the team list from the API:
- **Admin Users (Masquerading):** If `currentUserRole === 'admin'`, the user is accessing the portal in "Admin View" mode. They should have full control over the team (`myTeamRole = 'owner'` or `isOwner = true`).
- **Regular Users (Direct Owners or Team Members):** Find the team member in the list whose `user.id` matches the `currentUserId`.
  - Set the active role on the client to that member's role (e.g. `'owner'`, `'manager'`, `'editor'`, or `'viewer'`).

---

## 3. Detailed File Changes

### 1. `src/app/vendor/(dashboard)/team/page.tsx`
- Import `useSession` from `next-auth/react`.
- Retrieve `currentUserId` and `currentUserRole`.
- Update `fetchTeam` to map `myTeamRole` correctly:
  ```typescript
  if (currentUserRole === 'admin') {
      setMyTeamRole('owner');
  } else {
      const myMember = json.data.find((m: TeamMember) => m.user.id === currentUserId);
      setMyTeamRole(myMember ? (myMember.isOwner ? 'owner' : myMember.role) : 'viewer');
  }
  ```

### 2. `src/app/brand/portal/team/page.tsx`
- Import `useSession` from `next-auth/react`.
- Retrieve `currentUserId` and `currentUserRole`.
- Update `fetchTeam` to map `isOwner` correctly:
  ```typescript
  if (currentUserRole === 'admin') {
      setIsOwner(true);
  } else {
      const myMember = json.data.find((m: TeamMember) => m.user.id === currentUserId);
      setIsOwner(myMember ? (myMember.isOwner || myMember.role === 'owner') : false);
  }
  ```

---

## 4. Verification Plan

### Manual Verification
1. **As Brand / Vendor Owner:** Log in and open the team management tab. Confirm that all add/edit/delete actions are fully functional and visible.
2. **As Brand / Vendor Team Member (Viewer / Editor / Manager):** Log in and open the team management tab. Verify that the "Add Member" button and actions column are completely hidden.
3. **As Admin (Admin View):** Log in as an admin, select a Brand/Vendor dashboard, open the team tab, and confirm that all actions are visible.
