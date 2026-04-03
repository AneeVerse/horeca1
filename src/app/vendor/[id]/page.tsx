'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { VendorStoreHeader } from '@/components/features/vendor/VendorStoreHeader';
import { VendorCatalogNav } from '@/components/features/vendor/VendorCatalogNav';
import { VendorProductCard } from '@/components/features/vendor/VendorProductCard';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';
import { CategoryShowcase } from '@/components/features/CategoryShowcase';
import { dal } from '@/lib/dal';
import { cn } from '@/lib/utils';
import type { Vendor, VendorProduct } from '@/types';
import { Package, Star, CheckCircle, Clock } from 'lucide-react';

export default function VendorStorePage() {
    const params = useParams();
    const vendorId = params.id as string;
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Ensure page starts at the top on entry
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [vendorId]);

    // Fetch vendor + products from real API
    useEffect(() => {
        if (!vendorId) return;
        setLoading(true);
        Promise.all([
            dal.vendors.getById(vendorId),
            dal.vendors.getProducts(vendorId),
        ]).then(([v, p]) => {
            setVendor(v);
            setProducts(p.products);
        }).catch(console.error).finally(() => setLoading(false));
    }, [vendorId]);

    // Track recently viewed vendor for "Continue Ordering" section
    useEffect(() => {
        if (!vendor) return;
        try {
            const KEY = 'horeca_recently_viewed';
            const saved = localStorage.getItem(KEY);
            let entries: any[] = [];
            if (saved) entries = JSON.parse(saved);

            const existing = entries.find((e: any) => e.vendorId === vendor.id);
            const existingProducts = existing?.viewedProducts || [];
            const mergedProducts = existingProducts;

            entries = entries.filter((e: any) => e.vendorId !== vendor.id);
            entries.unshift({
                vendorId: vendor.id,
                vendorName: vendor.name,
                vendorLogo: vendor.logo,
                viewedProducts: mergedProducts.slice(0, 20),
                viewedAt: Date.now(),
            });
            if (entries.length > 20) entries = entries.slice(0, 20);
            localStorage.setItem(KEY, JSON.stringify(entries));
        } catch (e) {
            console.error('Failed to save recently viewed vendor:', e);
        }
    }, [vendor]);

    const filteredProducts = useMemo(() => {
        let result = products;

        // Filter by tab
        if (activeTab === 'frequent') {
            result = result.filter(p => p.frequentlyOrdered);
        } else if (activeTab === 'deals') {
            result = result.filter(p => p.isDeal);
        } else if (activeTab.startsWith('cat:')) {
            const category = activeTab.replace('cat:', '');
            result = result.filter(p => p.category === category || p.subcategory === category);
        }

        // Filter by search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q)
            );
        }

        return result;
    }, [products, activeTab, searchQuery]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-[#53B175] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[14px] text-gray-500">Loading store...</p>
                </div>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[20px] font-bold text-gray-800 mb-2">Vendor not found</p>
                    <p className="text-[14px] text-gray-500">The vendor you are looking for does not exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            {/* Vendor Header */}
            <VendorStoreHeader 
                vendor={vendor} 
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* ── DYNAMIC CATEGORY SHOWCASE & NAVIGATION (Only shown in shop views) ── */}
            {activeTab !== 'ratings' && activeTab !== 'about' && (
                <>
                    <CategoryShowcase 
                        filterByProducts={products} 
                        onCategoryClick={(cat) => setActiveTab(activeTab === `cat:${cat}` ? 'all' : `cat:${cat}`)} 
                        activeCategory={activeTab} 
                        title="" 
                    />

                    <VendorCatalogNav
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        categories={vendor.categories}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </>
            )}

            {/* Main Content Area */}
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] pb-8 pt-2">
                {activeTab === 'all' || activeTab === 'deals' || activeTab === 'frequent' || activeTab.startsWith('cat:') ? (
                    filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                            {filteredProducts.map((product) => (
                                <VendorProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="p-6 bg-gray-50 rounded-full mb-4">
                                <Package className="text-gray-300" size={48} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-[20px] font-black text-[#181725]">No items found</h3>
                            <p className="text-gray-400 font-bold mt-1">Try adjusting your search or filters</p>
                        </div>
                    )
                ) : activeTab === 'ratings' ? (
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Rating Summary Card */}
                        <div className="bg-white rounded-[32px] border border-gray-100 p-8 flex flex-col md:flex-row items-center gap-10 shadow-sm">
                            <div className="text-center md:text-left flex flex-col items-center md:items-start">
                                <span className="text-[64px] font-[1000] text-[#181725] leading-none mb-2">{vendor.rating}</span>
                                <div className="flex items-center gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} size={20} fill={s <= Math.floor(Number(vendor.rating)) ? "#FBC02D" : "none"} className={s <= Math.floor(Number(vendor.rating)) ? "text-[#FBC02D]" : "text-gray-200"} />
                                    ))}
                                </div>
                                <p className="text-gray-400 font-bold uppercase text-[12px] tracking-widest">Based on 2.4k reviews</p>
                            </div>
                            
                            <div className="flex-1 w-full space-y-3">
                                {[
                                    { s: 5, p: 85 }, { s: 4, p: 12 }, { s: 3, p: 2 }, { s: 2, p: 1 }, { s: 1, p: 0 }
                                ].map((row) => (
                                    <div key={row.s} className="flex items-center gap-4">
                                        <span className="text-[14px] font-black w-4">{row.s}</span>
                                        <div className="flex-1 h-2.5 bg-gray-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#53B175] rounded-full transition-all duration-1000" style={{ width: `${row.p}%` }} />
                                        </div>
                                        <span className="text-[13px] font-bold text-gray-400 w-10 text-right">{row.p}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Reviews (Dummy) */}
                        <div className="space-y-6">
                            {[
                                { name: "Rajesh Kumar", date: "Oct 12, 2026", msg: "Excellent quality grains. The delivery was fast and the packaging was top-notch. Highly recommended for bulk ordering." },
                                { name: "Ananya Sharma", date: "Sep 28, 2026", msg: "Great deals on spices! Saved 10% on my monthly stock. The vendor was very professional and easy to communicate with." }
                            ].map((review, i) => (
                                <div key={i} className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-black text-[16px] text-[#181725]">{review.name}</span>
                                        <span className="text-gray-400 font-bold text-[12px]">{review.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mb-3">
                                        {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} fill="#FBC02D" className="text-[#FBC02D]" />)}
                                    </div>
                                    <p className="text-gray-600 font-medium leading-relaxed">{review.msg}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Vendor About Section */}
                        <div className="bg-white rounded-[32px] border border-gray-100 p-10 space-y-8 shadow-sm">
                            <div className="space-y-4">
                                <h2 className="text-[24px] font-black text-[#181725]">Our Mission</h2>
                                <p className="text-gray-600 font-medium text-[16px] leading-[1.6]">
                                    {vendor.description || `${vendor.name} is a leading B2B supplier specializing in premium HoReCa solutions across Navi Mumbai. We pride ourselves on direct-from-source procurement, ensuring that every product in our catalog meets the highest standards of safety and quality.`}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-gray-50/50 rounded-[24px] border border-gray-100 text-center">
                                    <div className="bg-white p-3 rounded-2xl w-fit mx-auto mb-4 shadow-sm text-[#53B175]">
                                        <CheckCircle size={24} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="font-black text-[14px] text-gray-800 uppercase tracking-tight">Verified</h4>
                                    <p className="text-gray-400 text-[12px] font-bold mt-1 uppercase">ISO Certified Supply Chain</p>
                                </div>
                                <div className="p-6 bg-gray-50/50 rounded-[24px] border border-gray-100 text-center">
                                    <div className="bg-white p-3 rounded-2xl w-fit mx-auto mb-4 shadow-sm text-[#53B175]">
                                        <Clock size={24} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="font-black text-[14px] text-gray-800 uppercase tracking-tight">Fastest Ships</h4>
                                    <p className="text-gray-400 text-[12px] font-bold mt-1 uppercase">Next Day Promised</p>
                                </div>
                                <div className="p-6 bg-gray-50/50 rounded-[24px] border border-gray-100 text-center">
                                    <div className="bg-white p-3 rounded-2xl w-fit mx-auto mb-4 shadow-sm text-[#53B175]">
                                        <Package size={24} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="font-black text-[14px] text-gray-800 uppercase tracking-tight">Bulk Ready</h4>
                                    <p className="text-gray-400 text-[12px] font-bold mt-1 uppercase">Inventory Tracked Live</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Cart Bar */}
            <StickyCartBar />
        </div>
    );
}
