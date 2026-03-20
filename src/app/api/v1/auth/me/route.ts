// GET  /api/v1/auth/me — Get current logged-in user's profile
// PATCH /api/v1/auth/me — Update current user's profile
// WHY: Frontend needs to fetch and update user details (name, phone, pincode, business info)
// PROTECTED: Must be logged in — uses withAuth() wrapper

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/auth/auth.service';
import { updateProfileSchema } from '@/modules/auth/auth.validator';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const authService = new AuthService();

// GET — fetch profile
export const GET = withAuth(async (_req, ctx) => {
  // ctx.userId comes from the JWT token — guaranteed to be the logged-in user
  const profile = await authService.getProfile(ctx.userId);
  return NextResponse.json({ success: true, data: profile });
});

// PATCH — update profile fields
export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const data = updateProfileSchema.parse(body);
    const profile = await authService.updateProfile(ctx.userId, data);
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    return errorResponse(error);
  }
});
