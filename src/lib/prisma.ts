import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// WHY: Prisma 7 uses a JS-native engine (not a binary like Prisma 5/6).
// It needs a "driver adapter" to talk to PostgreSQL.
// PrismaPg accepts a pg.Pool instance.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection pool limits to prevent exhaustion under high load
    max: 20,              // Max connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
  });

  const adapter = new PrismaPg(pool as any);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
