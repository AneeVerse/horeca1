/**
 * Load the active (BusinessAccount, Outlet) context for a user, plus the flattened
 * permission set for that context. Called by the auth.ts jwt callback on login
 * and on session.update({ activeBusinessAccountId, activeOutletId }).
 *
 * See docs/multi-account-rbac-implementation-plan.md (§6 Auth & Session).
 */

import { prisma } from '@/lib/prisma';
import { flatten, mergePermissions } from '@/lib/permissions/engine';
import type { PermissionKey, PermissionsJson } from '@/lib/permissions/registry';

const MAX_AVAILABLE_ACCOUNTS = 20;

export interface AvailableAccountSummary {
  id: string;
  displayName: string;
  isVendor: boolean;
  isBrand: boolean;
}

export interface ActiveContext {
  hcidDisplay: string | null;
  activeBusinessAccountId: string;
  activeBusinessAccountType: { isCustomer: boolean; isVendor: boolean; isBrand: boolean };
  activeOutletId: string | null;
  permissions: PermissionKey[];
  availableAccounts: AvailableAccountSummary[];
  availableAccountsTruncated: boolean;
  totalAccountCount: number;
}

/**
 * Resolve the active context for a user.
 *
 * @param userId            HCID (User.id).
 * @param targetAccountId   The BusinessAccount to switch to, or null to pick the primary.
 * @param targetOutletId    The Outlet to switch to within that account, or null to pick the account's primary outlet.
 *
 * Returns null if the user has no BusinessAccountMember rows yet (legacy users mid-migration).
 * In that case the JWT will not carry account/outlet/permissions and the caller treats it as legacy.
 */
export async function loadActiveContext(
  userId: string,
  targetAccountId: string | null,
  targetOutletId: string | null,
): Promise<ActiveContext | null> {
  // Defensive top-level try/catch: this function is called from the auth.ts jwt
  // callback on every sign-in and every session.update(). If anything inside
  // throws (transient DB hiccup, schema drift, missing relation, etc.), we MUST
  // return null rather than propagate — callers already handle the null path by
  // clearing the active-context fields on the token, which is far better than
  // poisoning the JWT or blocking sign-in entirely.
  try {
    // Pull the user's hcidDisplay + first N memberships in one round-trip.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        hcidDisplay: true,
        accountMemberships: {
          select: {
            isPrimary: true,
            businessAccount: {
              select: {
                id: true,
                displayName: true,
                legalName: true,
                isCustomer: true,
                isVendor: true,
                isBrand: true,
                primaryOutletId: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!user || user.accountMemberships.length === 0) return null;

    // Pick the active account: explicit target wins, else primary, else first.
    const memberships = user.accountMemberships;
    let chosen = targetAccountId
      ? memberships.find((m) => m.businessAccount.id === targetAccountId)
      : (memberships.find((m) => m.isPrimary) ?? memberships[0]);
    if (!chosen) chosen = memberships[0];
    const account = chosen.businessAccount;

    // Pick the active outlet within the chosen account.
    // Validate targetOutletId belongs to the account; else fall back to primary.
    let activeOutletId: string | null = account.primaryOutletId;
    if (targetOutletId) {
      const ok = await prisma.outlet.findFirst({
        where: { id: targetOutletId, businessAccountId: account.id },
        select: { id: true },
      });
      if (ok) activeOutletId = ok.id;
    }
    // If no primary set and no valid target, pick the first outlet of the account.
    if (!activeOutletId) {
      const first = await prisma.outlet.findFirst({
        where: { businessAccountId: account.id },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      activeOutletId = first?.id ?? null;
    }

    // Compute the flattened permission set: union of every UserRole row that applies.
    // A UserRole applies if userId = current AND businessAccountId = active
    // AND (outletId IS NULL OR outletId = activeOutletId).
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        businessAccountId: account.id,
        OR: [{ outletId: null }, ...(activeOutletId ? [{ outletId: activeOutletId }] : [])],
      },
      select: {
        role: { select: { permissions: true } },
      },
    });

    const permSet = mergePermissions(
      ...userRoles.map((ur) => flatten(ur.role.permissions as PermissionsJson | null)),
    );
    const permissions = Array.from(permSet);

    // Cap the availableAccounts list (cookie size). Compute truncation flag + total count.
    const totalAccountCount = memberships.length;
    const availableAccounts: AvailableAccountSummary[] = memberships
      .slice(0, MAX_AVAILABLE_ACCOUNTS)
      .map((m) => ({
        id: m.businessAccount.id,
        displayName: m.businessAccount.displayName ?? m.businessAccount.legalName,
        isVendor: m.businessAccount.isVendor,
        isBrand: m.businessAccount.isBrand,
      }));
    const availableAccountsTruncated = totalAccountCount > MAX_AVAILABLE_ACCOUNTS;

    return {
      hcidDisplay: user.hcidDisplay,
      activeBusinessAccountId: account.id,
      activeBusinessAccountType: {
        isCustomer: account.isCustomer,
        isVendor: account.isVendor,
        isBrand: account.isBrand,
      },
      activeOutletId,
      permissions,
      availableAccounts,
      availableAccountsTruncated,
      totalAccountCount,
    };
  } catch (err) {
    console.error('[loadActiveContext] failed for userId=%s targetAccountId=%s targetOutletId=%s:', userId, targetAccountId, targetOutletId, err);
    return null;
  }
}
