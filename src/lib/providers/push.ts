import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || 'mailto:team.horeca1@gmail.com';
  if (!pub || !priv) return;
  webpush.setVapidDetails(sub, pub, priv);
  configured = true;
}

export async function sendPushToUser(userId: string, title: string, body: string, url?: string) {
  ensureConfigured();
  if (!configured) {
    console.warn('[push:dev] VAPID keys not set — skipping push for user', userId);
    return;
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify({ title, body, url: url ?? '/' });

  await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      ).catch(async err => {
        // 410 Gone = subscription expired, clean it up
        if (err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      })
    )
  );
}
