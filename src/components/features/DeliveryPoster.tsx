'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function DeliveryPoster() {
    return (
        <section className="w-full pb-16 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="relative w-full min-h-[180px] md:min-h-[220px] flex items-center">
                    {/* Background Layer (The Green Box) */}
                    <div className="absolute inset-0 bg-[#2ca36a] rounded-[24px] overflow-hidden">
                        <div
                            className="absolute inset-0 opacity-30 pointer-events-none"
                            style={{
                                backgroundImage: "url('/images/poster/delivery-bg.png')",
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                filter: 'brightness(0)'
                            }}
                        />
                    </div>

                    <div className="relative z-10 w-full flex flex-col items-center px-6 md:px-12 py-6 md:py-8">
                        {/* Delivery Man & Food Content Wrapper */}
                        <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center">
                            {/* Left: Delivery Man - Overflowed */}
                            <div className="hidden md:flex justify-start items-end h-[220px] relative">
                                <img
                                    src="/images/poster/delivery-man.png"
                                    alt="Delivery Man"
                                    className="w-[180px] lg:w-[260px] h-auto object-contain transform translate-y-14 lg:translate-y-16 animate-slide-in-down"
                                />
                            </div>

                            {/* Center: Content */}
                            <div className="text-center flex flex-col items-center justify-center">
                                <h2 className="text-[20px] sm:text-[24px] md:text-[28px] lg:text-[34px] font-extrabold text-white leading-tight mb-2 md:mb-4">
                                    <span className="block whitespace-nowrap">We Delivery on Next Day from</span>
                                    <span className="block whitespace-nowrap">10:00 AM to 08:00 PM</span>
                                </h2>
                                <p className="text-white/90 text-[12px] md:text-[14px] font-medium mb-4 md:mb-6">
                                    For Orders starts from $100
                                </p>
                                <Link
                                    href="/shop"
                                    className="bg-[#ff6b00] hover:bg-[#e66000] text-white px-8 md:px-12 py-3 md:py-3.5 rounded-full font-bold text-[14px] md:text-[15px] flex items-center gap-2 transition-all shadow-lg shadow-black/20"
                                >
                                    Shop Now
                                    <ArrowRight size={18} />
                                </Link>
                            </div>

                            {/* Right: Food Items */}
                            <div className="hidden md:flex justify-end items-center h-full">
                                <img
                                    src="/images/daily-best-sell/special-snacks-img.png"
                                    alt="Food Items"
                                    className="w-[180px] lg:w-[240px] h-auto object-contain transform translate-x-4 lg:translate-x-8"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mobile Images - Subtle Overlay */}
                    <div className="md:hidden absolute inset-0 rounded-[24px] overflow-hidden opacity-20 pointer-events-none px-4 flex justify-between items-end">
                        <img src="/images/poster/delivery-man.png" className="w-[80px] h-auto transform translate-y-4" />
                        <img src="/images/daily-best-sell/special-snacks-img.png" className="w-[100px] h-auto" />
                    </div>
                </div>
            </div>
        </section>
    );
}
