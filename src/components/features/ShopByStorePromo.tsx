'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { MOCK_VENDORS } from '@/lib/mockData';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ShopByStorePromo() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            checkScroll();
            el.addEventListener('scroll', checkScroll);
            return () => el.removeEventListener('scroll', checkScroll);
        }
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 300;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    // Standard mock login state - consistency with other homepage sections
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    }, []);

    if (!isMounted || !isLoggedIn) return null;

    // Use a subset of vendors for display
    const displayVendors = MOCK_VENDORS.slice(0, 12);

    return (
        <section
            className="w-full overflow-hidden relative min-h-[300px]"
            style={{
                background: 'linear-gradient(135deg, #3d9e5c 0%, #53B175 40%, #8be8b5 80%, #3d9e5c 100%)',
            }}
        >
            {/* Decorative floating elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                {/* Floating money/confetti shapes */}
                <div className="absolute top-[10%] left-[5%] w-8 h-4 bg-white/20 rounded-sm rotate-[25deg] shadow-sm animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[15%] left-[25%] w-6 h-3 bg-white/15 rounded-sm rotate-[-15deg] animate-float-mid backdrop-blur-sm" />
                <div className="absolute top-[8%] right-[15%] w-9 h-4.5 bg-white/20 rounded-sm rotate-[40deg] shadow-sm animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[20%] right-[8%] w-5 h-2.5 bg-white/15 rounded-sm rotate-[-30deg] animate-float-mid backdrop-blur-sm" />
                <div className="absolute top-[5%] left-[45%] w-7 h-3.5 bg-white/20 rounded-sm rotate-[10deg] animate-float-fast backdrop-blur-sm" />
                <div className="absolute top-[35%] left-[10%] w-8 h-4 bg-white/5 rounded-sm rotate-[-20deg] shadow-sm animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[25%] left-[60%] w-8 h-4 bg-white/5 rounded-sm rotate-[-20deg] animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[12%] right-[30%] w-5 h-2.5 bg-white/20 rounded-sm rotate-[50deg] animate-float-mid backdrop-blur-sm" />
                <div className="absolute top-[40%] right-[20%] w-7 h-3.5 bg-white/10 rounded-sm rotate-[15deg] shadow-sm animate-float-fast backdrop-blur-sm" />

                {/* Soft glowing circles for depth */}
                <div className="absolute -top-20 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Top Header Text - Now left-aligned and cleaner */}
                <div className="max-w-[var(--container-max)] mx-auto px-6 md:px-[var(--container-padding)] pt-10 md:pt-14 pb-1">
                    <h2 className="text-white text-[24px] md:text-[32px] font-black tracking-tight drop-shadow-sm">
                        Vendors Near You
                    </h2>
                    <p className="text-white/80 text-[12px] md:text-[14px] font-medium mt-1">
                        Delivering to your area
                    </p>
                </div>

                {/* Vendor Logos Horizontal Scroll */}
                <div className="pb-7 md:pb-10 pt-5 md:pt-6 w-full">
                    <div className="max-w-[var(--container-max)] mx-auto relative px-0 md:px-[var(--container-padding)] group/scroll">
                        {/* Desktop scroll arrows - Now centered on the circles and refined style */}
                        {canScrollLeft && (
                            <button
                                onClick={() => scroll('left')}
                                className="hidden md:flex absolute left-0 top-[82px] -translate-y-1/2 z-20 w-11 h-11 bg-white/95 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white hover:scale-110 transition-all cursor-pointer -translate-x-1/2 opacity-0 group-hover/scroll:opacity-100 border border-white/20"
                            >
                                <ChevronLeft size={24} className="text-[#3d9e5c] mr-0.5" />
                            </button>
                        )}

                        <div
                            ref={scrollRef}
                            onScroll={checkScroll}
                            className="flex gap-5 md:gap-8 overflow-x-auto no-scrollbar scroll-smooth pb-4"
                        >
                            {/* Spacer for mobile alignment (align with px-6 header text) */}
                            <div className="flex-none w-6 md:hidden" />

                            {displayVendors.map((vendor, index) => {
                                // Apply custom scaling/fitting for specific mock logos
                                let imgClass = "w-full h-full object-cover";
                                if (vendor.id === 'v3') {
                                    // M Mart: needs zoom to remove baked-in white edges
                                    imgClass = "w-full h-full object-cover scale-[1.2]";
                                } else if (vendor.id === 'v7') {
                                    // Mentari Mart is too wide and text-heavy, needs contain so it doesn't get cropped
                                    imgClass = "w-full h-full object-contain scale-[0.85]";
                                }

                                return (
                                    <Link
                                        key={`promo-${vendor.id}-${index}`}
                                        href={`/vendor/${vendor.id}`}
                                        className="flex-none flex flex-col items-center group"
                                    >
                                        {/* Logo Circle */}
                                        <div className="w-[90px] h-[90px] md:w-[115px] md:h-[115px] rounded-full bg-white flex items-center justify-center mb-4 overflow-hidden shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1)] group-hover:shadow-[0_12px_35px_-8px_rgba(0,0,0,0.2)] transition-shadow">
                                            <img
                                                src={vendor.logo}
                                                alt={vendor.name}
                                                className={imgClass}
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Vendor Name */}
                                        <h3 className="text-white text-[14px] md:text-[17px] font-black text-center leading-tight line-clamp-1 max-w-[100px] md:max-w-[140px] group-hover:text-[#FFD700] transition-colors drop-shadow-sm">
                                            {vendor.name}
                                        </h3>

                                        {/* Discount Badge */}
                                        <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full mt-2 border border-white/10">
                                            <span className="text-white text-[11px] md:text-[13px] font-black text-center tracking-wide">
                                                Flat {20 + (index % 4) * 5}% Off
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}

                            {/* End spacer for mobile */}
                            <div className="flex-none w-6 md:hidden" />
                        </div>

                        {canScrollRight && (
                            <button
                                onClick={() => scroll('right')}
                                className="hidden md:flex absolute right-0 top-[82px] -translate-y-1/2 z-20 w-11 h-11 bg-white/95 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white hover:scale-110 transition-all cursor-pointer translate-x-1/2 opacity-0 group-hover/scroll:opacity-100 border border-white/20"
                            >
                                <ChevronRight size={24} className="text-[#3d9e5c] ml-0.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
