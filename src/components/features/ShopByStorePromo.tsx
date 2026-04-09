'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const BRANDS = [
    {
        name: 'Kitchen Smith',
        image: '/images/brand/03b885b1-5477-4aa9-af03-d948165745e61771835977.png',
        href: '/search?brand=kitchen-smith',
    },
    {
        name: 'Kissan',
        image: '/images/brand/dc458c67-3702-4da8-8cb8-8011f0d3e17a1767094486.png',
        href: '/search?brand=kissan',
    },
    {
        name: 'Dhampure',
        image: '/images/brand/a9559b8a-60e4-4f54-aa70-30f0752505301767094501.png',
        href: '/search?brand=dhampure',
    },
    {
        name: 'Marim Bula',
        image: '/images/brand/ef12f3b4-b55f-4042-a2ae-2d1083071fd61767094388.png',
        href: '/search?brand=marim-bula',
    },
    {
        name: 'Everest',
        image: '/images/brand/cd69ab10-d9a6-4756-a99a-d330bad80ad41767094494.png',
        href: '/search?brand=everest',
    },
    {
        name: 'Alu-Freshh',
        image: '/images/brand/b82cb9a4-f54b-4cee-b2da-27216caf0f0d1768981196.png',
        href: '/search?brand=alu-freshh',
    },
];

export function ShopByStorePromo() {
    return (
        <section className="w-full py-6 md:py-10">
            <div className="max-w-[var(--container-max)] mx-auto px-4 md:px-[var(--container-padding)]">
                {/* Modern Layout inspired by Baby's Day Out - Yellow/Cream background */}
                <div className="bg-[#fdf2e3] md:bg-gradient-to-b md:from-[#4CAF50] md:to-[#45a049] rounded-[24px] md:rounded-[20px] p-4 md:p-8 shadow-sm md:shadow-lg overflow-hidden border border-[#f3e5d3] md:border-none">
                    {/* Reference: See all link at top right (mobile) */}
                    <div className="md:hidden flex justify-end mb-1">
                        <Link href="/search" className="text-[11px] font-bold text-[#ff4d6d] flex items-center gap-0.5">
                            See all <ChevronRight size={10} className="mt-0.5" />
                        </Link>
                    </div>

                    {/* Mobile Banner Heading - Large Blue Italic style */}
                    <div className="md:hidden flex flex-col items-center py-4 mb-4 relative">
                        {/* Decorative background circle (subtle) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#fff8ef] rounded-full blur-3xl opacity-60 -z-10" />
                        
                        <h2 className="text-[38px] font-[1000] text-[#0081ff] leading-[0.85] tracking-tighter text-center italic drop-shadow-sm">
                            SHOP BY<br/><span className="text-[28px] not-italic tracking-normal">BRAND</span>
                        </h2>
                        <div className="flex items-center gap-1 mt-2">
                            <span className="text-[9px] text-[#0081ff] font-bold opacity-60 uppercase tracking-wider">Powered by</span>
                            <span className="text-[11px] font-black text-[#0081ff] opacity-100 flex items-center gap-1">
                                <span className="bg-[#0081ff] text-white px-1 leading-none rounded-[2px] text-[8px] py-0.5">BEST</span>
                                DEALS
                            </span>
                        </div>
                    </div>

                    {/* Desktop Heading */}
                    <h2 className="hidden md:block text-[24px] font-[800] text-white mb-4">
                        Shop by Brand
                    </h2>

                    {/* Mobile: Split View Cards (Row 1: 3 Large, Row 2: 4 Small) */}
                    <div className="md:hidden flex flex-col gap-4">
                        {/* Row 1: 3 Larger Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            {BRANDS.slice(0, 3).map((brand, idx) => {
                                const footerText = idx === 0 ? 'Starts at ₹79' : idx === 1 ? 'Starts at ₹199' : 'Starts at ₹99';
                                return (
                                    <Link
                                        key={brand.name}
                                        href={brand.href}
                                        className="block rounded-[12px] overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] flex flex-col h-full active:scale-95 transition-all"
                                    >
                                        <div className="pt-2 px-1 text-center">
                                            <span className="text-[9px] font-bold text-[#0066cc] uppercase tracking-tighter block line-clamp-1">
                                                {brand.name}
                                            </span>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center p-2 min-h-[60px]">
                                            <img src={brand.image} alt={brand.name} className="w-full h-auto object-contain" />
                                        </div>
                                        <div className="bg-[#1a8cff] py-1.5 text-center">
                                            <span className="text-[8px] font-bold text-white uppercase">{footerText}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Row 2: Smaller Cards (Dimension matches bottom row of reference) */}
                        <div className="grid grid-cols-4 gap-2">
                            {BRANDS.slice(3, 6).map((brand, idx) => {
                                const footerText = idx === 0 ? 'Starts at ₹149' : idx === 1 ? 'Starts at ₹299' : 'Up to 60% OFF';
                                return (
                                    <Link
                                        key={brand.name}
                                        href={brand.href}
                                        className="block rounded-[10px] overflow-hidden bg-white shadow-sm flex flex-col h-full active:scale-95 transition-all"
                                    >
                                        <div className="pt-1.5 px-0.5 text-center">
                                            <span className="text-[7.5px] font-bold text-[#0066cc] uppercase tracking-tighter block h-[18px] flex items-center justify-center">
                                                {brand.name}
                                            </span>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center p-1 min-h-[50px]">
                                            <img src={brand.image} alt={brand.name} className="w-full h-auto object-contain" />
                                        </div>
                                        <div className="bg-[#1a8cff] py-1 text-center">
                                            <span className="text-[6.5px] font-bold text-white uppercase tracking-tighter block">{footerText}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Desktop: 6-column grid */}
                    <div className="hidden md:grid md:grid-cols-6 gap-4">
                        {BRANDS.map((brand) => (
                            <Link
                                key={brand.name}
                                href={brand.href}
                                className="block rounded-[18px] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <img
                                    src={brand.image}
                                    alt={brand.name}
                                    className="w-full block"
                                />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
