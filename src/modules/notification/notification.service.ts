import { prisma } from '@/lib/prisma';
import { createQueue } from '@/queues/setup';
import type { Queue } from 'bullmq';
import type { NotificationChannel } from '@prisma/client';

// Lazy queue creation — only connects to Redis when first notification is sent
let _queue: Queue | null = null;
function getQueue() {
  if (!_queue) _queue = createQueue('notification');
  return _queue;
}

interface SendNotificationInput {
  userId: string;
  type: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  referenceId?: string;
  referenceType?: string;
}

export class NotificationService {
  async send(input: SendNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel: input.channel,
        title: input.title,
        body: input.body,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        status: 'pending',
      },
    });

    // Queue for async delivery
    await getQueue().add('send', {
      notificationId: notification.id,
      ...input,
    });

    return notification;
  }

  async list(userId: string, options: { type?: string; read?: boolean; cursor?: string; limit?: number }) {
    const { type, read, cursor, limit = 20 } = options;
    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;
    if (read !== undefined) where.readAt = read ? { not: null } : null;

    const notifications = await prisma.notification.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = notifications.length > limit;
    if (hasMore) notifications.pop();

    return {
      notifications,
      pagination: { next_cursor: hasMore ? notifications[notifications.length - 1]?.id : null, has_more: hasMore },
    };
  }

  async markRead(notificationId: string, userId: string) {
    return prisma.notification.update({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
