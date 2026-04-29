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

// Mock BRAND_DATA (Kitchen Smith / Kissan / etc.) removed 2026-04-29 — the
// component now always fetches /api/v1/brands/[id] so storefronts show real
// products + vendor mappings instead of seeded fakes.

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
    const [brand, setBrand] = useState<BrandStoreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Always fetch from the API — no client-side mock data anymore
    useEffect(() => {
        Promise.resolve().then(() => setLoading(true));
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
