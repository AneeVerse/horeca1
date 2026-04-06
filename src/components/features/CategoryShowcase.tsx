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

interface CategoryShowcaseProps {
    filterByProducts?: { category: string }[];
    title?: string;
    onCategoryClick?: (categoryName: string) => void;
    activeCategory?: string;
}

export function CategoryShowcase({ filterByProducts, title = "Shop By Category", onCategoryClick, activeCategory }: CategoryShowcaseProps) {
    const [categories, setCategories] = useState<(Category & { bgColor: string })[]>([]);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
    
    useEffect(() => {
        dal.categories.list().then((cats) => {
            let filtered = cats;
            if (filterByProducts) {
                const uniqueVendorCats = new Set(filterByProducts.map(p => p.category));
                filtered = cats.filter(c => uniqueVendorCats.has(c.name));
            }

            setCategories(filtered.map(c => ({
                ...c,
                bgColor: CATEGORY_BG[c.slug] || '#f7f8fa',
            })));
        }).catch(console.error);
    }, [filterByProducts]);

    if (categories.length === 0) return null;

    const CategoryCard = ({ cat }: { cat: (typeof categories)[0] }) => {
        const isActive = activeCategory === `cat:${cat.name}`;
        
        return (
            <button
                onClick={() => onCategoryClick ? onCategoryClick(cat.name) : null}
                className="flex flex-col items-center group transition-transform active:scale-95 w-full"
            >
                <div
                    className={cn(
                        "w-full aspect-square rounded-[22px] flex items-center justify-center mb-3 overflow-hidden relative border transition-all duration-300",
                        isActive 
                            ? "border-[#53B175] shadow-[0_15px_40px_rgba(83,177,117,0.18)] ring-2 ring-[#53B175]/10 bg-white" 
                            : "border-gray-100 shadow-sm group-hover:shadow-[0_15px_30px_rgba(83,177,117,0.08)] group-hover:border-[#53B175]/30"
                    )}
                    style={{ backgroundColor: isActive ? 'white' : cat.bgColor }}
                >
                    <div className="relative w-[75%] h-[75%]">
                        <Image
                            src={cat.image || '/images/category/vegitable.png'}
                            alt={cat.name}
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>
                <h3 className={cn(
                    "text-[12px] md:text-[14px] text-center font-extrabold leading-tight px-0.5 line-clamp-2 min-h-[2.8em] transition-colors",
                    isActive ? "text-[#53B175]" : "text-[#181725] group-hover:text-[#53B175]"
                )}>
                    {cat.name}
                </h3>
            </button>
        );
    };

    return (
        <section
            className="w-full pt-8 pb-4 bg-white relative z-30"
            suppressHydrationWarning={true}
        >
            <div className="max-w-[var(--container-max)] mx-auto overflow-hidden">
                {/* Header (Optional) */}
                {title && (
                    <div className="flex items-center justify-between mb-8 px-6 md:px-[var(--container-padding)]">
                        <h2 className="text-[18px] md:text-[22px] lg:text-[24px] font-[900] text-[#181725] tracking-tight">{title}</h2>
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
                )}

                {/* Content Area */}
                <div className="relative">
                    {/* Mobile: collapsed = single-row horizontal scroll, expanded = wrapping grid */}
                    <div className="md:hidden">
                        <div className={cn(
                            "overflow-x-auto no-scrollbar scroll-smooth w-full",
                            isMobileExpanded && "overflow-x-visible"
                        )}>
                            {isMobileExpanded ? (
                                <div className="grid grid-cols-3 auto-cols-[100px] gap-x-4 gap-y-6 pb-6 px-6 w-auto">
                                    {categories.map((cat) => (
                                        <CategoryCard key={cat.id} cat={cat} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-start gap-4 pb-6 px-6 w-max">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="w-[100px] shrink-0">
                                            <CategoryCard cat={cat} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Desktop: Single row scroller (no-wrap) */}
                    <div className="hidden md:block relative w-full">
                        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-4 px-6 md:px-[var(--container-padding)]">
                            {categories.map((cat) => (
                                <div key={cat.id} className="w-[120px] lg:w-[140px] shrink-0">
                                    <CategoryCard cat={cat} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
