'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
    const { status: sessionStatus } = useSession();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [prevOrders, setPrevOrders] = useState<any[]>([]);
    const [reviewsData, setReviewsData] = useState<{
        reviews: Array<{ id: string; rating: number; comment?: string; createdAt: string; reviewerName: string }>;
        distribution: Record<string, number>;
        totalCount: number;
    } | null>(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);

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

    // Fetch previous orders from this vendor when "orders" tab activated
    const loadPrevOrders = useCallback(async () => {
        if (sessionStatus !== 'authenticated' || !vendorId) return;
        try {
            const res = await fetch('/api/v1/orders');
            const json = await res.json();
            const vendorOrders = (json.data || json.orders || []).filter((o: any) =>
                o.vendorId === vendorId || o.vendor?.id === vendorId
            );
            setPrevOrders(vendorOrders);
        } catch { setPrevOrders([]); }
    }, [vendorId, sessionStatus]);

    useEffect(() => {
        if (activeTab === 'orders') loadPrevOrders();
    }, [activeTab, loadPrevOrders]);

    // Load reviews when ratings tab is activated
    useEffect(() => {
        if (activeTab !== 'ratings' || !vendorId || reviewsData) return;
        setReviewsLoading(true);
        dal.reviews.getVendorReviews(vendorId)
            .then(data => setReviewsData(data))
            .catch(() => setReviewsData({ reviews: [], distribution: {}, totalCount: 0 }))
            .finally(() => setReviewsLoading(false));
    }, [activeTab, vendorId, reviewsData]);

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
            {activeTab !== 'ratings' && activeTab !== 'about' && activeTab !== 'orders' && (
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
                {activeTab === 'orders' ? (
                    <div className="max-w-2xl mx-auto space-y-4 py-4">
                        <h3 className="text-[18px] font-black text-[#181725] mb-4">My Previous Orders</h3>
                        {sessionStatus !== 'authenticated' ? (
                            <div className="text-center py-16 text-gray-400 font-bold">Please log in to see your orders from this vendor.</div>
                        ) : prevOrders.length === 0 ? (
                            <div className="text-center py-16 text-gray-400 font-bold">No previous orders from this vendor yet.</div>
                        ) : (
                            prevOrders.map((order: any) => (
                                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-[13px] font-black text-[#181725]">Order #{order.id?.slice(-8)}</p>
                                            <p className="text-[12px] text-gray-400 font-medium mt-0.5">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : order.date}</p>
                                        </div>
                                        <span className="text-[13px] font-black text-[#53B175]">₹{order.totalAmount || order.price}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {(order.items || []).slice(0, 4).map((item: any, i: number) => (
                                            <span key={i} className="text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">{item.name || item.productName}</span>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => { (order.items || []).forEach((item: any) => { if (item.productId) { /* addToCart logic */ } }); }}
                                        className="w-full py-2.5 bg-[#53B175] text-white rounded-xl text-[13px] font-black hover:bg-[#48a068] transition-colors"
                                    >
                                        Reorder All Items
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                ) : activeTab === 'all' || activeTab === 'deals' || activeTab === 'frequent' || activeTab.startsWith('cat:') ? (
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
                        {reviewsLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-8 h-8 border-4 border-gray-200 border-t-[#53B175] rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Rating Summary Card */}
                                <div className="bg-white rounded-[32px] border border-gray-100 p-8 flex flex-col md:flex-row items-center gap-10 shadow-sm">
                                    <div className="text-center md:text-left flex flex-col items-center md:items-start">
                                        <span className="text-[64px] font-[1000] text-[#181725] leading-none mb-2">{vendor.rating}</span>
                                        <div className="flex items-center gap-1 mb-2">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} size={20} fill={s <= Math.floor(Number(vendor.rating)) ? "#FBC02D" : "none"} className={s <= Math.floor(Number(vendor.rating)) ? "text-[#FBC02D]" : "text-gray-200"} />
                                            ))}
                                        </div>
                                        <p className="text-gray-400 font-bold uppercase text-[12px] tracking-widest">
                                            Based on {(reviewsData?.totalCount ?? vendor.totalRatings ?? 0).toLocaleString('en-IN')} reviews
                                        </p>
                                    </div>

                                    <div className="flex-1 w-full space-y-3">
                                        {[5, 4, 3, 2, 1].map((s) => {
                                            const pct = reviewsData?.distribution?.[s] ?? 0;
                                            return (
                                                <div key={s} className="flex items-center gap-4">
                                                    <span className="text-[14px] font-black w-4">{s}</span>
                                                    <div className="flex-1 h-2.5 bg-gray-50 rounded-full overflow-hidden">
                                                        <div className="h-full bg-[#53B175] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[13px] font-bold text-gray-400 w-10 text-right">{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Reviews */}
                                {reviewsData && reviewsData.reviews.length > 0 ? (
                                    <div className="space-y-6">
                                        {reviewsData.reviews.map((review) => (
                                            <div key={review.id} className="bg-white rounded-[28px] border border-gray-100 p-6 shadow-sm">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="font-black text-[16px] text-[#181725]">{review.reviewerName}</span>
                                                    <span className="text-gray-400 font-bold text-[12px]">
                                                        {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 mb-3">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star key={s} size={14} fill={s <= review.rating ? "#FBC02D" : "none"} className={s <= review.rating ? "text-[#FBC02D]" : "text-gray-200"} />
                                                    ))}
                                                </div>
                                                {review.comment && (
                                                    <p className="text-gray-600 font-medium leading-relaxed">{review.comment}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400 font-bold">
                                        No reviews yet. Be the first to review!
                                    </div>
                                )}
                            </>
                        )}
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
