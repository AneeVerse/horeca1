// GET /api/v1/wallet — the logged-in customer's credit wallets (H1 + vendor lines).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

export const GET = withAuth(async (_req: NextRequest, ctx) => {
  try {
    const wallets = await prisma.creditWallet.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'asc' },
      include: {
        vendor: { select: { id: true, businessName: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 15 },
        repayments: { orderBy: { createdAt: 'desc' }, take: 10 },
        penalties: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    return NextResponse.json({ success: true, data: wallets });
  } catch (error) {
    return errorResponse(error);
  }
});
