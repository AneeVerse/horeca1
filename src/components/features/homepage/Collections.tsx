'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dal } from '@/lib/dal';
import { ChevronRight } from 'lucide-react';

interface Collection {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    category: string;
}

const COLLECTION_STYLE: Record<string, { image: string; category: string }> = {
    'weekend-specials': {
        image: '/images/collections/weekend.png',
        category: 'WEEKEND DEALS',
    },
    'kitchen-essentials': {
        image: '/images/collections/kitchen.png',
        category: 'KITCHEN & DINING',
    },
    'new-arrivals': {
        image: '/images/collections/new-arrivals.png',
        category: 'JUST ARRIVED',
    },
};

const FALLBACK_STYLE = {
    image: '/images/collections/kitchen.png',
    category: 'COLLECTION',
};

export function Collections() {
    const [collections, setCollections] = useState<Collection[]>([]);

    useEffect(() => {
        dal.collections.list().then((data) => {
            const mapped = (data as unknown as Collection[]).map((c) => {
                const style = COLLECTION_STYLE[c.slug] || FALLBACK_STYLE;
                return { ...c, ...style };
            });
            setCollections(mapped);
        }).catch(() => {});
    }, []);

    if (collections.length === 0) return null;

    return (
        <section className="w-full py-8 md:py-14">
            <div className="max-w-[var(--container-max)] mx-auto px-4 md:px-[var(--container-padding)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-5 md:mb-8">
                    <h2 className="text-[20px] md:text-[28px] font-[800] text-[#181725] tracking-tight">
                        Curated Collections
                    </h2>
                    <Link
                        href="/collections"
                        className="flex items-center gap-1 text-[13px] md:text-[15px] font-[700] text-[#299E60] hover:opacity-80 transition-opacity"
                    >
                        See All <ChevronRight size={16} />
                    </Link>
                </div>

                {/* Mobile: 2-col side-by-side | Desktop: 3-col */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
                    {collections.map((col) => (
                        <Link
                            key={col.id}
                            href={`/collections/${col.slug}`}
                            className="group block"
                        >
                            <CardInner col={col} />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CardInner({ col }: { col: Collection }) {
    return (
        <div className="relative rounded-[14px] md:rounded-[18px] overflow-hidden aspect-[5/6] md:aspect-[16/9] shadow-md shadow-black/8 group-hover:shadow-xl transition-shadow duration-300">
            {/* Image */}
            <img
                src={col.image}
                alt={col.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />

            {/* Green-tinted gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#072e16]/90 via-[#072e16]/25 to-transparent" />

            {/* Category pill — frosted glass */}
            <div className="absolute top-2.5 left-2.5 md:top-4 md:left-4 z-10">
                <span className="inline-block px-2 py-[3px] md:px-3 md:py-1 rounded-full bg-white/15 backdrop-blur-md text-[7px] md:text-[10px] font-[700] tracking-[0.14em] text-white/90 uppercase">
                    {col.category}
                </span>
            </div>

            {/* Arrow button — theme green */}
            <div className="absolute top-2.5 right-2.5 md:top-4 md:right-4 w-7 h-7 md:w-9 md:h-9 rounded-full bg-[#299E60] flex items-center justify-center z-10 group-hover:bg-[#238a52] transition-colors shadow-lg shadow-black/30">
                <ChevronRight size={14} className="text-white md:!w-[18px] md:!h-[18px]" strokeWidth={2.5} />
            </div>

            {/* Title — bottom, clean white */}
            <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 z-10">
                <h3 className="text-[14px] md:text-[20px] font-[800] text-white leading-tight tracking-tight drop-shadow-sm">
                    {col.name}
                </h3>
                <p className="text-[10px] md:text-[12px] text-white/60 font-[500] mt-0.5 md:mt-1">
                    {col.description}
                </p>
            </div>
        </div>
    );
}
