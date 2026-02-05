'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Brand logos from the folder
const BRANDS = [
    { id: 1, name: 'Organic Brand 1', image: '/images/shope by brand/brand-img1.png' },
    { id: 2, name: 'Organic Brand 2', image: '/images/shope by brand/brand-img2.png' },
    { id: 3, name: 'Organic Brand 3', image: '/images/shope by brand/brand-img3.png' },
    { id: 4, name: 'Organic Brand 4', image: '/images/shope by brand/brand-img4.png' },
    { id: 5, name: 'Organic Brand 5', image: '/images/shope by brand/brand-img7.png' },
    { id: 6, name: 'Organic Brand 6', image: '/images/shope by brand/brand-img1.png' },
    { id: 7, name: 'Organic Brand 7', image: '/images/shope by brand/brand-img2.png' },
    { id: 8, name: 'Organic Brand 8', image: '/images/shope by brand/brand-img3.png' },
    { id: 9, name: 'Organic Brand 9', image: '/images/shope by brand/brand-img4.png' },
    { id: 10, name: 'Organic Brand 10', image: '/images/shope by brand/brand-img7.png' },
];

export function ShopByBrands() {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 250;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <section className="w-full pb-16 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Container with light green background */}
                <div className="bg-[#f0f9f0] rounded-[24px] p-6 md:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[24px] md:text-[28px] font-bold text-text">Shop by Brands</h2>
                        <div className="flex items-center gap-4">
                            <Link href="/brands" className="hidden md:block text-[14px] font-bold text-text-muted hover:text-primary transition-colors">
                                View All Deals
                            </Link>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => scroll('left')}
                                    className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-text-muted hover:bg-primary hover:text-white transition-all shadow-sm"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => scroll('right')}
                                    className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-text-muted hover:bg-primary hover:text-white transition-all shadow-sm"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Brands Carousel - Manual Only */}
                    <div className="relative">
                        <div
                            ref={scrollRef}
                            className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-2"
                        >
                            {BRANDS.map((brand) => (
                                <Link
                                    key={brand.id}
                                    href={`/brands/${brand.id}`}
                                    className="flex-none w-[80px] md:w-[140px] aspect-square bg-white rounded-full p-2 md:p-4 flex items-center justify-center shadow-sm hover:shadow-lg transition-all duration-300 group snap-start border border-gray-100"
                                >
                                    <img
                                        src={brand.image}
                                        alt={brand.name}
                                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
