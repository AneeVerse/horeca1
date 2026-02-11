'use client';

import React, { useState } from 'react';
import { ArrowLeft, Search, X, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'items' | 'stores';
}

const ITEMS = [
    {
        id: 1,
        name: 'Bell Pepper Red',
        weight: '200 gms',
        price: 5.22,
        originalPrice: 7.99,
        unit: 'gms',
        image: 'https://cdn.pixabay.com/photo/2016/08/11/23/25/red-bell-pepper-1587217_1280.jpg'
    },
    {
        id: 2,
        name: 'Banana',
        weight: '6 pcs',
        price: 2.50,
        originalPrice: 5.99,
        unit: 'pcs',
        image: 'https://cdn.pixabay.com/photo/2018/09/24/20/12/bananas-3700718_1280.jpg'
    },
    {
        id: 3,
        name: 'Brinjal Black',
        weight: '250 gms',
        price: 3.99,
        originalPrice: 4.99,
        unit: 'gms',
        image: 'https://cdn.pixabay.com/photo/2012/03/01/01/05/eggplant-20092_1280.jpg'
    },
    {
        id: 4,
        name: 'Bell Pepper Red',
        weight: '200 gms',
        price: 5.22,
        originalPrice: 7.99,
        unit: 'gms',
        image: 'https://cdn.pixabay.com/photo/2016/08/11/23/25/red-bell-pepper-1587217_1280.jpg'
    },
];

const STORES = [
    {
        id: 1,
        name: 'emarket',
        category: 'Grocery & Vegetables',
        distance: '0.18 km',
        location: 'Rose Valley, Mumbai',
        rating: 4.8,
        image: 'https://cdn.vectorstock.com/i/1000x1000/22/29/e-market-logo-template-vector-21222229.webp'
    },
    {
        id: 2,
        name: 'Family Supermarket',
        category: 'Grocery, Fruits & Vegetables',
        distance: '1 km',
        location: 'Rose Valley, Mumbai',
        rating: 4.4,
        image: 'https://static.vecteezy.com/system/resources/previews/000/365/493/original/family-supermarket-logo-vector.jpg'
    },
    {
        id: 3,
        name: 'M Mart',
        category: 'Grocery',
        distance: '10 km',
        location: 'New Mumbai',
        rating: 4.9,
        image: 'https://static.vecteezy.com/system/resources/previews/000/512/322/original/m-mart-logo-vector.jpg'
    },
    {
        id: 4,
        name: 'Groceri',
        category: 'Grocery & Fruits',
        distance: '14 km',
        location: '534 Valley, Pune',
        rating: 4.4,
        image: 'https://static.vecteezy.com/system/resources/previews/000/365/493/original/family-supermarket-logo-vector.jpg'
    },
];

export function MobileSearchOverlay({ isOpen, onClose, initialTab = 'items' }: MobileSearchOverlayProps) {
    const [activeTab, setActiveTab] = useState<'items' | 'stores'>(initialTab);
    const [searchQuery, setSearchQuery] = useState('');

    // Sync activeTab with initialTab when overlay opens
    React.useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    return (
        <div className="fixed top-2 bottom-[72px] left-0 right-0 z-[10000] bg-white flex flex-col md:hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex flex-col gap-3 p-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-1 -ml-1">
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                </div>

                <div className="relative">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl w-full focus-within:border-primary/50 transition-colors">
                        <Search size={20} className="text-gray-400 shrink-0" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="search for product or brand,store..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="shrink-0 text-gray-400">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center px-4 border-b border-gray-100 bg-white">
                <button
                    onClick={() => setActiveTab('items')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all relative",
                        activeTab === 'items' ? "text-[#33a852]" : "text-gray-500"
                    )}
                >
                    Items
                    <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-normal">
                        99
                    </span>
                    {activeTab === 'items' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#33a852] rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('stores')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all relative",
                        activeTab === 'stores' ? "text-[#33a852]" : "text-gray-500"
                    )}
                >
                    Stores
                    <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-normal">
                        11
                    </span>
                    {activeTab === 'stores' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#33a852] rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30">
                {activeTab === 'items' ? (
                    <div className="flex flex-col">
                        {ITEMS.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-4 bg-white border-b border-gray-50">
                                <div className="w-20 h-20 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-gray-800 truncate">{item.name}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{item.weight}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm font-extrabold text-[#1a1a1a]">$ {item.price.toFixed(2)} {item.unit}</span>
                                        <span className="text-[10px] text-gray-400 line-through">$ {item.originalPrice.toFixed(2)} {item.unit}</span>
                                    </div>
                                </div>
                                <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[#33a852] font-bold text-xs hover:bg-gray-50 transition-colors shadow-sm">
                                    <Plus size={14} className="stroke-[3]" />
                                    <span>ADD</span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col p-4 gap-3">
                        {STORES.map((store, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <div className="w-16 h-16 shrink-0 bg-white rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center p-2">
                                    <img src={store.image} alt={store.name} className="w-full h-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-bold text-gray-800 truncate">{store.name}</h3>
                                        <div className="flex items-center gap-1 bg-[#33a852] text-white text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">
                                            <Star size={10} fill="currentColor" />
                                            <span>{store.rating}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{store.category}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{store.distance}, {store.location}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
