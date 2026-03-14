'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star, Clock, CreditCard, Package, Search } from 'lucide-react';
import Link from 'next/link';
import { vendors } from '@/data/vendorData';

export default function VendorsPage() {
    const router = useRouter();
    const allVendors = vendors;

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-3 min-[340px]:py-4">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => router.back()} 
                            className="p-1 min-[340px]:p-2 -ml-1 min-[340px]:-ml-2 hover:bg-gray-50 rounded-full transition-colors shrink-0"
                        >
                            <ChevronLeft size={22} className="text-[#181725]" />
                        </button>
                        <div className="min-w-0 flex-1 px-1">
                            <h1 className="text-[18px] min-[340px]:text-[20px] font-bold text-[#181725] leading-tight text-center">
                                All Vendors
                            </h1>
                        </div>
                        <div className="w-10 min-[340px]:w-12" /> {/* Spacer for centering */}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white px-[var(--container-padding)] py-4 border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Find a vendor or category..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-[14px] outline-none focus:ring-1 focus:ring-[#299e60] focus:bg-white transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Vendor Grid */}
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-6 pb-24">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {allVendors.map((vendor) => (
                        <Link
                            key={vendor.id}
                            href={`/vendor/${vendor.id}`}
                            className="flex items-start gap-4 bg-white rounded-3xl p-5 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200 transition-all group relative overflow-hidden"
                        >
                            {/* Logo */}
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center p-3 shrink-0 border border-gray-100 relative z-10">
                                <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 relative z-10">
                                <h3 className="text-[15px] md:text-[17px] font-bold text-[#181725] line-clamp-1">{vendor.name}</h3>
                                <p className="text-[12px] text-gray-400 font-medium mt-1 line-clamp-1">
                                    {vendor.categories.join(', ')}
                                </p>

                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                                        <Star size={11} fill="currentColor" />
                                        <span className="text-[11px] font-bold">{vendor.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                        <Clock size={11} />
                                        {vendor.deliveryTime}
                                    </div>
                                    <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                        <Package size={11} />
                                        ₹{vendor.minOrderValue}+
                                    </div>
                                    {vendor.creditEnabled && (
                                        <div className="flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold text-[11px]">
                                            <CreditCard size={11} />
                                            Credit
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
