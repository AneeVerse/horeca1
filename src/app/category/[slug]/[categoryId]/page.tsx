'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
    ChevronRight,
    Search,
    Star,
    ArrowLeft,
    LayoutGrid,
    List,
    ChevronDown
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { vendors } from '@/data/vendorData';
import { VendorProductCard } from '@/components/features/vendor/VendorProductCard';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';

function VendorCategoryPageContent() {
    const params = useParams();
    const router = useRouter();

    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const slug = params.slug as string;
    const categoryId = params.categoryId as string;

    const vendor = useMemo(() => {
        const targetVendor = slugify(slug);
        return vendors.find(v => slugify(v.id) === targetVendor || slugify(v.name) === targetVendor);
    }, [slug]);

    const activeCategory = useMemo(() => {
        if (!vendor) return null;
        const targetCat = slugify(categoryId);
        
        // 1. Try direct match on ID or Name
        let found = vendor.catalog.find(c => 
            slugify(c.id) === targetCat || 
            slugify(c.name) === targetCat
        );

        // 2. Fallback: Find category containing a product that matches the slug
        if (!found) {
            found = vendor.catalog.find(cat => 
                cat.products.some(p => slugify(p.name).includes(targetCat) || targetCat.includes(slugify(p.name)))
            );
        }
        
        return found;
    }, [vendor, categoryId]);

    const filteredProducts = useMemo(() => {
        if (!activeCategory) return [];
        return activeCategory.products;
    }, [activeCategory]);

    if (!vendor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center p-8">
                    <p className="text-[20px] font-bold text-gray-800 mb-2">Vendor not found</p>
                    <button onClick={() => router.back()} className="text-[#53B175] font-bold">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen flex flex-col">
            {/* Global Footer Hide for Mobile on this page */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 768px) {
                    footer, .bottom-nav { display: none !important; }
                }
            `}} />

            {/* ==================== MOBILE LAYOUT ==================== */}
            <div className="md:hidden flex flex-col h-screen overflow-hidden">
                {/* Fixed Header */}
                <header className="bg-white px-4 py-4 flex items-center justify-between border-b border-[#F2F3F2] shrink-0 relative">
                    <button onClick={() => router.back()}>
                        <ArrowLeft size={24} className="text-[#181725]" />
                    </button>
                    <h1 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-bold text-[#181725] whitespace-nowrap">
                        {vendor.name}
                    </h1>
                    <button className="p-1">
                        <Search size={22} className="text-[#181725]" strokeWidth={2.5} />
                    </button>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Sidebar: Categories */}
                    <div className="w-[100px] bg-white overflow-y-auto no-scrollbar border-r border-[#D0D0D0] flex flex-col pt-2">
                        {/* "See All" or similar? The user's screenshot has several icons. 
                           Based on screenshot: See All, Dairy, Vegetables, Fruits, Grocery, Sauces & Condiments */}
                        
                        <Link
                            href={`/vendor/${vendor.id}`}
                            className="flex flex-col items-center py-4 px-1 relative transition-all"
                        >
                            <div className="w-[64px] h-[64px] rounded-full bg-[#F8F9FA] flex items-center justify-center mb-2 overflow-hidden border border-transparent">
                                <span className="text-[28px]">🛒</span>
                            </div>
                            <p className="text-[11px] text-center font-bold leading-tight px-1 text-[#181725]">
                                See All
                            </p>
                        </Link>

                        {vendor.catalog.map((cat, idx) => {
                            const isActive = activeCategory?.id === cat.id;
                            const categorySlug = slugify(cat.name);
                            
                            return (
                                <Link
                                    key={idx}
                                    href={`/category/${slug}/${categorySlug}`}
                                    className={cn(
                                        "flex flex-col items-center py-4 px-1 relative transition-all",
                                        "bg-white"
                                    )}
                                >
                                    {isActive && <div className="absolute right-[-1px] top-[16px] h-[72px] w-[4px] bg-[#53B175] rounded-l-md z-20" />}
                                    <div className={cn(
                                        "flex items-center justify-center mb-2 overflow-hidden transition-all",
                                        "w-[72px] h-[72px] rounded-[14px] bg-white p-2",
                                        isActive ? "border-[1.5px] border-[#53B175]" : "border border-gray-100"
                                    )}>
                                        <img src={cat.image} alt="" className="w-full h-full object-contain" />
                                    </div>
                                    <p className={cn(
                                        "text-[11px] text-center font-bold leading-tight px-1",
                                        isActive ? "text-[#53B175]" : "text-[#181725]"
                                    )}>
                                        {cat.name}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Content Area: Chips + Products */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        {/* Title bar below header? The screenshot shows "Sauces & Seasoning" in the header, 
                           but user says "top name should be of vendor". 
                           Let's put Category name as a secondary sub-header or just inside the main area.
                           Actually, re-reading the screenshot: The header title WAS "Sauces & Seasoning".
                           User said: "top name should be of vendor at top".
                           I'll put the Category name as a sub-header.
                        */}


                        {/* Scrollable Filter Chips */}
                        <div className="flex overflow-x-auto px-4 py-3 gap-2 no-scrollbar border-b border-[#F2F3F2]">
                            {[
                                { label: 'Above 4.0+', icon: <Star size={14} className="fill-[#FFB800] text-[#FFB800] mr-1" /> },
                                { label: 'Brand', hasArrow: true },
                                { label: 'Type', hasArrow: true },
                            ].map((chip, idx) => (
                                <button
                                    key={idx}
                                    className="flex items-center px-4 py-2 rounded-[12px] border border-[#E2E2E2] bg-white text-[13px] font-bold text-[#181725] whitespace-nowrap"
                                >
                                    {chip.icon}
                                    {chip.label}
                                    {chip.hasArrow && <ChevronDown size={14} className="ml-1" />}
                                </button>
                            ))}
                        </div>

                        {/* Product Feed */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <VendorProductCard
                                        key={product.id}
                                        product={{
                                            ...product,
                                            vendorId: vendor.id,
                                            vendorName: vendor.name,
                                            images: [product.image],
                                            packSize: product.unit,
                                            stock: product.inStock ? 10 : 0
                                        } as any}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-20 flex flex-col items-center">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                         <Search size={32} className="text-gray-300" />
                                    </div>
                                    <p className="text-[#181725] font-bold">No products found in this category</p>
                                    <p className="text-gray-400 text-sm">Explore other categories from this vendor</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== DESKTOP SECTION ==================== */}
            <div className="hidden md:block">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-10">
                    <p className="text-gray-400 mb-8">Desktop view for this route is under construction. Please use mobile view.</p>
                </div>
            </div>
            
            <StickyCartBar />
        </div>
    );
}

export default function CategoryVendorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white animate-pulse" />}>
            <VendorCategoryPageContent />
        </Suspense>
    );
}
