// GET /api/v1/notifications — List notifications for the current user
// WHY: Powers the notification bell icon in the navbar
//      Shows: "Order #PO-2026-123456 confirmed", "Payment received", "Low stock alert", etc.
// PROTECTED: Must be logged in
// SUPPORTS: ?type=order&read=false&cursor=xxx&limit=20

import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/modules/notification/notification.service';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const notificationService = new NotificationService();

export const GET = withAuth(async (req: NextRequest, ctx) => {
  try {
    const params = req.nextUrl.searchParams;
    const options = {
      type: params.get('type') || undefined,
      read: params.has('read') ? params.get('read') === 'true' : undefined,
      cursor: params.get('cursor') || undefined,
      limit: params.has('limit') ? Number(params.get('limit')) : undefined,
    };

    const result = await notificationService.list(ctx.userId, options);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
});
