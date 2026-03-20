'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, X, Star, Heart, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dal } from '@/lib/dal';
import type { Vendor, VendorProduct } from '@/types';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

interface MobileSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'items' | 'vendors' | 'stores';
    initialQuery?: string;
}

export function MobileSearchOverlay({ isOpen, onClose, initialTab = 'vendors', initialQuery = '' }: MobileSearchOverlayProps) {
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<'items' | 'vendors'>(initialTab as 'items' | 'vendors');
    const prevOpenRef = React.useRef(false);
    const { wishlist } = useWishlist();
    const { totalItems } = useCart();

    const [vendors, setVendors] = useState<Vendor[]>([]);

    useEffect(() => {
        dal.vendors.list().then((res) => setVendors(res.vendors)).catch(console.error);
    }, []);

    // Sync search query when overlay opens
    React.useEffect(() => {
        if (isOpen && !prevOpenRef.current) {
            setSearchQuery(initialQuery);
            setActiveTab(initialTab === 'stores' ? 'vendors' : initialTab);
        }
        prevOpenRef.current = isOpen;
    }, [isOpen, initialQuery, initialTab]);

    // Search products from API when user types
    const [filteredItems, setFilteredItems] = useState<VendorProduct[]>([]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredItems([]);
            return;
        }
        const timeout = setTimeout(() => {
            dal.search.query(searchQuery).then((res) => {
                setFilteredItems(res.products);
            }).catch(() => setFilteredItems([]));
        }, 300); // debounce 300ms
        return () => clearTimeout(timeout);
    }, [searchQuery]);

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
            const vendorDesc = (v.description || '').toLowerCase();
            const vendorTags = (v.categories || []).map(tag => tag.toLowerCase().replace(/&/g, 'and'));

            // 1. Store Name Match
            if (vendorName.includes(q)) return true;

            // 2. Description Match
            if (vendorDesc.includes(q)) return true;

            // 3. Tag Match
            const hasTagMatch = vendorTags.some(tag =>
                tag.includes(cleanQuery) ||
                (queryKeywords.length > 0 && queryKeywords.some(word => tag.includes(word)))
            );
            if (hasTagMatch) return true;

            return false;
        });
    }, [searchQuery, vendors]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[10000] flex flex-col md:items-center md:justify-center bg-black/40 md:bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            {/* Main Overlay Container */}
            <div 
                className="w-full h-full md:h-[90vh] md:max-w-[95vw] md:rounded-[40px] bg-[#F8FAFC] flex flex-col overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.18)] relative animate-in zoom-in-95 duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header/Search Input Section */}
                <div className="bg-white px-4 md:px-12 pt-4 md:pt-10 pb-0 shadow-sm border-b border-gray-100">
                    <div className="flex items-center gap-6 mb-6">
                        <button onClick={onClose} className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors md:hidden">
                            <ArrowLeft size={24} className="text-[#181725]" />
                        </button>
                        <button onClick={onClose} className="hidden md:flex p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                            <X size={24} className="text-gray-400" />
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
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for product, brand or store..."
                                    className="flex-1 bg-transparent text-[15px] md:text-[16px] text-[#181725] outline-none placeholder:text-gray-400 font-medium w-full"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 shrink-0 cursor-pointer">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                        <Link href="/wishlist" onClick={onClose} className="relative p-1">
                            <Heart size={20} className="text-[#181725]" />
                            {wishlist.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-[#FF4B4B] text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-extrabold border-[1.5px] border-white">
                                    {wishlist.length}
                                </span>
                            )}
                        </Link>
                        <Link href="/cart" onClick={onClose} className="relative p-1">
                            <ShoppingCart size={20} className="text-[#181725]" />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#53B175] text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border border-white">
                                    {totalItems}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-8 border-b border-[#EEEEEE]">
                    <button
                        onClick={() => setActiveTab('items')}
                        className={cn(
                            "flex items-center gap-2 pb-3.5 px-1 transition-all relative cursor-pointer",
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
                            "flex items-center gap-2 pb-3.5 px-1 transition-all relative cursor-pointer",
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
            <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-3 md:space-y-6">
                {activeTab === 'items' && (
                    <>
                        {filteredItems.length > 0 && (
                            <>
                                {/* Search in Category Card */}
                                <button
                                    onClick={() => {
                                        setSearchQuery(filteredItems[0].category);
                                        setActiveTab('vendors');
                                    }}
                                    className="bg-white rounded-[16px] p-4 flex items-center gap-4 shadow-sm border border-gray-50 text-left w-full active:scale-[0.98] transition-all"
                                >
                                    <div className="w-[58px] h-[58px] border border-[#EEEEEE] rounded-full flex items-center justify-center p-2.5 overflow-hidden">
                                        <img src={filteredItems[0].images[0]} alt="suggestion" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="text-[16px] font-medium text-[#181725]">
                                        See vendors for <span className="text-[#53B175] font-bold">{filteredItems[0].category}</span>
                                    </div>
                                </button>

                                {/* Products Section */}
                                <div className="bg-white rounded-[16px] p-5 shadow-sm border border-gray-50">
                                    <h2 className="text-[16px] font-bold text-[#181725] mb-4">Products</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredItems.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setSearchQuery(item.name);
                                                    setActiveTab('vendors');
                                                }}
                                                className="flex items-center gap-4 p-4 border border-[#EEEEEE] rounded-[20px] active:scale-[0.98] transition-all hover:border-[#53B175]/30 hover:bg-gray-50/50 group w-full text-left cursor-pointer"
                                            >
                                                <div className="w-[50px] h-[60px] flex items-center justify-center p-1 shrink-0 overflow-hidden bg-white rounded-lg">
                                                    <img src={item.images[0]} alt={item.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[15px] font-bold text-[#181725] leading-tight group-hover:text-[#53B175] transition-colors line-clamp-1">
                                                        {item.name}
                                                    </div>
                                                    <div className="text-[12px] text-gray-400 mt-1 font-medium">
                                                        {item.category}
                                                    </div>
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
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 w-full">
                        {filteredVendors.length > 0 ? (
                            filteredVendors.map((vendor) => {
                                const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                                const q = searchQuery.toLowerCase().trim();
                                
                                // 1. Check for exact category match
                                let catMatch = vendor.categories.find(c => slugify(c) === slugify(q));
                                
                                // 2. Fallback: no catalog on DAL vendors, skip product-level matching

                                const vendorTarget = catMatch 
                                    ? `/category/${vendor.slug}/${slugify(catMatch)}`
                                    : `/vendor/${vendor.id}`; 

                                return (
                                    <Link
                                        key={vendor.id}
                                        href={vendorTarget}
                                        onClick={onClose}
                                        className="flex items-center gap-4 p-5 md:p-6 bg-white rounded-[24px] border border-[#EEEEEE] active:scale-[0.98] transition-all hover:border-[#53B175]/30 hover:shadow-lg hover:shadow-gray-100 group"
                                    >
                                        {/* Vendor Logo */}
                                        <div className="w-[60px] h-[60px] md:w-[70px] md:h-[70px] min-w-[60px] md:min-w-[70px] rounded-[18px] border border-[#F2F2F2] flex items-center justify-center p-2.5 bg-white overflow-hidden relative shadow-sm">
                                            <img
                                                src={vendor.logo}
                                                alt={vendor.name}
                                                className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                                            />
                                        </div>

                                        {/* Vendor Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[16px] md:text-[18px] font-bold text-[#181725] leading-tight mb-1 group-hover:text-[#53B175] transition-colors">
                                                {vendor.name}
                                            </h3>
                                            <p className="text-[13px] md:text-[14px] text-[#7C7C7C] font-medium truncate">
                                                {vendor.categories.join(', ')}
                                            </p>
                                        </div>

                                        {/* Rating Badge */}
                                        <div className="flex items-center gap-1.5 bg-[#53B175] text-white px-3 py-1.5 rounded-full shrink-0 shadow-sm shadow-green-100">
                                            <Star size={14} className="fill-white text-white" />
                                            <span className="text-[14px] font-bold">{vendor.rating}</span>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                <div className="bg-gray-100 p-6 rounded-3xl mb-4">
                                    <Search size={40} className="text-gray-400" />
                                </div>
                                <p className="text-[#181725] font-bold text-xl">No vendors matching "{searchQuery}"</p>
                                <p className="text-gray-400 text-[15px] mt-2">Try searching for a different category or store name</p>
                            </div>
                        )}
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
