'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import { MOCK_VENDORS } from '@/lib/mockData';

export function ContinueOrdering() {
    const [isMounted, setIsMounted] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    }, []);

    // Show first 3 vendors as "recently ordered from" (mock)
    const recentVendors = MOCK_VENDORS.slice(0, 3);

    if (!isMounted || !isLoggedIn) return null;

    return (
        <section className="w-full py-4 bg-white">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[15px] md:text-[16px] font-bold text-[#181725]">Continue Ordering</h2>
                    <Link href="/orders" className="text-[12px] font-semibold text-[#299e60] hover:opacity-80 cursor-pointer">View all</Link>
                </div>

                <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-[var(--container-padding)] px-[var(--container-padding)] pb-1">
                    {recentVendors.map((vendor) => (
                        <Link
                            key={vendor.id}
                            href={`/vendor/${vendor.id}`}
                            className="flex items-center gap-3 min-w-[260px] md:min-w-[300px] bg-gray-50/80 rounded-2xl p-3 border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all group shrink-0"
                        >
                            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center p-1.5 border border-gray-100 shrink-0">
                                <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-[#181725] line-clamp-1">{vendor.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                                    <Clock size={10} />
                                    {vendor.deliverySchedule}
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 shrink-0" />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
