// GET /api/v1/health — liveness + readiness check for DB and Redis.
// WHY: Deployment platforms (systemd, Docker, DO App Platform) hit this to
//      decide whether to route traffic or restart the worker process.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, 'ok' | string> = {};

  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    results.db = 'ok';
  } catch (err) {
    results.db = err instanceof Error ? err.message : 'unknown error';
  }

  try {
    const pong = await redis.ping();
    results.redis = pong === 'PONG' ? 'ok' : `unexpected: ${pong}`;
  } catch (err) {
    results.redis = err instanceof Error ? err.message : 'unknown error';
  }

  const healthy = results.db === 'ok' && results.redis === 'ok';
  return NextResponse.json(
    { success: healthy, data: results, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
