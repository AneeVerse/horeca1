'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function SearchURLSync({ openSearch }: { openSearch: (tab: any, query: string) => void }) {
    const searchParams = useSearchParams();
    const router = useRouter();

    React.useEffect(() => {
        if (!searchParams) return;
        const searchOpen = searchParams.get('searchOpen');
        const q = searchParams.get('q');
        const tab = searchParams.get('tab');

        if (searchOpen === 'true') {
            openSearch(tab as any || 'items', q || '');

            // Clean up URL immediately to allow re-triggering
            const url = new URL(window.location.href);
            url.searchParams.delete('searchOpen');
            url.searchParams.delete('q');
            url.searchParams.delete('tab');
            router.replace(url.pathname + url.search, { scroll: false });
        }
    }, [searchParams, router, openSearch]);

    return null;
}
