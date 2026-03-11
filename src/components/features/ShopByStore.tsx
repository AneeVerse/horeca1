'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronUp } from 'lucide-react';

interface Store {
    id: number;
    name: string;
    logo: string;
    categories: string;
    bgColor: string;
    noContainer?: boolean;
}

const STORES: Store[] = [
    {
        id: 1,
        name: 'emarket',
        logo: '/images/top vendors/emarket.png',
        categories: 'Grocery, Vegetable, 2+',
        bgColor: '',
        noContainer: true
    },
    {
        id: 2,
        name: 'Whole Food M..',
        logo: '/images/top vendors/whole-foods-market.png',
        categories: 'Grocery, Fruits & Ve..',
        bgColor: '',
        noContainer: true
    },
    {
        id: 3,
        name: 'M Mart',
        logo: '/images/top vendors/m-mart.png',
        categories: 'Grocery, Dry Fruits, 3+',
        bgColor: 'bg-[#013518]'
    },
    {
        id: 4,
        name: 'Groceri',
        logo: '/images/top vendors/groceri.png',
        categories: 'Grocery & Fruits',
        bgColor: 'bg-[#53B175]'
    },
    {
        id: 5,
        name: 'Bee Mart',
        logo: '/images/top vendors/bee-mart.png',
        categories: 'Honey, Snacks, 1+',
        bgColor: '',
        noContainer: true
    },
    {
        id: 6,
        name: 'Family Market',
        logo: '/images/top vendors/family-supermarket.png',
        categories: 'Fruits, Meat & More',
        bgColor: '',
        noContainer: true
    },
    {
        id: 7,
        name: 'Fresh Mart',
        logo: '/images/top vendors/family-supermarket.png',
        categories: 'Fresh, Organic, 10+',
        bgColor: '',
        noContainer: true
    },
    {
        id: 8,
        name: 'Mega Store',
        logo: '/images/top vendors/family-supermarket.png',
        categories: 'All in one, 50+',
        bgColor: '',
        noContainer: true
    }
];

export function ShopByStore() {
    const [isExpanded, setIsExpanded] = useState(false);
    const visibleStores = isExpanded ? STORES : STORES.slice(0, 4);

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
                        {isExpanded ? (
                            <ChevronUp size={20} className="text-[#181725]" />
                        ) : (
                            "See All"
                        )}
                    </button>
                </div>

                {/* Stores Container */}
                <div className={cn(
                    "gap-4 pb-4 no-scrollbar transition-all duration-300",
                    isExpanded
                        ? "grid grid-cols-4 md:flex md:flex-wrap"
                        : "flex overflow-x-auto -mx-[var(--container-padding)] px-[var(--container-padding)]"
                )}>
                    {visibleStores.map((store) => (
                        <div key={store.id} className={cn(
                            "flex flex-col items-center",
                            isExpanded ? "min-w-0 w-full" : "min-w-[87px]"
                        )}>
                            <Link
                                href={`/store/${store.id}`}
                                className={cn(
                                    "w-[87px] h-[87px] mb-3 flex items-center justify-center transition-all active:scale-95 group overflow-hidden",
                                    !store.noContainer ? cn("rounded-[8px] shadow-sm", store.bgColor) : "p-0"
                                )}
                            >
                                <div className="w-full h-full relative flex items-center justify-center">
                                    <img
                                        src={store.logo}
                                        alt={store.name}
                                        className={cn(
                                            "max-w-[80%] max-h-[80%] object-contain transition-transform duration-300 group-hover:scale-110",
                                            // Apply normalization scales to equalize visual height
                                            store.name.toLowerCase().includes('whole food') ? "scale-[0.85]" :
                                                store.name.toLowerCase().includes('emarket') ? "scale-[1.4]" :
                                                    store.name.toLowerCase().includes('groceri') ? "scale-[1.9] translate-y-[6px]" : "scale-[1.5]"
                                        )}
                                    />
                                </div>
                            </Link>
                            <div className="text-center w-full px-0.5">
                                <h3 className="text-[14px] md:text-[16px] font-bold text-[#181725] mb-0.5 leading-tight line-clamp-1">
                                    {store.name}
                                </h3>
                                <p className="text-[10px] md:text-[11px] text-[#7C7C7C] font-medium leading-tight line-clamp-2">
                                    {store.categories}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
