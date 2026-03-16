'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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

import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';

export function CategoryShowcase() {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const visibleCategories = isExpanded ? CATEGORIES : CATEGORIES;

    return (
        <section 
            className="w-full pt-4 pb-6 bg-white relative z-30 overflow-hidden"
            suppressHydrationWarning={true}
        >
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[16px] md:text-[20px] lg:text-[22px] font-bold text-[#181725]">Shop By Category</h2>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[#53B175] font-bold text-sm flex items-center gap-1 transition-opacity hover:opacity-80 md:hidden"
                    >
                        {isExpanded ? "Show Less" : "See All"}
                    </button>
                </div>

                {/* Categories Container */}
                <div
                    ref={scrollRef}
                    className={cn(
                        "gap-x-4 gap-y-6 no-scrollbar transition-all duration-300",
                        isExpanded
                            ? "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 pb-4"
                            : "grid grid-rows-2 grid-flow-col overflow-x-auto auto-cols-[90px] gap-x-3 pb-4 scroll-smooth snap-x md:grid-rows-none md:grid-flow-row md:overflow-x-visible md:auto-cols-auto md:grid-cols-6 md:gap-x-4 lg:grid-cols-8 xl:grid-cols-10"
                    )}
                >
                    {visibleCategories.map((cat, idx) => (
                        <Link
                            key={idx}
                            href={`/?searchOpen=true&q=${encodeURIComponent(cat.name)}&tab=vendors`}
                            className={cn(
                                "flex flex-col items-center group transition-transform active:scale-95 snap-start w-full"
                            )}
                        >
                            {/* Image Box */}
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
                            {/* Category Name */}
                            <p className="text-[11px] md:text-[13px] text-center font-bold text-[#181725] leading-tight px-0.5 line-clamp-2 h-[2.4em] group-hover:text-[#53B175] transition-colors">
                                {cat.name}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
