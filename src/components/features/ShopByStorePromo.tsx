'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BrandStoreCard } from '@/components/features/brand/BrandStoreCard';

interface ApiBrand {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    banner: string | null;
    tagline: string | null;
    categories: string[];
    bgColor: string | null;
    showcaseImages: string[];
}

export function ShopByStorePromo() {
    const [brands, setBrands] = useState<ApiBrand[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/v1/brands?limit=12')
            .then(r => r.json())
            .then(d => setBrands(d.data?.brands ?? []))
            .catch(() => setBrands([]))
            .finally(() => setLoading(false));
    }, []);

    // Hide section entirely if no approved brands — better than showing a fake list.
    if (!loading && brands.length === 0) return null;

    const cards = brands.map(b => ({
        name: b.name,
        slug: b.slug,
        logoUrl: b.logo ?? undefined,
        productImages: b.showcaseImages.length > 0 ? [b.showcaseImages[0]] : [],
        categories: b.categories,
        bgColor: b.bgColor ?? '#f0faf4',
    }));

    return (
        <section className="w-full py-8 md:py-12">
            <div className="max-w-[var(--container-max)] mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-[var(--container-padding)]">
                    <h2 className="text-[20px] md:text-[24px] font-[900] text-[#181725] tracking-tight">
                        Shop by Brand
                    </h2>
                    <Link
                        href="/brands"
                        className="flex items-center gap-1 text-[#53B175] font-black text-sm hover:gap-2 transition-all cursor-pointer group"
                    >
                        See All <ChevronRight size={14} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                {loading ? (
                    <div className="flex gap-3 px-4 md:px-[var(--container-padding)]">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-[140px] md:w-full h-[260px] bg-gray-100 rounded-[24px] animate-pulse shrink-0" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Mobile: horizontal scroll */}
                        <div className="md:hidden flex gap-3 overflow-x-auto pb-3 px-4 scrollbar-none snap-x snap-mandatory">
                            {cards.map((brand) => (
                                <div key={brand.slug} className="snap-start shrink-0 w-[140px]">
                                    <BrandStoreCard {...brand} />
                                </div>
                            ))}
                        </div>

                        {/* Desktop: 6-column grid — portrait cards */}
                        <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-4 px-[var(--container-padding)]">
                            {cards.map((brand) => (
                                <BrandStoreCard key={brand.slug} {...brand} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
