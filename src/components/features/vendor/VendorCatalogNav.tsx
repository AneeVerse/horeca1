'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface VendorCatalogNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    categories: string[];
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

const TABS = [
    { key: 'all', label: 'All Items' },
    { key: 'frequent', label: 'Frequently Ordered' },
    { key: 'deals', label: 'Deals' },
];

export function VendorCatalogNav({ activeTab, onTabChange, categories, searchQuery, onSearchChange }: VendorCatalogNavProps) {
    const [showSearch, setShowSearch] = useState(false);

    return (
        <div className="w-full bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Search Bar */}
                <div className="py-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search in this store..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[13px] font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#299e60] focus:ring-1 focus:ring-[#299e60]/20 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-[var(--container-padding)] px-[var(--container-padding)] pb-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => onTabChange(tab.key)}
                            className={`px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all ${
                                activeTab === tab.key
                                    ? 'bg-[#299e60] text-white shadow-md shadow-green-200'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}

                    <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

                    {/* Category tabs */}
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => onTabChange(`cat:${cat}`)}
                            className={`px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all ${
                                activeTab === `cat:${cat}`
                                    ? 'bg-[#299e60] text-white shadow-md shadow-green-200'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
