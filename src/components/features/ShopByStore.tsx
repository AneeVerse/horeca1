'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronUp } from 'lucide-react';

interface Store {
    id: string;
    name: string;
    logo: string;
    categories: string;
    bgColor: string;
    noContainer?: boolean;
}

const STORES: Store[] = [
    {
        id: 'v1',
        name: 'emarket',
        logo: '/images/top vendors/emarket.png',
        categories: 'Grocery, Vegetable, 2+',
        bgColor: '',
        noContainer: true
    },
    {
        id: 'v2',
        name: 'Whole Food M..',
        logo: '/images/top vendors/whole-foods-market.png',
        categories: 'Grocery, Fruits & Ve..',
        bgColor: '',
        noContainer: true
    },
    {
        id: 'v3',
        name: 'M Mart',
        logo: '/images/top vendors/m-mart.png',
        categories: 'Grocery, Dry Fruits, 3+',
        bgColor: 'bg-[#013518]'
    },
    {
        id: 'v4',
        name: 'Groceri',
        logo: '/images/top vendors/groceri.png',
        categories: 'Grocery & Fruits',
        bgColor: 'bg-[#53B175]'
    },
    {
        id: 'v5',
        name: 'Borcelle',
        logo: '/images/top vendors/961d17c25868145dd167df9f88ca0d40a7c057d1.png',
        categories: 'Grocery, Dry Fruits',
        bgColor: '',
        noContainer: true
    },
    {
        id: 'v6',
        name: 'Arisha Mart',
        logo: '/images/top vendors/39a5dd37096e44eb8b72e053055e32896d63c44a.png',
        categories: 'grocery',
        bgColor: 'bg-[#AB202A]'
    },
    {
        id: 'v7',
        name: 'Mentari Ma..',
        logo: '/images/top vendors/658b597eb627e280b99c0cf10e482793 2.png',
        categories: 'Grocery & Vegetables',
        bgColor: '',
        noContainer: true
    },
    {
        id: 'v8',
        name: 'Walmart',
        logo: '/images/top vendors/ecommerce-logo-template_658705-117 3.png',
        categories: 'Grocery, Electronic, 3+',
        bgColor: 'bg-[#0071CE]'
    },
    {
        id: 'v9',
        name: 'Allure Mart',
        logo: '/images/top vendors/da025fadd66fb2aef4d63f0db58b86b5 2.png',
        categories: 'Grocery & Fruits',
        bgColor: '',
        noContainer: true
    },
    {
        id: 'v10',
        name: 'Cartomart',
        logo: '/images/top vendors/m-mart-grocery-store-brands-logo-238132857 3.png',
        categories: 'Grocery, Dry Fruits',
        bgColor: '',
        noContainer: true
    }
];

export function ShopByStore() {
    const [isExpanded, setIsExpanded] = useState(false);
    const visibleStores = isExpanded ? STORES : STORES; // Show all if scrollable, but maybe limit if grid? 
    // Actually, user wants horizontal scroll by default.

    return (
        <section className="w-full pt-4 pb-2 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[16px] font-[700] text-[#181725]">Shop By Store</h2>
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[13px] md:text-[15px] font-semibold text-[#53B175] hover:opacity-80 transition-opacity flex items-center gap-1"
                    >
                        {isExpanded ? "Show Less" : "See All"}
                    </button>
                </div>

                {/* Stores Container */}
                <div className={cn(
                    "gap-x-4 gap-y-6 no-scrollbar transition-all duration-300",
                    isExpanded
                        ? "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 pb-4"
                        : "grid grid-rows-2 grid-flow-col overflow-x-auto auto-cols-[90px] md:auto-cols-[110px] gap-x-3 md:gap-x-4 pb-4"
                )}>
                    {visibleStores.map((store, index) => (
                        <div key={`${store.id}-${index}`} className={cn(
                            "flex flex-col items-center w-full"
                        )}>
                            <Link
                                href={`/vendor/${store.id}`}
                                className="w-full flex flex-col items-center group"
                            >
                                <div
                                    className={cn(
                                        "w-[85px] h-[85px] md:w-[100px] md:h-[100px] mb-3 flex items-center justify-center transition-all active:scale-95 overflow-hidden",
                                        !store.noContainer ? cn("rounded-[12px] shadow-sm", store.bgColor) : (store.name === 'Borcelle' ? "bg-[#F7F2ED] rounded-[12px]" : "p-0")
                                    )}
                                >
                                    <div className="w-full h-full relative flex items-center justify-center">
                                        <img
                                            src={store.logo}
                                            alt={store.name}
                                            className={cn(
                                                "max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-110 p-1",
                                                store.noContainer ? "scale-[1.3]" : "scale-[0.8]"
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="text-center w-full px-0.5">
                                    <h3 className="text-[14px] md:text-[16px] font-bold text-[#181725] mb-0.5 leading-tight line-clamp-1 group-hover:text-[#53B175] transition-colors">
                                        {store.name}
                                    </h3>
                                    <p className="text-[10px] md:text-[11px] text-[#7C7C7C] font-medium leading-tight line-clamp-2">
                                        {store.categories}
                                    </p>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
