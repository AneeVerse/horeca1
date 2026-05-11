'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Disable browser's automatic scroll restoration — we handle it ourselves below.
// Without this the browser also tries to restore on back/forward, which collides
// with our restore-after-async-content-settles logic and lands the user in the
// wrong spot (often the footer when the homepage's lazy sections aren't loaded yet).
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
}

/**
 * Scroll behaviour across navigation, robust to async-loaded content:
 *
 * - Forward navigation (Link click / router.push) → scroll to top of new page.
 * - Back/forward navigation (browser button) → restore previous scroll position
 *   FOR THIS specific URL, retrying via requestAnimationFrame until the document
 *   is tall enough to actually reach the target (so async sections like Top Rated
 *   and Vendors have time to fill in before we lock the scroll position).
 * - Anchor links (#hash) → respected, never overridden.
 *
 * Scroll positions are stashed in sessionStorage keyed by full URL (path + query),
 * so two browser tabs don't collide and history-pop knows where to go.
 */
export function ScrollRestoration() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isPopState = useRef(false);
    const currentKey = useRef<string>('');

    const buildKey = (path: string, query: string) => `scroll:${path}${query ? '?' + query : ''}`;

    // Mark back/forward navigations so the effect below knows to restore, not reset.
    useEffect(() => {
        const handler = () => { isPopState.current = true; };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, []);

    // Save scroll position before the user navigates away (covers Link clicks AND
    // browser-tab-close). We re-save on every scroll, throttled to one rAF tick,
    // so the value is fresh when navigation happens.
    useEffect(() => {
        const key = buildKey(pathname, searchParams?.toString() ?? '');
        currentKey.current = key;

        let scheduled = false;
        const save = () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                sessionStorage.setItem(currentKey.current, String(window.scrollY));
                scheduled = false;
            });
        };
        window.addEventListener('scroll', save, { passive: true });
        window.addEventListener('beforeunload', save);
        return () => {
            save(); // final write on unmount (Link click triggers this before route change)
            window.removeEventListener('scroll', save);
            window.removeEventListener('beforeunload', save);
        };
    }, [pathname, searchParams]);

    // Apply the right scroll on every navigation.
    useEffect(() => {
        // Respect anchor links — they manage their own scroll.
        if (window.location.hash) return;

        const key = buildKey(pathname, searchParams?.toString() ?? '');

        if (isPopState.current) {
            // Back / forward → restore previous scroll for this URL.
            isPopState.current = false;
            const saved = sessionStorage.getItem(key);
            if (saved === null) {
                // No saved position (first visit via history) — top.
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                return;
            }
            const targetY = parseInt(saved, 10);
            if (!Number.isFinite(targetY) || targetY < 0) return;

            // Retry until the document is tall enough to reach the target. Async
            // sections (fetches, suspense boundaries, images) keep growing the page
            // for the first ~500ms — keep nudging the scroll until we can land.
            const deadline = performance.now() + 1500; // hard cap so we don't loop forever
            const tick = () => {
                const maxReachable = document.documentElement.scrollHeight - window.innerHeight;
                window.scrollTo({ top: Math.min(targetY, Math.max(0, maxReachable)), left: 0, behavior: 'instant' });
                if (maxReachable >= targetY) return; // done — page is now tall enough
                if (performance.now() > deadline) return; // give up; we did our best
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        } else {
            // Forward navigation → start at the top.
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
    }, [pathname, searchParams]);

    return null;
}
