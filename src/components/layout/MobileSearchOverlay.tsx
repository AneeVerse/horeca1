'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'items' | 'vendors' | 'stores';
    initialQuery?: string;
}

const VENDORS = [
    { id: 1, name: 'emarket', logo: '/images/top vendors/emarket.png', category: 'Grocery & Vegetables', rating: 4.8 },
    { id: 2, name: 'Whole Foods Market', logo: '/images/top vendors/whole-foods-market.png', category: 'Grocery, Fruits & Vegetables', rating: 4.4 },
    { id: 3, name: 'M Mart', logo: '/images/top vendors/m-mart.png', category: 'Grocery', rating: 4.9 },
    { id: 4, name: 'Groceri', logo: '/images/top vendors/groceri.png', category: 'Grocery & Fruits', rating: 4.4 },
    { id: 5, name: 'Bee mart', logo: '/images/top vendors/bee-mart.png', category: 'Grocery & Vegetables', rating: 4.6 },
    { id: 6, name: 'Family Supermarket', logo: '/images/top vendors/family-supermarket.png', category: 'Grocery, Fruits & Vegetables', rating: 4.4 },
];

export function MobileSearchOverlay({ isOpen, onClose, initialQuery = '' }: MobileSearchOverlayProps) {
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<'items' | 'vendors'>('items');

    // Sync search query when overlay opens
    React.useEffect(() => {
        if (isOpen && initialQuery) {
            setSearchQuery(initialQuery);
        }
    }, [isOpen, initialQuery]);

    const ALL_RESULTS = [
        { id: 1, name: 'Kissan Fresh Tomato Ketchup 750 gms', image: '/images/product/product-img1.png', category: 'Sauces & Seasoning' },
        { id: 102, name: 'Del Monte Tomato Ketchup Pouch 1 kg', image: '/images/product/product-img1.png', category: 'Sauces & Seasoning' },
        { id: 103, name: 'Maggi Tomato Ketchup Bottle 450 gms', image: '/images/product/product-img1.png', category: 'Sauces & Seasoning' },
        { id: 104, name: 'Heinz Tomato Ketchup Bottle 750 gms', image: '/images/product/product-img1.png', category: 'Sauces & Seasoning' },
        { id: 4001, name: 'Banana Robusta', image: '/images/fruits-vegetables/banana.png', category: 'Fruits' },
        { id: 202, name: 'Banana Yelakki', image: '/images/fruits-vegetables/banana.png', category: 'Fruits' },
        { id: 1001, name: 'Fresh Onion 1kg', image: '/images/fruits-vegetables/onion.png', category: 'Vegetables' },
        { id: 1003, name: 'Amul Butter 500g', image: '/images/dairy/amul-butter.png', category: 'Dairy' },
    ];

    const filteredItems = searchQuery.length > 0
        ? ALL_RESULTS.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const filteredVendors = searchQuery.length > 0
        ? VENDORS.filter(v =>
            v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : VENDORS;

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
                                className="flex-1 bg-transparent text-[15px] text-[#181725] outline-none placeholder:text-gray-400 font-medium"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
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
                                <div className="bg-white rounded-[16px] p-4 flex items-center gap-4 shadow-sm border border-gray-50">
                                    <div className="w-[58px] h-[58px] border border-[#EEEEEE] rounded-full flex items-center justify-center p-2.5 overflow-hidden">
                                        <img src={filteredItems[0].image} alt="suggestion" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-[16px] font-medium text-[#181725]">
                                        {searchQuery} in <span className="text-[#53B175] font-bold">{filteredItems[0].category}</span>
                                    </div>
                                </div>

                                {/* Products Section */}
                                <div className="bg-white rounded-[16px] p-5 shadow-sm border border-gray-50">
                                    <h2 className="text-[16px] font-bold text-[#181725] mb-4">Products</h2>
                                    <div className="space-y-3">
                                        {filteredItems.map((item) => (
                                            <Link
                                                key={item.id}
                                                href={`/product/${item.id}`}
                                                onClick={onClose}
                                                className="flex items-center gap-4 p-2 border border-[#EEEEEE] rounded-[14px] active:scale-[0.98] transition-all hover:border-[#53B175]/30 group"
                                            >
                                                <div className="w-[48px] h-[58px] flex items-center justify-center p-1 shrink-0 overflow-hidden">
                                                    <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                                                </div>
                                                <div className="text-[14px] font-semibold text-[#181725] leading-tight group-hover:text-[#53B175] transition-colors">
                                                    {item.name}
                                                </div>
                                            </Link>
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
                                <p className="text-gray-400 text-sm mt-1">Try searching for something else like &quot;Banana&quot; or &quot;Ketchup&quot;</p>
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
                                    href={`/vendor/${vendor.id}`}
                                    onClick={onClose}
                                    className="flex items-center gap-4 p-4 bg-white rounded-[16px] border border-[#EEEEEE] active:scale-[0.98] transition-all hover:border-[#53B175]/30 group"
                                >
                                    {/* Vendor Logo */}
                                    <div className="w-[60px] h-[60px] min-w-[60px] rounded-[14px] border border-[#E2E2E2] flex items-center justify-center p-2 bg-white overflow-hidden">
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
                                            {vendor.category}
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
