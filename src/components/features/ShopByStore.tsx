'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MOCK_VENDORS } from '@/lib/mockData';

const VENDOR_STYLE: Record<string, { bgColor: string; noContainer?: boolean }> = {
    v1: { bgColor: '', noContainer: true },
    v2: { bgColor: '', noContainer: true },
    v3: { bgColor: 'bg-[#013518]' },
    v4: { bgColor: 'bg-[#53B175]' },
    v5: { bgColor: '', noContainer: true },
    v6: { bgColor: 'bg-[#AB202A]' },
    v7: { bgColor: '', noContainer: true },
    v8: { bgColor: 'bg-[#0071CE]' },
    v9: { bgColor: '', noContainer: true },
    v10: { bgColor: '', noContainer: true },
};

export function ShopByStore() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <section className="w-full pt-4 pb-2 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[16px] md:text-[20px] lg:text-[22px] font-[700] text-[#181725]">Shop By Store</h2>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[13px] md:text-[15px] font-semibold text-[#53B175] hover:opacity-80 transition-opacity flex items-center gap-1 md:hidden"
                    >
                        {isExpanded ? "Show Less" : "See All"}
                    </button>
                </div>

                {/* Stores Container */}
                <div className={cn(
                    "gap-x-4 gap-y-6 no-scrollbar transition-all duration-300",
                    isExpanded
                        ? "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-10 pb-4"
                        : "grid grid-rows-2 grid-flow-col overflow-x-auto auto-cols-[90px] gap-x-3 pb-4 md:grid-rows-none md:grid-flow-row md:overflow-x-visible md:auto-cols-auto md:grid-cols-5 md:gap-x-4 lg:grid-cols-10"
                )}>
                    {MOCK_VENDORS.map((vendor, index) => {
                        const style = VENDOR_STYLE[vendor.id] ?? { bgColor: '', noContainer: true };
                        const categoriesLabel = vendor.categories.slice(0, 2).join(', ') +
                            (vendor.categories.length > 2 ? `, ${vendor.categories.length - 2}+` : '');
                        return (
                            <div key={`${vendor.id}-${index}`} className="flex flex-col items-center w-full">
                                <Link
                                    href={`/vendor/${vendor.id}`}
                                    className="w-full flex flex-col items-center group"
                                >
                                    <div
                                        className={cn(
                                            "w-[85px] h-[85px] md:w-[100px] md:h-[100px] mb-3 flex items-center justify-center transition-all active:scale-95 overflow-hidden",
                                            !style.noContainer ? cn("rounded-[12px] shadow-sm", style.bgColor) : (vendor.name === 'Borcelle' ? "bg-[#F7F2ED] rounded-[12px]" : "p-0")
                                        )}
                                    >
                                        <div className="w-full h-full relative flex items-center justify-center">
                                            <img
                                                src={vendor.logo}
                                                alt={vendor.name}
                                                className={cn(
                                                    "max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-110 p-1",
                                                    style.noContainer ? "scale-[1.3]" : "scale-[0.8]"
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-center w-full px-0.5">
                                        <h3 className="text-[14px] md:text-[16px] font-bold text-[#181725] mb-0.5 leading-tight line-clamp-1 group-hover:text-[#53B175] transition-colors">
                                            {vendor.name}
                                        </h3>
                                        <p className="text-[10px] md:text-[11px] text-[#7C7C7C] font-medium leading-tight line-clamp-2">
                                            {categoriesLabel}
                                        </p>
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
