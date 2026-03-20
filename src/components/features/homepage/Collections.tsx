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
    icon: string;
    color: string;
    bgGradient: string;
}

// Style config for each collection slug — icon, main color, and gradient
const COLLECTION_STYLE: Record<string, { icon: string; color: string; bgGradient: string }> = {
    'weekend-specials': {
        icon: '🎉',
        color: '#FF6B6B',
        bgGradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    },
    'kitchen-essentials': {
        icon: '🍳',
        color: '#4ECDC4',
        bgGradient: 'linear-gradient(135deg, #4ECDC4 0%, #44B09E 100%)',
    },
    'new-arrivals': {
        icon: '✨',
        color: '#7C3AED',
        bgGradient: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
    },
};
const FALLBACK_STYLE = {
    icon: '📦',
    color: '#6366F1',
    bgGradient: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
};

export function Collections() {
    const [collections, setCollections] = useState<Collection[]>([]);

    useEffect(() => {
        dal.collections.list().then((data) => {
            const mapped = (data as unknown as Collection[]).map(c => {
                const style = COLLECTION_STYLE[c.slug] || FALLBACK_STYLE;
                return {
                    ...c,
                    icon: style.icon,
                    color: style.color,
                    bgGradient: style.bgGradient,
                };
            });
            setCollections(mapped);
        }).catch(() => {});
    }, []);

    if (collections.length === 0) return null;

    return (
        <section className="w-full py-6 md:py-8 bg-white">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[18px] md:text-[20px] lg:text-[24px] font-black text-[#181725]">
                        Curated Collections
                    </h2>
                    <Link href="/collections" className="text-[13px] font-bold text-[#53B175] flex items-center gap-0.5 hover:underline">
                        See all <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                    {collections.map((col) => (
                        <Link
                            key={col.id}
                            href={`/collections/${col.slug}`}
                            className="group relative overflow-hidden rounded-2xl p-5 md:p-6 flex flex-col justify-between min-h-[140px] md:min-h-[160px] active:scale-[0.98] transition-all hover:shadow-xl"
                            style={{ background: col.bgGradient }}
                        >
                            {/* Decorative circle */}
                            <div
                                className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"
                                style={{ backgroundColor: 'white' }}
                            />

                            <div className="relative z-10">
                                <span className="text-[36px] md:text-[40px] block mb-2 drop-shadow-sm">
                                    {col.icon}
                                </span>
                                <h3 className="text-[16px] md:text-[18px] font-black text-white leading-tight">
                                    {col.name}
                                </h3>
                                <p className="text-[12px] md:text-[13px] text-white/80 font-medium mt-1 leading-tight line-clamp-2">
                                    {col.description}
                                </p>
                            </div>

                            <div className="relative z-10 flex items-center gap-1 mt-3">
                                <span className="text-[12px] font-bold text-white/90 group-hover:text-white transition-colors">
                                    Explore
                                </span>
                                <ChevronRight size={14} className="text-white/70 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
