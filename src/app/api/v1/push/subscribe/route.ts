import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';
import { prisma } from '@/lib/prisma';
import type { AuthContext } from '@/middleware/auth';

interface SubscribeBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json() as SubscribeBody;
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ success: false, error: { message: 'Invalid subscription' } }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: ctx.userId, endpoint } },
      create: { userId: ctx.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
});

export const DELETE = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { endpoint } = await req.json() as { endpoint: string };
    await prisma.pushSubscription.deleteMany({
      where: { userId: ctx.userId, endpoint },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
});
