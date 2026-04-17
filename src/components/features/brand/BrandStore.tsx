'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Store, ArrowLeft, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandProduct {
    id: string;
    name: string;
    image: string;
    category: string;
}

interface BrandVendor {
    id: string;
    name: string;
    logo: string;
    location: string;
    productIds: string[];
    prices: Record<string, string>;
}

interface BrandStoreData {
    id: string;
    name: string;
    bannerImage: string;
    tagline: string;
    products: BrandProduct[];
    vendors: BrandVendor[];
}

interface BrandStoreProps {
    brandId: string;
}

const PRODUCT_IMAGES = [
    '/images/shope by brand/brand-img1.png',
    '/images/shope by brand/brand-img2.png',
    '/images/shope by brand/brand-img3.png',
    '/images/shope by brand/brand-img4.png',
    '/images/shope by brand/brand-img7.png',
];

const img = (i: number) => PRODUCT_IMAGES[i % PRODUCT_IMAGES.length];

const BRAND_DATA: Record<string, BrandStoreData> = {
    'kitchen-smith': {
        id: 'kitchen-smith',
        name: 'Kitchen Smith',
        bannerImage: '/images/brand/03b885b1-5477-4aa9-af03-d948165745e61771835977.png',
        tagline: 'Premium Spices & Grains for Professional Kitchens',
        products: [
            { id: 'ks-1',  name: 'All Purpose Flour 1kg',      image: img(0), category: 'Flour & Grains' },
            { id: 'ks-2',  name: 'Basmati Rice 5kg',           image: img(1), category: 'Rice' },
            { id: 'ks-3',  name: 'Turmeric Powder 500g',       image: img(2), category: 'Spices' },
            { id: 'ks-4',  name: 'Chili Powder 250g',          image: img(3), category: 'Spices' },
            { id: 'ks-5',  name: 'Cumin Seeds 100g',           image: img(4), category: 'Spices' },
            { id: 'ks-6',  name: 'Black Pepper Powder 100g',   image: img(0), category: 'Spices' },
            { id: 'ks-7',  name: 'Coriander Powder 250g',      image: img(1), category: 'Spices' },
            { id: 'ks-8',  name: 'Garam Masala 100g',          image: img(2), category: 'Spices' },
            { id: 'ks-9',  name: 'Mustard Seeds 100g',         image: img(3), category: 'Spices' },
            { id: 'ks-10', name: 'Fenugreek Seeds 100g',       image: img(4), category: 'Spices' },
            { id: 'ks-11', name: 'Methi Powder 250g',          image: img(0), category: 'Spices' },
            { id: 'ks-12', name: 'Red Chili Flakes 100g',      image: img(1), category: 'Spices' },
        ],
        vendors: [
            {
                id: 'v1', name: 'Emarket',
                logo: '/images/top vendors/emarket.png', location: 'Mumbai',
                productIds: ['ks-1','ks-2','ks-3','ks-4','ks-5','ks-6','ks-7','ks-8'],
                prices: { 'ks-1':'120','ks-2':'450','ks-3':'85','ks-4':'95','ks-5':'110','ks-6':'120','ks-7':'100','ks-8':'140' },
            },
            {
                id: 'v2', name: 'Whole Food Market',
                logo: '/images/top vendors/whole-foods-market.png', location: 'Navi Mumbai',
                productIds: ['ks-1','ks-2','ks-3','ks-9','ks-10','ks-11'],
                prices: { 'ks-1':'125','ks-2':'480','ks-3':'90','ks-9':'115','ks-10':'125','ks-11':'110' },
            },
            {
                id: 'v3', name: 'M Mart',
                logo: '/images/top vendors/m-mart.png', location: 'Thane',
                productIds: ['ks-2','ks-4','ks-5','ks-8','ks-11','ks-12'],
                prices: { 'ks-2':'440','ks-4':'90','ks-5':'105','ks-8':'135','ks-11':'105','ks-12':'95' },
            },
        ],
    },
    'kissan': {
        id: 'kissan',
        name: 'Kissan',
        bannerImage: '/images/brand/dc458c67-3702-4da8-8cb8-8011f0d3e17a1767094486.png',
        tagline: 'Jams, Ketchups & Condiments',
        products: [
            { id: 'k-1', name: 'Tomato Ketchup 1kg',     image: img(0), category: 'Condiments' },
            { id: 'k-2', name: 'Chilli Sauce 500g',       image: img(1), category: 'Condiments' },
            { id: 'k-3', name: 'Mango Pickle 500g',       image: img(2), category: 'Pickles' },
            { id: 'k-4', name: 'Mixed Pickle 500g',       image: img(3), category: 'Pickles' },
            { id: 'k-5', name: 'Lime Pickle 500g',        image: img(4), category: 'Pickles' },
            { id: 'k-6', name: 'Strawberry Jam 500g',     image: img(0), category: 'Jams & Spreads' },
            { id: 'k-7', name: 'Mango Pulp 1kg',          image: img(1), category: 'Pulps & Pastes' },
            { id: 'k-8', name: 'Pineapple Jam 500g',      image: img(2), category: 'Jams & Spreads' },
            { id: 'k-9', name: 'Tomato Sauce 1kg',        image: img(3), category: 'Condiments' },
        ],
        vendors: [
            {
                id: 'v1', name: 'Emarket',
                logo: '/images/top vendors/emarket.png', location: 'Mumbai',
                productIds: ['k-1','k-2','k-3','k-4','k-9'],
                prices: { 'k-1':'180','k-2':'150','k-3':'120','k-4':'130','k-9':'200' },
            },
            {
                id: 'v2', name: 'Whole Food Market',
                logo: '/images/top vendors/whole-foods-market.png', location: 'Navi Mumbai',
                productIds: ['k-1','k-3','k-5','k-6','k-7'],
                prices: { 'k-1':'190','k-3':'125','k-5':'135','k-6':'160','k-7':'220' },
            },
            {
                id: 'v3', name: 'M Mart',
                logo: '/images/top vendors/m-mart.png', location: 'Thane',
                productIds: ['k-2','k-4','k-7','k-8','k-9'],
                prices: { 'k-2':'145','k-4':'125','k-7':'210','k-8':'155','k-9':'195' },
            },
        ],
    },
    'dhampure': {
        id: 'dhampure',
        name: 'Dhampure',
        bannerImage: '/images/brand/a9559b8a-60e4-4f54-aa70-30f0752505301767094501.png',
        tagline: 'Pure Sugar & Natural Sweeteners',
        products: [
            { id: 'd-1', name: 'Refined Sugar 1kg',           image: img(0), category: 'Sugar & Sweeteners' },
            { id: 'd-2', name: 'Refined Sugar 5kg',           image: img(1), category: 'Sugar & Sweeteners' },
            { id: 'd-3', name: 'Brown Sugar 500g',            image: img(2), category: 'Sugar & Sweeteners' },
            { id: 'd-4', name: 'Icing Sugar 500g',            image: img(3), category: 'Sugar & Sweeteners' },
            { id: 'd-5', name: 'Natural Jaggery 1kg',         image: img(4), category: 'Jaggery' },
            { id: 'd-6', name: 'Organic Jaggery Powder 500g', image: img(0), category: 'Jaggery' },
            { id: 'd-7', name: 'Mishri Rock Sugar 500g',      image: img(1), category: 'Sugar & Sweeteners' },
            { id: 'd-8', name: 'Liquid Glucose 500g',         image: img(2), category: 'Syrups' },
        ],
        vendors: [
            {
                id: 'v1', name: 'Emarket',
                logo: '/images/top vendors/emarket.png', location: 'Mumbai',
                productIds: ['d-1','d-2','d-3','d-5'],
                prices: { 'd-1':'55','d-2':'260','d-3':'85','d-5':'110' },
            },
            {
                id: 'v2', name: 'Whole Food Market',
                logo: '/images/top vendors/whole-foods-market.png', location: 'Navi Mumbai',
                productIds: ['d-1','d-4','d-6','d-7','d-8'],
                prices: { 'd-1':'58','d-4':'90','d-6':'120','d-7':'95','d-8':'140' },
            },
        ],
    },
    'marim-bula': {
        id: 'marim-bula',
        name: 'Marim Bula',
        bannerImage: '/images/brand/ef12f3b4-b55f-4042-a2ae-2d1083071fd61767094388.png',
        tagline: 'Artisan Sauces & Marinades',
        products: [
            { id: 'mb-1', name: 'Classic BBQ Sauce 500g',      image: img(0), category: 'Sauces' },
            { id: 'mb-2', name: 'Smoky Chipotle Sauce 500g',   image: img(1), category: 'Sauces' },
            { id: 'mb-3', name: 'Honey Mustard Sauce 300g',    image: img(2), category: 'Sauces' },
            { id: 'mb-4', name: 'Garlic Herb Marinade 300g',   image: img(3), category: 'Marinades' },
            { id: 'mb-5', name: 'Lemon Pepper Marinade 300g',  image: img(4), category: 'Marinades' },
            { id: 'mb-6', name: 'Tandoori Marinade 400g',      image: img(0), category: 'Marinades' },
        ],
        vendors: [
            {
                id: 'v2', name: 'Whole Food Market',
                logo: '/images/top vendors/whole-foods-market.png', location: 'Navi Mumbai',
                productIds: ['mb-1','mb-2','mb-3','mb-4'],
                prices: { 'mb-1':'220','mb-2':'235','mb-3':'190','mb-4':'175' },
            },
            {
                id: 'v3', name: 'M Mart',
                logo: '/images/top vendors/m-mart.png', location: 'Thane',
                productIds: ['mb-1','mb-4','mb-5','mb-6'],
                prices: { 'mb-1':'215','mb-4':'170','mb-5':'165','mb-6':'190' },
            },
        ],
    },
    'everest': {
        id: 'everest',
        name: 'Everest',
        bannerImage: '/images/brand/cd69ab10-d9a6-4756-a99a-d330bad80ad41767094494.png',
        tagline: "India's Favourite Masala Brand",
        products: [
            { id: 'ev-1',  name: 'Garam Masala 100g',          image: img(0), category: 'Masalas' },
            { id: 'ev-2',  name: 'Chana Masala 100g',          image: img(1), category: 'Masalas' },
            { id: 'ev-3',  name: 'Pav Bhaji Masala 100g',      image: img(2), category: 'Masalas' },
            { id: 'ev-4',  name: 'Chicken Masala 100g',        image: img(3), category: 'Masalas' },
            { id: 'ev-5',  name: 'Meat Masala 100g',           image: img(4), category: 'Masalas' },
            { id: 'ev-6',  name: 'Kitchen King Masala 100g',   image: img(0), category: 'Masalas' },
            { id: 'ev-7',  name: 'Sambar Masala 100g',         image: img(1), category: 'Masalas' },
            { id: 'ev-8',  name: 'Shahi Biryani Masala 50g',   image: img(2), category: 'Masalas' },
            { id: 'ev-9',  name: 'Tikhalal Chili Powder 400g', image: img(3), category: 'Spices' },
            { id: 'ev-10', name: 'Turmeric Powder 200g',       image: img(4), category: 'Spices' },
        ],
        vendors: [
            {
                id: 'v1', name: 'Emarket',
                logo: '/images/top vendors/emarket.png', location: 'Mumbai',
                productIds: ['ev-1','ev-2','ev-3','ev-4','ev-5','ev-6'],
                prices: { 'ev-1':'95','ev-2':'85','ev-3':'88','ev-4':'105','ev-5':'110','ev-6':'90' },
            },
            {
                id: 'v2', name: 'Whole Food Market',
                logo: '/images/top vendors/whole-foods-market.png', location: 'Navi Mumbai',
                productIds: ['ev-1','ev-3','ev-7','ev-8','ev-9','ev-10'],
                prices: { 'ev-1':'98','ev-3':'90','ev-7':'85','ev-8':'75','ev-9':'180','ev-10':'60' },
            },
            {
                id: 'v3', name: 'M Mart',
                logo: '/images/top vendors/m-mart.png', location: 'Thane',
                productIds: ['ev-2','ev-4','ev-6','ev-9','ev-10'],
                prices: { 'ev-2':'82','ev-4':'100','ev-6':'88','ev-9':'175','ev-10':'58' },
            },
        ],
    },
    'alu-freshh': {
        id: 'alu-freshh',
        name: 'Alu-Freshh',
        bannerImage: '/images/brand/b82cb9a4-f54b-4cee-b2da-27216caf0f0d1768981196.png',
        tagline: 'Fresh Aluminium Packaging & Foils',
        products: [
            { id: 'af-1', name: 'Aluminium Foil Roll 30m',       image: img(0), category: 'Packaging' },
            { id: 'af-2', name: 'Aluminium Foil Roll 75m',       image: img(1), category: 'Packaging' },
            { id: 'af-3', name: 'Foil Containers 500ml 50pk',    image: img(2), category: 'Containers' },
            { id: 'af-4', name: 'Foil Containers 1L 25pk',       image: img(3), category: 'Containers' },
            { id: 'af-5', name: 'Foil Trays Full Size 10pk',     image: img(4), category: 'Containers' },
            { id: 'af-6', name: 'Cling Film Roll 30m',           image: img(0), category: 'Packaging' },
            { id: 'af-7', name: 'Parchment Paper Roll 50m',      image: img(1), category: 'Packaging' },
        ],
        vendors: [
            {
                id: 'v1', name: 'Emarket',
                logo: '/images/top vendors/emarket.png', location: 'Mumbai',
                productIds: ['af-1','af-2','af-3','af-6'],
                prices: { 'af-1':'180','af-2':'420','af-3':'350','af-6':'160' },
            },
            {
                id: 'v3', name: 'M Mart',
                logo: '/images/top vendors/m-mart.png', location: 'Thane',
                productIds: ['af-1','af-4','af-5','af-7'],
                prices: { 'af-1':'175','af-4':'280','af-5':'320','af-7':'190' },
            },
        ],
    },
};

type ActiveTab = 'items' | 'vendors';

const TABS = [
    { key: 'items' as ActiveTab, label: 'All Items' },
    { key: 'vendors' as ActiveTab, label: 'Vendors' },
];

function TabBar({
    activeTab,
    brand,
    onTabChange,
}: {
    activeTab: ActiveTab;
    brand: BrandStoreData;
    onTabChange: (tab: ActiveTab) => void;
}) {
    const counts: Record<ActiveTab, number> = {
        items: brand.products.length,
        vendors: brand.vendors.length,
    };
    return (
        <div className="flex items-center gap-8 border-b border-gray-100">
            {TABS.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={cn(
                        'pb-3 pt-3 text-[15px] font-bold transition-all relative flex items-center gap-2',
                        activeTab === tab.key ? 'text-[#53B175]' : 'text-gray-400 hover:text-gray-700'
                    )}
                >
                    {tab.label}
                    <span className={cn(
                        'text-[11px] font-black px-2 py-0.5 rounded-full',
                        activeTab === tab.key ? 'bg-[#53B175]/10 text-[#53B175]' : 'bg-gray-100 text-gray-400'
                    )}>
                        {counts[tab.key]}
                    </span>
                    {activeTab === tab.key && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#53B175] rounded-full" />
                    )}
                </button>
            ))}
        </div>
    );
}

export function BrandStore({ brandId }: BrandStoreProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<ActiveTab>('items');
    const [selectedProduct, setSelectedProduct] = useState<BrandProduct | null>(null);
    const [brand, setBrand] = useState<BrandStoreData | null>(BRAND_DATA[brandId] ?? null);
    const [loading, setLoading] = useState(!BRAND_DATA[brandId]);
    const [searchQuery, setSearchQuery] = useState('');

    // Try real API; fall back to mock data silently
    useEffect(() => {
        if (BRAND_DATA[brandId]) return; // mock data covers this brand
        queueMicrotask(() => setLoading(true));
        fetch(`/api/v1/brands/${brandId}`)
            .then(r => r.json())
            .then(json => {
                if (json.success && json.data) {
                    const d = json.data;
                    // Shape API response → BrandStoreData
                    setBrand({
                        id: d.id,
                        name: d.name,
                        bannerImage: d.banner ?? '',
                        tagline: d.tagline ?? '',
                        products: d.products.map((p: { id: string; name: string; image?: string; category: string }) => ({
                            id: p.id,
                            name: p.name,
                            image: p.image ?? '',
                            category: p.category,
                        })),
                        vendors: d.vendors.map((v: { id: string; name: string; logo?: string; pincodes?: string[]; productIds: string[]; prices: Record<string, string> }) => ({
                            id: v.id,
                            name: v.name,
                            logo: v.logo ?? '',
                            location: v.pincodes?.[0] ?? 'India',
                            productIds: v.productIds,
                            prices: v.prices,
                        })),
                    });
                }
            })
            .catch(() => {/* stay null, show not-found */})
            .finally(() => setLoading(false));
    }, [brandId]);

    // Must be before early returns (hook rules)
    const filteredProducts = useMemo(() => {
        if (!brand) return [];
        if (!searchQuery.trim()) return brand.products;
        const q = searchQuery.toLowerCase();
        return brand.products.filter(
            (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
        );
    }, [brand, searchQuery]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-2 border-[#53B175] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!brand) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-[20px] font-black text-[#181725] mb-2">Brand not found</p>
                    <p className="text-[14px] text-gray-400 font-bold mb-6">
                        This brand store is not available yet.
                    </p>
                    <Link href="/" className="px-6 py-3 bg-[#53B175] text-white rounded-2xl font-black text-[14px]">
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const handleProductClick = (product: BrandProduct) => {
        setSelectedProduct(product);
        setActiveTab('vendors');
    };

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        if (tab === 'items') setSelectedProduct(null);
    };

    const vendorsForProduct = selectedProduct
        ? brand.vendors.filter((v) => v.productIds.includes(selectedProduct.id))
        : brand.vendors;

    const fallbackSvg = (size: number) =>
        `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"%3E%3Crect fill="%23f5f5f5" width="${size}" height="${size}"/%3E%3C/svg%3E`;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">

            {/* ══════════════════════════════════════════
                MOBILE HEADER — compact light-green hero
                (matches homepage mobile hero style)
            ══════════════════════════════════════════ */}
            <div className="block md:hidden px-4 pt-4">
                <div
                    className="relative w-full rounded-[20px] overflow-hidden"
                    style={{ backgroundColor: '#eff9f0' }}
                >
                    <button
                        onClick={() => router.back()}
                        className="absolute top-3 left-3 z-20 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm"
                        aria-label="Back"
                    >
                        <ChevronLeft size={18} strokeWidth={3} className="text-[#181725]" />
                    </button>
                    <div className="flex items-center px-5 py-6 pt-10">
                        <div className="flex-1 pr-2 min-w-0">
                            <span className="inline-block bg-[#53B175] text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide mb-2">
                                Brand Store
                            </span>
                            <h1 className="text-[20px] font-[900] text-[#0f172a] leading-[1.15] mb-1 line-clamp-2">
                                {brand.name}
                            </h1>
                            <p className="text-[11px] text-gray-500 font-bold leading-[1.4] line-clamp-2 mb-2">
                                {brand.tagline}
                            </p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wide">
                                {brand.products.length} products · {brand.vendors.length} distributors
                            </p>
                        </div>
                        <div className="flex-shrink-0 w-[38%] max-w-[120px]">
                            <div className="w-full aspect-square rounded-[14px] overflow-hidden bg-white border border-white/60 shadow-sm">
                                <img
                                    src={brand.bannerImage}
                                    alt={brand.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.background = '#f5f5f5'; }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs below hero */}
                <div className="mt-4 px-1">
                    <TabBar activeTab={activeTab} brand={brand} onTabChange={handleTabChange} />
                </div>
            </div>

            {/* ══════════════════════════════════════════
                DESKTOP HEADER — compact green-gradient hero
                (matches homepage hero style)
            ══════════════════════════════════════════ */}
            <div className="hidden md:block bg-white pb-0">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] pt-6">
                    <div className="relative w-full h-[180px] lg:h-[220px] rounded-[32px] md:rounded-[40px] overflow-hidden bg-gradient-to-r from-[#22844f] via-[#299e60] to-[#22c55e] flex items-center px-6 md:px-10 lg:px-20 shadow-lg">
                        {/* Decorative circles (same as homepage hero) */}
                        <div className="absolute left-0 top-0 w-full h-full opacity-10 pointer-events-none">
                            <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10%" cy="50%" r="150" stroke="white" strokeWidth="2" />
                                <circle cx="90%" cy="20%" r="80" stroke="white" strokeWidth="2" />
                            </svg>
                        </div>

                        {/* Back button */}
                        <button
                            onClick={() => router.back()}
                            className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white z-20 hover:bg-white/30 transition"
                            aria-label="Back"
                        >
                            <ChevronLeft size={20} strokeWidth={3} />
                        </button>

                        {/* Content */}
                        <div className="flex items-center w-full relative z-10">
                            {/* Brand image thumbnail */}
                            <div className="flex-shrink-0 mr-4 md:mr-8 lg:mr-12">
                                <div className="w-[110px] h-[110px] md:w-[140px] md:h-[140px] lg:w-[170px] lg:h-[170px] rounded-[20px] md:rounded-[24px] bg-white/10 border-2 border-white/30 overflow-hidden shadow-2xl">
                                    <img
                                        src={brand.bannerImage}
                                        alt={brand.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.background = 'rgba(255,255,255,0.15)'; }}
                                    />
                                </div>
                            </div>

                            {/* Title + tagline + counts */}
                            <div className="flex-grow flex flex-col items-start justify-center text-white min-w-0">
                                <span className="bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                                    Brand Store
                                </span>
                                <h1 className="text-[1.6rem] md:text-[2rem] lg:text-[2.8rem] font-[900] leading-[1.05] tracking-tight drop-shadow-md line-clamp-1">
                                    {brand.name}
                                </h1>
                                <p className="text-[0.8rem] md:text-[0.95rem] lg:text-[1.05rem] font-medium opacity-90 max-w-[500px] mt-1 line-clamp-1">
                                    {brand.tagline}
                                </p>
                                <p className="text-[0.7rem] md:text-[0.78rem] font-bold opacity-80 mt-1.5 uppercase tracking-wider">
                                    {brand.products.length} products · {brand.vendors.length} distributors
                                </p>
                            </div>

                            {/* CTA button */}
                            <div className="flex-shrink-0 ml-4 hidden lg:block">
                                <button
                                    onClick={() => handleTabChange('items')}
                                    className="bg-[#181725] text-white px-7 py-3 rounded-2xl flex items-center gap-2 text-[1rem] font-bold hover:scale-105 transition-all shadow-xl whitespace-nowrap"
                                >
                                    Explore Items
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs below hero */}
                    <div className="mt-6">
                        <TabBar activeTab={activeTab} brand={brand} onTabChange={handleTabChange} />
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                TAB CONTENT
            ══════════════════════════════════════════ */}
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-6">

                {/* ALL ITEMS TAB */}
                {activeTab === 'items' && (
                    <>
                    {/* Search bar — inside content, below tabs */}
                    <div className="relative mb-4 max-w-[500px]">
                        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={3} />
                        <input
                            type="text"
                            placeholder={`Search in ${brand.name}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 bg-white border border-gray-100 rounded-2xl text-[14px] font-bold text-gray-800 placeholder:text-gray-400 placeholder:font-bold focus:outline-none focus:border-[#53B175]/50 shadow-sm transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 transition">
                                <X size={13} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                        {filteredProducts.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                className="text-left flex flex-col bg-white rounded-[18px] border border-gray-100 overflow-hidden hover:border-[#53B175]/40 hover:shadow-md active:scale-[0.97] transition-all duration-200"
                            >
                                <div className="w-full aspect-square bg-gray-50 overflow-hidden">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-contain p-3"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackSvg(100); }}
                                    />
                                </div>
                                <div className="px-3 py-2.5">
                                    <p className="text-[12px] font-black text-[#181725] line-clamp-2 leading-tight">
                                        {product.name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tight">
                                        {product.category}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                    </>
                )}

                {/* VENDORS TAB */}
                {activeTab === 'vendors' && (
                    <div>
                        {/* Selected product context bar */}
                        {selectedProduct && (
                            <div className="flex items-center gap-3 mb-5 p-4 bg-white rounded-[16px] border border-[#53B175]/20">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                                    <img
                                        src={selectedProduct.image}
                                        alt={selectedProduct.name}
                                        className="w-full h-full object-contain p-1.5"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackSvg(40); }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Showing vendors for</p>
                                    <p className="text-[14px] font-black text-[#181725] truncate">{selectedProduct.name}</p>
                                </div>
                                <button
                                    onClick={() => handleTabChange('items')}
                                    className="flex items-center gap-1.5 text-[12px] font-black text-[#53B175] shrink-0 hover:underline"
                                >
                                    <ArrowLeft size={13} strokeWidth={3} />
                                    All Items
                                </button>
                            </div>
                        )}

                        {/* Vendor cards */}
                        {vendorsForProduct.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Store size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
                                <p className="text-[16px] font-black text-gray-400">No distributors available</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {vendorsForProduct.map((vendor) => (
                                    <Link
                                        key={vendor.id}
                                        href={`/vendor/${vendor.id}`}
                                        className="flex items-center gap-4 p-5 bg-white rounded-[20px] border border-gray-100 hover:border-[#53B175]/30 hover:shadow-lg hover:shadow-gray-100 transition-all duration-200 group"
                                    >
                                        <div className="w-16 h-16 rounded-[16px] bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                                            <img
                                                src={vendor.logo}
                                                alt={vendor.name}
                                                className="w-full h-full object-contain p-2"
                                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackSvg(64); }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[16px] font-black text-[#181725] group-hover:text-[#53B175] transition-colors truncate">
                                                {vendor.name}
                                            </p>
                                            <p className="text-[12px] text-gray-400 font-bold flex items-center gap-1 mt-1">
                                                <MapPin size={12} strokeWidth={2.5} />
                                                {vendor.location}
                                            </p>
                                            {selectedProduct && vendor.prices[selectedProduct.id] ? (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[18px] font-[1000] text-[#53B175]">
                                                        ₹{vendor.prices[selectedProduct.id]}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[11px] font-black text-green-600">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                        In Stock
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="text-[12px] font-bold text-gray-400 mt-1.5">
                                                    {vendor.productIds.length} products available
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
