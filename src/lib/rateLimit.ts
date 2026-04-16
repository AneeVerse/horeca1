// Rate limiter — Redis-backed sliding window with in-memory fallback.
// WHY: In multi-instance/cluster deployments (PM2 cluster mode on the droplet),
//      each worker had its own in-memory counter, so the effective limit was
//      N_workers × configured cap. Redis gives us a single source of truth.
//      Falls back to in-memory if Redis is unreachable so dev still works.

import { redis } from './redis';

const MAX_KEYS = 10000;
const memStore = new Map<string, number[]>();
let redisFailed = false;
let redisFailedAt = 0;
const REDIS_COOLDOWN_MS = 30_000; // Don't hammer Redis with retries after a failure

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of memStore.entries()) {
    const filtered = timestamps.filter(t => now - t < 60000);
    if (filtered.length === 0) memStore.delete(key);
    else memStore.set(key, filtered);
  }
}, 60000).unref();

function shouldSkipRedis() {
  return redisFailed && Date.now() - redisFailedAt < REDIS_COOLDOWN_MS;
}

function checkMemory(key: string, maxRequests: number, windowMs: number) {
  if (memStore.size >= MAX_KEYS && !memStore.has(key)) {
    return { allowed: false, remaining: 0 };
  }
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (memStore.get(key) || []).filter(t => t > windowStart);
  timestamps.push(now);
  memStore.set(key, timestamps);
  return {
    allowed: timestamps.length <= maxRequests,
    remaining: Math.max(0, maxRequests - timestamps.length),
  };
}

async function checkRedis(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `rl:${key}`;
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zadd(redisKey, now, member);
  pipeline.zcard(redisKey);
  pipeline.pexpire(redisKey, windowMs + 1000);
  const results = await pipeline.exec();
  if (!results) throw new Error('redis pipeline returned null');
  const count = Number(results[2]?.[1] ?? 0);
  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
  };
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  if (shouldSkipRedis()) return checkMemory(key, maxRequests, windowMs);

  try {
    return await checkRedis(key, maxRequests, windowMs);
  } catch {
    redisFailed = true;
    redisFailedAt = Date.now();
    return checkMemory(key, maxRequests, windowMs);
  }
}

// Per-role default caps used by withRateLimit wrapper
export const RATE_LIMIT_TIERS = {
  anonymous: { max: 60, windowMs: 60_000 },
  customer: { max: 120, windowMs: 60_000 },
  vendor: { max: 240, windowMs: 60_000 },
  brand: { max: 240, windowMs: 60_000 },
  admin: { max: 600, windowMs: 60_000 },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;
