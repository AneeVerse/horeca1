/**
 * Permission engine — flatten, check, and merge permissions for a request.
 *
 * Locked-in design choices (see docs/multi-account-rbac-implementation-plan.md):
 *   - Union merge across UserRole rows. Roles only grant; never restrict.
 *   - A UserRole applies if userId = current AND businessAccountId = active
 *     AND (outletId IS NULL OR outletId = activeOutletId).
 *
 * Replaces the hardcoded matrix in the legacy src/lib/teamPermissions.ts.
 */

import { NextResponse } from 'next/server';
import { ALL_PERMISSION_KEYS, type PermissionKey, type PermissionsJson } from './registry';

// ─── flatten ──────────────────────────────────────────────────────────────

/** Convert a permissions JSON object into the flat string set used at request time. */
export function flatten(permissions: PermissionsJson | null | undefined): Set<PermissionKey> {
  const out = new Set<PermissionKey>();
  if (!permissions) return out;
  for (const [m, actions] of Object.entries(permissions)) {
    if (!actions) continue;
    for (const [a, on] of Object.entries(actions)) {
      if (on === true) out.add(`${m}.${a}` as PermissionKey);
    }
  }
  return out;
}

// ─── merge (UNION — additive, locked-in) ──────────────────────────────────

export function mergePermissions(...sets: Array<Set<PermissionKey> | PermissionsJson | null | undefined>): Set<PermissionKey> {
  const out = new Set<PermissionKey>();
  for (const s of sets) {
    if (!s) continue;
    if (s instanceof Set) {
      for (const k of s) out.add(k);
    } else {
      for (const k of flatten(s)) out.add(k);
    }
  }
  return out;
}

// ─── checks ───────────────────────────────────────────────────────────────

export interface SessionLike {
  permissions?: PermissionKey[] | readonly PermissionKey[];
}

export function hasPermission(session: SessionLike | null | undefined, key: PermissionKey): boolean {
  if (!session?.permissions) return false;
  return (session.permissions as readonly PermissionKey[]).includes(key);
}

export function hasAnyPermission(session: SessionLike | null | undefined, ...keys: PermissionKey[]): boolean {
  if (!session?.permissions) return false;
  const perms = session.permissions as readonly PermissionKey[];
  return keys.some((k) => perms.includes(k));
}

export function hasAllPermissions(session: SessionLike | null | undefined, ...keys: PermissionKey[]): boolean {
  if (!session?.permissions) return false;
  const perms = session.permissions as readonly PermissionKey[];
  return keys.every((k) => perms.includes(k));
}

// ─── middleware wrappers ──────────────────────────────────────────────────
// These wrap a route handler and return 403 if the active session lacks the permission.
// They expect the handler to be already wrapped in `withAuth` so `ctx.session` is present.

type Ctx = { session: SessionLike };
type Handler<TArgs extends unknown[]> = (req: Request, ctx: Ctx & { params?: unknown }, ...rest: TArgs) => Promise<Response> | Response;

function forbidden(key: PermissionKey | PermissionKey[]): Response {
  return NextResponse.json(
    { error: 'forbidden', requiredPermission: key },
    { status: 403 },
  );
}

export function requirePermission<TArgs extends unknown[]>(key: PermissionKey) {
  return function (handler: Handler<TArgs>) {
    return async function wrapped(req: Request, ctx: Ctx & { params?: unknown }, ...rest: TArgs) {
      if (!hasPermission(ctx.session, key)) return forbidden(key);
      return handler(req, ctx, ...rest);
    };
  };
}

export function requireAnyPermission<TArgs extends unknown[]>(...keys: PermissionKey[]) {
  return function (handler: Handler<TArgs>) {
    return async function wrapped(req: Request, ctx: Ctx & { params?: unknown }, ...rest: TArgs) {
      if (!hasAnyPermission(ctx.session, ...keys)) return forbidden(keys);
      return handler(req, ctx, ...rest);
    };
  };
}

// ─── utility: validate a PermissionsJson at write time ───────────────────

export function sanitizePermissions(input: unknown): PermissionsJson {
  if (!input || typeof input !== 'object') return {};
  const validSet = new Set<string>(ALL_PERMISSION_KEYS);
  const out: PermissionsJson = {};
  for (const [m, actions] of Object.entries(input as Record<string, unknown>)) {
    if (!actions || typeof actions !== 'object') continue;
    const cleaned: Record<string, boolean> = {};
    for (const [a, on] of Object.entries(actions as Record<string, unknown>)) {
      if (on === true && validSet.has(`${m}.${a}`)) {
        cleaned[a] = true;
      }
    }
    if (Object.keys(cleaned).length) (out as Record<string, Record<string, boolean>>)[m] = cleaned;
  }
  return out;
}
