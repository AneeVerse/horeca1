'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
    ShoppingBag,
    Package,
    Wallet,
    AlertTriangle,
    Loader2,
    Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Format Indian currency: 115000 → "₹1,15,000"
function formatINR(val: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val);
}

// Format date as dd MMM yyyy
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

interface VendorDashboardData {
    stats: {
        totalOrders: number;
        totalRevenue: number;
        activeProducts: number;
        lowStockCount: number;
    };
    ordersByStatus: Record<string, number>;
    recentOrders: {
        id: string;
        orderNumber: string;
        status: string;
        totalAmount: number;
        createdAt: string;
        user: { id: string; fullName: string; email: string };
    }[];
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

export default function VendorDashboardPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<VendorDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = () => {
        setLoading(true);
        setError(null);
        fetch('/api/v1/vendor/dashboard')
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    setData(json.data);
                } else {
                    setError(json.error || 'Failed to load dashboard data');
                }
            })
            .catch(() => setError('Failed to load dashboard data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const statCards = data ? [
        {
            label: 'Total Orders',
            value: data.stats.totalOrders.toLocaleString('en-IN'),
            icon: ShoppingBag,
            color: 'bg-blue-50 text-[#3B82F6]',
            stripe: '#3B82F6',
        },
        {
            label: 'Revenue',
            value: formatINR(Number(data.stats.totalRevenue)),
            icon: Wallet,
            color: 'bg-green-50 text-[#299E60]',
            stripe: '#299E60',
        },
        {
            label: 'Active Products',
            value: data.stats.activeProducts.toLocaleString('en-IN'),
            icon: Package,
            color: 'bg-purple-50 text-[#8B5CF6]',
            stripe: '#8B5CF6',
        },
        {
            label: 'Low Stock',
            value: data.stats.lowStockCount.toLocaleString('en-IN'),
            icon: AlertTriangle,
            color: 'bg-orange-50 text-[#F59E0B]',
            stripe: '#F59E0B',
        },
    ] : [];

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div>
                <h1 className="text-[26px] font-medium text-[#000000]">Dashboard</h1>
                <p className="text-[#000000] text-[12px] font-light">
                    Welcome back, {session?.user?.name || 'Vendor'}
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-[#299E60]" size={32} />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <p className="text-[14px] text-[#E74C3C] font-medium">{error}</p>
                    <button
                        onClick={fetchDashboard}
                        className="px-6 py-3 bg-[#299E60] text-white rounded-[10px] font-bold hover:bg-[#238a54] transition-colors"
                    >
                        Retry
                    </button>
                </div>
            ) : (
            <>
                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {statCards.map((stat, idx) => (
                        <div
                            key={idx}
                            className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm hover:shadow-md transition-all cursor-default overflow-hidden"
                        >
                            <div className="h-[3px]" style={{ backgroundColor: stat.stripe }} />
                            <div className="p-6 flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", stat.color)}>
                                        <stat.icon size={22} />
                                    </div>
                                    <span className="text-[15px] font-bold text-[#4B4B4B]">{stat.label}</span>
                                </div>
                                <h4 className="text-[28px] font-[800] text-[#181725] leading-none">{stat.value}</h4>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Orders by Status */}
                {data?.ordersByStatus && Object.keys(data.ordersByStatus).length > 0 && (
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(data.ordersByStatus).map(([status, count]) => (
                            <div
                                key={status}
                                className={cn(
                                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold border capitalize",
                                    STATUS_PILL_COLORS[status] || 'bg-gray-50 text-gray-600 border-gray-200'
                                )}
                            >
                                <span>{status}</span>
                                <span className="bg-white/60 px-2 py-0.5 rounded-full text-[12px] font-extrabold">{count}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Recent Orders Table */}
                <div className="bg-white p-6 rounded-[14px] border border-[#EEEEEE] shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[18px] font-bold text-[#000000]">Recent Orders</h3>
                        <Link href="/vendor/orders" className="text-[#299E60] text-[12px] font-bold hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-[#EFEFEF] h-[47px]">
                                    <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B] first:rounded-l-[10px]">Order ID</th>
                                    <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B]">Customer</th>
                                    <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B]">Total</th>
                                    <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B]">Date</th>
                                    <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B]">Status</th>
                                    <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B] last:rounded-r-[10px]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EEEEEE]">
                                {(data?.recentOrders || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-[14px] text-[#7C7C7C]">
                                            No orders yet
                                        </td>
                                    </tr>
                                ) : (
                                    data?.recentOrders.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-5 px-6 text-center font-bold text-[14px] text-[#181725]">
                                                {row.orderNumber}
                                            </td>
                                            <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-medium">
                                                {row.user.fullName}
                                            </td>
                                            <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-medium">
                                                {formatINR(Number(row.totalAmount))}
                                            </td>
                                            <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-medium">
                                                {formatDate(row.createdAt)}
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex justify-center">
                                                    <span className={cn(
                                                        "inline-flex items-center justify-center rounded-[10px] text-[14px] font-medium capitalize px-6 py-1.5",
                                                        STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-600'
                                                    )}>
                                                        {row.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex justify-center">
                                                    <Link
                                                        href={`/vendor/orders/${row.id}`}
                                                        className="bg-[#299E60] hover:bg-[#238b54] text-white text-[12px] font-bold h-[28px] px-4 rounded-[5px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                                    >
                                                        <Eye size={14} />
                                                        View
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
            )}
        </div>
    );
}
