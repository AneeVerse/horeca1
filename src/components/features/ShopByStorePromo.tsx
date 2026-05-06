'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BrandStoreCard } from '@/components/features/brand/BrandStoreCard';

// Google Favicons API (sz=256) — always returns an image for any domain, no auth.
const gf = (domain: string) =>
    `https://www.google.com/s2/favicons?sz=256&domain=${domain}`;

const BRANDS: {
    name: string;
    slug: string;
    logoUrl?: string;
    productImages: string[];
    categories: string[];
    bgColor: string;
}[] = [
    {
        name: 'Amul',
        slug: 'amul',
        logoUrl: gf('amul.com'),
        productImages: [
            'https://images.unsplash.com/photo-1589985270958-bf087b2d76ee?w=600&q=80',
        ],
        categories: ['Butter', 'Cheese', 'Ghee', 'Paneer'],
        bgColor: '#fff8e1',
    },
    {
        name: 'Kissan',
        slug: 'kissan',
        logoUrl: gf('kissan.in'),
        productImages: [
            'https://images.unsplash.com/photo-1597475681053-bfdfa8d28f5f?w=600&q=80',
        ],
        categories: ['Jams', 'Ketchup', 'Sauces', 'Squashes'],
        bgColor: '#fde8e8',
    },
    {
        name: 'Britannia',
        slug: 'britannia',
        logoUrl: gf('britanniaindustries.com'),
        productImages: [
            'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80',
        ],
        categories: ['Biscuits', 'Bread', 'Cheese', 'Cake'],
        bgColor: '#fdf6e3',
    },
    {
        name: 'Veeba',
        slug: 'veeba',
        logoUrl: gf('veeba.in'),
        productImages: [
            'https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=600&q=80',
        ],
        categories: ['Mayonnaise', 'Dressings', 'Sauces', 'Dips'],
        bgColor: '#e8f5e9',
    },
    {
        name: 'Tata Sampann',
        slug: 'tata-sampann',
        logoUrl: gf('tataconsumer.com'),
        productImages: [
            'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80',
        ],
        categories: ['Spices', 'Pulses', 'Atta', 'Salt'],
        bgColor: '#fce4ec',
    },
    {
        name: 'Maggi',
        slug: 'maggi',
        logoUrl: gf('nestle.com'),
        productImages: [
            'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80',
        ],
        categories: ['Noodles', 'Ketchup', 'Soups', 'Sauces'],
        bgColor: '#fff3e0',
    },
];

export function ShopByStorePromo() {
    return (
        <section className="w-full py-8 md:py-12">
            <div className="max-w-[var(--container-max)] mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 md:mb-6 px-4 md:px-[var(--container-padding)]">
                    <h2 className="text-[20px] md:text-[24px] font-[900] text-[#181725] tracking-tight">
                        Shop by Brand
                    </h2>
                    <Link
                        href="/brands"
                        className="flex items-center gap-1 text-[13px] font-bold text-[#53B175] hover:text-[#3d9e56] transition-colors"
                    >
                        See all <ChevronRight size={14} />
                    </Link>
                </div>

                {/* Mobile: horizontal scroll */}
                <div className="md:hidden flex gap-3 overflow-x-auto pb-3 px-4 scrollbar-none snap-x snap-mandatory">
                    {BRANDS.map((brand) => (
                        <div key={brand.slug} className="snap-start shrink-0 w-[140px]">
                            <BrandStoreCard {...brand} />
                        </div>
                    ))}
                </div>

                {/* Desktop: 6-column grid — portrait cards */}
                <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-4 px-[var(--container-padding)]">
                    {BRANDS.map((brand) => (
                        <BrandStoreCard key={brand.slug} {...brand} />
                    ))}
                </div>
            </div>
        </section>
    );
}
