'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Star, ArrowLeft, ChevronDown } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { dal } from '@/lib/dal';
import type { Vendor, VendorProduct, Category } from '@/types';
import { VendorProductCard } from '@/components/features/vendor/VendorProductCard';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';

function VendorCategoryPageContent() {
    const params = useParams();
    const router = useRouter();

    const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const slug = params.slug as string;
    const categoryId = params.categoryId as string;

    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [dealsOnly, setDealsOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'discount'>('default');

    // Fetch vendor + products + categories in one chain — loading stays true until ALL data is ready
    useEffect(() => {
        if (!slug) return;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

        const findVendor = isUUID
            ? dal.vendors.getById(slug)
            : dal.vendors.list().then(res => {
                const found = res.vendors.find(v =>
                    slugify(v.slug) === slugify(slug) ||
                    slugify(v.name) === slugify(slug) ||
                    v.id === slug
                );
                if (!found) throw new Error('Vendor not found');
                return found;
            });

        Promise.resolve()
            .then(() => setLoading(true))
            .then(() => Promise.all([findVendor, dal.categories.list()]))
            .then(async ([v, cats]) => {
                setVendor(v);
                setCategories(cats);
                const res = await dal.vendors.getProducts(v.id, { limit: 200 });
                setProducts(res.products);
            })
            .catch(() => {
                setVendor(null);
                setProducts([]);
            })
            .finally(() => setLoading(false));
    }, [slug]);

    // Find active category by slug match
    const activeCategory = useMemo(() => {
        if (!categoryId || categories.length === 0) return null;
        return categories.find(c =>
            slugify(c.slug) === slugify(categoryId) ||
            slugify(c.name) === slugify(categoryId) ||
            c.id === categoryId
        ) || null;
    }, [categoryId, categories]);

    // Filter products by category ID (exact match) with name as fallback
    const filteredProducts = useMemo(() => {
        let list = !activeCategory
            ? products
            : products.filter(p =>
                p.categoryId === activeCategory.id ||
                p.category.toLowerCase() === activeCategory.name.toLowerCase()
            );

        if (dealsOnly) {
            list = list.filter(p => p.isDeal || (p.originalPrice && p.originalPrice > p.price));
        }

        if (sortBy === 'price_asc') {
            list = [...list].sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price_desc') {
            list = [...list].sort((a, b) => b.price - a.price);
        } else if (sortBy === 'discount') {
            const discountPct = (p: VendorProduct) =>
                p.originalPrice && p.originalPrice > p.price
                    ? (p.originalPrice - p.price) / p.originalPrice
                    : 0;
            list = [...list].sort((a, b) => discountPct(b) - discountPct(a));
        }

        return list;
    }, [products, activeCategory, dealsOnly, sortBy]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-2 border-[#53B175] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center p-8">
                    <p className="text-[20px] font-bold text-gray-800 mb-2">Vendor not found</p>
                    <button onClick={() => router.back()} className="text-[#53B175] font-bold">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen flex flex-col">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 1023px) {
                    footer, .bottom-nav { display: none !important; }
                }
            `}} />

            {/* ==================== MOBILE/TABLET LAYOUT ==================== */}
            <div className="lg:hidden flex flex-col h-screen overflow-hidden">
                <header className="bg-white px-4 md:px-8 py-4 flex items-center justify-between border-b border-[#F2F3F2] shrink-0 relative">
                    <button onClick={() => router.back()}>
                        <ArrowLeft size={24} className="text-[#181725] md:w-7 md:h-7" />
                    </button>
                    <h1 className="absolute left-1/2 -translate-x-1/2 text-[18px] md:text-[22px] font-bold text-[#181725] whitespace-nowrap">
                        {vendor.name}
                    </h1>
                    <button className="p-1">
                        <Search size={22} className="text-[#181725] md:w-7 md:h-7" strokeWidth={2.5} />
                    </button>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar: Categories */}
                    <div className="w-[100px] md:w-[130px] bg-white overflow-y-auto no-scrollbar border-r border-[#D0D0D0] flex flex-col pt-2">
                        <Link
                            href={`/vendor/${vendor.id}`}
                            className="flex flex-col items-center py-4 px-1 relative transition-all"
                        >
                            <div className="w-[64px] h-[64px] md:w-[84px] md:h-[84px] rounded-full bg-[#F8F9FA] flex items-center justify-center mb-2 overflow-hidden border border-transparent transition-all">
                                <span className="text-[28px] md:text-[36px]">🛒</span>
                            </div>
                            <p className="text-[11px] md:text-[13px] text-center font-black leading-tight px-1 text-[#181725]">
                                See All
                            </p>
                        </Link>

                        {categories.map((cat, idx) => {
                            const isActive = activeCategory?.id === cat.id || slugify(activeCategory?.name || '') === slugify(cat.name);
                            const categorySlug = slugify(cat.name);

                            return (
                                <Link
                                    key={idx}
                                    href={`/category/${slug}/${categorySlug}`}
                                    className={cn(
                                        "flex flex-col items-center py-4 px-1 relative transition-all",
                                        "bg-white"
                                    )}
                                >
                                    {isActive && <div className="absolute right-[-1px] top-[16px] h-[72px] w-[4px] bg-[#53B175] rounded-l-md z-20" />}
                                    <div className={cn(
                                        "flex items-center justify-center mb-2 overflow-hidden transition-all relative",
                                        "w-[72px] h-[72px] md:w-[92px] md:h-[92px] rounded-[14px] md:rounded-[20px] bg-white p-2 md:p-3",
                                        isActive ? "border-[2px] border-[#53B175]" : "border border-gray-100"
                                    )}>
                                        <Image src={cat.image || '/images/category/vegitable.png'} alt="" fill className="object-contain" />
                                    </div>
                                    <p className={cn(
                                        "text-[11px] md:text-[13px] text-center font-black leading-tight px-1",
                                        isActive ? "text-[#53B175]" : "text-[#181725]"
                                    )}>
                                        {cat.name}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        <div className="flex overflow-x-auto px-4 md:px-8 py-3 md:py-4 gap-2 md:gap-3 no-scrollbar border-b border-[#F2F3F2]">
                            <button
                                type="button"
                                onClick={() => setDealsOnly(v => !v)}
                                className={cn(
                                    'flex items-center px-4 md:px-6 py-2 md:py-3 rounded-[12px] md:rounded-xl border text-[13px] md:text-[14px] font-extrabold whitespace-nowrap transition-all active:scale-95',
                                    dealsOnly
                                        ? 'bg-[#53B175] border-[#53B175] text-white'
                                        : 'bg-white border-[#E2E2E2] text-[#181725]',
                                )}
                            >
                                <Star size={14} className={cn('mr-1', dealsOnly ? 'fill-white text-white' : 'fill-[#FFB800] text-[#FFB800]')} />
                                Deals Only
                            </button>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="flex items-center px-4 md:px-6 py-2 md:py-3 rounded-[12px] md:rounded-xl border border-[#E2E2E2] bg-white text-[13px] md:text-[14px] font-extrabold text-[#181725] whitespace-nowrap transition-all focus:outline-none focus:border-[#53B175]"
                            >
                                <option value="default">Sort: Default</option>
                                <option value="price_asc">Price: Low → High</option>
                                <option value="price_desc">Price: High → Low</option>
                                <option value="discount">Biggest Discount</option>
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
                            {filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {filteredProducts.map((product) => (
                                    <VendorProductCard key={product.id} product={product} />
                                ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 flex flex-col items-center">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                         <Search size={32} className="text-gray-300" />
                                    </div>
                                    <p className="text-[#181725] font-bold">No products found in this category</p>
                                    <p className="text-gray-400 text-sm">Explore other categories from this vendor</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== DESKTOP SECTION ==================== */}
            <div className="hidden lg:block bg-gray-50/50 min-h-screen">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-6">
                    <nav className="flex items-center gap-2 mb-6 text-[13px] text-gray-500 font-medium">
                        <Link href="/" className="hover:text-[#53B175]">Home</Link>
                        <span>/</span>
                        <Link href="/vendors" className="hover:text-[#53B175]">Vendors</Link>
                        <span>/</span>
                        <span className="text-gray-900">{vendor.name}</span>
                    </nav>

                    <div className="flex gap-8 items-start">
                        <aside className="w-[280px] shrink-0 sticky top-24">
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center p-2 shrink-0 border border-gray-100 relative overflow-hidden">
                                        <Image src={vendor.logo || '/placeholder.png'} alt={vendor.name} fill className="object-contain" />
                                    </div>
                                    <div>
                                        <h2 className="text-[18px] font-bold text-[#181725] leading-tight mb-1">{vendor.name}</h2>
                                        <div className="flex items-center gap-1.5">
                                            <Star size={14} fill="#53B175" className="text-[#53B175]" />
                                            <span className="text-[13px] font-bold text-gray-700">{vendor.rating}</span>
                                            <span className="text-[11px] text-gray-400">({vendor.totalRatings})</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Link
                                        href={`/vendor/${vendor.id}`}
                                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-all group hover:bg-gray-50"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-gray-100">
                                            <span className="text-[18px]">✨</span>
                                        </div>
                                        <span className="text-[14px] font-bold text-[#181725]">All Products</span>
                                    </Link>

                                    {categories.map((cat, idx) => {
                                        const isActive = activeCategory?.id === cat.id || slugify(activeCategory?.name || '') === slugify(cat.name);
                                        const categorySlug = slugify(cat.name);
                                        return (
                                            <Link
                                                key={idx}
                                                href={`/category/${slug}/${categorySlug}`}
                                                className={cn(
                                                    "flex items-center justify-between w-full p-3 rounded-xl transition-all group",
                                                    isActive ? "bg-[#53B175]/10" : "hover:bg-gray-50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center border transition-all relative overflow-hidden",
                                                        isActive ? "bg-white border-[#53B175]/20 shadow-sm" : "bg-gray-50 border-transparent group-hover:bg-white group-hover:border-gray-100"
                                                    )}>
                                                        <Image src={cat.image || '/images/category/vegitable.png'} alt="" width={24} height={24} className="object-contain" />
                                                    </div>
                                                    <span className={cn(
                                                        "text-[14px] font-bold transition-colors",
                                                        isActive ? "text-[#53B175]" : "text-[#181725]"
                                                    )}>
                                                        {cat.name}
                                                    </span>
                                                </div>
                                                <ChevronDown size={16} className={cn(
                                                    "text-gray-300 transition-all",
                                                    isActive ? "text-[#53B175] rotate-[-90deg]" : "group-hover:text-gray-400"
                                                )} />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </aside>

                        <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm flex items-center justify-between">
                                <h3 className="text-[18px] font-bold text-[#181725]">
                                    {activeCategory?.name || 'All Products'}
                                    <span className="ml-2 text-[14px] text-gray-400 font-medium">({filteredProducts.length} items)</span>
                                </h3>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDealsOnly(v => !v)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl border text-[13px] font-bold transition-all",
                                            dealsOnly
                                                ? "bg-[#53B175] border-[#53B175] text-white"
                                                : "bg-white border-gray-200 text-gray-600 hover:border-[#53B175] hover:text-[#53B175]",
                                        )}
                                    >
                                        Deals Only
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSortBy(s => s === 'price_asc' ? 'default' : 'price_asc')}
                                        className={cn(
                                            "px-4 py-2 rounded-xl border text-[13px] font-bold transition-all",
                                            sortBy === 'price_asc'
                                                ? "bg-[#53B175] border-[#53B175] text-white"
                                                : "bg-white border-gray-200 text-gray-600 hover:border-[#53B175] hover:text-[#53B175]",
                                        )}
                                    >
                                        Price: Low to High
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSortBy(s => s === 'discount' ? 'default' : 'discount')}
                                        className={cn(
                                            "px-4 py-2 rounded-xl border text-[13px] font-bold transition-all",
                                            sortBy === 'discount'
                                                ? "bg-[#53B175] border-[#53B175] text-white"
                                                : "bg-white border-gray-200 text-gray-600 hover:border-[#53B175] hover:text-[#53B175]",
                                        )}
                                    >
                                        Best Offers
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredProducts.map((product) => (
                                    <VendorProductCard key={product.id} product={product} />
                                ))}
                            </div>

                            {filteredProducts.length === 0 && (
                                <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[40px]">🛍️</div>
                                    <h3 className="text-[18px] font-bold text-[#181725] mb-1">No products in this category</h3>
                                    <p className="text-gray-400">Try checking other categories from this vendor.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <StickyCartBar />
        </div>
    );
}

export default function CategoryVendorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white animate-pulse" />}>
            <VendorCategoryPageContent />
        </Suspense>
    );
}
