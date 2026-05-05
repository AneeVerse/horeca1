'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const BRANDS = [
    {
        name: 'Kitchen Smith',
        image: '/images/brand/03b885b1-5477-4aa9-af03-d948165745e61771835977.png',
        href: '/brand/kitchen-smith',
        tag: 'Spices & Grains',
    },
    {
        name: 'Kissan',
        image: '/images/brand/dc458c67-3702-4da8-8cb8-8011f0d3e17a1767094486.png',
        href: '/brand/kissan',
        tag: 'Jams & Sauces',
    },
    {
        name: 'Dhampure',
        image: '/images/brand/a9559b8a-60e4-4f54-aa70-30f0752505301767094501.png',
        href: '/brand/dhampure',
        tag: 'Sugar & Jaggery',
    },
    {
        name: 'Marim Bula',
        image: '/images/brand/ef12f3b4-b55f-4042-a2ae-2d1083071fd61767094388.png',
        href: '/brand/marim-bula',
        tag: 'Marinades',
    },
    {
        name: 'Everest',
        image: '/images/brand/cd69ab10-d9a6-4756-a99a-d330bad80ad41767094494.png',
        href: '/brand/everest',
        tag: 'Masalas',
    },
    {
        name: 'Alu-Freshh',
        image: '/images/brand/b82cb9a4-f54b-4cee-b2da-27216caf0f0d1768981196.png',
        href: '/brand/alu-freshh',
        tag: 'Packaging',
    },
];

export function ShopByStorePromo() {
    return (
        <section className="w-full py-6 md:py-10">
            <div className="max-w-[var(--container-max)] mx-auto px-4 md:px-[var(--container-padding)]">
                <div className="bg-gradient-to-b from-[#4CAF50] to-[#3d9e41] rounded-[20px] p-5 md:p-8 shadow-lg">

                    {/* Header row */}
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-[22px] md:text-[24px] font-[800] text-white leading-tight">
                            Shop by Brand
                        </h2>
                        <Link
                            href="/search"
                            className="flex items-center gap-1 text-[12px] font-bold text-white/80 hover:text-white transition"
                        >
                            See all <ChevronRight size={14} />
                        </Link>
                    </div>

                    {/* Mobile: Row 1 (3 large) + Row 2 (3 small) */}
                    <div className="md:hidden flex flex-col gap-3">
                        {/* Row 1 */}
                        <div className="grid grid-cols-3 gap-2.5">
                            {BRANDS.slice(0, 3).map((brand) => (
                                <Link
                                    key={brand.name}
                                    href={brand.href}
                                    className="flex flex-col bg-white rounded-[14px] overflow-hidden shadow-sm active:scale-95 transition-all"
                                >
                                    <div className="flex-1 flex items-center justify-center p-2.5 min-h-[72px]">
                                        <img
                                            src={brand.image}
                                            alt={brand.name}
                                            className="w-full h-auto object-contain"
                                        />
                                    </div>
                                    <div className="bg-[#53B175] py-1.5 text-center">
                                        <span className="text-[8px] font-black text-white uppercase tracking-wide block truncate px-1">
                                            {brand.tag}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-3 gap-2.5">
                            {BRANDS.slice(3, 6).map((brand) => (
                                <Link
                                    key={brand.name}
                                    href={brand.href}
                                    className="flex flex-col bg-white rounded-[14px] overflow-hidden shadow-sm active:scale-95 transition-all"
                                >
                                    <div className="flex-1 flex items-center justify-center p-2.5 min-h-[60px]">
                                        <img
                                            src={brand.image}
                                            alt={brand.name}
                                            className="w-full h-auto object-contain"
                                        />
                                    </div>
                                    <div className="bg-[#53B175] py-1.5 text-center">
                                        <span className="text-[8px] font-black text-white uppercase tracking-wide block truncate px-1">
                                            {brand.tag}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Desktop: portrait cards (district-style) — image on top, white name+tag pad below */}
                    <div className="hidden md:grid md:grid-cols-6 gap-4">
                        {BRANDS.map((brand) => (
                            <Link
                                key={brand.name}
                                href={brand.href}
                                className="group rounded-[18px] overflow-hidden shadow-sm hover:shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col"
                            >
                                <div className="relative w-full aspect-[3/4] overflow-hidden block leading-none">
                                    <img
                                        src={brand.image}
                                        alt={brand.name}
                                        className="absolute inset-0 w-full h-full object-cover scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <div className="px-3 py-3 bg-white">
                                    <h3 className="text-[14px] font-extrabold text-[#181725] truncate leading-tight group-hover:text-[#53B175] transition-colors">
                                        {brand.name}
                                    </h3>
                                    <p className="text-[11px] font-semibold text-gray-500 truncate mt-0.5">
                                        {brand.tag}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
}
