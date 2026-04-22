'use client';

import { useState, useEffect, useCallback } from 'react';

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PushPermission);

    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub));
    }).catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission as PushPermission);
      if (permission !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!).buffer as ArrayBuffer,
      });

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch('/api/v1/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      setSubscribed(true);
    } catch { /* user dismissed or error */ }
    finally { setLoading(false); }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/v1/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
        setSubscribed(false);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  return { permission, subscribed, loading, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
