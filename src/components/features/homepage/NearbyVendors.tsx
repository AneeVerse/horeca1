'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Clock, CreditCard, Package } from 'lucide-react';
import { MOCK_VENDORS } from '@/lib/mockData';

export function NearbyVendors() {
    const vendors = MOCK_VENDORS;

    return (
        <section id="vendors" className="w-full py-4 bg-white">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-[16px] md:text-[18px] lg:text-[22px] font-bold text-[#181725]">Vendors Near You</h2>
                        <p className="text-[11px] md:text-[12px] text-gray-400 font-medium mt-0.5">Delivering to your area</p>
                    </div>
                    <span className="text-[12px] font-semibold text-[#299e60]">See all</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {vendors.map((vendor) => (
                        <Link
                            key={vendor.id}
                            href={`/vendor/${vendor.id}`}
                            className="flex items-start gap-4 bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 hover:border-gray-200 transition-all group"
                        >
                            {/* Logo */}
                            <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                                <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[14px] md:text-[15px] font-bold text-[#181725] line-clamp-1">{vendor.name}</h3>
                                <p className="text-[11px] text-gray-400 font-medium mt-0.5 line-clamp-1">
                                    {vendor.categories.join(', ')}
                                </p>

                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <div className="flex items-center gap-0.5">
                                        <Star size={11} fill="#299e60" className="text-[#299e60]" />
                                        <span className="text-[10px] font-bold text-[#181725]">{vendor.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600">
                                        <Clock size={10} />
                                        {vendor.deliveryTime}
                                    </div>
                                    <div className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-600">
                                        <Package size={10} />
                                        Min ₹{vendor.minOrderValue}
                                    </div>
                                    {vendor.creditEnabled && (
                                        <div className="flex items-center gap-0.5 text-[10px] font-semibold text-purple-600">
                                            <CreditCard size={10} />
                                            Credit
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
