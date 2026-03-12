'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Clock, ChevronRight, ListOrdered } from 'lucide-react';
import { MOCK_ORDER_LISTS } from '@/lib/mockData';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';

export default function OrderListsPage() {
    const orderLists = MOCK_ORDER_LISTS;

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[20px] md:text-[24px] font-bold text-[#181725]">My Order Lists</h1>
                            <p className="text-[12px] md:text-[13px] text-gray-400 font-medium mt-0.5">
                                Saved purchase templates for fast repeat ordering
                            </p>
                        </div>
                        <button className="flex items-center gap-1.5 bg-[#299e60] text-white px-4 py-2.5 rounded-xl text-[12px] font-bold shadow-md shadow-green-200/50 hover:bg-[#22844f] active:scale-[0.98] transition-all">
                            <Plus size={16} />
                            <span className="hidden sm:inline">New List</span>
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
                                className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all group"
                            >
                                {/* Vendor Logo */}
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center p-2 shrink-0 border border-gray-100">
                                    {list.vendorLogo ? (
                                        <img src={list.vendorLogo} alt={list.vendorName} className="w-full h-full object-contain" />
                                    ) : (
                                        <ListOrdered size={20} className="text-gray-400" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[14px] font-bold text-[#181725] line-clamp-1">{list.name}</p>
                                    </div>
                                    <p className="text-[11px] text-[#299e60] font-semibold mt-0.5">
                                        {list.vendorName}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[11px] text-gray-400 font-medium">
                                            {list.items.length} items
                                        </span>
                                        {list.lastUsed && (
                                            <span className="flex items-center gap-0.5 text-[11px] text-gray-400 font-medium">
                                                <Clock size={10} />
                                                Last used {new Date(list.lastUsed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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
