'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
    draft: 'bg-gray-50 text-gray-600',
    delivered: 'bg-[#EEF8F1] text-[#299E60]',
    confirmed: 'bg-blue-50 text-blue-600',
    processing: 'bg-indigo-50 text-indigo-600',
    pending: 'bg-[#FFF4E5] text-[#976538]',
    ready_for_dispatch: 'bg-cyan-50 text-cyan-600',
    shipped: 'bg-purple-50 text-purple-600',
    partially_delivered: 'bg-orange-50 text-orange-600',
    returned: 'bg-rose-50 text-rose-600',
    cancelled: 'bg-[#FFF0F0] text-[#E74C3C]',
};

// Statuses an admin can set directly from the list (draft is customer-side only).
const STATUS_OPTIONS = [
    'pending', 'confirmed', 'processing', 'ready_for_dispatch',
    'shipped', 'partially_delivered', 'delivered', 'returned', 'cancelled',
];

export default function OrdersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Inline status change straight from the list (admin force override on the API).
    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        const prev = orders.find(o => o.id === orderId)?.status;
        if (!prev || prev === newStatus) return;
        setBusyId(orderId);
        setOrders(os => os.map(o => o.id === orderId ? { ...o, status: newStatus } : o)); // optimistic
        try {
            const res = await fetch(`/api/v1/admin/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error?.message || json.message || 'Failed to update status');
            toast.success(`Order set to ${newStatus.replace(/_/g, ' ')}`);
        } catch (e) {
            setOrders(os => os.map(o => o.id === orderId ? { ...o, status: prev } : o)); // revert
            toast.error(e instanceof Error ? e.message : 'Failed to update status');
        } finally {
            setBusyId(null);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            setLoading(true);
            const url = new URL('/api/v1/admin/orders', window.location.origin);
            url.searchParams.set('limit', '50');
            if (searchQuery.trim()) url.searchParams.set('q', searchQuery.trim());
            fetch(url.toString())
                .then(res => res.json())
                .then(json => { if (!cancelled && json.success) setOrders(json.data.orders); })
                .catch(console.error)
                .finally(() => { if (!cancelled) setLoading(false); });
        }, searchQuery ? 300 : 0);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [searchQuery]);

    const filteredOrders = orders;

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
                <h3 className="text-[18px] font-bold text-[#000000] mb-8">All Orders</h3>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#299E60]" size={32} />
                    </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
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
                                                <select
                                                    value={order.status}
                                                    disabled={busyId === order.id}
                                                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                    title="Change status"
                                                    className={cn(
                                                        "cursor-pointer rounded-[8px] text-[13px] font-semibold capitalize px-4 py-2 outline-none border border-transparent hover:border-black/10 focus:border-[#299E60]/40 disabled:opacity-50 transition-colors",
                                                        STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-600'
                                                    )}
                                                >
                                                    {/* keep a non-settable status (e.g. draft) visible for that row */}
                                                    {!STATUS_OPTIONS.includes(order.status) && (
                                                        <option value={order.status} disabled className="bg-white text-gray-800 capitalize">{order.status.replace(/_/g, ' ')}</option>
                                                    )}
                                                    {STATUS_OPTIONS.map((s) => (
                                                        <option key={s} value={s} className="bg-white text-gray-800 capitalize">{s.replace(/_/g, ' ')}</option>
                                                    ))}
                                                </select>
                                                {busyId === order.id && <Loader2 size={14} className="animate-spin text-gray-400 ml-1 self-center" />}
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
