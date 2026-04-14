'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminOrder {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
    vendor: { id: string; businessName: string };
    user: { id: string; fullName: string; email: string };
    items: { id: string; productName: string; quantity: number; unitPrice: number; totalPrice: number }[];
}

const STATUS_STYLE: Record<string, string> = {
    delivered: 'bg-[#EEF8F1] text-[#299E60]',
    confirmed: 'bg-[#EEF8F1] text-[#299E60]',
    processing: 'bg-[#FFF4E5] text-[#976538]',
    pending: 'bg-[#FFF4E5] text-[#976538]',
    shipped: 'bg-blue-50 text-blue-600',
    cancelled: 'bg-[#FFF0F0] text-[#E74C3C]',
};

export default function OrdersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/v1/admin/orders?limit=50')
            .then(res => res.json())
            .then(json => { if (json.success) setOrders(json.data.orders); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filteredOrders = orders.filter(order =>
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.vendor.businessName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 md:space-y-8 pb-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-[22px] md:text-[28px] font-bold text-[#000000] leading-none mb-1">Orders</h1>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70">Whole data about your Order by Customers</p>
                </div>

                {/* Search Bar */}
                <div className="relative group w-full md:max-w-[210px]">
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
            <div className="bg-white p-4 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm w-full">
                <h3 className="text-[16px] md:text-[18px] font-bold text-[#000000] mb-4 md:mb-8">All Orders</h3>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#299E60]" size={32} />
                    </div>
                ) : (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                    <table className="w-full border-separate border-spacing-0 min-w-[700px]">
                        <thead>
                            <tr className="bg-[#EFEFEF] h-[52px]">
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] first:rounded-l-[10px]">Order ID</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Customer</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Vendor</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Total</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Date</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Status</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] last:rounded-r-[10px]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="py-5 px-6 text-center font-bold text-[14px] text-[#181725]">{order.orderNumber}</td>
                                        <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{order.user.fullName}</td>
                                        <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{order.vendor.businessName}</td>
                                        <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">₹ {Number(order.totalAmount).toLocaleString('en-IN')}</td>
                                        <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "inline-flex items-center justify-center rounded-[8px] text-[14px] font-semibold capitalize px-7 py-2",
                                                    STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-600'
                                                )}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <Link href={`/admin/orders/${order.id}`} className="bg-[#299E60] hover:bg-[#238b54] text-white text-[13px] font-bold h-[32px] px-6 rounded-[6px] transition-colors cursor-pointer flex items-center justify-center">
                                                    View Details
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-[#AEAEAE] font-medium">
                                        {searchQuery ? `No orders found matching "${searchQuery}"` : 'No orders yet'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
        </div>
    );
}
