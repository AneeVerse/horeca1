'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VendorOrder {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
    user: { id: string; fullName: string; email: string; businessName?: string };
    _count?: { items: number };
}

const STATUS_STYLE: Record<string, string> = {
    delivered: 'bg-[#EEF8F1] text-[#299E60]',
    confirmed: 'bg-[#EEF8F1] text-[#299E60]',
    processing: 'bg-[#FFF4E5] text-[#976538]',
    pending: 'bg-[#FFF4E5] text-[#976538]',
    shipped: 'bg-blue-50 text-blue-600',
    cancelled: 'bg-[#FFF0F0] text-[#E74C3C]',
};

const STATUS_TABS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

export default function VendorOrdersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<string>('all');
    const [orders, setOrders] = useState<VendorOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            setLoading(true);
            const url = new URL('/api/v1/vendor/orders', window.location.origin);
            url.searchParams.set('limit', '50');
            if (activeTab !== 'all') url.searchParams.set('status', activeTab);
            if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());
            fetch(url.toString())
                .then(res => res.json())
                .then(json => { if (!cancelled && json.success) setOrders(json.data.orders); })
                .catch(console.error)
                .finally(() => { if (!cancelled) setLoading(false); });
        }, searchQuery ? 300 : 0);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [searchQuery, activeTab]);

    const filteredOrders = orders;

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Orders</h1>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70">Manage orders from your customers</p>
                </div>
                <div className="relative w-full max-w-[240px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-[44px] w-full bg-white border border-[#EEEEEE] rounded-[12px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                    />
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'px-4 py-2 rounded-[10px] text-[13px] font-bold capitalize transition-all',
                            activeTab === tab
                                ? 'bg-[#299E60] text-white shadow-md shadow-[#299E60]/20'
                                : 'bg-white text-[#7C7C7C] border border-[#EEEEEE] hover:border-[#299E60]/30'
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#299E60]" size={32} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                    <th className="px-6 py-4 text-left text-[12px] font-bold text-[#AEAEAE] uppercase">Order ID</th>
                                    <th className="px-6 py-4 text-left text-[12px] font-bold text-[#AEAEAE] uppercase">Customer</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Total</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Date</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Payment</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filteredOrders.length > 0 ? (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-[#FAFAFA] transition-colors">
                                            <td className="px-6 py-4 text-[14px] font-bold text-[#181725]">{order.orderNumber}</td>
                                            <td className="px-6 py-4">
                                                <p className="text-[14px] font-bold text-[#181725]">{order.user.fullName}</p>
                                                {order.user.businessName && (
                                                    <p className="text-[12px] text-[#7C7C7C]">{order.user.businessName}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center text-[14px] font-bold text-[#181725]">
                                                ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 text-center text-[13px] text-[#7C7C7C] font-medium">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    'text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase',
                                                    order.paymentStatus === 'paid' ? 'bg-[#EEF8F1] text-[#299E60]' : 'bg-[#FFF4E5] text-[#976538]'
                                                )}>
                                                    {order.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    'inline-flex items-center rounded-[8px] text-[12px] font-bold capitalize px-3 py-1.5',
                                                    STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-600'
                                                )}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Link
                                                    href={`/vendor/orders/${order.id}`}
                                                    className="inline-flex items-center gap-1.5 bg-[#299E60] hover:bg-[#238a54] text-white text-[12px] font-bold px-4 py-2 rounded-[8px] transition-colors"
                                                >
                                                    <Eye size={14} />
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center text-[#AEAEAE] font-medium">
                                            {searchQuery ? `No orders matching "${searchQuery}"` : 'No orders yet'}
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
