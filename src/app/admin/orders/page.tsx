'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ORDERS_DATA = [
    { id: '#09998', customerName: 'Sumit More', total: 'Rs. 1,653 /-', date: '24 Apr 2025', status: 'Delivered' },
    { id: '#09999', customerName: 'Pooja Jha', total: 'Rs. 297 /-', date: '24 Apr 2025', status: 'Delivered' },
    { id: '#10000', customerName: 'KAJAL23', total: 'Rs. 653 /-', date: '24 Apr 2025', status: 'Delivered' },
];

export default function OrdersPage() {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredOrders = ORDERS_DATA.filter(order =>
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Orders</h1>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70">Whole data about your Order by Customers</p>
                </div>

                {/* Search Bar */}
                <div className="relative group w-full max-w-[210px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                    <input
                        type="text"
                        placeholder="search Order ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-[40px] w-full bg-white border border-[#DCDCDC] rounded-[10px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                    />
                </div>
            </div>

            {/* Orders Table Container */}
            <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm max-w-[1360px]">
                <h3 className="text-[18px] font-bold text-[#000000] mb-8">Recent Activity</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-[#EFEFEF] h-[52px]">
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] first:rounded-l-[10px]">Order ID</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Customer Name</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Total Rs.</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Date</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Status</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] last:rounded-r-[10px]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order, i) => (
                                    <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="py-5 px-6 text-center font-bold text-[14px] text-[#181725]">{order.id}</td>
                                        <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{order.customerName}</td>
                                        <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{order.total}</td>
                                        <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{order.date}</td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "inline-flex items-center justify-center rounded-[8px] text-[14px] font-semibold bg-[#EEF8F1] text-[#299E60] px-7 py-2"
                                                )}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <Link href={`/admin/orders/${order.id.replace('#', '')}`} className="bg-[#299E60] hover:bg-[#238b54] text-white text-[13px] font-bold h-[32px] px-6 rounded-[6px] transition-colors cursor-pointer flex items-center justify-center">
                                                    View Details
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-[#AEAEAE] font-medium">
                                        No orders found matching "{searchQuery}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* View All Button */}
                <div className="mt-12 flex justify-center">
                    <button className="flex items-center justify-center gap-2 h-[45px] w-[180px] border border-[#299E60]/40 rounded-[8px] text-[15px] font-bold text-[#299E60] hover:bg-[#EEF8F1] transition-all cursor-pointer">
                        <span>View all</span>
                        <ChevronRight size={18} className="text-[#299E60]" />
                    </button>
                </div>
            </div>
        </div>
    );
}
