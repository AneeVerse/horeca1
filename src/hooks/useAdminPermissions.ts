'use client';

import { useSession } from 'next-auth/react';

export type AdminTeamRole = 'owner' | 'manager' | 'editor' | 'viewer';

export interface AdminPermissions {
  role: AdminTeamRole;
  canRead: boolean;
  canWriteOrders: boolean;
  canWriteProducts: boolean;
  canWriteInventory: boolean;
  canWriteSettings: boolean;
  canManageTeam: boolean;
}

const MATRIX: Record<AdminTeamRole, Omit<AdminPermissions, 'role'>> = {
  owner:   { canRead: true, canWriteOrders: true,  canWriteProducts: true,  canWriteInventory: true,  canWriteSettings: true,  canManageTeam: true  },
  manager: { canRead: true, canWriteOrders: true,  canWriteProducts: true,  canWriteInventory: true,  canWriteSettings: true,  canManageTeam: false },
  editor:  { canRead: true, canWriteOrders: false, canWriteProducts: true,  canWriteInventory: false, canWriteSettings: false, canManageTeam: false },
  viewer:  { canRead: true, canWriteOrders: false, canWriteProducts: false, canWriteInventory: false, canWriteSettings: false, canManageTeam: false },
};

export function useAdminPermissions(): AdminPermissions {
  const { data: session } = useSession();
  const raw = (session?.user as { adminTeamRole?: string } | undefined)?.adminTeamRole;
  const role = (raw as AdminTeamRole) ?? 'owner';
  const perms = MATRIX[role] ?? MATRIX.viewer;
  return { role, ...perms };
}
