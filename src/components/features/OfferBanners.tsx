'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function OfferBanners() {
    return (
        <section className="w-full pb-16 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* First Banner */}
                    <div
                        className="relative h-[180px] sm:h-[200px] md:h-[230px] rounded-[24px] overflow-hidden bg-[#2ca36a] flex items-center px-6 md:px-12 group"
                    >
                        {/* Background Wave Pattern */}
                        <div
                            className="absolute inset-0 opacity-15 pointer-events-none mix-blend-soft-light"
                            style={{
                                backgroundImage: `url('/images/banner2/banner-pattern-bg.png')`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        />

                        {/* Product Image (Left) */}
                        <div className="relative z-10 w-[120px] sm:w-[150px] md:w-[200px] flex-shrink-0 transition-transform duration-500 group-hover:scale-105">
                            <img
                                src="/images/banner2/offer-img1.png"
                                alt="Fresh Vegetables Basket"
                                className="w-full h-full object-contain drop-shadow-2xl"
                            />
                        </div>

                        {/* Content (Right) */}
                        <div className="relative z-20 flex flex-col items-center flex-1 gap-1 md:gap-1.5 py-2">
                            {/* Vendor Logo */}
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white flex items-center justify-center p-1.5 md:p-2 mb-1 shadow-sm">
                                <img src="/images/banner2/offer-logo.png" alt="Nature Food Logo" className="w-full h-full object-contain" />
                            </div>

                            <h3 className="text-[16px] sm:text-[22px] md:text-[28px] font-extrabold text-white leading-tight text-center whitespace-nowrap">
                                $5 off your first order
                            </h3>

                            <div className="flex items-center gap-2 text-white/95 text-[10px] md:text-[13px] font-medium">
                                <span>Delivery by 6:15am</span>
                                <span className="text-[#ffd600] font-bold">expired Aug 5</span>
                            </div>

                            <Link
                                href="/shop"
                                className="mt-1 md:mt-2 group flex items-center gap-2 bg-white text-[#2ca36a] hover:bg-gray-50 px-5 md:px-8 py-1.5 md:py-2.5 rounded-full text-[12px] md:text-[14px] font-bold transition-all shadow-md"
                            >
                                Shop Now
                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>

                    {/* Second Banner */}
                    <div
                        className="relative h-[180px] sm:h-[200px] md:h-[230px] rounded-[24px] overflow-hidden bg-[#2ca36a] flex items-center px-6 md:px-12 group"
                    >
                        {/* Background Wave Pattern */}
                        <div
                            className="absolute inset-0 opacity-15 pointer-events-none mix-blend-soft-light"
                            style={{
                                backgroundImage: `url('/images/banner2/banner-pattern-bg.png')`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        />

                        {/* Product Image (Left) */}
                        <div className="relative z-10 w-[120px] sm:w-[150px] md:w-[200px] flex-shrink-0 transition-transform duration-500 group-hover:scale-105">
                            <img
                                src="/images/banner2/offer-img2.png"
                                alt="Fresh Fish & Meat"
                                className="w-full h-full object-contain drop-shadow-2xl"
                            />
                        </div>

                        {/* Content (Right) */}
                        <div className="relative z-20 flex flex-col items-center flex-1 gap-1 md:gap-1.5 py-2">
                            {/* Vendor Logo */}
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white flex items-center justify-center p-1.5 md:p-2 mb-1 shadow-sm">
                                <img src="/images/banner2/offer-logo.png" alt="Nature Food Logo" className="w-full h-full object-contain" />
                            </div>

                            <h3 className="text-[16px] sm:text-[22px] md:text-[28px] font-extrabold text-white leading-tight text-center whitespace-nowrap">
                                $5 off your first order
                            </h3>

                            <div className="flex items-center gap-2 text-white/95 text-[10px] md:text-[13px] font-medium">
                                <span>Delivery by 6:15am</span>
                                <span className="text-[#ffd600] font-bold">expired Aug 5</span>
                            </div>

                            <Link
                                href="/shop"
                                className="mt-1 md:mt-2 group flex items-center gap-2 bg-white text-[#2ca36a] hover:bg-gray-50 px-5 md:px-8 py-1.5 md:py-2.5 rounded-full text-[12px] md:text-[14px] font-bold transition-all shadow-md"
                            >
                                Shop Now
                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
