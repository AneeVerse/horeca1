'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Scroll behavior across navigation:
 *
 * - Forward navigation (clicking a Link, router.push) → scroll to top of new page.
 *   Next.js App Router *usually* does this on <Link> clicks but it's unreliable when
 *   transitions, modals, or scroll-locked overlays interfere. This component
 *   forces a top-scroll whenever the pathname changes.
 *
 * - Back/forward navigation → restore the previous scroll position.
 *   That part is handled by `experimental.scrollRestoration: true` in next.config
 *   (the browser remembers position per history entry). We DETECT history pops
 *   here using the popstate event and skip the top-scroll for those.
 *
 * Mount once in the root layout. Anchor links (#hash) are honored — we don't
 * override scroll if the URL has a hash.
 */
export function ScrollRestoration() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isPopState = useRef(false);

    // Track whether the latest navigation came from the browser back/forward button.
    useEffect(() => {
        const handler = () => {
            isPopState.current = true;
            // Clear flag on the next tick — by then the pathname effect below
            // has already read it.
            setTimeout(() => { isPopState.current = false; }, 0);
        };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, []);

    useEffect(() => {
        // Browser back/forward → let scrollRestoration do its thing.
        if (isPopState.current) return;
        // Anchor link target → respect the hash, don't override.
        if (window.location.hash) return;
        // Forward nav → scroll to top.
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, searchParams]);

    return null;
}
