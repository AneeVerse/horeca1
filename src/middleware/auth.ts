import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { Errors, errorResponse } from './errorHandler';
import type { Role, TeamRole } from '@prisma/client';

// Authenticated user context injected into API handlers
export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  // Only present for admin users — 'owner' for the original admin, or their AdminTeamMember role
  adminTeamRole: TeamRole | 'owner';
}

// Validate session and extract user context
export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw Errors.unauthorized();
  }

  const adminTeamRole = (session.user as { adminTeamRole?: string }).adminTeamRole;

  return {
    userId: session.user.id,
    email: session.user.email!,
    role: (session.user as { role?: Role }).role || 'customer',
    adminTeamRole: (adminTeamRole as TeamRole | 'owner') ?? 'owner',
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
