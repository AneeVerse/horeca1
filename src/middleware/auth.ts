import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { Errors, errorResponse } from './errorHandler';
import type { Role } from '@prisma/client';

// Authenticated user context injected into API handlers
export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
}

// Validate session and extract user context
export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw Errors.unauthorized();
  }

  return {
    userId: session.user.id,
    email: session.user.email!,
    role: (session.user as { role?: Role }).role || 'customer',
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
