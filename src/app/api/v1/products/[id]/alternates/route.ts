// GET /api/v1/products/:id/alternates
// WHY: When a product is out of stock on the PDP, surface up to 3 alternate
//      vendors that carry a similar product (same category or name token match)
//      with available stock so the buyer doesn't bounce.
// PUBLIC: No auth required — anyone browsing a PDP can read these suggestions.

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { errorResponse } from '@/middleware/errorHandler';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    // 1. Resolve the source product (just need name + category to find similar).
    const source = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, categoryId: true },
    });

    if (!source) {
      return NextResponse.json({ success: true, data: { alternates: [] } });
    }

    // Build name-token matchers: split on whitespace, keep tokens >= 3 chars.
    const tokens = (source.name || '')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length >= 3);

    const orClauses: Prisma.ProductWhereInput[] = [];
    if (source.categoryId) {
      orClauses.push({ categoryId: source.categoryId });
    }
    for (const token of tokens) {
      orClauses.push({ name: { contains: token, mode: 'insensitive' } });
    }

    // If we have neither a category nor usable tokens, no meaningful query.
    if (orClauses.length === 0) {
      return NextResponse.json({ success: true, data: { alternates: [] } });
    }

    const alternates = await prisma.product.findMany({
      where: {
        id: { not: productId },
        isActive: true,
        approvalStatus: 'approved',
        inventory: { qtyAvailable: { gt: 0 } },
        OR: orClauses,
      },
      include: {
        vendor: { select: { id: true, businessName: true, minOrderValue: true } },
        inventory: { select: { qtyAvailable: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    return NextResponse.json({ success: true, data: { alternates } });
  } catch (error) {
    return errorResponse(error);
  }
}
