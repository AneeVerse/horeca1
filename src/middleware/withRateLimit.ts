// withRateLimit — single-line wrapper that any route can opt into.
// Uses the Redis-backed sliding-window limiter from src/lib/rateLimit.ts and
// keys per-IP so anonymous abuse is bounded even before any auth runs.
//
// Usage:
//   export const POST = withRateLimit(handler, { max: 30, windowMs: 60_000 });
//   export const POST = withRateLimit(handler, 'mutation'); // preset
//
// Presets:
//   'auth'     — 10 / 60s   (login, OTP send, password reset — abuse-prone)
//   'mutation' — 30 / 60s   (POST/PATCH/DELETE on most resources)
//   'upload'   — 20 / 60s   (file uploads — bandwidth-heavy)
//   'webhook'  — 600 / 60s  (provider webhooks — high legitimate volume)

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/utils';

type RateLimitConfig = { max: number; windowMs: number };
type Preset = 'auth' | 'mutation' | 'upload' | 'webhook';

const PRESETS: Record<Preset, RateLimitConfig> = {
  auth: { max: 10, windowMs: 60_000 },
  mutation: { max: 30, windowMs: 60_000 },
  upload: { max: 20, windowMs: 60_000 },
  webhook: { max: 600, windowMs: 60_000 },
};

type Handler<TArgs extends unknown[]> = (req: NextRequest, ...rest: TArgs) => Promise<Response>;

export function withRateLimit<TArgs extends unknown[]>(
  handler: Handler<TArgs>,
  config: RateLimitConfig | Preset,
  keyPrefix?: string,
): Handler<TArgs> {
  const { max, windowMs } = typeof config === 'string' ? PRESETS[config] : config;

  return async (req, ...rest) => {
    const ip = getClientIp(req);
    const route = req.nextUrl.pathname;
    const key = `${keyPrefix ?? 'rl'}:${route}:${ip}`;

    const { allowed, remaining } = await checkRateLimit(key, max, windowMs);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } },
        { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining), 'Retry-After': String(Math.ceil(windowMs / 1000)) } },
      );
    }
    return handler(req, ...rest);
  };
}
