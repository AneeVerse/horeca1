'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';


import { dal } from '@/lib/dal';
import type { Category } from '@/types';

// Background colors per category slug (visual styling — not data)
const CATEGORY_BG: Record<string, string> = {
    'vegetables': '#e8f9e9',
    'fruits': '#fff7ed',
    'dairy-eggs': '#eef2ff',
    'spices-masala': '#fef2f2',
    'grains-pulses': '#f5f3ff',
    'meat-poultry': '#fffbeb',
    'seafood': '#fdf4ff',
    'beverages': '#ecfdf5',
    'oils-ghee': '#f0fdf4',
    'packaging-supplies': '#f8fafc',
};

export function CategoryShowcase() {
    const [categories, setCategories] = useState<(Category & { bgColor: string })[]>([]);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
    useEffect(() => {
        dal.categories.list().then((cats) => {
            setCategories(cats.map(c => ({
                ...c,
                bgColor: CATEGORY_BG[c.slug] || '#f7f8fa',
            })));
        }).catch(console.error);
    }, []);

    if (categories.length === 0) return null;

    const CategoryCard = ({ cat }: { cat: (typeof categories)[0] }) => (
        <Link
            href={`/?searchOpen=true&q=${encodeURIComponent(cat.name)}&tab=stores`}
            className="flex flex-col items-center group transition-transform active:scale-95 w-full"
        >
            <div
                className="w-full aspect-square rounded-[22px] flex items-center justify-center mb-3 overflow-hidden relative border border-gray-50 shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-1"
                style={{ backgroundColor: cat.bgColor }}
            >
                <div className="relative w-[70%] h-[70%] rounded-[12px] overflow-hidden transition-transform duration-500 group-hover:scale-110">
                    <Image
                        src={cat.image || '/images/category/vegitable.png'}
                        alt={cat.name}
                        fill
                        className="object-cover"
                    />
                </div>
            </div>
            <h3 className="text-[12px] md:text-[14px] text-center font-extrabold text-[#181725] leading-tight px-0.5 line-clamp-2 min-h-[2.8em] group-hover:text-[#53B175] transition-colors">
                {cat.name}
            </h3>
        </Link>
    );

    return (
        <section
            className="w-full pt-8 pb-10 bg-white relative z-30"
            suppressHydrationWarning={true}
        >
            <div className="max-w-[var(--container-max)] mx-auto overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 px-6 md:px-[var(--container-padding)]">
                    <h2 className="text-[18px] md:text-[22px] lg:text-[24px] font-[900] text-[#181725] tracking-tight">Shop By Category</h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
                            className="hidden md:block text-[#53B175] font-black text-sm transition-all hover:translate-x-1 cursor-pointer"
                        >
                            {isDesktopExpanded ? "Show Less" : "See All"}
                        </button>

                        <button
                            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                            className="text-[#53B175] font-black text-sm transition-opacity hover:opacity-80 md:hidden"
                        >
                            {isMobileExpanded ? "Show Less" : "See All"}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative">
                    {/* Mobile: collapsed = 2-row horizontal scroll, expanded = wrapping grid */}
                    <div className="md:hidden">
                        <div className={cn(
                            "overflow-x-auto no-scrollbar scroll-smooth w-full",
                            isMobileExpanded && "overflow-x-visible"
                        )}>
                            <div className={cn(
                                "grid auto-cols-[100px] gap-x-4 gap-y-6 pb-6 px-6",
                                isMobileExpanded
                                    ? "grid-cols-3 w-auto"
                                    : "grid-rows-2 grid-flow-col w-max max-w-none"
                            )}>
                                {categories.map((cat) => (
                                    <CategoryCard key={cat.id} cat={cat} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Desktop: collapsed = single row, expanded = full wrapping grid */}
                    <div className="hidden md:block relative w-full">
                        <div className={cn(
                            "grid grid-cols-[repeat(auto-fill,minmax(115px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-x-5 gap-y-8 pb-4 px-6 md:px-[var(--container-padding)]",
                            !isDesktopExpanded && "max-h-[200px] overflow-hidden"
                        )}>
                            {categories.map((cat) => (
                                <CategoryCard key={cat.id} cat={cat} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
