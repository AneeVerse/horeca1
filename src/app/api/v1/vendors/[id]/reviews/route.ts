// GET /api/v1/vendors/:id/reviews — Get paginated reviews + rating distribution for a vendor
// WHY: Displayed in the vendor store's "Ratings" tab.
//      Shows real reviews with distribution bars instead of hardcoded dummy data.
// PUBLIC: No auth required

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, Errors } from '@/middleware/errorHandler';

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    // /api/v1/vendors/{id}/reviews → id is at index [5]
    const vendorId = segments[5];
    const cursor = url.searchParams.get('cursor') || undefined;
    const limit = Math.min(Number(url.searchParams.get('limit') || PAGE_SIZE), 50);

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, rating: true },
    });
    if (!vendor) throw Errors.notFound('Vendor');

    // Paginated reviews
    const reviews = await prisma.review.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
    });

    const hasMore = reviews.length > limit;
    if (hasMore) reviews.pop();

    // Rating distribution (count per star 1–5)
    const distribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { vendorId },
      _count: { rating: true },
    });

    const totalCount = await prisma.review.count({ where: { vendorId } });

    // Build distribution map: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distribution) {
      dist[row.rating] = row._count.rating;
    }

    // Convert to percentages
    const distPercent = Object.fromEntries(
      Object.entries(dist).map(([star, count]) => [
        star,
        totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
      ])
    );

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviews.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          reviewerName: r.user.fullName || 'Customer',
        })),
        distribution: distPercent,
        totalCount,
        pagination: {
          hasMore,
          nextCursor: hasMore && reviews.length > 0 ? reviews[reviews.length - 1].id : null,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
