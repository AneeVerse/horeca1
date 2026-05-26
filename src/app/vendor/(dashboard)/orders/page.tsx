'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2, Eye, CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendorOrder {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
    user: { fullName: string; email: string; businessName?: string };
    _count?: { items: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
    delivered: 'bg-[#EEF8F1] text-[#299E60]',
    confirmed: 'bg-[#EEF8F1] text-[#299E60]',
    processing: 'bg-[#FFF4E5] text-[#976538]',
    pending: 'bg-[#FFF4E5] text-[#976538]',
    shipped: 'bg-blue-50 text-blue-600',
    cancelled: 'bg-[#FFF0F0] text-[#E74C3C]',
};

const PAYMENT_STYLE: Record<string, string> = {
    paid: 'bg-[#EEF8F1] text-[#299E60]',
    unpaid: 'bg-[#FFF4E5] text-[#976538]',
    partial: 'bg-blue-50 text-blue-600',
    refunded: 'bg-[#F3F4F6] text-[#6B7280]',
};

const STATUS_TABS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
const PAGE_SIZE = 20;

function isOverSLA(dateStr: string): boolean {
    return Date.now() - new Date(dateStr).getTime() > 2 * 60 * 60 * 1000;
}

function formatINR(v: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorOrdersPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Read initial status from URL (e.g., ?status=pending from dashboard)
    const initialStatus = searchParams.get('status') || 'all';

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<string>(initialStatus);
    const [orders, setOrders] = useState<VendorOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [accepting, setAccepting] = useState<string | null>(null);

    // Cursors stack for "back" pagination
    const [cursorStack, setCursorStack] = useState<string[]>([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchOrders = useCallback((opts: { tab: string; q: string; cur?: string | null; silent?: boolean }) => {
        if (!opts.silent) setLoading(true);
        const url = new URL('/api/v1/vendor/orders', window.location.origin);
        url.searchParams.set('limit', String(PAGE_SIZE));
        if (opts.tab !== 'all') url.searchParams.set('status', opts.tab);
        if (opts.q.trim()) url.searchParams.set('search', opts.q.trim());
        if (opts.cur) url.searchParams.set('cursor', opts.cur);

        fetch(url.toString())
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    setOrders(json.data.orders);
                    setCursor(json.data.nextCursor);
                    setHasMore(json.data.hasMore);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Re-fetch when tab changes (immediate)
    useEffect(() => {
        setCursorStack([]);
        fetchOrders({ tab: activeTab, q: searchQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Debounce search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setCursorStack([]);
            fetchOrders({ tab: activeTab, q: searchQuery });
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSearchQuery('');
        // Sync URL
        const params = new URLSearchParams(searchParams.toString());
        if (tab === 'all') params.delete('status');
        else params.set('status', tab);
        router.replace(`/vendor/orders?${params.toString()}`, { scroll: false });
    };

    const handleNextPage = () => {
        if (!cursor) return;
        setCursorStack(prev => [...prev, orders[0]?.id ?? '']);
        fetchOrders({ tab: activeTab, q: searchQuery, cur: cursor });
    };

    const handlePrevPage = () => {
        const stack = [...cursorStack];
        stack.pop();
        setCursorStack(stack);
        fetchOrders({ tab: activeTab, q: searchQuery, cur: stack[stack.length - 1] ?? null });
    };

    const handleAccept = async (order: VendorOrder) => {
        setAccepting(order.id);
        try {
            const res = await fetch(`/api/v1/vendor/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'confirmed' }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to accept');
            toast.success(`${order.orderNumber} accepted!`);
            setOrders(prev => prev.map(o =>
                o.id === order.id ? { ...o, status: 'confirmed' } : o
            ));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Accept failed');
        } finally {
            setAccepting(null);
        }
    };

    const isFirstPage = cursorStack.length === 0;

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[24px] font-bold text-[#181725]">Orders</h1>
                    <p className="text-[12px] text-[#AEAEAE]">Manage and fulfil customer orders</p>
                </div>
                <div className="relative w-full max-w-[260px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={15} />
                    <input
                        type="text"
                        placeholder="Search by order number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-[40px] w-full bg-white border border-[#EEEEEE] rounded-[10px] pl-10 pr-4 text-[13px] outline-none placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 shadow-sm"
                    />
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={cn(
                            'px-4 py-2 rounded-[10px] text-[13px] font-bold capitalize transition-all',
                            activeTab === tab
                                ? 'bg-[#299E60] text-white shadow-sm shadow-[#299E60]/30'
                                : 'bg-white text-[#7C7C7C] border border-[#EEEEEE] hover:border-[#299E60]/30'
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#299E60]" size={28} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                    <th className="px-5 py-3 text-left text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Order</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Customer</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Items</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Amount</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Date</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Payment</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Status</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-[14px] text-[#AEAEAE]">
                                            {searchQuery ? `No orders matching "${searchQuery}"` : `No ${activeTab === 'all' ? '' : activeTab + ' '}orders`}
                                        </td>
                                    </tr>
                                ) : orders.map((order) => {
                                    const overSLA = order.status === 'pending' && isOverSLA(order.createdAt);
                                    const isAccepting = accepting === order.id;
                                    return (
                                        <tr
                                            key={order.id}
                                            className={cn(
                                                'hover:bg-[#FAFAFA] transition-colors',
                                                overSLA && 'bg-[#FFF9F0]'
                                            )}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    {overSLA && (
                                                        <AlertTriangle size={13} className="text-[#E74C3C] shrink-0" />
                                                    )}
                                                    <Link
                                                        href={`/vendor/orders/${order.id}`}
                                                        className="text-[13px] font-bold text-[#181725] hover:text-[#299E60] transition-colors"
                                                    >
                                                        {order.orderNumber}
                                                    </Link>
                                                </div>
                                                {overSLA && (
                                                    <p className="text-[10px] text-[#E74C3C] font-bold mt-0.5">Overdue — needs action</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-[13px] font-bold text-[#181725]">{order.user.fullName}</p>
                                                {order.user.businessName && (
                                                    <p className="text-[11px] text-[#AEAEAE]">{order.user.businessName}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-center text-[12px] text-[#AEAEAE] font-medium">
                                                {order._count?.items ?? '—'}
                                            </td>
                                            <td className="px-5 py-4 text-right text-[13px] font-bold text-[#181725]">
                                                {formatINR(Number(order.totalAmount))}
                                            </td>
                                            <td className="px-5 py-4 text-center text-[12px] text-[#AEAEAE]">
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={cn(
                                                    'text-[11px] font-bold px-2.5 py-1 rounded-[6px] uppercase',
                                                    PAYMENT_STYLE[order.paymentStatus] || 'bg-gray-100 text-gray-500'
                                                )}>
                                                    {order.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={cn(
                                                    'inline-flex px-3 py-1 rounded-[8px] text-[12px] font-bold capitalize',
                                                    STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-600'
                                                )}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {order.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleAccept(order)}
                                                            disabled={!!accepting}
                                                            className="h-8 px-3 rounded-[8px] bg-[#299E60] text-white text-[12px] font-bold hover:bg-[#238a54] transition-all flex items-center gap-1 disabled:opacity-60"
                                                        >
                                                            {isAccepting
                                                                ? <Loader2 size={12} className="animate-spin" />
                                                                : <CheckCircle2 size={12} />}
                                                            Accept
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={`/vendor/orders/${order.id}`}
                                                        className="h-8 px-3 rounded-[8px] border border-[#EEEEEE] text-[12px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all flex items-center gap-1"
                                                    >
                                                        <Eye size={13} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && (orders.length > 0 || !isFirstPage) && (
                    <div className="px-5 py-3 border-t border-[#F5F5F5] flex items-center justify-between">
                        <p className="text-[12px] text-[#AEAEAE]">
                            Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={isFirstPage}
                                className="h-8 w-8 rounded-[8px] border border-[#EEEEEE] flex items-center justify-center text-[#7C7C7C] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <button
                                onClick={handleNextPage}
                                disabled={!hasMore}
                                className="h-8 w-8 rounded-[8px] border border-[#EEEEEE] flex items-center justify-center text-[#7C7C7C] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
