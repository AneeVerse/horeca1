// POST /api/v1/admin/brands/embed-backfill — Embed all approved active brand-master and
// distributor products that are missing an embedding (or were embedded by a different
// provider/model than the currently configured one).
//
// Returns counts and the provider/model used. Long-running but fire-and-forget on the
// caller side: the request just kicks the work; embedding happens in batches but blocks
// the request until complete (the backfill is bounded — full catalog typically <60s
// with OpenAI/DeepSeek).
//
// REQUIRES: role=admin

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { requireAdminPerm } from '@/lib/teamPermissions';
import { errorResponse } from '@/middleware/errorHandler';
import { embedBatch, getEmbeddingProvider } from '@/lib/embeddings';
import type { AuthContext } from '@/middleware/auth';

const BATCH_SIZE = 50;

function buildText(name: string, brand?: string | null, packSize?: string | null, unit?: string | null, category?: string | null): string {
  return [brand?.trim(), name?.trim(), [packSize?.trim(), unit?.trim()].filter(Boolean).join(' '), category?.trim()]
    .filter(Boolean)
    .join(' ');
}

export const POST = adminOnly(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    requireAdminPerm(ctx.adminTeamRole, 'settings:write');

    let provider: string;
    try { provider = getEmbeddingProvider().name; }
    catch (e: unknown) {
      return NextResponse.json({
        success: false,
        error: { message: `Embedding provider not configured: ${(e as Error).message}` },
      }, { status: 400 });
    }

    // ── Brand master products ──
    const masters = await prisma.brandMasterProduct.findMany({
      where: {
        isActive: true,
        brand: { isActive: true, approvalStatus: 'approved' },
        OR: [{ embedding: { equals: [] } }, { embeddingModel: { not: provider } }],
      },
      include: { brand: { select: { name: true } }, categoryRel: { select: { name: true } } },
    });

    let masterEmbeddedCount = 0;
    let masterFailedCount = 0;
    for (let i = 0; i < masters.length; i += BATCH_SIZE) {
      const batch = masters.slice(i, i + BATCH_SIZE);
      const texts = batch.map(m => buildText(m.name, m.brand?.name, m.packSize, m.unit, m.categoryRel?.name ?? m.category));
      const vectors = await embedBatch(texts);
      if (!vectors) { masterFailedCount += batch.length; continue; }
      for (let j = 0; j < batch.length; j++) {
        await prisma.brandMasterProduct.update({
          where: { id: batch[j].id },
          data: { embedding: vectors[j], embeddingModel: provider, embeddingUpdatedAt: new Date() },
        });
        masterEmbeddedCount++;
      }
    }

    // ── Distributor products ──
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        approvalStatus: 'approved',
        OR: [{ embedding: { equals: [] } }, { embeddingModel: { not: provider } }],
      },
      include: { category: { select: { name: true } } },
    });

    let productEmbeddedCount = 0;
    let productFailedCount = 0;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const texts = batch.map(p => buildText(p.name, p.brand, p.packSize, p.unit, p.category?.name));
      const vectors = await embedBatch(texts);
      if (!vectors) { productFailedCount += batch.length; continue; }
      for (let j = 0; j < batch.length; j++) {
        await prisma.product.update({
          where: { id: batch[j].id },
          data: { embedding: vectors[j], embeddingModel: provider, embeddingUpdatedAt: new Date() },
        });
        productEmbeddedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        provider,
        masters: { needed: masters.length, embedded: masterEmbeddedCount, failed: masterFailedCount },
        products: { needed: products.length, embedded: productEmbeddedCount, failed: productFailedCount },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
