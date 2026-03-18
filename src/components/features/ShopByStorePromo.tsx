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
                <div className="absolute top-[35%] left-[10%] w-8 h-4 bg-white/15 rounded-sm rotate-[-20deg] shadow-sm animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[25%] left-[60%] w-8 h-4 bg-white/15 rounded-sm rotate-[-20deg] animate-float-slow backdrop-blur-sm" />
                <div className="absolute top-[12%] right-[30%] w-5 h-2.5 bg-white/20 rounded-sm rotate-[50deg] animate-float-mid backdrop-blur-sm" />
                <div className="absolute top-[40%] right-[20%] w-7 h-3.5 bg-white/10 rounded-sm rotate-[15deg] shadow-sm animate-float-fast backdrop-blur-sm" />

                {/* Soft glowing circles for depth */}
                <div className="absolute -top-20 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Top Promo Text */}
                <div className="text-center pt-7 pb-2 md:pt-10 md:pb-3 px-4">
                    <p className="text-white/90 text-[11px] md:text-[13px] font-semibold tracking-wider uppercase mb-1.5">
                        Exclusive for Horeca Partners
                    </p>
                    <span className="text-[#FFD700] text-[15px] md:text-[18px] font-extrabold uppercase tracking-[0.15em] block mb-0.5">
                        EXTRA
                    </span>
                    <div className="flex items-baseline justify-center gap-2">
                        <span className="text-white text-[44px] md:text-[56px] font-black leading-none drop-shadow-lg">
                            ₹500
                        </span>
                        <span className="text-[#FFD700] text-[32px] md:text-[42px] font-black leading-none drop-shadow-lg">
                            OFF
                        </span>
                    </div>
                    <p className="text-white/90 text-[11px] md:text-[13px] font-semibold mt-1.5 tracking-[0.1em] uppercase">
                        Apply on bills above ₹2000
                    </p>
                </div>

                {/* Vendor Logos Horizontal Scroll */}
                <div className="relative pb-7 md:pb-10 pt-5 md:pt-6 w-full">
                    {/* Desktop scroll arrows */}
                    {canScrollLeft && (
                        <button
                            onClick={() => scroll('left')}
                            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white hover:scale-110 transition-all cursor-pointer"
                        >
                            <ChevronLeft size={20} className="text-[#3d9e5c]" />
                        </button>
                    )}

                    <div
                        ref={scrollRef}
                        className="flex gap-5 md:gap-7 overflow-x-auto no-scrollbar scroll-smooth pb-4 px-4 md:px-8"
                    >
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
                                    <div className="w-[90px] h-[90px] md:w-[110px] md:h-[110px] rounded-full bg-white flex items-center justify-center mb-3 overflow-hidden">
                                        <img
                                            src={vendor.logo}
                                            alt={vendor.name}
                                            className={imgClass}
                                            loading="lazy"
                                        />
                                    </div>

                                    {/* Vendor Name */}
                                    <h3 className="text-white text-[14px] md:text-[17px] font-bold text-center leading-tight line-clamp-1 max-w-[100px] md:max-w-[140px] group-hover:text-[#FFD700] transition-colors">
                                        {vendor.name}
                                    </h3>

                                    {/* Discount Badge */}
                                    <span className="text-white/90 text-[12px] md:text-[14px] font-bold mt-1 text-center tracking-wide">
                                        Flat {20 + (index % 4) * 5}% Off
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    {canScrollRight && (
                        <button
                            onClick={() => scroll('right')}
                            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg items-center justify-center hover:bg-white hover:scale-110 transition-all cursor-pointer"
                        >
                            <ChevronRight size={20} className="text-[#3d9e5c]" />
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
