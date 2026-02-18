'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    ShoppingCart,
    Star,
    Store,
    ArrowLeft,
    Filter,
    LayoutGrid,
    List
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProductShowcase } from '@/components/features/ProductShowcase';
import { NewsletterBanner } from '@/components/features/NewsletterBanner';

// --- Shared Data ---
const CATEGORIES = [
    { name: 'Vegetables', image: '/images/category/vegitable.png' },
    { name: 'Fruits', image: '/images/category/fruits.png' },
    { name: 'Meat & Eggs', image: '/images/category/animal food.png' },
    { name: 'Drinks', image: '/images/category/drink-juice.png' },
    { name: 'Bakery', image: '/images/category/candy.png' },
    { name: 'Snacks', image: '/images/category/snacks.png' },
    { name: 'Dairy', image: '/images/category/milk.png' },
];

const VEGETABLES = [
    {
        id: 1,
        name: 'Ladies Finger 1 kg',
        image: '/images/product/product-img1.png',
        vendor: 'Sold by: 6 venders',
    },
    {
        id: 2,
        name: 'Desi Fresh Tomato 1 kg',
        image: '/images/product/product-img3.png',
        vendor: 'Sold by: 12 venders',
    },
    {
        id: 3,
        name: 'Ladies Finger 1 kg',
        image: '/images/product/product-img1.png',
        vendor: 'Sold by: 6 venders',
    },
    {
        id: 4,
        name: 'Desi Fresh Tomato 1 kg',
        image: '/images/product/product-img3.png',
        vendor: 'Sold by: 12 venders',
    }
];

const FRUITS = [
    {
        id: 101,
        name: 'Nagpur Oranges 1 kg',
        image: '/images/category/fruits.png',
        vendor: 'Sold by: 12 venders',
    },
    {
        id: 102,
        name: 'Kashmir Apple 1 kg',
        image: '/images/recom-product/product-img10.png',
        vendor: 'Sold by: 6 venders',
    },
    {
        id: 103,
        name: 'Nagpur Oranges 1 kg',
        image: '/images/category/fruits.png',
        vendor: 'Sold by: 12 venders',
    },
    {
        id: 104,
        name: 'Kashmir Apple 1 kg',
        image: '/images/recom-product/product-img10.png',
        vendor: 'Sold by: 6 venders',
    }
];

const PRODUCTS = [
    {
        id: 1,
        name: 'Ladies Finger 1 kg',
        image: '/images/product/product-img1.png', // Assuming correct veg image or using placeholder
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'Sold by: 6 venders',
        sold: 18,
        total: 35
    },
    {
        id: 2,
        name: 'Desi Fresh Tomato 1 kg',
        image: '/images/product/product-img3.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'Sold by: 12 venders',
        sold: 18,
        total: 35
    },
    {
        id: 3,
        name: 'Onion 1 kg',
        image: '/images/fruits-vegetables/onion.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'Sold by: 8 venders',
        sold: 18,
        total: 35
    },
    {
        id: 4,
        name: 'Coriander 200 gms Bunch',
        image: '/images/fruits-vegetables/corriander.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'Sold by: 10 venders',
        sold: 18,
        total: 35
    },
    {
        id: 5,
        name: 'Fresh Carrots',
        image: '/images/product/product-img5.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'Sold by: 5 venders',
        sold: 18,
        total: 35
    },
    {
        id: 6,
        name: 'Green Broccoli',
        image: '/images/product/brokali.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'Sold by: 6 venders',
        sold: 18,
        total: 35
    }
];

const FEATURED_PRODUCTS = [
    { id: 1, name: 'Taylor Farms Broccoli...', image: '/images/product/brokali.png', price: '$1500.00', oldPrice: '$1500.00', rating: 4.8, reviews: '17k' },
    { id: 2, name: 'Taylor Farms Broccoli...', image: '/images/product/product-img3.png', price: '$1500.00', oldPrice: '$1500.00', rating: 4.8, reviews: '17k' },
    { id: 3, name: 'Taylor Farms Broccoli...', image: '/images/product/brokali.png', price: '$1500.00', oldPrice: '$1500.00', rating: 4.8, reviews: '17k' },
    { id: 4, name: 'Taylor Farms Broccoli...', image: '/images/product/product-img5.png', price: '$1500.00', oldPrice: '$1500.00', rating: 4.8, reviews: '17k' },
];

const PROMO_SLIDES = [
    { title: 'Fresh \n Vegetables', subtitle: 'Get Up To 40% OFF', image: '/images/category/vegitable.png', bg: 'from-[#EAF6EF] to-[#EAF6EF]' },
    { title: 'Organic \n Fruits', subtitle: 'Save Extra 20%', image: '/images/category/fruits.png', bg: 'from-[#F2F3F2] to-[#F2F3F2]' },
    { title: 'Natural \n Drinks', subtitle: 'Best Price Guaranteed', image: '/images/category/drink-juice.png', bg: 'from-[#f0f9ff] via-[#ffffff] to-[#f0f9ff]' },
];

export default function CategoryPage() {
    const params = useParams();
    const slug = params.slug as string;
    const displayName = (slug || 'Fruits & Vegetables')
        .replace(/%26/g, '&')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    const [activeIdx, setActiveIdx] = useState(0);
    const scrollRef = React.useRef<HTMLDivElement>(null);

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

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.clientWidth;
        const newIdx = Math.round(scrollLeft / width);
        if (newIdx !== activeIdx) setActiveIdx(newIdx);
    };

    const ProductCard = ({ product }: { product: any }) => (
        <div className="bg-white border border-[#E2E2E2] rounded-[18px] p-3 flex flex-col relative group transition-all duration-300">
            <div className="w-full aspect-[1] mb-2 flex items-center justify-center p-2">
                <Link href={`/product/${product.id}`} className="w-full h-full flex items-center justify-center">
                    <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain" />
                </Link>
            </div>
            <h3 className="text-[14px] font-bold text-[#181725] leading-snug mb-3 line-clamp-2 h-10">
                {product.name}
            </h3>
            <div className="flex items-center gap-2 mb-4">
                <img src="/images/shop.svg" alt="shop" className="w-[12px] h-[14px]" />
                <span className="text-[11px] text-[#7C7C7C] font-medium">{product.vendor}</span>
            </div>
            <button className="w-full py-2.5 bg-[#EAF6EF] rounded-[15px] flex items-center justify-center gap-2 text-[#53B175] text-[13px] font-bold transition-all active:scale-95">
                Add To Cart
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            </button>
        </div>
    );

    return (
        <div className="bg-white min-h-screen">
            {/* Global Footer Hide for Mobile on this page */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 768px) {
                    footer { display: none !important; }
                }
            `}} />

            {/* ==================== MOBILE TOP SECTION ==================== */}
            <div className="md:hidden">
                {/* Green Theme Bar */}
                <div className="w-full h-[2px] bg-[#53B175] shadow-sm" />

                {/* Main Header */}
                <header className="bg-white px-4 py-3 flex items-center justify-between">
                    <Link href="/">
                        <ArrowLeft size={22} className="text-[#181725]" strokeWidth={2.5} />
                    </Link>
                    <h1 className="text-[18px] font-bold text-[#181725] flex-1 text-center">
                        {displayName}
                    </h1>
                    <button className="p-1">
                        <Search size={22} className="text-[#181725]" strokeWidth={2.5} />
                    </button>
                </header>

                {/* Horizontal Category Select */}
                <div className="bg-white overflow-x-auto no-scrollbar py-2">
                    <div className="flex items-center gap-4 px-4">
                        {CATEGORIES.map((cat, idx) => {
                            const isActive = slug?.toLowerCase() === cat.name.toLowerCase() || (idx === 0 && !slug);
                            return (
                                <div key={idx} className="flex flex-col items-center flex-shrink-0 relative pb-2 min-w-[75px]">
                                    <Link
                                        href={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                                        className={cn(
                                            "w-[64px] h-[64px] rounded-[18px] flex items-center justify-center overflow-hidden transition-all duration-300",
                                            isActive ? "bg-[#EAF6EF] border-2 border-[#53B175]" : "bg-[#F2F3F2]"
                                        )}
                                    >
                                        <img src={cat.image} alt={cat.name} className="w-[60%] h-[60%] object-contain" />
                                    </Link>
                                    <span className={cn(
                                        "text-[12px] font-bold mt-2",
                                        isActive ? "text-[#53B175]" : "text-[#7C7C7C]"
                                    )}>
                                        {cat.name}
                                    </span>
                                    {isActive && (
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-[#53B175] rounded-full"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Promo Slider */}
                <div className="px-4 py-4">
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                    >
                        {PROMO_SLIDES.map((slide, idx) => (
                            <div key={idx} className="min-w-full snap-start">
                                <div className={cn(
                                    "relative h-[115px] rounded-[18px] overflow-hidden flex items-center bg-gradient-to-r",
                                    slide.bg
                                )}>
                                    <div className="w-[45%] flex items-center justify-center pl-4">
                                        <img src={slide.image} alt="Featured" className="h-[90px] w-auto object-contain" />
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center text-center pr-4">
                                        <h3 className="text-[18px] font-bold text-[#181725] leading-none mb-1 whitespace-pre-line">
                                            {slide.title}
                                        </h3>
                                        <p className="text-[12px] font-bold text-[#53B175] mb-2 uppercase tracking-tight">
                                            {slide.subtitle}
                                        </p>

                                        {/* Dots Indicator */}
                                        <div className="flex items-center gap-1.5 mt-1">
                                            {PROMO_SLIDES.map((_, dotIdx) => (
                                                <div
                                                    key={dotIdx}
                                                    className={cn(
                                                        "transition-all duration-300 rounded-full",
                                                        dotIdx === activeIdx ? "w-4 h-1 bg-[#53B175]" : "w-1 h-1 bg-gray-300"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ==================== DESKTOP SECTION ==================== */}
            <div className="hidden md:block">
                {/* Desktop Breadcrumb & Header */}
                <div className="bg-[#f8fff8] py-8 border-b border-gray-100">
                    <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                        <div className="flex items-center gap-2 text-[13px] text-text-muted mb-4">
                            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                            <span>/</span>
                            <span className="text-text font-semibold">{displayName}</span>
                        </div>
                        <h1 className="text-[36px] font-extrabold text-[#1a2b4b]">{displayName}</h1>
                    </div>
                </div>

                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-10">
                    <div className="flex gap-10">
                        {/* Sidebar Filters */}
                        <aside className="w-[280px] shrink-0">
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24 space-y-8">
                                {/* Categories List */}
                                <div>
                                    <h3 className="text-[18px] font-bold text-text mb-4 pb-2 border-b-2 border-primary/10">Categories</h3>
                                    <div className="space-y-3">
                                        {CATEGORIES.map((cat, idx) => (
                                            <Link
                                                key={idx}
                                                href={`/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                                                className={cn(
                                                    "flex items-center justify-between group py-1",
                                                    slug?.toLowerCase() === cat.name.toLowerCase() ? "text-primary" : "text-text-muted hover:text-primary transition-colors"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                        <img src={cat.image} alt="" className="w-[60%] h-[60%] object-contain" />
                                                    </div>
                                                    <span className="text-[14px] font-bold">{cat.name}</span>
                                                </div>
                                                <span className="text-[11px] font-bold bg-gray-50 px-2 py-0.5 rounded-full text-text-muted">24</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Filter */}
                                <div>
                                    <h3 className="text-[18px] font-bold text-text mb-4 pb-2 border-b-2 border-primary/10">Price Range</h3>
                                    <div className="space-y-4 pt-2">
                                        <div className="h-1 w-full bg-gray-100 rounded-full relative">
                                            <div className="absolute inset-y-0 left-[10%] right-[30%] bg-primary rounded-full"></div>
                                            <div className="absolute top-1/2 left-[10%] -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-sm cursor-pointer"></div>
                                            <div className="absolute top-1/2 right-[30%] -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-sm cursor-pointer"></div>
                                        </div>
                                        <div className="flex items-center justify-between text-[13px] font-bold text-text">
                                            <span>$0</span>
                                            <span>$1500</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Banner Ad in Sidebar */}
                                <div className="rounded-2xl overflow-hidden relative group">
                                    <img src="/images/banner/banner-img1.png" alt="Promo" className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-5 flex flex-col justify-end">
                                        <span className="text-white/80 text-[12px] font-bold mb-1">Big Sale</span>
                                        <h4 className="text-white text-[16px] font-bold leading-tight line-clamp-2">Pure Organic Honey Bundle</h4>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Main Grid Section */}
                        <div className="flex-1">
                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-8 bg-gray-50/50 rounded-xl px-6 py-4 border border-gray-100">
                                <div className="flex items-center gap-6">
                                    <span className="text-[14px] text-text-muted">Showing <strong>24</strong> products</span>
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 rounded-lg bg-white border border-gray-200 text-primary shadow-sm"><LayoutGrid size={18} /></button>
                                        <button className="p-2 rounded-lg bg-transparent text-text-muted hover:bg-gray-100"><List size={18} /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[14px] font-bold text-text">Sort by:</span>
                                    <select className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[14px] font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer">
                                        <option>Price: Low to High</option>
                                        <option>Price: High to Low</option>
                                        <option>Newest First</option>
                                        <option>Most Popular</option>
                                    </select>
                                </div>
                            </div>

                            {/* Main Product Grid */}
                            <div className="grid grid-cols-3 xl:grid-cols-4 gap-6">
                                {PRODUCTS.map((product) => (
                                    <Link
                                        href={`/product/${product.id}`}
                                        key={product.id}
                                        className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 flex flex-col"
                                    >
                                        <div className="relative aspect-square mb-4 bg-gray-50 rounded-xl overflow-hidden p-4 flex items-center justify-center shrink-0">
                                            <img src={product.image} alt={product.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" />
                                            <button className="absolute top-2 right-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[11px] font-bold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-sm">
                                                Quick Add +
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1 mb-2">
                                            <Star size={12} className="fill-[#ffb800] text-[#ffb800]" />
                                            <span className="text-[12px] font-bold text-text">{product.rating}</span>
                                        </div>
                                        <h3 className="text-[14px] font-bold text-text leading-tight mb-2 line-clamp-2 h-9 group-hover:text-primary transition-colors">
                                            {product.name}
                                        </h3>
                                        <div className="mt-auto pt-2 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[18px] font-extrabold text-primary">{product.newPrice}</span>
                                                <span className="text-[11px] text-text-muted line-through">{product.oldPrice}</span>
                                            </div>
                                            <button className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-dark transition-all transform active:scale-90">
                                                <ShoppingCart size={18} />
                                            </button>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== CONTENT SECTIONS ==================== */}
            <div className="max-w-[var(--container-max)] mx-auto px-4 md:px-[var(--container-padding)] pb-20">

                {/* 1. Vegetable Section (Mobile) */}
                <div className="md:hidden grid grid-cols-2 gap-3 mt-4">
                    {VEGETABLES.map((product, idx) => (
                        <ProductCard key={`${product.id}-${idx}`} product={product} />
                    ))}
                </div>

                {/* 2. Flash Sales Today Section (Mobile) */}
                <div className="md:hidden mt-8">
                    <h2 className="text-[20px] font-bold text-[#181725] mb-4">Flash Sales Today</h2>

                    {/* Flash Sale Banner */}
                    <div className="bg-[#E7F6E7] rounded-[22px] p-6 mb-6 flex items-center relative overflow-hidden">
                        <div className="relative z-10 w-[60%]">
                            <h3 className="text-[20px] font-bold text-[#181725] leading-tight mb-4">
                                $5 off on your<br />firstorder
                            </h3>
                            <button className="bg-[#53B175] text-white px-6 py-2.5 rounded-[12px] text-[15px] font-bold shadow-sm transition-all active:scale-95">
                                Shop Now
                            </button>
                        </div>
                        <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-[55%]">
                            <img src="/images/flash-sale/flash-right1 (2).png" alt="Flash Sale" className="w-full h-auto object-contain" />
                        </div>
                        {/* Decorative background leaf pattern - conceptual */}
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("/images/category/vegitable.png")', backgroundSize: '100px' }} />
                    </div>

                    {/* Flash Sale Fruit Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {FRUITS.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>

                {/* Down Feature Section */}
                {/* <div className="mt-12 md:mt-16">
                    <ProductShowcase />
                </div> */}
            </div>

            {/* Newsletter Section */}
            {/* <div className="mt-4 md:mt-12 bg-white">
                <NewsletterBanner />
            </div> */}
        </div>
    );
}
