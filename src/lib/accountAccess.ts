/**
 * Helpers for account-scoped API routes.
 *
 * - assertAccountMember: throws 403 if the caller is not a member of the target account.
 * - assertAccountPermission: throws 403 if the caller is a member but lacks the required permission
 *   for the target account (uses their UserRole rows, not the JWT-cached set, so it works
 *   on a non-active account too).
 */

import { prisma } from '@/lib/prisma';
import { Errors } from '@/middleware/errorHandler';
import { flatten, mergePermissions } from '@/lib/permissions/engine';
import type { PermissionKey, PermissionsJson } from '@/lib/permissions/registry';

export async function assertAccountMember(userId: string, businessAccountId: string): Promise<void> {
  const m = await prisma.businessAccountMember.findUnique({
    where: { userId_businessAccountId: { userId, businessAccountId } },
    select: { id: true },
  });
  if (!m) throw Errors.forbidden('You are not a member of this account');
}

export async function assertAccountPermission(
  userId: string,
  businessAccountId: string,
  requiredKey: PermissionKey,
  outletId: string | null = null,
): Promise<void> {
  await assertAccountMember(userId, businessAccountId);
  const rows = await prisma.userRole.findMany({
    where: {
      userId,
      businessAccountId,
      OR: [{ outletId: null }, ...(outletId ? [{ outletId }] : [])],
    },
    select: { role: { select: { permissions: true } } },
  });
  const merged = mergePermissions(
    ...rows.map((r) => flatten(r.role.permissions as PermissionsJson | null)),
  );
  if (!merged.has(requiredKey)) throw Errors.forbidden(`Requires ${requiredKey}`);
}
