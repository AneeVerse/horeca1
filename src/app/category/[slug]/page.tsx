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

const PRODUCTS = [
    {
        id: 1,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/product/brokali.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
        sold: 18,
        total: 35
    },
    {
        id: 2,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/product/product-img1.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
        sold: 18,
        total: 35
    },
    {
        id: 3,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/product/product-img3.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
        sold: 18,
        total: 35
    },
    {
        id: 4,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/product/product-img5.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
        sold: 18,
        total: 35
    },
    {
        id: 5,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/product/product-img6.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
        sold: 18,
        total: 35
    },
    {
        id: 6,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/organic/product-img20.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
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
    { title: 'Fresh \n Vegetables', subtitle: 'Get Up To 40% OFF', image: '/images/category/vegitable.png', bg: 'from-[#fff5f0] via-[#ffffff] to-[#f4fcf4]' },
    { title: 'Organic \n Fruits', subtitle: 'Save Extra 20%', image: '/images/category/fruits.png', bg: 'from-[#fdfcf0] via-[#ffffff] to-[#fff5f0]' },
    { title: 'Natural \n Drinks', subtitle: 'Best Price Guaranteed', image: '/images/category/drink-juice.png', bg: 'from-[#f0f9ff] via-[#ffffff] to-[#f0f9ff]' },
];

export default function CategoryPage() {
    const params = useParams();
    const slug = params.slug as string;
    const displayName = slug?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Category';
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

    return (
        <div className="bg-white min-h-screen">
            {/* ==================== MOBILE TOP SECTION (DETTO) ==================== */}
            <div className="md:hidden">
                {/* Green Theme Bar */}
                <div className="w-full h-1.5 bg-[#2ca36a]" />

                {/* Main Header */}
                <header className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-50">
                    <Link href="/">
                        <ArrowLeft size={24} className="text-[#1e293b]" strokeWidth={2.5} />
                    </Link>
                    <h1 className="text-[18px] font-[800] text-[#1e293b] font-[family-name:var(--font-inter)]">
                        {displayName}
                    </h1>
                    <button className="p-1">
                        <Search size={24} className="text-[#1e293b] stroke-2" />
                    </button>
                </header>

                {/* Horizontal Category Select */}
                <div className="bg-white border-b border-gray-100/80 overflow-x-auto no-scrollbar py-4 px-2">
                    <div className="flex items-center gap-6 px-4">
                        {CATEGORIES.map((cat, idx) => (
                            <div key={idx} className="flex flex-col items-center flex-shrink-0 relative">
                                <Link
                                    href={`/category/${cat.name.toLowerCase()}`}
                                    className={cn(
                                        "w-[68px] h-[68px] rounded-[20px] flex items-center justify-center overflow-hidden transition-all duration-300",
                                        idx === 0 ? "bg-[#cceccd] border-2 border-[#2ca36a] shadow-sm" : "bg-[#e9f7ef]"
                                    )}
                                >
                                    <img src={cat.image} alt={cat.name} className="w-[65%] h-[65%] object-contain" />
                                </Link>
                                <span className={cn(
                                    "text-[12px] font-[900] mt-3 tracking-tight font-[family-name:var(--font-inter)]",
                                    idx === 0 ? "text-[#2ca36a]" : "text-[#64748b]"
                                )}>
                                    {cat.name}
                                </span>
                                {idx === 0 && (
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-6 h-[2.5px] bg-[#2ca36a] rounded-full"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile Promo Slider (Poster Component Style) */}
                <div className="px-4 py-6">
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
                    >
                        {PROMO_SLIDES.map((slide, idx) => (
                            <div key={idx} className="min-w-full snap-start pr-0 last:pr-0">
                                <div className={cn(
                                    "relative h-[115px] rounded-[18px] overflow-hidden bg-gradient-to-r shadow-sm border border-gray-50/50",
                                    slide.bg
                                )}>
                                    {/* Background Leaf/Pattern */}
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("/images/flash-sale/flash-sale-bg1.png")', backgroundSize: '180px' }} />

                                    <div className="relative z-10 flex items-center justify-between h-full px-5">
                                        <div className="w-[38%] flex items-center justify-center">
                                            <img src={slide.image} alt="Featured" className="w-[85%] h-auto object-contain drop-shadow-md" />
                                        </div>

                                        <div className="flex-1 flex flex-col items-center text-center">
                                            <h3 className="text-[16px] font-[900] text-[#1e293b] leading-tight mb-0.5 font-[family-name:var(--font-inter)] uppercase tracking-wider whitespace-pre-line">
                                                {slide.title}
                                            </h3>
                                            <p className="text-[12px] font-[800] text-[#2ca36a] mb-2 font-[family-name:var(--font-inter)]">
                                                {slide.subtitle}
                                            </p>

                                            {/* Dots Indicator */}
                                            <div className="flex items-center gap-1 mt-1">
                                                {PROMO_SLIDES.map((_, dotIdx) => (
                                                    <div
                                                        key={dotIdx}
                                                        className={cn(
                                                            "transition-all duration-300 rounded-full",
                                                            dotIdx === activeIdx ? "w-4 h-1 bg-[#2ca36a]" : "w-1 h-1 bg-gray-300"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="absolute right-2 top-2">
                                            <img src="/images/banner/leaf-icon.png" alt="" className="w-5 opacity-40" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ==================== DESKTOP SECTION (MODERN IDEA) ==================== */}
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
                                                href={`/category/${cat.name.toLowerCase()}`}
                                                className={cn(
                                                    "flex items-center justify-between group py-1",
                                                    idx === 0 ? "text-primary" : "text-text-muted hover:text-primary transition-colors"
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

            {/* ==================== COMMON SECTIONS (MOBILE GRID & DOWN FEATURE) ==================== */}
            <div className="max-w-[var(--container-max)] mx-auto px-4 md:px-[var(--container-padding)]">
                {/* Mobile Specific Grid */}
                <div className="md:hidden grid grid-cols-2 gap-4">
                    {PRODUCTS.map((product) => (
                        <Link
                            href={`/product/${product.id}`}
                            key={product.id}
                            className="bg-white rounded-[22px] border border-gray-100 p-3.5 shadow-sm flex flex-col h-full active:bg-gray-50 transition-colors"
                        >
                            <div className="relative aspect-square mb-3.5 bg-[#f7f8f7] rounded-[18px] p-4 flex items-center justify-center shrink-0">
                                <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                                <button className="absolute -top-1 -right-1 bg-white text-[#2ca36a] px-3.5 py-2 rounded-full text-[11px] font-[900] shadow-md flex items-center gap-1 border border-[#e9f7ef] font-[family-name:var(--font-inter)]">
                                    Add <ShoppingCart size={13} strokeWidth={3} />
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className="text-[10px] text-text-muted line-through font-bold">{product.oldPrice}</span>
                                <span className="text-[15px] font-[900] text-[#2ca36a] tracking-tighter">{product.newPrice}</span>
                                <span className="text-[11px] font-bold text-[#64748b]">/Qty</span>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                                <Star size={12} className="fill-[#ffb800] text-[#ffb800]" />
                                <span className="text-[12px] font-extrabold text-[#111827]">{product.rating}</span>
                                <span className="text-[10px] text-text-muted font-bold">({product.reviews})</span>
                            </div>
                            <h3 className="text-[13px] font-[800] text-[#111827] leading-[1.3] mb-3 line-clamp-2 h-8 font-[family-name:var(--font-inter)]">
                                {product.name}
                            </h3>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1 bg-[#f0fdf4] rounded-md">
                                    <Store size={11} className="text-[#2ca36a]" />
                                </div>
                                <span className="text-[10px] text-[#64748b] font-bold italic">{product.vendor}</span>
                            </div>
                            <div className="mt-auto">
                                <div className="w-full h-[3px] bg-gray-100 rounded-full overflow-hidden mb-1.5">
                                    <div className="h-full bg-[#2ca36a] rounded-full" style={{ width: '51%' }} />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-extrabold text-[#111827]">
                                    <span>Sold: {product.sold}/{product.total}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Down Feature Section (Product Showcase) */}
                <div className="mt-12 md:mt-16">
                    <ProductShowcase />
                </div>
            </div>

            {/* Newsletter Section */}
            <div className="mt-8 md:mt-12 bg-white">
                <NewsletterBanner />
            </div>

            {/* Bottom Space for mobile nav */}
            <div className="h-10 md:hidden" />
        </div>
    );
}
