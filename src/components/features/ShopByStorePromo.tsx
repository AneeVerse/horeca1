'use client';

import React from 'react';
import Link from 'next/link';

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
            <div className="max-w-[var(--container-max)] mx-auto">
                {/* Heading */}
                <h2 className="text-[20px] md:text-[24px] font-[800] text-[#181725] px-4 md:px-[var(--container-padding)] mb-4">
                    Shop by Brand
                </h2>

                {/* Mobile: single-row horizontal scroll */}
                <div className="md:hidden overflow-x-auto scrollbar-hide px-4 pb-2">
                    <div className="flex gap-3">
                        {BRANDS.map((brand) => (
                            <Link
                                key={brand.name}
                                href={brand.href}
                                className="block flex-shrink-0 w-[156px] rounded-[18px] overflow-hidden hover:shadow-md active:scale-95 transition-all duration-200"
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

                {/* Desktop: 6-column grid */}
                <div className="hidden md:grid md:grid-cols-6 gap-4 px-[var(--container-padding)]">
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
        </section>
    );
}
