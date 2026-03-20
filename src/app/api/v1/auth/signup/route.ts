// POST /api/v1/auth/signup — Register a new user account
// WHY: Auth.js handles login but NOT registration. We need a custom route for signup.
// FLOW: Validate input (Zod) → check duplicate → hash password → create user → return profile

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/auth/auth.service';
import { signupSchema } from '@/modules/auth/auth.validator';
import { errorResponse } from '@/middleware/errorHandler';

const authService = new AuthService();

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate the request body using Zod schema
    //    This checks: valid email format, password >= 8 chars, valid phone format, etc.
    const body = await req.json();
    const input = signupSchema.parse(body);

    // 2. Create the user (service handles duplicate check + password hashing)
    const user = await authService.signup(input);

    // 3. Return the new user profile (no password included)
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    // Handles: ZodError (bad input), ApiError (duplicate email), or unknown errors
    return errorResponse(error);
  }
}
