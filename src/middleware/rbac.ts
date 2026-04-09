import { NextRequest } from 'next/server';
import type { Role } from '@prisma/client';
import { type AuthContext, getAuthContext } from './auth';
import { Errors, errorResponse } from './errorHandler';

// Wrapper for role-restricted API routes
export function withRole(
  allowedRoles: Role[],
  handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>
) {
  return async (req: NextRequest) => {
    try {
      const authCtx = await getAuthContext(req);

      if (!allowedRoles.includes(authCtx.role)) {
        throw Errors.forbidden();
      }

      return await handler(req, authCtx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

// Convenience wrappers for common role checks
export function adminOnly(handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>) {
  return withRole(['admin'], handler);
}

export function vendorOnly(handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>) {
  return withRole(['vendor', 'admin'], handler);
}

export function customerOnly(handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>) {
  return withRole(['customer', 'admin'], handler);
}

export function brandOnly(handler: (req: NextRequest, ctx: AuthContext) => Promise<Response>) {
  return withRole(['brand', 'admin'], handler);
}
