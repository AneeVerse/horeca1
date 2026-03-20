'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, Star } from 'lucide-react';
import { cn, slugify } from '@/lib/utils';
import { Vendor } from '@/types';

interface NavCategory {
    name: string;
    image: string;
    bgColor: string;
}

interface CategoryBrowseMenuProps {
    isOpen: boolean;
    categories: NavCategory[];
    vendors: Vendor[];
    hoveredCategory: string | null;
    setHoveredCategory: (category: string | null) => void;
    onClose: () => void;
}

export function CategoryBrowseMenu({
    isOpen,
    categories,
    vendors,
    hoveredCategory,
    setHoveredCategory,
    onClose
}: CategoryBrowseMenuProps) {
    return (
        <div className={cn(
            "absolute top-full left-0 bg-white shadow-[0_32px_64px_rgba(0,0,0,0.15)] transition-all duration-300 z-[110] rounded-b-2xl overflow-hidden flex min-h-[480px] border border-gray-100 border-t-0",
            isOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2",
            !hoveredCategory ? "w-72" : "w-[calc(18rem+450px)]"
        )}>
            {/* Categories List */}
            <div className="w-72 border-r border-gray-100 py-2 bg-white shrink-0">
                {categories.slice(0, 10).map((item, idx) => (
                    <div
                        key={idx}
                        onMouseEnter={() => setHoveredCategory(item.name)}
                        className={cn(
                            "flex items-center justify-between px-6 py-3.5 cursor-pointer group/item transition-all",
                            hoveredCategory === item.name ? "bg-primary/5 text-primary" : "hover:bg-gray-50 text-text"
                        )}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-7 h-7 flex items-center justify-center transition-all">
                                <img src={item.image} alt="" className="max-w-full max-h-full object-contain" />
                            </div>
                            <span className="text-[14px] font-bold">{item.name}</span>
                        </div>
                        <ChevronDown size={14} className={cn("-rotate-90 transition-colors", hoveredCategory === item.name ? "text-primary" : "text-gray-300")} />
                    </div>
                ))}
            </div>

            {/* Vendors Side Panel */}
            {hoveredCategory && (
                <div className="w-[450px] bg-[#F9FAFB] p-6 overflow-y-auto max-h-[600px] animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[15px] font-black text-text uppercase tracking-tight">
                            {hoveredCategory}
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {vendors.filter(v =>
                            hoveredCategory && v.categories.some(c => c.toLowerCase() === hoveredCategory.toLowerCase())
                        ).slice(0, 6).map((vendor) => (
                            <Link
                                key={vendor.id}
                                href={`/category/${vendor.slug || slugify(vendor.name)}/${slugify(hoveredCategory || '')}`}
                                onClick={onClose}
                                className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all group/vendor cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-lg border border-gray-50 flex items-center justify-center p-1.5 shrink-0 bg-white">
                                    <img src={vendor.logo} alt="" className="max-w-full max-h-full object-contain group-hover/vendor:scale-110 transition-transform" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-[14px] font-bold text-text truncate group-hover/vendor:text-primary transition-colors">{vendor.name}</h5>
                                    <p className="text-[11px] text-text-muted truncate font-medium">
                                        {vendor.categories.join(', ')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-lg shrink-0">
                                    <Star size={12} fill="currentColor" />
                                    <span className="text-[11px] font-bold">{vendor.rating}</span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {vendors.filter(v =>
                        hoveredCategory && v.categories.some(c => c.toLowerCase() === hoveredCategory.toLowerCase())
                    ).length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-text-muted text-[13px] font-medium italic">No direct matches found. Try exploring the category.</p>
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}
