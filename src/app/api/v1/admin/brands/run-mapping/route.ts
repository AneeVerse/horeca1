// POST /api/v1/admin/brands/run-mapping — Re-run brand-product mapping for ALL approved brands.
// Uses whichever AI signals are configured (embeddings + LLM judge). Returns counts.
// REQUIRES: role=admin

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { requireAdminPerm } from '@/lib/teamPermissions';
import { errorResponse } from '@/middleware/errorHandler';
import { runMappingForBrand } from '@/modules/brand/brand-mapper';
import { getMappingAI } from '@/lib/mapping-ai';
import type { AuthContext } from '@/middleware/auth';

export const POST = adminOnly(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'settings:write');

    const aiProvider = getMappingAI();
    const aiName = aiProvider ? `${aiProvider.name} (${aiProvider.model})` : 'none';

    const brands = await prisma.brand.findMany({
      where: { isActive: true, approvalStatus: 'approved' },
      select: { id: true, name: true },
    });

    const before = await prisma.brandProductMapping.count({
      where: { status: { in: ['auto_mapped', 'verified', 'pending_review'] } },
    });

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

    const after = await prisma.brandProductMapping.count({
      where: { status: { in: ['auto_mapped', 'verified', 'pending_review'] } },
    });

    return NextResponse.json({
      success: true,
      data: {
        ai: aiName,
        brandsProcessed: processed,
        brandsFailed: errors,
        mappingsBefore: before,
        mappingsAfter: after,
        delta: after - before,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
