'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Clock, CreditCard, Package, ChevronLeft, Share2 } from 'lucide-react';
import type { Vendor } from '@/types';

interface VendorStoreHeaderProps {
    vendor: Vendor;
}

export function VendorStoreHeader({ vendor }: VendorStoreHeaderProps) {
    return (
        <div className="w-full bg-white border-b border-gray-100">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Back + Share */}
                <div className="flex items-center justify-between pt-4 pb-2">
                    <Link href="/" className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
                        <ChevronLeft size={18} />
                        <span>Back</span>
                    </Link>
                    <button className="p-2 rounded-full hover:bg-gray-50 transition-colors">
                        <Share2 size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Vendor Info */}
                <div className="flex items-start gap-4 pb-4">
                    {/* Logo */}
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center p-2 shrink-0">
                        <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-contain" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-[18px] md:text-[22px] font-bold text-[#181725] leading-tight">
                            {vendor.name}
                        </h1>
                        {vendor.description && (
                            <p className="text-[12px] md:text-[13px] text-gray-500 mt-0.5 line-clamp-1">
                                {vendor.description}
                            </p>
                        )}

                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {/* Rating */}
                            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                <Star size={12} fill="currentColor" />
                                <span className="text-[11px] font-bold">{vendor.rating}</span>
                                <span className="text-[10px] text-green-600">({vendor.totalRatings})</span>
                            </div>

                            {/* Delivery */}
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                <Clock size={12} />
                                <span className="text-[11px] font-semibold">{vendor.deliverySchedule}</span>
                            </div>

                            {/* MOV */}
                            <div className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                                <Package size={12} />
                                <span className="text-[11px] font-semibold">Min ₹{vendor.minOrderValue}</span>
                            </div>

                            {/* Credit */}
                            {vendor.creditEnabled && (
                                <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                                    <CreditCard size={12} />
                                    <span className="text-[11px] font-semibold">Credit Available</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Categories Tags */}
                <div className="flex items-center gap-2 pb-3 overflow-x-auto no-scrollbar -mx-[var(--container-padding)] px-[var(--container-padding)]">
                    {vendor.categories.map((cat) => (
                        <span key={cat} className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                            {cat}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
