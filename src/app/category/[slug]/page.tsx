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
    List,
    Share2,
    Plus,
    ChevronDown
} from 'lucide-react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProductShowcase } from '@/components/features/ProductShowcase';
import { NewsletterBanner } from '@/components/features/NewsletterBanner';
import { useCart } from '@/context/CartContext';


// --- Shared Data ---
const CATEGORIES = [
    { name: 'Fruits & Vegetables', image: '/images/category/vegitable.png' },
    { name: 'Dairy', image: '/images/category/milk.png' },
    { name: 'Canned & Imported', image: '/images/category/candy.png' }, // Placeholder image
    { name: 'Flours', image: '/images/category/snacks.png' }, // Placeholder image
    { name: 'Noodles & Sauces', image: '/images/category/drink-juice.png' }, // Placeholder image
    { name: 'Meat & Eggs', image: '/images/category/animal food.png' },
    { name: 'Bakery', image: '/images/category/candy.png' },
];

const VEGETABLES = [
    {
        id: 3001,
        name: 'Ladies Finger 1 kg',
        image: '/images/product/product-img1.png',
        vendor: 'Sold by: 6 venders',
    },
    {
        id: 3002,
        name: 'Desi Fresh Tomato 1 kg',
        image: '/images/product/product-img3.png',
        vendor: 'Sold by: 12 venders',
    },
    {
        id: 3003,
        name: 'Ladies Finger 1 kg',
        image: '/images/product/product-img1.png',
        vendor: 'Sold by: 6 venders',
    },
    {
        id: 3004,
        name: 'Desi Fresh Tomato 1 kg',
        image: '/images/product/product-img3.png',
        vendor: 'Sold by: 12 venders',
    }
];

const FRUITS = [
    {
        id: 4001,
        name: 'Nagpur Oranges 1 kg',
        image: '/images/category/fruits.png',
        vendor: 'Sold by: 12 venders',
    },
    {
        id: 4002,
        name: 'Kashmir Apple 1 kg',
        image: '/images/recom-product/product-img10.png',
        vendor: 'Sold by: 6 venders',
    },
    {
        id: 4003,
        name: 'Nagpur Oranges 1 kg',
        image: '/images/category/fruits.png',
        vendor: 'Sold by: 12 venders',
    },
    {
        id: 4004,
        name: 'Kashmir Apple 1 kg',
        image: '/images/recom-product/product-img10.png',
        vendor: 'Sold by: 6 venders',
    }
];

const PRODUCTS = [
    {
        id: 3001,
        name: 'Ladies Finger 1 kg',
        image: '/images/product/product-img1.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'Sold by: 6 venders',
        sold: 18,
        total: 35
    },
    {
        id: 3002,
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
        id: 3003,
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
        id: 3004,
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
        id: 3005,
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
        id: 3006,
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
    const searchParams = useSearchParams();
    const router = useRouter();
    const slug = params.slug as string;
    const { addToCart } = useCart();


    // Check for expanded state in URL
    const isExpanded = searchParams.get('exp') === '1';

    const displayName = (slug || 'Fruits & Vegetables')
        .replace(/%26/g, '&')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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
    const isTabActive = (catName: string, currentSlug: string) => {
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Default to first item if no slug (usually Fruits & Vegetables in this context)
        if (!currentSlug && normalize(catName) === 'vegetables') return true;
        return normalize(decodeURIComponent(currentSlug || '')) === normalize(catName);
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

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.clientWidth;
        const newIdx = Math.round(scrollLeft / width);
        if (newIdx !== activeIdx) setActiveIdx(newIdx);
    };

    const ProductCard = ({ product }: { product: any }) => {
        const handleAdd = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            addToCart(product);
        };

        return (
            <div className="bg-white border border-[#E2E2E2] rounded-[22px] p-4 flex flex-col relative w-full h-[440px] group transition-all duration-300">
                {/* Share Button */}
                <button className="absolute top-4 right-4 p-1.5 text-[#181725] hover:bg-gray-100 rounded-full z-10 transition-colors">
                    <Share2 size={18} strokeWidth={1.5} />
                </button>

                {/* Product Image */}
                <div className="w-full h-[160px] mb-4 flex items-center justify-center p-2 overflow-hidden">
                    <Link href={`/product/${product.id}`} className="w-full h-full flex items-center justify-center">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                    </Link>
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col">
                    <Link href={`/product/${product.id}`}>
                        <h3 className="text-[16px] font-bold text-[#181725] leading-tight mb-0.5 line-clamp-2">
                            {product.name}
                        </h3>
                    </Link>

                    <p className="text-[13px] text-[#7C7C7C] font-medium mb-3">1 pc</p>

                    {/* Tiered Pricing Section */}
                    <div className="bg-[#F1FBF4]/60 border border-[#53B175]/15 rounded-[12px] overflow-hidden mb-4">
                        {/* Tier 1 */}
                        <div className="flex items-center justify-between px-3 py-2">
                            <span className="text-[12px] font-bold text-[#53B175]">₹174/pc for 6 pcs+</span>
                            <button
                                onClick={handleAdd}
                                className="bg-white border border-[#E2E2E2] rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-[#53B175] active:scale-95 transition-transform shadow-sm"
                            >
                                <Plus size={12} strokeWidth={4} /> ADD
                            </button>
                        </div>

                        <div className="h-[1px] w-full bg-[#53B175]/10" />

                        {/* Tier 2 */}
                        <div className="flex items-center justify-between px-3 py-2">
                            <span className="text-[12px] font-bold text-[#53B175]">₹175/pc for 3 pcs+</span>
                            <button
                                onClick={handleAdd}
                                className="bg-white border border-[#E2E2E2] rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-[#53B175] active:scale-95 transition-transform shadow-sm"
                            >
                                <Plus size={12} strokeWidth={4} /> ADD
                            </button>
                        </div>
                    </div>

                    {/* Final Pricing */}
                    <div className="mb-4 flex items-baseline gap-1">
                        <span className="text-[17px] font-bold text-[#181725]">₹ 177</span>
                        <span className="text-[13px] text-[#7C7C7C] font-semibold">/pc</span>
                    </div>

                    {/* Main Action Button */}
                    <button
                        onClick={handleAdd}
                        className="w-full py-2.5 bg-[#EAF7EF] rounded-[16px] border border-[#53B175]/30 flex items-center justify-center gap-2 text-[#53B175] text-[14px] font-bold transition-all active:scale-95 hover:bg-[#E2F2E8] shadow-sm mt-auto"
                    >
                        <span>Add To Cart</span>
                        <ShoppingCart size={16} />
                    </button>
                </div>
            </div>
        );
    };

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
                    <Link href="/">
                        <ArrowLeft size={24} className="text-[#181725]" />
                    </Link>
                    <h1 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-bold text-[#181725] whitespace-nowrap">
                        {displayName}
                    </h1>
                    <button className="p-1">
                        <Search size={22} className="text-[#181725]" strokeWidth={2.5} />
                    </button>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar: Categories */}
                    <div className="w-[100px] bg-white overflow-y-auto no-scrollbar border-r border-[#D0D0D0] flex flex-col pt-2">
                        {[{ name: 'See All', image: null }, ...CATEGORIES].map((cat, idx) => {
                            const isActive = cat.name === 'See All' ? false : isTabActive(cat.name, slug);
                            return (
                                <Link
                                    key={idx}
                                    href={cat.name === 'See All' ? '#' : `/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                                    className={cn(
                                        "flex flex-col items-center py-4 px-1 relative transition-all",
                                        "bg-white"
                                    )}
                                >
                                    {isActive && <div className="absolute right-[-1px] top-[16px] h-[72px] w-[4px] bg-[#53B175] rounded-l-md z-20" />}
                                    <div className={cn(
                                        "flex items-center justify-center mb-2 overflow-hidden transition-all",
                                        cat.name === 'See All' ? "w-[64px] h-[64px] rounded-full bg-[#F8F9FA]" : "w-[72px] h-[72px] rounded-[14px] bg-white",
                                        isActive ? "border-[1.5px] border-[#53B175]" : (cat.name !== 'See All' ? "border border-transparent" : "border border-transparent")
                                    )}>
                                        {cat.image ? (
                                            <img src={cat.image} alt={cat.name} className="w-[70%] h-[70%] object-contain" />
                                        ) : (
                                            <div className="grid grid-cols-2 gap-[2px] p-[2px]">
                                                <div className="w-[10px] h-[10px] bg-[#181725] rounded-[2px]" />
                                                <div className="w-[10px] h-[10px] bg-[#181725] rounded-[2px]" />
                                                <div className="w-[10px] h-[10px] bg-[#181725] rounded-[2px]" />
                                                <div className="w-[10px] h-[10px] bg-[#181725] rounded-full" />
                                            </div>
                                        )}
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
                                    className="flex items-center px-4 py-2 rounded-[12px] border border-[#E2E2E2] bg-white text-[13px] font-bold text-[#181725] whitespace-nowrap whitespace-nowrap"
                                >
                                    {chip.icon}
                                    {chip.label}
                                    {chip.hasArrow && <ChevronDown size={14} className="ml-1" />}
                                </button>
                            ))}
                        </div>

                        {/* Product Feed */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {PRODUCTS.map((product, idx) => (
                                <ProductCard
                                    key={`${product.id}-${idx}`}
                                    product={product}
                                />
                            ))}
                        </div>
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
                                    <div
                                        key={product.id}
                                        className="group bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 flex flex-col"
                                    >
                                        <div className="relative aspect-square mb-4 bg-gray-50 rounded-xl overflow-hidden p-4 flex items-center justify-center shrink-0">
                                            <img src={product.image} alt={product.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" />
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    addToCart(product);
                                                }}
                                                className="absolute top-2 right-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[11px] font-bold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-sm"
                                            >
                                                Quick Add +
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1 mb-2">
                                            <Star size={12} className="fill-[#ffb800] text-[#ffb800]" />
                                            <span className="text-[12px] font-bold text-text">{product.rating}</span>
                                        </div>
                                        <Link href={`/product/${product.id}`}>
                                            <h3 className="text-[14px] font-bold text-text leading-tight mb-2 line-clamp-2 h-9 group-hover:text-primary transition-colors">
                                                {product.name}
                                            </h3>
                                        </Link>
                                        <div className="mt-auto pt-2 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[18px] font-extrabold text-primary">{product.newPrice}</span>
                                                <span className="text-[11px] text-text-muted line-through">{product.oldPrice}</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    addToCart(product);
                                                }}
                                                className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-dark transition-all transform active:scale-90"
                                            >
                                                <ShoppingCart size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
