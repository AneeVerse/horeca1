'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { VendorStoreHeader } from '@/components/features/vendor/VendorStoreHeader';
import { VendorCatalogNav } from '@/components/features/vendor/VendorCatalogNav';
import { VendorProductCard } from '@/components/features/vendor/VendorProductCard';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';
import { getVendorById } from '@/data/vendorData';
import type { VendorProduct } from '@/types';

export default function VendorStorePage() {
    const params = useParams();
    const vendorId = params.id as string;
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const vendor = getVendorById(vendorId);
    const products = useMemo(() => {
        if (!vendor?.catalog) return [];
        return vendor.catalog.flatMap(cat => 
            cat.products.map(p => ({
                id: p.id,
                vendorId: vendor.id,
                vendorName: vendor.name,
                name: p.name,
                description: '', // fallback
                category: cat.name,
                packSize: p.unit,
                unit: p.unit,
                price: p.price,
                originalPrice: p.originalPrice,
                stock: p.inStock ? 100 : 0,
                images: [p.image],
                bulkPrices: [],
                creditBadge: vendor.creditEnabled,
                minOrderQuantity: 1,
                isActive: p.inStock,
                createdAt: new Date(),
                updatedAt: new Date(),
                isDeal: !!p.discount,
                frequentlyOrdered: false
            } as VendorProduct))
        );
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
                categories={vendor.catalog?.map(c => c.name) || vendor.categories}
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
