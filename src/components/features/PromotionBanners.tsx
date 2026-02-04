'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const BANNERS = [
    {
        title: 'Everyday Fresh Meat',
        image: '/images/category/fish & meat.png',
        bgAsset: '/images/banner/meat-banner-bg.png',
        bgColor: '#f3f6e5',
        textColor: '#1a2b4b'
    },
    {
        title: 'Daily Fresh Vegetables',
        image: '/images/category/vegitable.png',
        bgAsset: '/images/banner/vegitable-banner-bg.png',
        bgColor: '#dbf3dd',
        textColor: '#1a2b4b'
    },
    {
        title: 'Everyday Fresh Milk',
        image: '/images/category/milk.png',
        bgAsset: '/images/banner/milk-banner-bg.png',
        bgColor: '#f9eae3',
        textColor: '#1a2b4b'
    },
    {
        title: 'Everyday Fresh Fruits',
        image: '/images/category/fruits.png',
        bgAsset: '/images/banner/fruits-banner-bg.png',
        bgColor: '#ecf3df',
        textColor: '#1a2b4b'
    }
];

export function PromotionBanners() {
    return (
        <section className="w-full pb-12 md:pb-16 bg-white">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Scrollable Container on Mobile, Grid on Desktop */}
                <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 no-scrollbar snap-x snap-mandatory">
                    {BANNERS.map((banner, idx) => (
                        <div
                            key={idx}
                            className="relative min-w-[280px] md:min-w-0 flex-shrink-0 rounded-[20px] p-8 md:p-6 lg:p-8 overflow-hidden snap-start transition-transform duration-300 hover:shadow-lg h-[220px] md:h-[200px] lg:h-[240px] flex flex-col justify-between"
                            style={{ backgroundColor: banner.bgColor }}
                        >
                            {/* Background Asset Pattern */}
                            <div
                                className="absolute right-0 top-0 w-1/2 h-full opacity-60 pointer-events-none bg-no-repeat bg-right-top bg-contain"
                                style={{ backgroundImage: `url(${banner.bgAsset})` }}
                            />

                            {/* Product Image */}
                            <div className="absolute right-4 bottom-4 w-[140px] h-[140px] md:w-[120px] md:h-[120px] lg:w-[150px] lg:h-[150px] z-10 transition-transform duration-500 hover:scale-110">
                                <img
                                    src={banner.image}
                                    alt={banner.title}
                                    className="w-full h-full object-contain drop-shadow-xl"
                                />
                            </div>

                            {/* Content */}
                            <div className="relative z-20 flex flex-col items-start gap-3 md:gap-4 lg:gap-6 h-full">
                                <h3 className="text-[20px] md:text-[22px] lg:text-[26px] font-bold leading-tight max-w-[180px] md:max-w-[220px]" style={{ color: banner.textColor }}>
                                    {banner.title}
                                </h3>

                                <Link
                                    href="/shop"
                                    className="group flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 mt-auto whitespace-nowrap w-fit"
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
