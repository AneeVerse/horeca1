'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Clock, ChevronRight, ListOrdered, ChevronLeft } from 'lucide-react';
import { MOCK_ORDER_LISTS } from '@/lib/mockData';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';

export default function OrderListsPage() {
    const router = useRouter();
    const orderLists = MOCK_ORDER_LISTS;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-3 min-[340px]:py-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1 min-[340px]:gap-2">
                            <button 
                                onClick={() => router.back()} 
                                className="p-1 min-[340px]:p-2 -ml-1 min-[340px]:-ml-2 hover:bg-gray-50 rounded-full transition-colors shrink-0"
                            >
                                <ChevronLeft size={22} className="text-[#181725]" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-[18px] min-[340px]:text-[20px] md:text-[24px] font-bold text-[#181725] leading-tight">
                                    My Order Lists
                                </h1>
                                <p className="text-[11px] min-[340px]:text-[12px] md:text-[13px] text-gray-400 font-medium mt-0.5 line-clamp-2">
                                    Saved purchase templates for fast repeat ordering
                                </p>
                            </div>
                        </div>
                        <button className="flex items-center justify-center bg-[#299e60] text-white w-10 h-10 min-[340px]:w-12 min-[340px]:h-12 sm:w-auto sm:px-4 sm:py-2.5 rounded-full sm:rounded-xl text-[12px] font-bold shadow-lg shadow-green-200/50 hover:bg-[#22844f] active:scale-[0.98] transition-all shrink-0">
                            <Plus size={20} className="sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline ml-1.5">New List</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Lists */}
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                {orderLists.length > 0 ? (
                    <div className="space-y-3">
                        {orderLists.map((list) => (
                            <Link
                                key={list.id}
                                href={`/order-lists/${list.id}`}
                                className="flex items-center gap-2 min-[340px]:gap-4 bg-white rounded-2xl p-3 min-[340px]:p-4 border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all group"
                            >
                                {/* Vendor Logo */}
                                <div className="w-10 h-10 min-[340px]:w-12 min-[340px]:h-12 bg-gray-50 rounded-xl flex items-center justify-center p-1.5 shrink-0 border border-gray-100">
                                    {list.vendorLogo ? (
                                        <img src={list.vendorLogo} alt={list.vendorName} className="w-full h-full object-contain" />
                                    ) : (
                                        <ListOrdered size={20} className="text-gray-400" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[13px] min-[340px]:text-[14px] font-bold text-[#181725] line-clamp-1">{list.name}</p>
                                    </div>
                                    <p className="text-[10px] min-[340px]:text-[11px] text-[#299e60] font-semibold mt-0.5">
                                        {list.vendorName}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 min-[340px]:gap-3 mt-1">
                                        <span className="text-[10px] min-[340px]:text-[11px] text-gray-400 font-medium">
                                            {list.items.length} items
                                        </span>
                                        {list.lastUsed && (
                                            <span className="flex items-center gap-0.5 text-[10px] min-[340px]:text-[11px] text-gray-400 font-medium">
                                                <Clock size={10} />
                                                <span className="whitespace-nowrap">
                                                    Used {new Date(list.lastUsed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight size={18} className="text-gray-300 shrink-0 group-hover:text-gray-500 transition-colors" />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-[48px] mb-3">📋</p>
                        <p className="text-[16px] font-bold text-gray-700">No order lists yet</p>
                        <p className="text-[13px] text-gray-400 mt-1">Create your first list for fast repeat ordering</p>
                        <button className="mt-4 bg-[#299e60] text-white px-6 py-2.5 rounded-xl text-[13px] font-bold shadow-md shadow-green-200/50 hover:bg-[#22844f] transition-all">
                            Create Order List
                        </button>
                    </div>
                )}
            </div>

            <StickyCartBar />
        </div>
    );
}
