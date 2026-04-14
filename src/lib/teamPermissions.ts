// teamPermissions.ts — RBAC permission matrix for team members
// Used by vendor, brand, and admin API routes to enforce scoped access.

import type { TeamRole } from '@prisma/client';
import { Errors } from '@/middleware/errorHandler';

export type Permission =
  | 'read'
  | 'orders:write'
  | 'products:write'
  | 'inventory:write'
  | 'settings:write'
  | 'team:manage';

const VENDOR_PERMS: Record<TeamRole | 'owner', Permission[]> = {
  owner:   ['read', 'orders:write', 'products:write', 'inventory:write', 'settings:write', 'team:manage'],
  manager: ['read', 'orders:write', 'products:write', 'inventory:write', 'settings:write'],
  editor:  ['read', 'orders:write', 'products:write', 'inventory:write'],
  viewer:  ['read'],
};

const BRAND_PERMS: Record<TeamRole | 'owner', Permission[]> = {
  owner:   ['read', 'products:write', 'settings:write', 'team:manage'],
  manager: ['read', 'products:write', 'settings:write'],
  editor:  ['read', 'products:write'],
  viewer:  ['read'],
};

const ADMIN_PERMS: Record<TeamRole | 'owner', Permission[]> = {
  owner:   ['read', 'orders:write', 'products:write', 'inventory:write', 'settings:write', 'team:manage'],
  manager: ['read', 'orders:write', 'products:write', 'inventory:write', 'settings:write'],
  editor:  ['read', 'products:write'],
  viewer:  ['read'],
};

export function requireVendorPerm(role: TeamRole | 'owner', perm: Permission): void {
  if (!VENDOR_PERMS[role]?.includes(perm)) {
    throw Errors.forbidden(`Requires ${perm} permission`);
  }
}

export function requireBrandPerm(role: TeamRole | 'owner', perm: Permission): void {
  if (!BRAND_PERMS[role]?.includes(perm)) {
    throw Errors.forbidden(`Requires ${perm} permission`);
  }
}

export function requireAdminPerm(role: TeamRole | 'owner', perm: Permission): void {
  if (!ADMIN_PERMS[role]?.includes(perm)) {
    throw Errors.forbidden(`Requires ${perm} permission`);
  }
}

export function getVendorPermissions(role: TeamRole | 'owner'): Permission[] {
  return VENDOR_PERMS[role] ?? [];
}

export function getBrandPermissions(role: TeamRole | 'owner'): Permission[] {
  return BRAND_PERMS[role] ?? [];
}
