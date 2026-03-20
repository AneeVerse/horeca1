// POST /api/v1/notifications/read-all — Mark ALL notifications as read
// WHY: "Mark all as read" button in the notification dropdown — common UX pattern
// PROTECTED: Must be logged in

import { NextResponse } from 'next/server';
import { NotificationService } from '@/modules/notification/notification.service';
import { withAuth } from '@/middleware/auth';
import { errorResponse } from '@/middleware/errorHandler';

const notificationService = new NotificationService();

export const POST = withAuth(async (_req, ctx) => {
  try {
    await notificationService.markAllRead(ctx.userId);
    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return errorResponse(error);
  }
});
