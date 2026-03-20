'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowLeft, Star, Clock, CreditCard, Package, ChevronRight } from 'lucide-react';
import { dal } from '@/lib/dal';
import type { VendorProduct, VendorSummary, Category } from '@/types';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';
import { VendorProductCard } from '@/components/features/vendor/VendorProductCard';

function SearchPageContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<{ products: VendorProduct[]; vendors: VendorSummary[]; categories: Category[] }>({ products: [], vendors: [], categories: [] });

    useEffect(() => {
        if (!query.trim()) {
            setResults({ products: [], vendors: [], categories: [] });
            return;
        }

        let cancelled = false;

        dal.search.query(query).then((data) => {
            if (!cancelled) {
                setResults({
                    products: data.products,
                    vendors: data.vendors,
                    categories: data.categories,
                });
            }
        }).catch(() => {
            if (!cancelled) {
                setResults({ products: [], vendors: [], categories: [] });
            }
        });

        return () => { cancelled = true; };
    }, [query]);

    const hasResults = results.products.length > 0 || results.vendors.length > 0 || results.categories.length > 0;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            {/* Search Header */}
            <div className="bg-white sticky top-0 z-40 shadow-sm">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="shrink-0">
                            <ArrowLeft size={20} className="text-gray-600" />
                        </Link>
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products, vendors, categories..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#299e60] focus:ring-1 focus:ring-[#299e60]/20 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                {!query.trim() ? (
                    <div className="text-center py-16">
                        <p className="text-[48px] mb-3">🔍</p>
                        <p className="text-[16px] font-bold text-gray-700">Search for products or vendors</p>
                        <p className="text-[13px] text-gray-400 mt-1">Try &quot;cheese&quot;, &quot;dairy&quot;, or &quot;Sharad&quot;</p>
                    </div>
                ) : !hasResults ? (
                    <div className="text-center py-16">
                        <p className="text-[48px] mb-3">😕</p>
                        <p className="text-[16px] font-bold text-gray-700">No results for &quot;{query}&quot;</p>
                        <p className="text-[13px] text-gray-400 mt-1">Try searching with different keywords</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* == PRODUCTS BLOCK == */}
                        {results.products.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-[18px] font-bold text-[#181725]">Products</h2>
                                    <span className="text-[14px] font-semibold text-[#299e60]">View all</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {results.products.map((product) => (
                                        <VendorProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </section>
                        )}


                        {/* == VENDORS BLOCK (Primary Path) == */}
                        {results.vendors.length > 0 && (
                            <section>
                                <h2 className="text-[15px] font-bold text-[#181725] mb-3">Vendors</h2>
                                <div className="space-y-3">
                                    {results.vendors.map((vendor) => {
                                        const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                                        const categoryMatch = vendor.categories.find(c => slugify(c) === slugify(query));
                                        const vendorPath = categoryMatch 
                                            ? `/category/${vendor.slug}/${slugify(categoryMatch)}`
                                            : `/vendor/${vendor.id}`;
                                            
                                        return (
                                            <Link
                                                key={vendor.id}
                                                href={vendorPath}
                                                className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all group"
                                            >
                                                <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                                                    <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[14px] font-bold text-[#181725]">{vendor.name}</p>
                                                    <p className="text-[11px] text-gray-400 font-medium mt-0.5 line-clamp-1">
                                                        {vendor.categories.join(', ')}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <div className="flex items-center gap-0.5 text-[10px] font-bold text-green-600">
                                                            <Star size={10} fill="currentColor" />
                                                            {vendor.rating}
                                                        </div>
                                                        <div className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600">
                                                            <Clock size={10} />
                                                            {vendor.deliveryTime}
                                                        </div>
                                                        <div className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-600">
                                                            <Package size={10} />
                                                            Min ₹{vendor.minOrderValue}
                                                        </div>
                                                        {vendor.creditEnabled && (
                                                            <div className="flex items-center gap-0.5 text-[10px] font-semibold text-purple-600">
                                                                <CreditCard size={10} />
                                                                Credit
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-gray-300 shrink-0" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* == CATEGORIES BLOCK == */}
                        {results.categories.length > 0 && (
                            <section>
                                <h2 className="text-[15px] font-bold text-[#181725] mb-3">Categories</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {results.categories.map((cat) => (
                                        <Link
                                            key={cat.id}
                                            href={`/category/${cat.slug}`}
                                            className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:shadow-md transition-all"
                                        >
                                            <span className="text-[24px]">{cat.icon}</span>
                                            <div>
                                                <p className="text-[13px] font-bold text-[#181725]">{cat.name}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{cat.itemCount} items</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>

            <StickyCartBar />
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white animate-pulse" />}>
            <SearchPageContent />
        </Suspense>
    );
}
