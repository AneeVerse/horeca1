'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
    ChevronRight,
    Search,
    Star,
    ArrowLeft,
    LayoutGrid,
    List,
    ChevronDown
} from 'lucide-react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ALL_MOCK_PRODUCTS, MOCK_CATEGORIES } from '@/lib/mockData';
import { VendorProductCard } from '@/components/features/vendor/VendorProductCard';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';

const PROMO_SLIDES = [
    { title: 'Fresh \n Vegetables', subtitle: 'Get Up To 40% OFF', image: '/images/category/vegitable.png', bg: 'from-[#EAF6EF] to-[#EAF6EF]' },
    { title: 'Organic \n Fruits', subtitle: 'Save Extra 20%', image: '/images/category/fruits.png', bg: 'from-[#F2F3F2] to-[#F2F3F2]' },
    { title: 'Natural \n Drinks', subtitle: 'Best Price Guaranteed', image: '/images/category/drink-juice.png', bg: 'from-[#f0f9ff] via-[#ffffff] to-[#f0f9ff]' },
];

function CategoryPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const slug = params.slug as string;

    // Filter products based on category slug
    const filteredProducts = useMemo(() => {
        if (!slug) return ALL_MOCK_PRODUCTS;
        const categoryName = slug.toLowerCase().replace(/-/g, ' ');
        return ALL_MOCK_PRODUCTS.filter(p => 
            p.category.toLowerCase().includes(categoryName) || 
            (p.subcategory && p.subcategory.toLowerCase().includes(categoryName))
        );
    }, [slug]);

    // Check for expanded state in URL
    const isExpanded = searchParams.get('exp') === '1';

    const displayName = useMemo(() => {
        if (!slug) return 'Fruits & Vegetables';
        return slug
            .replace(/%26/g, '&')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, [slug]);

    const [activeIdx, setActiveIdx] = useState(0);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Toggle expansion via URL to persist across navigations
    const toggleExpanded = () => {
        const newExpanded = !isExpanded;
        const currentParams = new URLSearchParams(searchParams.toString());
        if (newExpanded) {
            currentParams.set('exp', '1');
        } else {
            currentParams.delete('exp');
        }
        router.push(`?${currentParams.toString()}`, { scroll: false });
    };

    // Robust comparison for active tab
    const isTabActive = (catSlug: string, currentSlug: string) => {
        if (!currentSlug && catSlug === 'vegetables') return true;
        return currentSlug === catSlug;
    };

    React.useEffect(() => {
        const interval = setInterval(() => {
            if (scrollRef.current) {
                const nextIdx = (activeIdx + 1) % PROMO_SLIDES.length;
                const container = scrollRef.current;
                container.scrollTo({
                    left: nextIdx * container.clientWidth,
                    behavior: 'smooth'
                });
                setActiveIdx(nextIdx);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeIdx]);

    return (
        <div className="bg-white min-h-screen flex flex-col">
            {/* Global Footer Hide for Mobile on this page */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 768px) {
                    footer, .bottom-nav { display: none !important; }
                }
            `}} />

            {/* ==================== MOBILE LAYOUT ==================== */}
            <div className="md:hidden flex flex-col h-screen overflow-hidden">
                {/* Fixed Header */}
                <header className="bg-white px-4 py-4 flex items-center justify-between border-b border-[#F2F3F2] shrink-0 relative">
                    <button onClick={() => router.back()}>
                        <ArrowLeft size={24} className="text-[#181725]" />
                    </button>
                    <h1 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-bold text-[#181725] whitespace-nowrap">
                        {displayName}
                    </h1>
                    <Link href="/search" className="p-1">
                        <Search size={22} className="text-[#181725]" strokeWidth={2.5} />
                    </Link>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar: Categories */}
                    <div className="w-[100px] bg-white overflow-y-auto no-scrollbar border-r border-[#D0D0D0] flex flex-col pt-2">
                        {[{ name: 'See All', slug: 'all', icon: '🛒' }, ...MOCK_CATEGORIES].map((cat, idx) => {
                            const isActive = isTabActive(cat.slug, slug);
                            return (
                                <Link
                                    key={idx}
                                    href={cat.slug === 'all' ? '/search' : `/category/${cat.slug}`}
                                    className={cn(
                                        "flex flex-col items-center py-4 px-1 relative transition-all",
                                        "bg-white"
                                    )}
                                >
                                    {isActive && <div className="absolute right-[-1px] top-[16px] h-[72px] w-[4px] bg-[#53B175] rounded-l-md z-20" />}
                                    <div className={cn(
                                        "flex items-center justify-center mb-2 overflow-hidden transition-all",
                                        cat.slug === 'all' ? "w-[64px] h-[64px] rounded-full bg-[#F8F9FA]" : "w-[72px] h-[72px] rounded-[14px] bg-white",
                                        isActive ? "border-[1.5px] border-[#53B175]" : "border border-transparent"
                                    )}>
                                        <span className="text-[28px]">{cat.icon}</span>
                                    </div>
                                    <p className={cn(
                                        "text-[11px] text-center font-bold leading-tight px-1",
                                        isActive ? "text-[#53B175]" : "text-[#181725]"
                                    )}>
                                        {cat.name}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Content Area: Chips + Products */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        {/* Scrollable Filter Chips */}
                        <div className="flex overflow-x-auto px-4 py-3 gap-2 no-scrollbar border-b border-[#F2F3F2]">
                            {[
                                { label: 'Above 4.0+', icon: <Star size={14} className="fill-[#FFB800] text-[#FFB800] mr-1" /> },
                                { label: 'Brand', hasArrow: true },
                                { label: 'Type', hasArrow: true },
                                { label: 'Price', hasArrow: true },
                            ].map((chip, idx) => (
                                <button
                                    key={idx}
                                    className="flex items-center px-4 py-2 rounded-[12px] border border-[#E2E2E2] bg-white text-[13px] font-bold text-[#181725] whitespace-nowrap"
                                >
                                    {chip.icon}
                                    {chip.label}
                                    {chip.hasArrow && <ChevronDown size={14} className="ml-1" />}
                                </button>
                            ))}
                        </div>

                        {/* Product Feed */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <VendorProductCard
                                        key={product.id}
                                        product={product}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-20">
                                    <p className="text-[48px] mb-4">🛒</p>
                                    <p className="text-[#181725] font-bold">No products found in this category</p>
                                    <Link href="/search" className="text-[#53B175] font-bold mt-2 inline-block">Explore other items</Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== DESKTOP SECTION ==================== */}
            <div className="hidden md:block">
                {/* Desktop Breadcrumb & Header */}
                <div className="bg-[#f8fff8] py-8 border-b border-gray-100">
                    <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                        <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-4 font-medium">
                            <Link href="/" className="hover:text-[#53B175] transition-colors">Home</Link>
                            <span>/</span>
                            <span className="text-[#181725] font-semibold">{displayName}</span>
                        </div>
                        <h1 className="text-[36px] font-extrabold text-[#181725]">{displayName}</h1>
                    </div>
                </div>

                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-10">
                    <div className="flex gap-10">
                        {/* Sidebar Filters */}
                        <aside className="w-[280px] shrink-0">
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24 space-y-8">
                                {/* Categories List */}
                                <div>
                                    <h3 className="text-[18px] font-bold text-[#181725] mb-4 pb-2 border-b-2 border-[#53B175]/10">Categories</h3>
                                    <div className="space-y-3">
                                        {MOCK_CATEGORIES.map((cat, idx) => (
                                            <Link
                                                key={idx}
                                                href={`/category/${cat.slug}`}
                                                className={cn(
                                                    "flex items-center justify-between group py-1",
                                                    slug === cat.slug ? "text-[#53B175]" : "text-gray-400 hover:text-[#53B175] transition-colors"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-[#53B175]/10 transition-colors">
                                                        <span className="text-[16px]">{cat.icon}</span>
                                                    </div>
                                                    <span className="text-[14px] font-bold">{cat.name}</span>
                                                </div>
                                                <span className="text-[11px] font-bold bg-gray-50 px-2 py-0.5 rounded-full text-gray-400">{cat.itemCount}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Filter */}
                                <div>
                                    <h3 className="text-[18px] font-bold text-[#181725] mb-4 pb-2 border-b-2 border-[#53B175]/10">Price Range</h3>
                                    <div className="space-y-4 pt-2">
                                        <div className="h-1 w-full bg-gray-100 rounded-full relative">
                                            <div className="absolute inset-y-0 left-[10%] right-[30%] bg-[#53B175] rounded-full"></div>
                                            <div className="absolute top-1/2 left-[10%] -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#53B175] rounded-full shadow-sm cursor-pointer"></div>
                                            <div className="absolute top-1/2 right-[30%] -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#53B175] rounded-full shadow-sm cursor-pointer"></div>
                                        </div>
                                        <div className="flex items-center justify-between text-[13px] font-bold text-[#181725]">
                                            <span>₹0</span>
                                            <span>₹5000</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Main Grid Section */}
                        <div className="flex-1">
                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-8 bg-gray-50/50 rounded-xl px-6 py-4 border border-gray-100">
                                <div className="flex items-center gap-6">
                                    <span className="text-[14px] text-gray-400">Showing <strong>{filteredProducts.length}</strong> products</span>
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 rounded-lg bg-white border border-gray-200 text-[#53B175] shadow-sm"><LayoutGrid size={18} /></button>
                                        <button className="p-2 rounded-lg bg-transparent text-gray-400 hover:bg-gray-100"><List size={18} /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[14px] font-bold text-[#181725]">Sort by:</span>
                                    <select className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-[#53B175]/20 cursor-pointer">
                                        <option>Price: Low to High</option>
                                        <option>Price: High to Low</option>
                                        <option>Most Popular</option>
                                    </select>
                                </div>
                            </div>

                            {/* Main Product Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                                {filteredProducts.map((product) => (
                                    <VendorProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <StickyCartBar />
        </div>
    );
}

export default function CategoryPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white animate-pulse" />}>
            <CategoryPageContent />
        </Suspense>
    );
}
