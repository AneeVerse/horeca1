'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { VendorStoreHeader } from '@/components/features/vendor/VendorStoreHeader';
import { VendorCatalogNav } from '@/components/features/vendor/VendorCatalogNav';
import { VendorProductCard } from '@/components/features/vendor/VendorProductCard';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';
import { dal } from '@/lib/dal';
import type { Vendor, VendorProduct } from '@/types';

export default function VendorStorePage() {
    const params = useParams();
    const vendorId = params.id as string;
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

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
            <VendorStoreHeader vendor={vendor} />

            {/* Catalog Navigation */}
            <VendorCatalogNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                categories={vendor.categories}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* Product Grid */}
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                        {filteredProducts.map((product) => (
                            <VendorProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-[48px] mb-3">🔍</p>
                        <p className="text-[16px] font-bold text-gray-700">No products found</p>
                        <p className="text-[13px] text-gray-400 mt-1">
                            {searchQuery ? 'Try a different search term' : 'No items available in this category'}
                        </p>
                    </div>
                )}
            </div>

            {/* Sticky Cart Bar */}
            <StickyCartBar />
        </div>
    );
}
