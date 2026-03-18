'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ClipboardList, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { MOCK_VENDORS, MOCK_ORDER_LISTS } from '@/lib/mockData';

export function ContinueOrdering() {
    const [isMounted, setIsMounted] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeOrderLists, setActiveOrderLists] = useState<any[]>([]);

    useEffect(() => {
        setIsMounted(true);
        setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
        
        const loadAndSync = () => {
            const savedLists = localStorage.getItem('horeca_order_lists_all');
            if (savedLists) {
                try {
                    const parsed = JSON.parse(savedLists);
                    // Sync: If session has fewer lists than our current defaults, merge the missing ones
                    if (parsed.length < MOCK_ORDER_LISTS.length) {
                        const merged = [...parsed];
                        MOCK_ORDER_LISTS.forEach(mockList => {
                            if (!merged.find(l => l.id === mockList.id)) {
                                merged.push(mockList);
                            }
                        });
                        setActiveOrderLists(merged);
                        localStorage.setItem('horeca_order_lists_all', JSON.stringify(merged));
                    } else {
                        setActiveOrderLists(parsed);
                    }
                } catch (e) {
                    setActiveOrderLists(MOCK_ORDER_LISTS);
                }
            } else {
                setActiveOrderLists(MOCK_ORDER_LISTS);
                localStorage.setItem('horeca_order_lists_all', JSON.stringify(MOCK_ORDER_LISTS));
            }
        };

        loadAndSync();

        // Listen for storage changes from other tabs/pages
        window.addEventListener('storage', loadAndSync);
        // Refresh when tab gains focus
        window.addEventListener('focus', loadAndSync);

        return () => {
            window.removeEventListener('storage', loadAndSync);
            window.removeEventListener('focus', loadAndSync);
        };
    }, []);

    // Show first 7 vendors as "recently ordered from" (mock)
    const recentVendors = MOCK_VENDORS.slice(0, 7);

    if (!isMounted || !isLoggedIn) return null;

    return (
        <section className="w-full py-4 bg-white">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-[16px] md:text-[20px] lg:text-[22px] font-bold text-[#181725]">Continue Ordering</h2>
                    <Link href="/order-lists" className="text-[13px] md:text-[15px] font-semibold text-[#53B175] hover:opacity-80 transition-opacity cursor-pointer">View all</Link>
                </div>

                <div className="flex flex-nowrap gap-3 md:gap-4 overflow-x-auto no-scrollbar -mx-[var(--container-padding)] px-[var(--container-padding)] pb-3">
                    {activeOrderLists
                        .filter(list => !!list.lastUsed)
                        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
                        .map((vendorList, idx) => {
                            // Find the primary vendor for general metadata fallback
                            const vendor = MOCK_VENDORS.find(v => v.id === vendorList.vendorId) || MOCK_VENDORS[0];
                            const targetUrl = `/order-lists/${vendorList.id}`;
                        // Get unique vendor IDs first, then resolve logos for reliability
                        const vendorIds = vendorList 
                            ? [...new Set(vendorList.items.map((item: any) => item.product?.vendorId || item.vendorId).filter(Boolean))]
                            : [vendor.id];
                        
                        const listLogos = vendorIds.map(vid => {
                            const v = MOCK_VENDORS.find(v => v.id === vid);
                            return v ? v.logo : null;
                        }).filter(Boolean);

                        const listTitle = listLogos.length > 1 
                            ? `${vendor.name} +${listLogos.length - 1} more` 
                            : vendor.name;

                        return (
                            <Link
                                key={vendor.id}
                                href={targetUrl}
                                className="flex items-center gap-3 md:gap-4 min-w-[260px] md:min-w-[320px] bg-white rounded-2xl p-3 md:p-4 border border-gray-100 hover:shadow-xl hover:shadow-gray-100/30 hover:border-[#53B175]/30 transition-all group shrink-0"
                            >
                                {/* logo handling: single or stacked grid matching OrderListsPage */}
                                <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 relative flex items-center justify-center">
                                    {listLogos.length > 1 ? (
                                        <div className="relative w-full h-full">
                                            {listLogos.slice(0, 4).map((logoUrl: any, i) => (
                                                <div 
                                                    key={i} 
                                                    className="absolute rounded-full overflow-hidden aspect-square bg-transparent"
                                                    style={{ 
                                                        width: '60%',
                                                        height: '60%',
                                                        left: (i === 1 || i === 3) ? '40%' : '0%',
                                                        top: (i === 2 || i === 3) ? '40%' : '0%',
                                                        zIndex: 4 - i 
                                                    }}
                                                >
                                                    <img src={logoUrl} alt="vendor" className="w-full h-full object-cover rounded-full" />
                                                </div>
                                            ))}
                                            {listLogos.length > 4 && (
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#53B175] text-white text-[8px] md:text-[9px] font-bold flex items-center justify-center border border-white z-20">
                                                    +{listLogos.length - 4}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-transparent overflow-hidden shrink-0 transition-transform group-hover:scale-95 duration-300">
                                            <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-cover transition-transform group-hover:scale-125 duration-700" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] md:text-[16px] font-bold text-[#181725] line-clamp-1 transition-colors group-hover:text-[#53B175]">
                                        {listTitle}
                                    </p>
                                    
                                    <div className="flex flex-col mt-0.5">
                                        <div className="flex items-center gap-1.5 text-[10px] md:text-[12px] text-gray-400 font-semibold whitespace-nowrap">
                                            {vendorList ? (
                                                <>
                                                    <span className="flex items-center gap-1">
                                                        {vendorList.items.length} items
                                                    </span>
                                                    <span className="flex items-center gap-1.5 ml-1">
                                                        {vendorList.lastUsed ? (
                                                            <span className="flex items-center gap-0.5 text-[#299e60] font-bold">
                                                                <Clock size={10} className="md:w-3 md:h-3" />
                                                                <span>Used {new Date(vendorList.lastUsed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-0.5 text-gray-400 font-bold px-1.5 py-0.5 bg-gray-50 rounded-full border border-gray-100">
                                                                <AlertCircle size={10} className="md:w-3 md:h-3" />
                                                                <span>Never used</span>
                                                            </span>
                                                        )}
                                                    </span>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <Clock size={10} className="md:w-[13px] md:h-[13px]" />
                                                    <span>{vendor.deliverySchedule || 'Tomorrow 7:00 AM'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-white flex items-center justify-center border border-gray-100 text-gray-300 group-hover:text-[#53B175] group-hover:border-[#53B175]/30 transition-all group-hover:translate-x-1">
                                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
