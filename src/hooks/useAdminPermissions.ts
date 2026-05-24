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
}

function has(perms: readonly string[] | undefined, key: PermissionKey): boolean {
  return !!perms && perms.includes(key);
}

export function useAdminPermissions(): AdminPermissions {
  const { data: session, status } = useSession();
  const perms = (session?.user as { permissions?: string[] } | undefined)?.permissions;
  return {
    loading: status === 'loading',
    canRead: has(perms, 'dashboard.view'),
    canWriteOrders: has(perms, 'orders.edit'),
    canWriteProducts: has(perms, 'products.edit'),
    canWriteInventory: has(perms, 'inventory.edit'),
    canWriteSettings: has(perms, 'settings.edit'),
    canManageTeam: has(perms, 'users.create'),
  };
}
