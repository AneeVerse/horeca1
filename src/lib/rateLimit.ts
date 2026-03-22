// In-memory sliding window rate limiter (no Redis dependency)
// For single-instance deployments; upgrade to Redis-based for multi-instance

const MAX_KEYS = 10000; // Cap to prevent memory exhaustion under DDoS
const requests = new Map<string, number[]>();

// Clean up old entries every 60s to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requests.entries()) {
    const filtered = timestamps.filter(t => now - t < 60000);
    if (filtered.length === 0) requests.delete(key);
    else requests.set(key, filtered);
  }
}, 60000).unref();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  // If map is full and this is a new key, reject (protects memory under DDoS)
  if (requests.size >= MAX_KEYS && !requests.has(key)) {
    return { allowed: false, remaining: 0 };
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (requests.get(key) || []).filter(t => t > windowStart);
  timestamps.push(now);
  requests.set(key, timestamps);

  return {
    allowed: timestamps.length <= maxRequests,
    remaining: Math.max(0, maxRequests - timestamps.length),
  };
}
