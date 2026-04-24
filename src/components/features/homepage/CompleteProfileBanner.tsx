'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { X, UserCog } from 'lucide-react';

const DISMISS_KEY = 'horeca1:profile-nudge-dismissed-until';

type ProfileStatus = {
  isComplete: boolean;
  hasCorePersonalization: boolean;
};

export function CompleteProfileBanner() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<ProfileStatus | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;
    // Admins don't need to complete a customer profile
    if ((session?.user as { role?: string })?.role === 'admin') return;

    const until = typeof window !== 'undefined' ? window.localStorage.getItem(DISMISS_KEY) : null;
    if (until && Number(until) > Date.now()) return;

    let cancelled = false;
    fetch('/api/v1/me/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.success) return;
        setData(json.data);
        // Hide banner when user has core info (name + business + pincode), even if profileCompletedAt isn't explicitly set
        if (!json.data.isComplete && !json.data.hasCorePersonalization) setHidden(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (hidden || !data || data.isComplete || data.hasCorePersonalization) return null;

  const snooze = () => {
    if (typeof window === 'undefined') return;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + sevenDays));
    setHidden(true);
  };

  return (
    <div className="mx-[clamp(1rem,3vw,3rem)] mt-[clamp(0.75rem,2vw,1.5rem)] rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-[clamp(0.875rem,2vw,1.25rem)] shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <UserCog className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-[clamp(0.95rem,1.4vw,1.05rem)] font-semibold text-amber-900">
            Complete your profile for better recommendations
          </p>
          <p className="mt-0.5 text-[clamp(0.8rem,1.2vw,0.9rem)] text-amber-800/80">
            Add your pincode and business details to see vendors and prices tailored to you.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/profile"
            className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Complete
          </Link>
          <button
            type="button"
            onClick={snooze}
            aria-label="Remind me later"
            className="rounded-full p-2 text-amber-700 transition hover:bg-amber-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
