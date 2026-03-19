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
            className="w-full relative min-h-[300px] py-10 md:py-14"
            style={{
                background: 'linear-gradient(165deg, #2d7a46 0%, #3d9e5c 30%, #46b36e 70%, #2d7a46 100%)',
            }}
        >
            {/* Decorative floating elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[10%] left-[5%] w-8 h-4 bg-white/10 rounded-sm rotate-[25deg] shadow-sm animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[15%] left-[25%] w-6 h-3 bg-white/5 rounded-sm rotate-[-15deg] animate-float-mid backdrop-blur-sm" />
                <div className="absolute top-[8%] right-[15%] w-9 h-4.5 bg-white/10 rounded-sm rotate-[40deg] shadow-sm animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[20%] right-[8%] w-5 h-2.5 bg-white/5 rounded-sm rotate-[-30deg] animate-float-mid backdrop-blur-sm" />
                <div className="absolute top-[5%] left-[45%] w-7 h-3.5 bg-white/10 rounded-sm rotate-[10deg] animate-float-fast backdrop-blur-sm" />
                <div className="absolute top-[35%] left-[10%] w-8 h-4 bg-white/3 rounded-sm rotate-[-20deg] shadow-sm animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[25%] left-[60%] w-8 h-4 bg-white/3 rounded-sm rotate-[-20deg] animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[12%] right-[30%] w-5 h-2.5 bg-white/10 rounded-sm rotate-[50deg] animate-float-mid backdrop-blur-sm" />
                <div className="absolute top-[40%] right-[20%] w-7 h-3.5 bg-white/5 rounded-sm rotate-[15deg] shadow-sm animate-float-fast backdrop-blur-sm" />

                {/* Soft glowing circles for depth */}
                <div className="absolute -top-20 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            </div>

            {/* Content - Same container for header AND scroll for perfect alignment */}
            <div className="max-w-[var(--container-max)] mx-auto relative z-10 overflow-hidden">
                {/* Header Text */}
                <div className="px-6 md:px-[var(--container-padding)] pt-0 pb-2 md:pb-4">
                    <h2 className="text-white text-[24px] md:text-[32px] font-black tracking-tight drop-shadow-sm">
                        Vendors Near You
                    </h2>
                    <p className="text-white/80 text-[12px] md:text-[14px] font-medium mt-1">
                        Delivering to your area
                    </p>
                </div>

                {/* Horizontal Scroll - same container ensures alignment */}
                <div className="relative group mt-5 md:mt-6">
                    {/* Desktop scroll arrows */}
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className="hidden md:flex absolute left-2 lg:left-4 top-[82px] -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] items-center justify-center hover:scale-110 active:scale-95 transition-all border border-white/20 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={24} className="text-[#3d9e5c] mr-0.5" strokeWidth={3} />
                    </button>

                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        className="overflow-x-auto no-scrollbar scroll-smooth w-full"
                    >
                        <div className="flex gap-6 md:gap-10 pb-4 w-max px-6 md:px-[var(--container-padding)]">
                            {displayVendors.map((vendor, index) => {
                                let imgClass = "w-full h-full object-cover";
                                if (vendor.id === 'v3') {
                                    imgClass = "w-full h-full object-cover scale-[1.2]";
                                } else if (vendor.id === 'v7') {
                                    imgClass = "w-full h-full object-contain scale-[0.85]";
                                }

                                return (
                                    <Link
                                        key={`promo-${vendor.id}-${index}`}
                                        href={`/vendor/${vendor.id}`}
                                        className="flex-none flex flex-col items-center group/card snap-start"
                                    >
                                        <div className="w-[85px] h-[85px] md:w-[115px] md:h-[115px] rounded-full bg-white flex items-center justify-center mb-4 overflow-hidden shadow-[0_8px_25px_-5px_rgba(0,0,0,0.25)] group-hover/card:shadow-[0_12px_45px_-8px_rgba(0,0,0,0.4)] transition-all">
                                            <img
                                                src={vendor.logo}
                                                alt={vendor.name}
                                                className={imgClass}
                                            />
                                        </div>

                                        <h3 className="text-white text-[13px] md:text-[16px] font-black text-center leading-tight line-clamp-1 max-w-[90px] md:max-w-[130px] group-hover/card:text-[#FFD100] transition-colors drop-shadow-md">
                                            {vendor.name}
                                        </h3>

                                        <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full mt-2 border border-white/10">
                                            <span className="text-white text-[10px] md:text-[12px] font-black text-center tracking-tight">
                                                Flat {20 + (index % 4) * 5}% Off
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}


                        </div>
                    </div>

                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className="hidden md:flex absolute right-2 lg:right-4 top-[82px] -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] items-center justify-center hover:scale-110 active:scale-95 transition-all border border-white/20 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={24} className="text-[#3d9e5c] ml-0.5" strokeWidth={3} />
                    </button>
                </div>
            </div>
        </section>
    );
}
