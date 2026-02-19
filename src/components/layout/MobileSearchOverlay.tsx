'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, X, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StoreDetailOverlay } from './StoreDetailOverlay';

interface MobileSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'items' | 'venders' | 'stores';
    initialQuery?: string;
}

export function MobileSearchOverlay({ isOpen, onClose, initialQuery = '' }: MobileSearchOverlayProps) {
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<'items' | 'venders'>('items');

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
                        onClick={() => setActiveTab('venders')}
                        className={cn(
                            "flex items-center gap-2 pb-3.5 px-1 transition-all relative",
                            activeTab === 'venders' ? "text-[#53B175]" : "text-[#181725]"
                        )}
                    >
                        <span className="text-[17px] font-semibold">Venders</span>
                        <span className="bg-[#E5E7EB] text-[#181725] text-[11px] px-2 py-0.5 rounded-full font-bold">12</span>
                        {activeTab === 'venders' && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#53B175] rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* Results Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredItems.length > 0 && (
                    <>
                        {/* Search in Category Card - Just shows the first item's category as a suggestion */}
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
                        <p className="text-gray-400 text-sm mt-1">Try searching for something else like "Banana" or "Ketchup"</p>
                    </div>
                )}
            </div>
        </div>
    );
}
