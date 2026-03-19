'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORIES = [
    { name: 'Fruits & Vegetables', image: '/images/category/vegitable.png', count: '125+ Products', bgColor: '#e8f9e9' },
    { name: 'Dairy', image: '/images/category/milk.png', count: '80+ Products', bgColor: '#eef2ff' },
    { name: 'Canned & Imported', image: '/images/category/animal food.png', count: '50+ Products', bgColor: '#fff7ed' },
    { name: 'Flours', image: '/images/category/snacks.png', count: '150+ Products', bgColor: '#fef2f2' },
    { name: 'Sauces & Seasoning', image: '/images/category/desset.png', count: '40+ Products', bgColor: '#fdf4ff' },
    { name: 'Masala, Salt & Sugar', image: '/images/category/candy.png', count: '110+ Products', bgColor: '#eff6ff' },
    { name: 'Chicken & Eggs', image: '/images/category/fish & meat.png', count: '95+ Products', bgColor: '#fffbeb' },
    { name: 'Edible Oils', image: '/images/category/fruits.png', count: '65+ Products', bgColor: '#f0fdf4' },
    { name: 'Custom Packaging', image: '/images/category/vegitable.png', count: '130+ Products', bgColor: '#f8fafc' },
    { name: 'Frozen & Instant Food', image: '/images/category/frozen foods.png', count: '125+ Products', bgColor: '#f0f9ff' },
    { name: 'Packaging Material', image: '/images/category/vegitable.png', count: '80+ Products', bgColor: '#fdf2f8' },
    { name: 'Bakery & Chocolates', image: '/images/category/candy.png', count: '50+ Products', bgColor: '#fff1f2' },
    { name: 'Beverages & Mixers', image: '/images/category/drink-juice.png', count: '150+ Products', bgColor: '#ecfdf5' },
    { name: 'Cleaning & Consumables', image: '/images/category/vegitable.png', count: '40+ Products', bgColor: '#fafaf9' },
    { name: 'Pulses', image: '/images/category/snacks.png', count: '110+ Products', bgColor: '#f5f3ff' },
    { name: 'Mutton, Duck & Meat', image: '/images/category/fish & meat.png', count: '95+ Products', bgColor: '#fdfcf0' },
    { name: 'Dry Fruits & Nuts', image: '/images/category/snacks.png', count: '65+ Products', bgColor: '#fff7ed' },
    { name: 'Rice & Rice Products', image: '/images/category/snacks.png', count: '130+ Products', bgColor: '#f0fdfa' },
    { name: 'Fish, Prawns & Seafood', image: '/images/category/fish & meat.png', count: '125+ Products', bgColor: '#fef2f2' }
];

export function CategoryShowcase() {
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
    const desktopScrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (desktopScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = desktopScrollRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    // Duplicate categories for desktop to fill scroll area
    const desktopCategories = [...CATEGORIES, ...CATEGORIES];

    const scroll = (direction: 'left' | 'right') => {
        if (desktopScrollRef.current) {
            const amount = 500;
            desktopScrollRef.current.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth'
            });
            setTimeout(checkScroll, 350);
        }
    };

    const CategoryCard = ({ cat }: { cat: typeof CATEGORIES[0] }) => (
        <Link
            href={`/?searchOpen=true&q=${encodeURIComponent(cat.name)}&tab=stores`}
            className="flex flex-col items-center group transition-transform active:scale-95 w-full"
        >
            <div
                className="w-full aspect-square rounded-[22px] flex items-center justify-center mb-3 overflow-hidden relative border border-gray-50 shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-1"
                style={{ backgroundColor: cat.bgColor || '#F2F3F2' }}
            >
                <div className="relative w-[70%] h-[70%] transition-transform duration-500 group-hover:scale-110">
                    <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        className="object-contain"
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
                        {/* Desktop toggle */}
                        <button
                            onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
                            className="hidden md:block text-[#53B175] font-black text-sm transition-all hover:translate-x-1 cursor-pointer"
                        >
                            {isDesktopExpanded ? "Show Less" : "See All"}
                        </button>
                        {/* Mobile toggle */}
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
                        {isMobileExpanded ? (
                            <div className="grid grid-cols-4 sm:grid-cols-4 gap-x-3 gap-y-6 pb-4 px-6 md:px-[var(--container-padding)]">
                                {CATEGORIES.map((cat, idx) => (
                                    <CategoryCard key={`mob-exp-${idx}`} cat={cat} />
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto no-scrollbar scroll-smooth w-full">
                                <div className="grid grid-rows-2 grid-flow-col auto-cols-[100px] gap-x-4 gap-y-6 pb-6 px-6 md:px-[var(--container-padding)] w-max max-w-none">
                                    {CATEGORIES.map((cat, idx) => (
                                        <CategoryCard key={`mob-scr-${idx}`} cat={cat} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Desktop: collapsed = 2-row horizontal scroll, expanded = wrapping grid */}
                    <div className="hidden md:block relative w-full">
                        {!isDesktopExpanded && (
                            <button
                                onClick={() => scroll('left')}
                                disabled={!canScrollLeft}
                                className="absolute -left-2 top-[45%] -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                <ChevronLeft size={24} className="text-[#181725]" strokeWidth={2.5} />
                            </button>
                        )}

                        {isDesktopExpanded ? (
                            <div className="grid grid-cols-[repeat(auto-fill,115px)] lg:grid-cols-[repeat(auto-fill,135px)] justify-between gap-x-5 gap-y-10 pb-4 px-6 md:px-[var(--container-padding)]">
                                {desktopCategories.map((cat, idx) => (
                                    <CategoryCard key={`desk-exp-${idx}`} cat={cat} />
                                ))}
                            </div>
                        ) : (
                            <div
                                ref={desktopScrollRef}
                                onScroll={checkScroll}
                                className="overflow-x-auto no-scrollbar scroll-smooth w-full"
                            >
                                <div className="grid grid-rows-2 grid-flow-col auto-cols-[125px] lg:auto-cols-[145px] gap-x-6 gap-y-10 pb-8 px-6 md:px-[var(--container-padding)] w-max max-w-none">
                                    {desktopCategories.map((cat, idx) => (
                                        <CategoryCard key={`desk-scr-${idx}`} cat={cat} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isDesktopExpanded && (
                            <button
                                onClick={() => scroll('right')}
                                disabled={!canScrollRight}
                                className="absolute -right-2 top-[45%] -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                <ChevronRight size={24} className="text-[#181725]" strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
