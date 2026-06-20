'use client';

import { useSession } from 'next-auth/react';
import type { PermissionKey } from '@/lib/permissions/registry';

/**
 * Convenience flags consumed by the admin UI. Derived from the flattened
 * permission set in session.user.permissions (populated by auth.ts jwt
 * callback → applyAdminPermissions). Server-side route handlers do their
 * own check via requirePermission(session, 'x.y') in engine.ts — this hook
 * is only for show/hide decisions in the client UI.
 *
 * The shape is preserved from the legacy hook so existing call sites keep
 * working. New callers should prefer `useHasPermission('module.action')`
 * once that hook lands, or call hasPermission(session, key) directly.
 */
export interface AdminPermissions {
  loading: boolean;
  canRead: boolean;
  canWriteOrders: boolean;
  canWriteProducts: boolean;
  canWriteInventory: boolean;
  canWriteSettings: boolean;
  canManageTeam: boolean;
  // Granular team actions — used by /admin/team to gate individual buttons
  // so a user with users.create but not users.delete doesn't see a Remove
  // button that 403s on click.
  canInviteUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
}

function has(perms: readonly string[] | undefined, key: PermissionKey): boolean {
  return !!perms && perms.includes(key);
}

export function useAdminPermissions(): AdminPermissions {
  const { data: session, status } = useSession();
  const perms = (session?.user as { permissions?: string[] } | undefined)?.permissions;
  return {
    // Only "loading" on the genuine initial load. A background session
    // revalidation flips status to 'loading' while session stays populated;
    // treating that as loading would make consumers unmount their UI.
    loading: status === 'loading' && !session,
    canRead: has(perms, 'dashboard.view'),
    canWriteOrders: has(perms, 'orders.edit'),
    canWriteProducts: has(perms, 'products.edit'),
    canWriteInventory: has(perms, 'inventory.edit'),
    canWriteSettings: has(perms, 'settings.edit'),
    // canManageTeam stays = users.create for "can see the page" gate
    canManageTeam: has(perms, 'users.create') || has(perms, 'users.edit') || has(perms, 'users.delete') || has(perms, 'users.view'),
    canInviteUsers: has(perms, 'users.create'),
    canEditUsers: has(perms, 'users.edit'),
    canDeleteUsers: has(perms, 'users.delete'),
  };
}
