import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getClientIp } from '@/lib/utils';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
  keyPrefix?: string;
}

// Simple sliding window rate limiter using Redis
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const { maxRequests, windowMs, keyPrefix = 'rl' } = config;

  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipe = redis.pipeline();
  pipe.zremrangebyscore(key, 0, windowStart); // Remove old entries
  pipe.zadd(key, now, `${now}`); // Add current request
  pipe.zcard(key); // Count requests in window
  pipe.pexpire(key, windowMs); // Set TTL

  const results = await pipe.exec();
  const count = (results?.[2]?.[1] as number) || 0;

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetMs: windowMs,
  };
}

// Rate limit response helper
export function rateLimitResponse(resetMs: number) {
  const retryAfter = Math.ceil(resetMs / 1000);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Try again in ${retryAfter}s`,
      },
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    }
  );
}
