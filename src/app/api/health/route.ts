// GET /api/health — Health check endpoint for load balancers and monitoring
// Returns 200 if server is running, includes DB connectivity check

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const start = Date.now();

  try {
    // Quick DB connectivity check
    await prisma.$queryRawUnsafe('SELECT 1');
    const dbLatency = Date.now() - start;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: { connected: true, latency_ms: dbLatency },
    });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        db: { connected: false },
      },
      { status: 503 }
    );
  }
}
