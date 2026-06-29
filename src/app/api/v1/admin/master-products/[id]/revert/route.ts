// POST /api/v1/admin/master-products/:id/revert — rollback master + linked listings
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { requirePermission } from '@/lib/permissions/engine';
import { revertMasterProductRevision } from '@/modules/catalog/master-sync.service';

function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split('/');
  return segments[segments.length - 2];
}

const bodySchema = z.object({
  revisionId: z.string().uuid(),
});

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    requirePermission(ctx, 'products.edit');
    const id = extractId(req);
    const { revisionId } = bodySchema.parse(await req.json());

    await revertMasterProductRevision(revisionId, ctx.userId);

    return NextResponse.json({ success: true, data: { masterProductId: id, revisionId } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Revision not found') {
      return errorResponse(Errors.notFound('Revision'));
    }
    if (error instanceof Error && error.message === 'Revision expired') {
      return errorResponse(Errors.badRequest('Revision expired (7-day window)'));
    }
    return errorResponse(error);
  }
});
