'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandStoreCardProps {
    name: string;
    slug: string;
    logoUrl?: string;
    productImages?: string[];
    categories?: string[];
    bgColor?: string;
    className?: string;
}

export function BrandStoreCard({
    name,
    slug,
    logoUrl,
    productImages = [],
    categories = [],
    bgColor = '#fce4ec',
    className,
}: BrandStoreCardProps) {
    const img = productImages[0];

    return (
        <Link
            href={`/brand/${slug}`}
            className={cn(
                'group relative bg-white rounded-[24px] border border-gray-200',
                'shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)]',
                'hover:-translate-y-1 transition-all duration-300',
                'flex flex-col overflow-visible cursor-pointer',
                className,
            )}
        >
            {/* ── TOP: coloured product-image area ── */}
            <div
                className="relative w-full rounded-t-[24px] overflow-hidden h-[110px] md:h-[160px]"
                style={{ backgroundColor: bgColor }}
            >
                {img ? (
                    <Image
                        src={img}
                        alt={name}
                        fill
                        sizes="240px"
                        className="object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[52px] font-black text-white/30 select-none">{name[0]}</span>
                    </div>
                )}
            </div>

            {/* ── LOGO bubble — overlaps colour/white boundary ── */}
            <div className="absolute left-1/2 -translate-x-1/2 z-10 top-[78px] md:top-[124px]">
                <div className="w-[64px] h-[64px] rounded-full border-4 border-white shadow-[0_4px_16px_rgba(0,0,0,0.14)] overflow-hidden bg-white flex items-center justify-center">
                    {logoUrl ? (
                        <Image
                            src={logoUrl}
                            alt={name}
                            width={56}
                            height={56}
                            className="object-contain w-full h-full"
                        />
                    ) : (
                        <span className="text-[22px] font-black text-gray-300 select-none">{name[0]}</span>
                    )}
                </div>
            </div>

            {/* ── BOTTOM: name, categories, CTA ── */}
            <div className="pt-8 md:pt-10 pb-3 md:pb-4 px-3 md:px-4 flex flex-col items-center gap-2">
                <h3 className="text-[15px] font-black italic text-[#1a1a5e] text-center leading-tight tracking-tight">
                    {name}
                </h3>

                {categories.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full px-1">
                        {categories.slice(0, 4).map((cat) => (
                            // Stop propagation so clicking a category doesn't also navigate to brand store
                            <Link
                                key={cat}
                                href={`/search?q=${encodeURIComponent(cat)}&brand=${encodeURIComponent(name)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-semibold italic text-[#1a1a5e] flex items-start gap-1 leading-snug hover:text-[#53B175] transition-colors"
                            >
                                <span className="mt-[2px] shrink-0">•</span>
                                <span className="truncate">{cat}</span>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="w-full mt-1 py-2 bg-[#53B175] rounded-full text-center group-hover:bg-[#3d9e5f] transition-colors">
                    <span className="text-[11px] font-bold text-white">
                        Explore Store
                    </span>
                </div>
            </div>
        </Link>
    );
}
