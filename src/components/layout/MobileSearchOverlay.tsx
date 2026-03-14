'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { vendors } from '@/data/vendorData';
import type { VendorProduct } from '@/types';

interface MobileSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'items' | 'vendors' | 'stores';
    initialQuery?: string;
}

export function MobileSearchOverlay({ isOpen, onClose, initialTab = 'vendors', initialQuery = '' }: MobileSearchOverlayProps) {
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<'items' | 'vendors'>(initialTab as 'items' | 'vendors');

    // Sync search query when overlay opens
    React.useEffect(() => {
        if (isOpen) {
            setSearchQuery(initialQuery);
            setActiveTab(initialTab === 'stores' ? 'vendors' : initialTab);
        }
    }, [isOpen, initialQuery, initialTab]);

    const allProducts = useMemo(() => {
        const mapped: VendorProduct[] = [];
        vendors.forEach(v => {
            v.catalog.forEach(cat => {
                cat.products.forEach(p => {
                    mapped.push({
                        id: p.id,
                        vendorId: v.id,
                        vendorName: v.name,
                        name: p.name,
                        description: '',
                        category: cat.name,
                        subcategory: '',
                        price: p.price,
                        stock: p.inStock ? 100 : 0,
                        images: [p.image],
                        packSize: p.unit,
                        unit: p.unit,
                        bulkPrices: [],
                        isDeal: !!p.discount,
                        frequentlyOrdered: false,
                        creditBadge: v.creditEnabled,
                        minOrderQuantity: 1,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    } as unknown as VendorProduct);
                });
            });
        });
        return mapped;
    }, []);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return allProducts.filter(item =>
            item.name.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
        );
    }, [searchQuery, allProducts]);

    const filteredVendors = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return vendors;

        const cleanQuery = q.replace(/&/g, 'and').replace(/\s+/g, ' ');
        const STOP_WORDS = ['and', 'for', 'with', 'the', 'item', 'list', 'page'];
        const queryKeywords = cleanQuery.split(' ')
            .filter(word => word.length > 2 && !STOP_WORDS.includes(word));

        // Major category terms that should strictly require a catalog match
        const MAJOR_CATEGORIES = ['fruits', 'vegetables', 'dairy', 'oils', 'masala', 'chicken', 'meat', 'pulses', 'rice', 'bakery', 'frozen'];
        const isCategorySearch = queryKeywords.some(word => MAJOR_CATEGORIES.includes(word));

        return vendors.filter(v => {
            const vendorName = v.name.toLowerCase();
            const catalogCatNames = v.catalog.map(cat => cat.name.toLowerCase().replace(/&/g, 'and'));
            const vendorTags = v.categories.map(tag => tag.toLowerCase().replace(/&/g, 'and'));

            // 1. Highest Priority: Store Name Match
            if (vendorName.includes(q)) return true;

            // 2. High Priority: Catalog Category Match (Source of Truth)
            // If the vendor has the category in their catalog, they definitely sell it.
            const hasCatalogMatch = catalogCatNames.some(cat =>
                cat.includes(cleanQuery) ||
                (queryKeywords.length > 0 && queryKeywords.some(word => cat.includes(word)))
            );
            if (hasCatalogMatch) return true;

            // 3. High Priority: Product match (Does the store sell an item with this name?)
            const hasProductMatch = v.catalog.some(cat =>
                cat.products.some(p => p.name.toLowerCase().includes(q))
            );
            if (hasProductMatch) return true;

            // 4. Low Priority: Display Tag Match (Only for non-categorical searches)
            // If user searches "Fruits", we don't want to match a vendor just because they have a "Vegetables" tag.
            // We only use tags for general attributes like "Organic", "Fast", "Wholesale", etc.
            if (!isCategorySearch) {
                const hasTagMatch = vendorTags.some(tag =>
                    tag.includes(cleanQuery) ||
                    (queryKeywords.length > 0 && queryKeywords.some(word => tag.includes(word)))
                );
                if (hasTagMatch) return true;
            }

            return false;
        });
    }, [searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] bg-[#F8FAFC] flex flex-col md:hidden animate-in fade-in duration-200">
            {/* Header/Search Input Section */}
            <div className="bg-white px-4 pt-4 pb-0">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={onClose} className="p-1 -ml-1">
                        <ArrowLeft size={24} className="text-[#181725]" />
                    </button>
                    <div className="flex-1 relative">
                        <div className={cn(
                            "flex items-center gap-3 px-4 py-3 bg-[#F7F7F7] border rounded-2xl shadow-sm transition-all duration-300",
                            searchQuery ? "border-[#53B175] bg-white ring-1 ring-[#53B175]/10" : "border-gray-100"
                        )}>
                            <Search size={22} className={cn("transition-colors", searchQuery ? "text-[#53B175]" : "text-gray-400")} />
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="search for product or brand,store..."
                                className="flex-1 bg-transparent text-[15px] text-[#181725] outline-none placeholder:text-gray-400 font-medium w-full"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 shrink-0">
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-8 border-b border-[#EEEEEE]">
                    <button
                        onClick={() => setActiveTab('items')}
                        className={cn(
                            "flex items-center gap-2 pb-3.5 px-1 transition-all relative",
                            activeTab === 'items' ? "text-[#53B175]" : "text-[#181725]"
                        )}
                    >
                        <span className="text-[17px] font-semibold">Items</span>
                        <span className="bg-[#E5E7EB] text-[#181725] text-[11px] px-2 py-0.5 rounded-full font-bold">
                            {filteredItems.length}
                        </span>
                        {activeTab === 'items' && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#53B175] rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('vendors')}
                        className={cn(
                            "flex items-center gap-2 pb-3.5 px-1 transition-all relative",
                            activeTab === 'vendors' ? "text-[#53B175]" : "text-[#181725]"
                        )}
                    >
                        <span className="text-[17px] font-semibold">Vendors</span>
                        <span className={cn(
                            "text-[11px] px-2 py-0.5 rounded-full font-bold",
                            activeTab === 'vendors' ? "bg-[#53B175] text-white" : "bg-[#E5E7EB] text-[#181725]"
                        )}>
                            {filteredVendors.length}
                        </span>
                        {activeTab === 'vendors' && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#53B175] rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* Results Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeTab === 'items' && (
                    <>
                        {filteredItems.length > 0 && (
                            <>
                                {/* Search in Category Card */}
                                <button
                                    onClick={() => {
                                        setSearchQuery(filteredItems[0].name);
                                        setActiveTab('vendors');
                                    }}
                                    className="bg-white rounded-[16px] p-4 flex items-center gap-4 shadow-sm border border-gray-50 text-left w-full active:scale-[0.98] transition-all"
                                >
                                    <div className="w-[58px] h-[58px] border border-[#EEEEEE] rounded-full flex items-center justify-center p-2.5 overflow-hidden">
                                        <img src={filteredItems[0].images[0]} alt="suggestion" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-[16px] font-medium text-[#181725]">
                                        See vendors for <span className="text-[#53B175] font-bold">{filteredItems[0].name}</span>
                                    </div>
                                </button>

                                {/* Products Section */}
                                <div className="bg-white rounded-[16px] p-5 shadow-sm border border-gray-50">
                                    <h2 className="text-[16px] font-bold text-[#181725] mb-4">Products</h2>
                                    <div className="space-y-3">
                                        {filteredItems.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setSearchQuery(item.name);
                                                    setActiveTab('vendors');
                                                }}
                                                className="flex items-center gap-4 p-2 border border-[#EEEEEE] rounded-[14px] active:scale-[0.98] transition-all hover:border-[#53B175]/30 group w-full text-left"
                                            >
                                                <div className="w-[48px] h-[58px] flex items-center justify-center p-1 shrink-0 overflow-hidden">
                                                    <img src={item.images[0]} alt={item.name} className="max-w-full max-h-full object-contain" />
                                                </div>
                                                <div className="text-[14px] font-semibold text-[#181725] leading-tight group-hover:text-[#53B175] transition-colors">
                                                    {item.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {searchQuery && filteredItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                                <div className="bg-gray-100 p-4 rounded-full mb-4">
                                    <Search size={32} className="text-gray-400" />
                                </div>
                                <p className="text-[#181725] font-bold text-lg">No items found</p>
                                <p className="text-gray-400 text-sm mt-1">Try searching for something else like "Banana" or "Ketchup"</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'vendors' && (
                    <>
                        {filteredVendors.length > 0 ? (
                            filteredVendors.map((vendor) => (
                                <Link
                                    key={vendor.id}
                                    href={searchQuery
                                        ? `/category/${vendor.id}/${searchQuery.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
                                        : `/vendor/${vendor.id}`}
                                    onClick={onClose}
                                    className="flex items-center gap-4 p-4 bg-white rounded-[16px] border border-[#EEEEEE] active:scale-[0.98] transition-all hover:border-[#53B175]/30 group"
                                >
                                    {/* Vendor Logo */}
                                    <div className="w-[60px] h-[60px] min-w-[60px] rounded-[14px] border border-[#E2E2E2] flex items-center justify-center p-2 bg-white overflow-hidden relative">
                                        <img
                                            src={vendor.logo}
                                            alt={vendor.name}
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>

                                    {/* Vendor Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[16px] font-bold text-[#181725] leading-tight mb-0.5 group-hover:text-[#53B175] transition-colors">
                                            {vendor.name}
                                        </h3>
                                        <p className="text-[13px] text-[#7C7C7C] font-medium truncate">
                                            {vendor.categories.join(', ')}
                                        </p>
                                    </div>

                                    {/* Rating Badge */}
                                    <div className="flex items-center gap-1 bg-[#53B175] text-white px-2.5 py-1 rounded-full shrink-0">
                                        <Star size={12} className="fill-white text-white" />
                                        <span className="text-[13px] font-bold">{vendor.rating}</span>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                                <div className="bg-gray-100 p-4 rounded-full mb-4">
                                    <Search size={32} className="text-gray-400" />
                                </div>
                                <p className="text-[#181725] font-bold text-lg">No vendors found</p>
                                <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
