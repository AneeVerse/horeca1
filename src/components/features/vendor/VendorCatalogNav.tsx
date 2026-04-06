'use client';

import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function VendorCatalogNav({ activeTab, onTabChange, searchQuery, onSearchChange }: VendorCatalogNavProps) {
    return (
        <div className="w-full bg-gray-50/50 backdrop-blur-2xl sticky top-0 z-[40] border-b border-gray-100 shadow-[0_1px_20px_rgba(0,0,0,0.02)]">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* ── MODERN TOOLBAR (EXPANDED SEARCH) ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4">
                    
                    {/* Left Side: Integrated Search Command Center (Expanded) */}
                    <div className="relative group flex-1 md:max-w-[450px] lg:max-w-[600px] flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search 
                                size={18} 
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#53B175] transition-colors" 
                                strokeWidth={3}
                            />
                            <input
                                type="text"
                                placeholder="Search in this store..."
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full pl-12 pr-10 py-3 bg-white border border-gray-100 rounded-2xl text-[14px] font-bold text-gray-800 placeholder:text-gray-400 placeholder:font-bold focus:outline-none focus:border-[#53B175]/50 focus:bg-white focus:ring-8 focus:ring-[#53B175]/5 transition-all duration-500 shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => onSearchChange('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-gray-100/50 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all active:scale-90"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                        
                        {/* Integrated Filter Icon */}
                        <button className="p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-[#53B175] hover:border-[#53B175]/20 hover:shadow-lg transition-all shrink-0">
                            <SlidersHorizontal size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Right Side: Filter Pill Tabs */}
                    <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar -mx-[calc(var(--container-padding)/2)] px-[calc(var(--container-padding)/2)] md:mx-0 md:px-0">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => onTabChange(tab.key)}
                                className={cn(
                                    "px-5 py-2.5 rounded-2xl text-[12px] font-black whitespace-nowrap transition-all duration-300 border uppercase tracking-wider",
                                    activeTab === tab.key
                                        ? "bg-[#53B175] text-white border-[#53B175] shadow-[0_8px_20px_rgba(83,177,117,0.25)]"
                                        : "bg-gray-50/50 text-gray-500 border-gray-100/80 hover:bg-white hover:text-gray-800 hover:border-[#53B175]/30 hover:shadow-lg hover:shadow-gray-100"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
