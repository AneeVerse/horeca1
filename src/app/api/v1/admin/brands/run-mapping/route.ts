// POST /api/v1/admin/brands/run-mapping — Re-run brand-product mapping for ALL approved brands.
// Uses whichever AI signals are configured (embeddings + LLM judge). Returns counts.
// REQUIRES: role=admin

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { requirePermission } from '@/lib/permissions/engine';
import { errorResponse } from '@/middleware/errorHandler';
import { runMappingForBrand } from '@/modules/brand/brand-mapper';
import { getMappingAI } from '@/lib/mapping-ai';
import type { AuthContext } from '@/middleware/auth';

export const POST = adminOnly(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    requirePermission(ctx, 'brands.edit');

    const aiProvider = getMappingAI();
    const aiName = aiProvider ? `${aiProvider.name} (${aiProvider.model})` : 'none';

    const brands = await prisma.brand.findMany({
      where: { isActive: true, approvalStatus: 'approved' },
      select: { id: true, name: true },
    });

    // Snapshot status counts before to report what AI changed
    const snapshot = async () => {
      const rows = await prisma.brandProductMapping.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { status: { in: ['auto_mapped', 'verified', 'pending_review', 'rejected'] } },
      });
      const out: Record<string, number> = { auto_mapped: 0, verified: 0, pending_review: 0, rejected: 0 };
      for (const r of rows) out[r.status] = r._count._all;
      return out;
    };
    const before = await snapshot();

    let processed = 0;
    let errors = 0;
    for (const b of brands) {
      try {
        await runMappingForBrand(b.id);
        processed++;
      } catch (e) {
        errors++;
        console.error('[run-mapping] failed for brand', b.id, e);
      }
    }

    const after = await snapshot();
    const totalBefore = before.auto_mapped + before.verified + before.pending_review;
    const totalAfter = after.auto_mapped + after.verified + after.pending_review;

    return NextResponse.json({
      success: true,
      data: {
        ai: aiName,
        brandsProcessed: processed,
        brandsFailed: errors,
        before,
        after,
        delta: totalAfter - totalBefore,
        promoted: Math.max(0, after.auto_mapped - before.auto_mapped),
        newPending: Math.max(0, after.pending_review - before.pending_review),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
