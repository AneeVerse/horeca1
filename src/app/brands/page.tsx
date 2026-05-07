'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { BrandStoreCard } from '@/components/features/brand/BrandStoreCard';

const gf = (domain: string) =>
    `https://www.google.com/s2/favicons?sz=256&domain=${domain}`;

// Seed fallback shown while DB brands load (or if none approved yet)
const SEED_BRANDS = [
    { name: 'Amul', slug: 'amul', logoUrl: gf('amul.com'), productImages: ['https://images.unsplash.com/photo-1589985270958-bf087b2d76ee?w=600&q=80'], categories: ['Butter', 'Cheese', 'Ghee', 'Paneer'], bgColor: '#fff8e1' },
    { name: 'Kissan', slug: 'kissan', logoUrl: gf('kissan.in'), productImages: ['https://images.unsplash.com/photo-1597475681053-bfdfa8d28f5f?w=600&q=80'], categories: ['Jams', 'Ketchup', 'Sauces', 'Squashes'], bgColor: '#fde8e8' },
    { name: 'Britannia', slug: 'britannia', logoUrl: gf('britanniaindustries.com'), productImages: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80'], categories: ['Biscuits', 'Bread', 'Cheese', 'Cake'], bgColor: '#fdf6e3' },
    { name: 'Veeba', slug: 'veeba', logoUrl: gf('veeba.in'), productImages: ['https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=600&q=80'], categories: ['Mayonnaise', 'Dressings', 'Sauces', 'Dips'], bgColor: '#e8f5e9' },
    { name: 'Tata Sampann', slug: 'tata-sampann', logoUrl: gf('tataconsumer.com'), productImages: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80'], categories: ['Spices', 'Pulses', 'Atta', 'Salt'], bgColor: '#fce4ec' },
    { name: 'Maggi', slug: 'maggi', logoUrl: gf('nestle.com'), productImages: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80'], categories: ['Noodles', 'Ketchup', 'Soups', 'Sauces'], bgColor: '#fff3e0' },
    { name: 'MDH', slug: 'mdh', logoUrl: gf('mdhspices.com'), productImages: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80'], categories: ['Spices', 'Masala', 'Blends', 'Herbs'], bgColor: '#fff3e0' },
    { name: 'Dabur', slug: 'dabur', logoUrl: gf('dabur.com'), productImages: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80'], categories: ['Honey', 'Juices', 'Syrups', 'Health'], bgColor: '#e8f5e9' },
    { name: 'Haldirams', slug: 'haldirams', logoUrl: gf('haldirams.com'), productImages: ['https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80'], categories: ['Namkeen', 'Sweets', 'Ready-to-eat', 'Snacks'], bgColor: '#fff8e1' },
    { name: 'ITC Foods', slug: 'itc-foods', logoUrl: gf('itcportal.com'), productImages: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80'], categories: ['Aashirvaad', 'Sunfeast', 'Bingo', 'Yippee'], bgColor: '#fde8e8' },
    { name: 'Nestle', slug: 'nestle', logoUrl: gf('nestle.com'), productImages: ['https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&q=80'], categories: ['Dairy', 'Beverages', 'Chocolates', 'Baby Food'], bgColor: '#fdf6e3' },
    { name: 'Mother Dairy', slug: 'mother-dairy', logoUrl: gf('motherdairy.com'), productImages: ['https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&q=80'], categories: ['Milk', 'Paneer', 'Dahi', 'Ice Cream'], bgColor: '#e3f2fd' },
];

interface ApiBrand {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    banner: string | null;
    tagline: string | null;
    categories: string[];
    bgColor: string | null;
    showcaseImages: string[];
    productCount: number;
}

export default function BrandsPage() {
    const router = useRouter();
    const [brands, setBrands] = useState(SEED_BRANDS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/v1/brands?limit=100')
            .then(r => r.json())
            .then(d => {
                const apiBrands: ApiBrand[] = d.data?.brands ?? [];
                if (apiBrands.length > 0) {
                    setBrands(apiBrands.map(b => ({
                        name: b.name,
                        slug: b.slug,
                        logoUrl: b.logo ?? '',
                        productImages: b.showcaseImages.length > 0 ? [b.showcaseImages[0]] : [],
                        categories: b.categories,
                        bgColor: b.bgColor ?? '#f0faf4',
                    })));
                }
                // if API returns 0 approved brands, keep seed fallback
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-[#F8F9FA]">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2.5 hover:bg-gray-100/80 rounded-2xl transition-all duration-300 group active:scale-95 shrink-0"
                        >
                            <ChevronLeft size={22} className="text-gray-700 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <h1 className="text-[22px] font-extrabold text-[#1A1C1E] tracking-tight">
                            All Brands
                        </h1>
                    </div>
                </div>
            </div>

            {/* Brand Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="w-10 h-10 border-[3px] border-[#53B175]/10 border-t-[#53B175] rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 min-[500px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {brands.map((brand) => (
                            <BrandStoreCard key={brand.slug} {...brand} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
