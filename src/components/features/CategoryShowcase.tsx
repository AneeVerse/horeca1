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

    // Duplicate categories for desktop to fill scroll area
    const desktopCategories = [...CATEGORIES, ...CATEGORIES];

    const scrollLeft = () => {
        desktopScrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' });
    };

    const scrollRight = () => {
        desktopScrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' });
    };

    const CategoryCard = ({ cat }: { cat: typeof CATEGORIES[0] }) => (
        <Link
            href={`/?searchOpen=true&q=${encodeURIComponent(cat.name)}&tab=stores`}
            className="flex flex-col items-center group transition-transform active:scale-95 snap-start w-full"
        >
            <div
                className="w-full aspect-square rounded-[18px] flex items-center justify-center mb-2 overflow-hidden relative border border-gray-50 shadow-sm transition-shadow group-hover:shadow-md"
                style={{ backgroundColor: cat.bgColor || '#F2F3F2' }}
            >
                <div className="relative w-[70%] h-[70%] transition-transform duration-300 group-hover:scale-110">
                    <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        className="object-contain"
                    />
                </div>
            </div>
            <p className="text-[11px] md:text-[13px] text-center font-bold text-[#181725] leading-tight px-0.5 line-clamp-2 h-[2.4em] group-hover:text-[#53B175] transition-colors">
                {cat.name}
            </p>
        </Link>
    );

    return (
        <section
            className="w-full pt-4 pb-6 bg-white relative z-30"
            suppressHydrationWarning={true}
        >
            <div className="max-w-[var(--container-max)] mx-auto overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-5 px-4 md:px-[var(--container-padding)]">
                    <h2 className="text-[16px] md:text-[20px] lg:text-[22px] font-bold text-[#181725]">Shop By Category</h2>
                    {/* Mobile toggle */}
                    <button
                        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                        className="text-[#53B175] font-bold text-sm transition-opacity hover:opacity-80 md:hidden"
                    >
                        {isMobileExpanded ? "Show Less" : "See All"}
                    </button>
                    {/* Desktop toggle */}
                    <button
                        onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
                        className="hidden md:block text-[#53B175] font-bold text-sm transition-opacity hover:opacity-80 cursor-pointer"
                    >
                        {isDesktopExpanded ? "Show Less" : "See All"}
                    </button>
                </div>

                {/* Content Area */}
                <div className="relative">
                    {/* Mobile: collapsed = 2-row horizontal scroll, expanded = wrapping grid */}
                    <div className="md:hidden">
                        {isMobileExpanded ? (
                            <div className="grid grid-cols-4 sm:grid-cols-4 gap-x-3 gap-y-6 pb-4 px-5  md:px-[var(--container-padding)]">
                                {CATEGORIES.map((cat, idx) => (
                                    <CategoryCard key={`mob-exp-${idx}`} cat={cat} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-rows-2 grid-flow-col overflow-x-auto no-scrollbar auto-cols-[100px] gap-x-4 gap-y-6 pb-6 px-4 md:px-[var(--container-padding)] scroll-smooth snap-x">
                                {CATEGORIES.map((cat, idx) => (
                                    <CategoryCard key={`mob-scr-${idx}`} cat={cat} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop: collapsed = 2-row horizontal scroll, expanded = wrapping grid */}
                    <div className="hidden md:block relative group/scroll w-full">
                        {!isDesktopExpanded && (
                            <button
                                onClick={scrollLeft}
                                className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-100 opacity-0 group-hover/scroll:opacity-100"
                            >
                                <ChevronLeft size={20} className="text-gray-500" />
                            </button>
                        )}

                        {isDesktopExpanded ? (
                            <div className="grid grid-cols-[repeat(auto-fill,110px)] lg:grid-cols-[repeat(auto-fill,125px)] justify-between gap-x-4 gap-y-8 pb-4 px-5 md:px-[var(--container-padding)]">
                                {desktopCategories.map((cat, idx) => (
                                    <CategoryCard key={`desk-exp-${idx}`} cat={cat} />
                                ))}
                            </div>
                        ) : (
                            <div
                                ref={desktopScrollRef}
                                className="grid grid-rows-2 grid-flow-col overflow-x-auto auto-cols-[115px] lg:auto-cols-[130px] gap-x-5 gap-y-8 no-scrollbar pb-6 px-5 md:px-[var(--container-padding)] scroll-smooth"
                            >
                                {desktopCategories.map((cat, idx) => (
                                    <CategoryCard key={`desk-scr-${idx}`} cat={cat} />
                                ))}
                            </div>
                        )}

                        {!isDesktopExpanded && (
                            <button
                                onClick={scrollRight}
                                className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-100 opacity-0 group-hover/scroll:opacity-100"
                            >
                                <ChevronRight size={20} className="text-gray-500" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
