import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { Errors, errorResponse } from './errorHandler';
import type { Role, TeamRole } from '@prisma/client';
import type { PermissionKey } from '@/lib/permissions/registry';

// Authenticated user context injected into API handlers.
// V2.2: extended with the active BusinessAccount / Outlet / permission set
// resolved at login by auth.ts (via loadActiveContext).
export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  // Only present for admin users — 'owner' for the original admin, or their AdminTeamMember role
  adminTeamRole: TeamRole | 'owner';
  // V2.2 — HCID multi-account fields. Nullable during the transition window
  // for legacy users whose BusinessAccountMember row isn't backfilled yet.
  hcidDisplay: string | null;
  activeBusinessAccountId: string | null;
  activeBusinessAccountType: { isCustomer: boolean; isVendor: boolean; isBrand: boolean } | null;
  activeOutletId: string | null;
  /** Empty = account-wide access. Non-empty = only these outlet IDs are accessible. */
  accessibleOutletIds: string[];
  permissions: readonly PermissionKey[];
}

// Validate session and extract user context
export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  void req;
  const session = await auth();

  if (!session?.user?.id) {
    throw Errors.unauthorized();
  }

  const u = session.user as Record<string, unknown>;
  const adminTeamRole = u.adminTeamRole as string | undefined;

  return {
    userId: session.user.id,
    email: session.user.email!,
    role: (u.role as Role) ?? 'customer',
    adminTeamRole: (adminTeamRole as TeamRole | 'owner') ?? 'owner',
    hcidDisplay: (u.hcidDisplay as string) ?? null,
    activeBusinessAccountId: (u.activeBusinessAccountId as string) ?? null,
    activeBusinessAccountType:
      (u.activeBusinessAccountType as { isCustomer: boolean; isVendor: boolean; isBrand: boolean }) ?? null,
    activeOutletId: (u.activeOutletId as string) ?? null,
    accessibleOutletIds: Array.isArray(u.accessibleOutletIds) ? (u.accessibleOutletIds as string[]) : [],
    permissions: (u.permissions as PermissionKey[]) ?? [],
  };
}

// Wrapper for protected API routes
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>
) {
  return async (req: NextRequest) => {
    try {
      const authCtx = await getAuthContext(req);
      return await handler(req, authCtx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
