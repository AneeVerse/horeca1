'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
    ShoppingBag, Package, AlertTriangle, Loader2, Eye,
    CheckCircle2, Clock, TrendingUp, CreditCard, ChevronRight,
    Bell, RefreshCw, Wallet, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessAccountSwitcher } from '@/hooks/useBusinessAccountSwitcher';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingOrder {
    id: string;
    orderNumber: string;
    totalAmount: number;
    createdAt: string;
    notes: string | null;
    user: { id: string; fullName: string; businessName: string | null; email: string };
    _count: { items: number };
}

interface RecentOrder {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
    user: { id: string; fullName: string; email: string };
    _count: { items: number };
}

interface DashboardData {
    stats: {
        totalOrders: number;
        totalRevenue: number;
        todaySales: number;
        mtdSales: number;
        pendingPayments: number;
        activeProducts: number;
        lowStockCount: number;
        pendingOrdersCount: number;
        walletBalance: number;
        pendingSettlement: number;
        overdueAmount: number;
        pendingWalletAmount: number;
    };
    ordersByStatus: Record<string, number>;
    pendingOrders: PendingOrder[];
    recentOrders: RecentOrder[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(val: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(val);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

function timeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
}

function isOverSLA(dateStr: string): boolean {
    return Date.now() - new Date(dateStr).getTime() > 2 * 60 * 60 * 1000; // 2 hours
}

const STATUS_COLORS: Record<string, string> = {
    delivered: 'bg-[#EEF8F1] text-[#299E60]',
    confirmed: 'bg-[#EEF8F1] text-[#299E60]',
    processing: 'bg-[#FFF4E5] text-[#976538]',
    pending: 'bg-[#FFF4E5] text-[#976538]',
    shipped: 'bg-[#EFF6FF] text-[#3B82F6]',
    cancelled: 'bg-[#FFF0F0] text-[#E74C3C]',
};

const STATUS_PILL_COLORS: Record<string, string> = {
    pending: 'bg-[#FFF4E5] text-[#976538] border-[#F59E0B]/20',
    confirmed: 'bg-[#EEF8F1] text-[#299E60] border-[#299E60]/20',
    processing: 'bg-[#FFF4E5] text-[#976538] border-[#F59E0B]/20',
    shipped: 'bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]/20',
    delivered: 'bg-[#EEF8F1] text-[#299E60] border-[#299E60]/20',
    cancelled: 'bg-[#FFF0F0] text-[#E74C3C] border-[#E74C3C]/20',
};

// ─── Pending Orders Widget ─────────────────────────────────────────────────────

function PendingOrdersWidget({
    orders,
    onAccept,
}: {
    orders: PendingOrder[];
    onAccept: (orderId: string, orderNumber: string) => Promise<void>;
}) {
    const [accepting, setAccepting] = useState<string | null>(null);

    const handleAccept = async (order: PendingOrder) => {
        setAccepting(order.id);
        try {
            await onAccept(order.id, order.orderNumber);
        } finally {
            setAccepting(null);
        }
    };

    if (orders.length === 0) {
        return (
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#EEF8F1] flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} className="text-[#299E60]" />
                </div>
                <div>
                    <p className="text-[15px] font-bold text-[#181725]">All caught up!</p>
                    <p className="text-[13px] text-[#AEAEAE]">No pending orders at the moment.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[14px] border-2 border-[#F59E0B]/40 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-[#FFFBEB] border-b border-[#F59E0B]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F59E0B] flex items-center justify-center">
                        <Bell size={15} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-bold text-[#181725]">
                            Pending Orders
                            <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F59E0B] text-white text-[11px] font-bold">
                                {orders.length}
                            </span>
                        </h3>
                        <p className="text-[11px] text-[#976538]">Accept or reject each order</p>
                    </div>
                </div>
                <Link
                    href="/vendor/orders?status=pending"
                    className="text-[12px] font-bold text-[#976538] hover:underline flex items-center gap-1"
                >
                    View all <ChevronRight size={14} />
                </Link>
            </div>

            {/* Order rows */}
            <div className="divide-y divide-[#F5F5F5]">
                {orders.map((order) => {
                    const overSLA = isOverSLA(order.createdAt);
                    const isAccepting = accepting === order.id;
                    return (
                        <div key={order.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAFAFA] transition-colors">
                            {/* SLA indicator */}
                            <div className={cn(
                                'w-2 h-2 rounded-full shrink-0',
                                overSLA ? 'bg-[#E74C3C] animate-pulse' : 'bg-[#F59E0B]'
                            )} />

                            {/* Order info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-bold text-[#181725]">{order.orderNumber}</span>
                                    {overSLA && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFF0F0] text-[#E74C3C]">
                                            Overdue
                                        </span>
                                    )}
                                </div>
                                <p className="text-[12px] text-[#7C7C7C] truncate">
                                    {order.user.fullName}
                                    {order.user.businessName ? ` · ${order.user.businessName}` : ''}
                                </p>
                            </div>

                            {/* Stats */}
                            <div className="hidden sm:flex flex-col items-end shrink-0">
                                <span className="text-[13px] font-bold text-[#181725]">{formatINR(Number(order.totalAmount))}</span>
                                <span className="text-[11px] text-[#AEAEAE]">{order._count.items} item{order._count.items !== 1 ? 's' : ''}</span>
                            </div>

                            {/* Time */}
                            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#AEAEAE] shrink-0 w-[64px] justify-end">
                                <Clock size={12} />
                                {timeAgo(order.createdAt)}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleAccept(order)}
                                    disabled={!!accepting}
                                    className="h-8 px-4 rounded-[8px] bg-[#299E60] text-white text-[12px] font-bold hover:bg-[#238a54] transition-all flex items-center gap-1.5 disabled:opacity-60"
                                >
                                    {isAccepting
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : <CheckCircle2 size={13} />}
                                    Accept
                                </button>
                                <Link
                                    href={`/vendor/orders/${order.id}`}
                                    className="h-8 px-3 rounded-[8px] border border-[#EEEEEE] text-[12px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all flex items-center gap-1"
                                >
                                    <Eye size={13} />
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorDashboardPage() {
    const { data: session } = useSession();
    const { currentOutlet } = useBusinessAccountSwitcher();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchDashboard = useCallback((silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        fetch('/api/v1/vendor/dashboard')
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    setData(json.data);
                    setLastRefresh(new Date());
                } else {
                    setError(json.error?.message || 'Failed to load dashboard data');
                }
            })
            .catch(() => setError('Failed to load dashboard data'))
            .finally(() => { if (!silent) setLoading(false); });
    }, []);

    useEffect(() => {
        fetchDashboard();
        // Poll every 30 seconds
        const interval = setInterval(() => fetchDashboard(true), 30000);
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    const handleAcceptOrder = useCallback(async (orderId: string, orderNumber: string) => {
        const res = await fetch(`/api/v1/vendor/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'confirmed' }),
        });
        const json = await res.json();
        if (!json.success) {
            toast.error(json.error?.message || 'Failed to accept order');
            throw new Error(json.error?.message);
        }
        toast.success(`${orderNumber} accepted! Inventory reserved.`);
        // Optimistically remove from pending list and update counters
        setData(prev => {
            if (!prev) return prev;
            const remaining = prev.pendingOrders.filter(o => o.id !== orderId);
            return {
                ...prev,
                pendingOrders: remaining,
                stats: { ...prev.stats, pendingOrdersCount: remaining.length },
                ordersByStatus: {
                    ...prev.ordersByStatus,
                    pending: Math.max(0, (prev.ordersByStatus.pending ?? 0) - 1),
                    confirmed: (prev.ordersByStatus.confirmed ?? 0) + 1,
                },
            };
        });
    }, []);

    const statCards = data ? [
        {
            label: "Today's Sales",
            value: formatINR(Number(data.stats.todaySales)),
            icon: TrendingUp,
            color: 'bg-green-50 text-[#299E60]',
            stripe: '#299E60',
            href: '/vendor/reports',
        },
        {
            label: 'Month Sales',
            value: formatINR(Number(data.stats.mtdSales)),
            icon: ShoppingBag,
            color: 'bg-blue-50 text-[#3B82F6]',
            stripe: '#3B82F6',
            href: '/vendor/reports',
        },
        {
            label: 'Active Products',
            value: data.stats.activeProducts.toLocaleString('en-IN'),
            icon: Package,
            color: 'bg-purple-50 text-[#8B5CF6]',
            stripe: '#8B5CF6',
            href: '/vendor/products',
        },
        {
            label: 'Pending Payments',
            value: formatINR(Number(data.stats.pendingPayments)),
            icon: CreditCard,
            color: 'bg-orange-50 text-[#F59E0B]',
            stripe: '#F59E0B',
            href: '/vendor/orders',
        },
        {
            label: 'Wallet Balance',
            value: formatINR(Number(data.stats.walletBalance)),
            icon: Wallet,
            color: 'bg-[#EEF8F1] text-[#299E60]',
            stripe: '#10B981',
            href: '/vendor/wallet',
        },
        {
            label: 'Pending Settlement',
            value: formatINR(Number(data.stats.pendingSettlement)),
            icon: BookOpen,
            color: 'bg-teal-50 text-teal-600',
            stripe: '#14B8A6',
            href: '/vendor/ledger',
        },
    ] : [];

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[24px] font-bold text-[#181725]">Dashboard</h1>
                    <p className="text-[12px] text-[#AEAEAE]">
                        Welcome back, {session?.user?.name || 'Vendor'}
                        {currentOutlet?.name ? ` — ${currentOutlet.name}` : ''}
                    </p>
                </div>
                <button
                    onClick={() => fetchDashboard()}
                    className="h-9 px-3 rounded-[10px] border border-[#EEEEEE] text-[12px] text-[#AEAEAE] hover:bg-[#F5F5F5] flex items-center gap-1.5 transition-all"
                    title={`Last refreshed: ${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                >
                    <RefreshCw size={13} />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-[#299E60]" size={32} />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <AlertTriangle size={32} className="text-[#E74C3C]" />
                    <p className="text-[14px] text-[#E74C3C] font-medium">{error}</p>
                    <button
                        onClick={() => fetchDashboard()}
                        className="px-6 py-3 bg-[#299E60] text-white rounded-[10px] font-bold hover:bg-[#238a54] transition-colors"
                    >
                        Retry
                    </button>
                </div>
            ) : data && (
                <>
                    {/* ── Pending Orders (most prominent widget) ───── */}
                    <PendingOrdersWidget
                        orders={data.pendingOrders}
                        onAccept={handleAcceptOrder}
                    />

                    {/* ── Stat Cards ────────────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        {statCards.map((stat, idx) => (
                            <Link
                                key={idx}
                                href={stat.href}
                                className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm hover:shadow-md transition-all overflow-hidden group"
                            >
                                <div className="h-[3px]" style={{ backgroundColor: stat.stripe }} />
                                <div className="p-5 flex flex-col gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stat.color)}>
                                            <stat.icon size={18} />
                                        </div>
                                        <span className="text-[13px] font-bold text-[#7C7C7C] group-hover:text-[#181725] transition-colors">
                                            {stat.label}
                                        </span>
                                    </div>
                                    <p className="text-[22px] font-[800] text-[#181725] leading-none">{stat.value}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Overdue credit alert */}
                    {Number(data.stats.overdueAmount) > 0 && (
                        <Link
                            href="/vendor/collections"
                            className="flex items-center gap-3 p-4 bg-[#FFF0F0] border border-[#E74C3C]/30 rounded-[12px] hover:bg-[#FFE5E5] transition-colors"
                        >
                            <CreditCard size={18} className="text-[#E74C3C] shrink-0" />
                            <p className="text-[13px] font-bold text-[#E74C3C]">
                                {formatINR(Number(data.stats.overdueAmount))} in overdue credit payments
                            </p>
                            <ChevronRight size={16} className="text-[#E74C3C] ml-auto" />
                        </Link>
                    )}

                    {/* Low stock alert */}
                    {data.stats.lowStockCount > 0 && (
                        <Link
                            href="/vendor/inventory"
                            className="flex items-center gap-3 p-4 bg-[#FFF4E5] border border-[#F59E0B]/30 rounded-[12px] hover:bg-[#FFF0D0] transition-colors"
                        >
                            <AlertTriangle size={18} className="text-[#F59E0B] shrink-0" />
                            <p className="text-[13px] font-bold text-[#976538]">
                                {data.stats.lowStockCount} product{data.stats.lowStockCount !== 1 ? 's' : ''} are low on stock
                            </p>
                            <ChevronRight size={16} className="text-[#F59E0B] ml-auto" />
                        </Link>
                    )}

                    {/* ── Orders by Status ──────────────────────────── */}
                    {Object.keys(data.ordersByStatus).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(data.ordersByStatus).map(([status, count]) => (
                                <Link
                                    key={status}
                                    href={`/vendor/orders?status=${status}`}
                                    className={cn(
                                        'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold border capitalize hover:opacity-80 transition-opacity',
                                        STATUS_PILL_COLORS[status] || 'bg-gray-50 text-gray-600 border-gray-200'
                                    )}
                                >
                                    <span>{status}</span>
                                    <span className="bg-white/70 px-1.5 py-0.5 rounded-full text-[11px] font-extrabold">{count}</span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* ── Recent Orders Table ───────────────────────── */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
                            <h3 className="text-[16px] font-bold text-[#181725]">Recent Orders</h3>
                            <Link href="/vendor/orders" className="text-[#299E60] text-[12px] font-bold hover:underline flex items-center gap-1">
                                View All <ChevronRight size={14} />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-separate border-spacing-0">
                                <thead>
                                    <tr className="bg-[#FAFAFA]">
                                        <th className="px-5 py-3 text-left text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Order</th>
                                        <th className="px-5 py-3 text-left text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Customer</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Items</th>
                                        <th className="px-5 py-3 text-right text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Amount</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Date</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Status</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F5F5F5]">
                                    {data.recentOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-[14px] text-[#AEAEAE]">
                                                No orders yet
                                            </td>
                                        </tr>
                                    ) : data.recentOrders.map((row) => (
                                        <tr key={row.id} className="hover:bg-[#FAFAFA] transition-colors">
                                            <td className="px-5 py-4 text-[13px] font-bold text-[#181725]">{row.orderNumber}</td>
                                            <td className="px-5 py-4 text-[13px] text-[#7C7C7C]">{row.user.fullName}</td>
                                            <td className="px-5 py-4 text-center text-[13px] text-[#AEAEAE]">{row._count.items}</td>
                                            <td className="px-5 py-4 text-right text-[13px] font-bold text-[#181725]">
                                                {formatINR(Number(row.totalAmount))}
                                            </td>
                                            <td className="px-5 py-4 text-center text-[12px] text-[#AEAEAE]">{formatDate(row.createdAt)}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={cn(
                                                    'inline-flex px-3 py-1 rounded-[8px] text-[12px] font-bold capitalize',
                                                    STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-600'
                                                )}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <Link
                                                    href={`/vendor/orders/${row.id}`}
                                                    className="inline-flex items-center gap-1 h-8 px-3 rounded-[8px] bg-[#F1F4F9] text-[#3B82F6] text-[12px] font-bold hover:bg-[#DBEAFE] transition-all"
                                                >
                                                    <Eye size={13} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
