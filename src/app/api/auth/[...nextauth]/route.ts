// Auth.js catch-all route handler with rate limiting
// WHY: Auth.js v5 needs this to handle login, logout, session, and callback URLs
// It auto-handles: POST /api/auth/signin, GET /api/auth/session, POST /api/auth/signout, etc.

import { handlers } from '@/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

function withRateLimit(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    const ip = getClientIp(req);
    const { allowed } = await checkRateLimit(`auth:${ip}`, 30, 60000); // 30 per minute (Auth.js uses multiple requests per login flow)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    return handler(req);
  };
}

export const GET = withRateLimit(handlers.GET);
export const POST = withRateLimit(handlers.POST);
