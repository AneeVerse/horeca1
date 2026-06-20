'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { sanitizeRedirect } from '@/lib/postLoginPicker';

/** Legacy: middleware used to send unauthenticated users to /?callbackUrl=… */
export function CallbackUrlRedirect() {
  const params = useSearchParams();

  useEffect(() => {
    const safe = sanitizeRedirect(params?.get('callbackUrl') ?? null);
    if (safe) {
      window.location.replace(`/login?redirect=${encodeURIComponent(safe)}`);
    }
  }, [params]);

  return null;
}
