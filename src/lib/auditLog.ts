// Audit logging helper — use logAction() from any privileged mutation.
// WHY: Compliance + forensics. We capture WHO did WHAT to WHICH entity, with
// optional before/after snapshots. Failures are swallowed — an audit write must
// never break the main request path.

import { prisma } from './prisma';
import type { NextRequest } from 'next/server';
import type { AuthContext } from '@/middleware/auth';

export interface LogActionInput {
  action: string;                    // 'vendor.approve', 'product.price_update', etc.
  entity: string;                    // 'Vendor', 'Product', 'User', etc.
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export async function logAction(
  ctx: AuthContext | null,
  req: NextRequest | null,
  input: LogActionInput,
): Promise<void> {
  try {
    const ip = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    await prisma.auditLog.create({
      data: {
        actorId: ctx?.userId ?? null,
        actorRole: ctx?.role ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: input.before === undefined ? undefined : (input.before as never),
        after: input.after === undefined ? undefined : (input.after as never),
        metadata: input.metadata === undefined ? undefined : (input.metadata as never),
        ip,
      },
    });
  } catch (err) {
    // Never fail the mutation because the audit write failed.
    console.error('[audit] write failed', err);
  }
}
