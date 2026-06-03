/**
 * Permission registry — the single source of truth for valid (module, action) pairs.
 *
 * Adding a new permission key:
 *   1. Add the action to the relevant module here.
 *   2. Update the seeded role templates in prisma/migrations/.../data_migrate.ts if needed.
 *   3. Reference the key via PermissionKey type — TypeScript will block typos at compile time.
 *
 * The matrix UI at /account/[id]/roles reads MODULES at runtime to render rows × columns.
 */

export const MODULES = {
  dashboard:    ['view'],
  products:     ['view', 'create', 'edit', 'delete', 'approve'],
  brandStore:   ['view', 'edit'],
  orders:       ['view', 'create', 'edit', 'delete', 'approve'],
  repeatOrders: ['view', 'create', 'edit'],
  inventory:    ['view', 'create', 'edit', 'delete'],
  grn:          ['view', 'create', 'edit'],
  dispatch:     ['view', 'create', 'edit'],
  deliveries:   ['view', 'edit', 'approve'],
  payments:     ['view', 'create', 'approve'],
  creditLine:   ['view', 'approve'],
  customers:    ['view', 'create', 'edit', 'delete'],
  vendors:      ['view', 'create', 'edit', 'delete', 'approve'],
  brands:       ['view', 'create', 'edit', 'delete', 'approve'],
  users:        ['view', 'create', 'edit', 'delete'],
  outlets:      ['view', 'create', 'edit', 'delete'],
  analytics:    ['view'],
  promotions:   ['view', 'create', 'edit', 'delete'],
  support:      ['view', 'edit'],
  logistics:    ['view', 'edit'],
  auditLogs:    ['view'],
  settings:     ['view', 'edit'],
  storefront:   ['view', 'order', 'pay'],
  // V2.2 Phase 1 — Salesman Commission
  salespersons: ['view', 'create', 'edit', 'delete'],
  // commissions.edit = override rule / change accrual amount;
  // commissions.approve = move state through pending→approved→paid/cancelled
  commissions:  ['view', 'edit', 'approve'],
} as const satisfies Record<string, readonly string[]>;

export type Module = keyof typeof MODULES;
export type Action = typeof MODULES[Module][number];

// All concrete permission keys, e.g. "orders.edit" | "products.view"
export type PermissionKey = {
  [M in Module]: `${M}.${typeof MODULES[M][number]}`
}[Module];

// Runtime list of every valid permission key — useful for validation & seeding.
export const ALL_PERMISSION_KEYS: readonly PermissionKey[] = Object.entries(MODULES).flatMap(
  ([m, actions]) => (actions as readonly string[]).map((a) => `${m}.${a}` as PermissionKey),
);

export function isValidPermissionKey(key: string): key is PermissionKey {
  const [m, a] = key.split('.');
  if (!m || !a) return false;
  const actions = (MODULES as Record<string, readonly string[]>)[m];
  return Array.isArray(actions) && actions.includes(a);
}

/** Permissions JSON as stored on AccountRole.permissions. */
export type PermissionsJson = Partial<Record<Module, Partial<Record<Action, boolean>>>>;

// ─── Scope ↔ Module mapping ──────────────────────────────────────────────
//
// Each AccountRole has a scope (account / vendor / brand / admin / delivery).
// The permission matrix shown when creating or editing a role of a given
// scope must only include modules that make sense for that scope —
// otherwise a customer-team admin sees vendor-only modules like GRN /
// dispatch / inventory, which is confusing and lets them set permissions
// that never apply.
//
// Membership rule of thumb:
//   • account  — buying-side: orders, payments, credit, team, outlets, settings
//   • vendor   — selling-side: full catalog/inventory/dispatch + everything
//   • brand    — brand-store: catalog management + distributor relationships
//   • admin    — platform staff: everything cross-tenant + audit trail
//   • delivery — delivery operators (V2.3+): dispatch + deliveries + orders.view
//
// Keep this list aligned with what each portal's pages actually need.
export type RoleScope = 'account' | 'vendor' | 'brand' | 'admin' | 'delivery';

export const SCOPE_MODULES: Record<RoleScope, readonly Module[]> = {
  account: [
    'dashboard',
    'orders',
    'repeatOrders',
    'payments',
    'creditLine',
    'users',
    'outlets',
    'settings',
  ],
  vendor: [
    'dashboard',
    'products',
    'brandStore',
    'orders',
    'repeatOrders',
    'inventory',
    'grn',
    'dispatch',
    'deliveries',
    'payments',
    'creditLine',
    'customers',
    'users',
    'outlets',
    'analytics',
    'promotions',
    'salespersons',
    'commissions',
    'settings',
  ],
  brand: [
    'dashboard',
    'products',
    'vendors',
    'analytics',
    'users',
    'settings',
  ],
  admin: [
    'dashboard',
    'orders',
    'customers',
    'vendors',
    'brands',
    'products',
    'payments',
    'analytics',
    'users',
    'auditLogs',
    'settings',
    'support',
    'logistics',
  ],
  delivery: [
    'dashboard',
    'orders',
    'dispatch',
    'deliveries',
  ],
} as const;

/** Filter MODULES down to just the ones a given role-scope can use. */
export function modulesForScope(scope: RoleScope): Record<Module, readonly Action[]> {
  const allowed = SCOPE_MODULES[scope];
  const out: Partial<Record<Module, readonly Action[]>> = {};
  for (const m of allowed) {
    out[m] = MODULES[m];
  }
  return out as Record<Module, readonly Action[]>;
}
