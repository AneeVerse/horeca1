'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function OfferBanners() {
    return (
        <section className="w-full pb-12 md:pb-16 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="flex lg:grid lg:grid-cols-2 gap-4 md:gap-6 overflow-x-auto lg:overflow-visible no-scrollbar snap-x snap-mandatory pb-4 lg:pb-0">
                    {[
                        {
                            id: 1,
                            color: '#2ca36a',
                            title: '$5 off your first order',
                            delivery: '6:15am',
                            expiry: 'Aug 5'
                        },
                        {
                            id: 2,
                            color: '#2ca36a',
                            title: '$5 off your first order',
                            delivery: '6:15am',
                            expiry: 'Aug 5'
                        }
                    ].map((banner) => (
                        <div
                            key={banner.id}
                            className="relative flex-none w-[85%] xs:w-[320px] lg:w-full h-[160px] md:h-[210px] rounded-[24px] overflow-hidden bg-[#2ca36a] flex flex-col items-center justify-center px-4 md:px-8 group snap-start"
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

                            {/* Top Section: Logo + Text */}
                            <div className="relative z-20 flex items-center gap-4 w-full justify-center mb-4">
                                {/* Vendor Logo */}
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white flex items-center justify-center p-2 shadow-sm flex-shrink-0">
                                    <img src="/images/banner2/offer-logo.png" alt="Nature Food Logo" className="w-full h-full object-contain" />
                                </div>

                                <div className="flex flex-col items-start">
                                    <h3 className="text-[14px] xs:text-[18px] md:text-[24px] font-extrabold text-white leading-tight">
                                        {banner.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-white/95 text-[10px] md:text-[13px] font-medium">
                                        <span>Delivery by {banner.delivery}</span>
                                        {banner.expiry && <span className="text-[#ffd600] font-bold">expired {banner.expiry}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Section: Button */}
                            <div className="relative z-20">
                                <Link
                                    href="/shop"
                                    className="group flex items-center gap-2 bg-white text-[#2ca36a] hover:bg-gray-50 px-6 md:px-10 py-2 md:py-2.5 rounded-full text-[12px] md:text-[14px] font-bold transition-all shadow-md"
                                >
                                    Shop Now
                                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
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
