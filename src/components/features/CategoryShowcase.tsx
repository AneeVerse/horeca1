'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const CATEGORIES = [
    { name: 'Vegetables', image: '/images/category/vegitable.png', count: '125+ Products', bgColor: '#e8f9e9' },
    { name: 'Fish & Meats', image: '/images/category/fish & meat.png', count: '80+ Products', bgColor: '#e8f9e9' },
    { name: 'Desserts', image: '/images/category/desset.png', count: '50+ Products', bgColor: '#e8f9e9' },
    { name: 'Drinks & Juice', image: '/images/category/drink-juice.png', count: '150+ Products', bgColor: '#e8f9e9' },
    { name: 'Animal Food', image: '/images/category/animal food.png', count: '40+ Products', bgColor: '#e8f9e9' },
    { name: 'Fresh Fruits', image: '/images/category/fruits.png', count: '110+ Products', bgColor: '#e8f9e9' },
    { name: 'Yummy Candy', image: '/images/category/candy.png', count: '95+ Products', bgColor: '#e8f9e9' },
    { name: 'Dairy & Milk', image: '/images/category/milk.png', count: '65+ Products', bgColor: '#e8f9e9' },
    { name: 'Snacks', image: '/images/category/snacks.png', count: '130+ Products', bgColor: '#e8f9e9' }
];

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CategoryShowcase() {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 300;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section className="w-full pt-6 pb-6 md:pt-16 md:pb-12 bg-white relative md:-mt-10 z-30">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] relative group/main">

                {/* ===== MOBILE LAYOUT ===== */}
                <div className="block md:hidden">
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-[0.9rem] font-[family-name:var(--font-inter)] font-[800] text-[#1e293b]">Shop By Category</h2>
                        <Link href="/categories" className="text-[#5cb85c] font-bold text-sm">
                            See All
                        </Link>
                    </div>

                    {/* Mobile Grid - 4 columns */}
                    <div className="grid grid-cols-4 gap-x-3 gap-y-6">
                        {CATEGORIES.slice(0, 8).map((cat, idx) => (
                            <Link
                                key={idx}
                                href={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                                className="flex flex-col items-center"
                            >
                                {/* Image Box */}
                                <div
                                    className="w-full aspect-square rounded-[15px] flex items-center justify-center mb-2.5 overflow-hidden"
                                    style={{ backgroundColor: '#f8f8f8' }}
                                >
                                    <img
                                        src={cat.image}
                                        alt={cat.name}
                                        className="w-[70%] h-[70%] object-contain"
                                    />
                                </div>
                                {/* Category Name */}
                                <p className="text-[11px] text-center font-bold text-[#1e293b] leading-[1.3] px-0.5">
                                    {cat.name}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ===== DESKTOP LAYOUT ===== */}
                <div className="hidden md:block">
                    {/* Navigation Arrows */}
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-[var(--container-padding)] top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-text-muted hover:text-primary transition-all opacity-0 group-hover/main:opacity-100 border border-gray-100"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-[var(--container-padding)] top-1/2 -translate-y-1/2 translate-x-1/2 z-50 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-text-muted hover:text-primary transition-all opacity-0 group-hover/main:opacity-100 border border-gray-100"
                    >
                        <ChevronRight size={24} />
                    </button>

                    {/* Scrollable Container */}
                    <div
                        ref={scrollRef}
                        className="flex overflow-x-auto pt-4 pb-4 gap-6 lg:gap-8 no-scrollbar scroll-smooth snap-x snap-mandatory justify-start"
                    >
                        {CATEGORIES.map((cat, idx) => (
                            <Link
                                key={idx}
                                href={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                                className="flex flex-col items-center flex-shrink-0 group snap-start"
                                style={{ width: 'clamp(110px, 12vw, 150px)' }}
                            >
                                {/* Image Circle */}
                                <div
                                    className="relative w-[130px] h-[130px] lg:w-[145px] lg:h-[145px] rounded-full flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/10 border-2 border-transparent group-hover:border-primary/20 overflow-hidden"
                                    style={{ backgroundColor: cat.bgColor }}
                                >
                                    <div className="relative w-[70%] h-[70%] group-hover:scale-110 transition-transform duration-500">
                                        <img
                                            src={cat.image}
                                            alt={cat.name}
                                            className="w-full h-full object-contain drop-shadow-md"
                                        />
                                    </div>
                                </div>

                                {/* Text Info */}
                                <div className="text-center">
                                    <h3 className="text-[16px] font-extrabold text-[#1a2b4b] mb-0.5 group-hover:text-primary transition-colors whitespace-nowrap">
                                        {cat.name}
                                    </h3>
                                    <p className="text-[12px] text-text-muted font-medium whitespace-nowrap opacity-60">
                                        {cat.count}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </section>
    );
}
