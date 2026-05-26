'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Loader2, TrendingUp, ShoppingBag, IndianRupee, Package,
    Users, AlertTriangle, Download, RefreshCw,
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | '6m';

interface RevenuePoint { key: string; label: string; revenue: number; orders: number }
interface TopProduct { productId: string; name: string; qty: number; revenue: number }
interface TopCustomer { userId: string; fullName: string; businessName?: string | null; orderCount: number; totalSpend: number }
interface DeadStockItem { productId: string; name: string; qty: number }

interface ReportsData {
    period: string;
    totals: { revenue: number; orders: number };
    revenueByPeriod: RevenuePoint[];
    topProducts: TopProduct[];
    statusBreakdown: Record<string, number>;
    customerAnalytics: {
        totalCustomers: number;
        repeatCustomers: number;
        dormantCount: number;
        aov: number;
        topCustomers: TopCustomer[];
    };
    inventoryAnalytics: {
        fillRate: number;
        lowStockCount: number;
        outOfStockCount: number;
        totalSkus: number;
        deadStock: DeadStockItem[];
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}`; }

const STATUS_COLOR: Record<string, string> = {
    pending: '#F59E0B', confirmed: '#3B82F6', processing: '#8B5CF6',
    out_for_delivery: '#F97316', delivered: '#299E60', cancelled: '#EF4444', shipped: '#06B6D4',
};

const PERIOD_LABELS: Record<Period, string> = {
    '7d': '7 Days', '30d': '30 Days', '90d': '90 Days', '6m': '6 Months',
};

// Client-side CSV export from topProducts data
function downloadCsv(data: ReportsData) {
    const rows = [
        ['Product', 'Units Sold', 'Revenue (₹)'],
        ...data.topProducts.map(p => [p.name, String(p.qty), String(p.revenue)]),
        [],
        ['Status Breakdown'],
        ...Object.entries(data.statusBreakdown).map(([s, c]) => [s, String(c)]),
        [],
        ['Top Customers'],
        ['Customer', 'Business', 'Orders', 'Spend (₹)'],
        ...data.customerAnalytics.topCustomers.map(c => [c.fullName, c.businessName ?? '', String(c.orderCount), String(c.totalSpend)]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `horeca1-report-${data.period}.csv`; a.click();
    URL.revokeObjectURL(url);
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorReportsPage() {
    const [data, setData] = useState<ReportsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<Period>('6m');

    const fetchReports = useCallback(async (p: Period) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/vendor/reports?period=${p}`);
            const json = await res.json();
            if (json.success) setData(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReports(period); }, [period, fetchReports]);

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[24px] font-bold text-[#181725]">Reports</h1>
                    <p className="text-[12px] text-[#AEAEAE]">Sales, customer, and inventory analytics</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Period tabs */}
                    <div className="flex items-center bg-[#F5F5F5] rounded-[10px] p-1 gap-0.5">
                        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    'h-[30px] px-3 rounded-[8px] text-[12px] font-bold transition-all',
                                    period === p ? 'bg-white text-[#181725] shadow-sm' : 'text-[#7C7C7C] hover:text-[#181725]'
                                )}
                            >
                                {PERIOD_LABELS[p]}
                            </button>
                        ))}
                    </div>
                    {data && (
                        <button
                            onClick={() => downloadCsv(data)}
                            className="h-[38px] px-3 rounded-[10px] border border-[#EEEEEE] bg-white text-[12px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all flex items-center gap-1.5"
                        >
                            <Download size={13} />
                            Export
                        </button>
                    )}
                    <button
                        onClick={() => fetchReports(period)}
                        disabled={loading}
                        className="h-[38px] w-[38px] rounded-[10px] border border-[#EEEEEE] bg-white flex items-center justify-center text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="flex justify-center items-center h-[40vh]">
                    <Loader2 size={28} className="animate-spin text-[#299E60]" />
                </div>
            ) : !data ? (
                <div className="flex justify-center items-center h-[40vh] text-[#AEAEAE] text-[13px]">
                    Failed to load reports
                </div>
            ) : (
                <div className={cn('space-y-5 transition-opacity', loading && 'opacity-50 pointer-events-none')}>
                    {/* ─── Summary cards ─── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Revenue', value: fmt(data.totals.revenue), icon: IndianRupee, color: '#299E60' },
                            { label: 'Total Orders', value: String(data.totals.orders), icon: ShoppingBag, color: '#3B82F6' },
                            { label: 'Delivered', value: String(data.statusBreakdown['delivered'] ?? 0), icon: TrendingUp, color: '#10B981' },
                            { label: 'Cancelled', value: String(data.statusBreakdown['cancelled'] ?? 0), icon: Package, color: '#EF4444' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">{s.label}</p>
                                    <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center"
                                        style={{ backgroundColor: `${s.color}18`, color: s.color }}>
                                        <s.icon size={16} />
                                    </div>
                                </div>
                                <p className="text-[22px] font-extrabold text-[#181725]">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* ─── Revenue chart ─── */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                        <h2 className="text-[15px] font-bold text-[#181725] mb-5">Revenue Trend</h2>
                        {data.revenueByPeriod.length === 0 ? (
                            <p className="text-[13px] text-[#AEAEAE] text-center py-12">No data for this period</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={230}>
                                <AreaChart data={data.revenueByPeriod} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#299E60" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#299E60" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#AEAEAE' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#AEAEAE' }} axisLine={false} tickLine={false}
                                        tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), 'Revenue']}
                                        contentStyle={{ borderRadius: 10, border: '1px solid #EEEEEE', fontSize: 12 }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#299E60" strokeWidth={2.5}
                                        fill="url(#revGrad)" dot={{ fill: '#299E60', r: 3 }} activeDot={{ r: 5 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* ─── Orders + Status breakdown ─── */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                            <h2 className="text-[15px] font-bold text-[#181725] mb-5">Orders per Period</h2>
                            {data.revenueByPeriod.length === 0 ? (
                                <p className="text-[13px] text-[#AEAEAE] text-center py-10">No data</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={data.revenueByPeriod} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#AEAEAE' }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#AEAEAE' }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EEEEEE', fontSize: 12 }} />
                                        <Bar dataKey="orders" fill="#299E60" radius={[5, 5, 0, 0]} maxBarSize={36} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                            <h2 className="text-[15px] font-bold text-[#181725] mb-5">Order Status Breakdown</h2>
                            {Object.keys(data.statusBreakdown).length === 0 ? (
                                <p className="text-[13px] text-[#AEAEAE] text-center py-10">No orders yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(data.statusBreakdown)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([status, count]) => {
                                            const total = Object.values(data.statusBreakdown).reduce((a, b) => a + b, 0);
                                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                            const color = STATUS_COLOR[status] ?? '#AEAEAE';
                                            return (
                                                <div key={status}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[12px] font-bold text-[#181725] capitalize">{status.replace(/_/g, ' ')}</span>
                                                        <span className="text-[12px] font-bold" style={{ color }}>{count} ({pct}%)</span>
                                                    </div>
                                                    <div className="h-[5px] bg-[#F5F5F5] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Top products ─── */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                        <h2 className="text-[15px] font-bold text-[#181725] mb-5">Top Products by Revenue</h2>
                        {data.topProducts.length === 0 ? (
                            <p className="text-[13px] text-[#AEAEAE] text-center py-10">No sales yet</p>
                        ) : (
                            <div className="space-y-3">
                                {data.topProducts.map((p, i) => {
                                    const max = Math.max(...data.topProducts.map(x => x.revenue), 1);
                                    return (
                                        <div key={p.productId} className="flex items-center gap-4">
                                            <span className="text-[12px] font-bold text-[#AEAEAE] w-[18px] shrink-0">#{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-[13px] font-bold text-[#181725] truncate">{p.name}</p>
                                                    <span className="text-[13px] font-bold text-[#299E60] ml-3 shrink-0">{fmt(p.revenue)}</span>
                                                </div>
                                                <div className="h-[5px] bg-[#F5F5F5] rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#299E60] rounded-full" style={{ width: `${Math.round((p.revenue / max) * 100)}%` }} />
                                                </div>
                                                <p className="text-[11px] text-[#AEAEAE] mt-0.5">{p.qty} units sold</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ─── Customer analytics ─── */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                            <h2 className="text-[15px] font-bold text-[#181725] mb-4">Customer Analytics</h2>
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {[
                                    { label: 'Unique Customers', value: data.customerAnalytics.totalCustomers, icon: Users, color: '#3B82F6' },
                                    { label: 'Repeat Customers', value: data.customerAnalytics.repeatCustomers, icon: TrendingUp, color: '#299E60' },
                                    { label: 'Avg Order Value', value: fmt(data.customerAnalytics.aov), icon: IndianRupee, color: '#8B5CF6' },
                                    { label: 'Dormant', value: data.customerAnalytics.dormantCount, icon: AlertTriangle, color: '#F59E0B' },
                                ].map(stat => (
                                    <div key={stat.label} className="bg-[#FAFAFA] rounded-[10px] p-4">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <stat.icon size={13} style={{ color: stat.color }} />
                                            <p className="text-[10px] font-bold text-[#AEAEAE] uppercase tracking-wide">{stat.label}</p>
                                        </div>
                                        <p className="text-[18px] font-extrabold text-[#181725]">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                            {data.customerAnalytics.topCustomers.length > 0 && (
                                <>
                                    <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide mb-3">Top Customers</p>
                                    <div className="space-y-2">
                                        {data.customerAnalytics.topCustomers.slice(0, 5).map((c, i) => (
                                            <div key={c.userId} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-[#AEAEAE] w-[16px]">#{i + 1}</span>
                                                    <div>
                                                        <p className="text-[12px] font-bold text-[#181725] leading-tight">{c.fullName}</p>
                                                        {c.businessName && <p className="text-[10px] text-[#AEAEAE]">{c.businessName}</p>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[12px] font-bold text-[#299E60]">{fmt(c.totalSpend)}</p>
                                                    <p className="text-[10px] text-[#AEAEAE]">{c.orderCount} orders</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ─── Inventory analytics ─── */}
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                            <h2 className="text-[15px] font-bold text-[#181725] mb-4">Inventory Health</h2>
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {[
                                    { label: 'Fill Rate', value: `${data.inventoryAnalytics.fillRate}%`, color: data.inventoryAnalytics.fillRate >= 90 ? '#299E60' : '#F59E0B' },
                                    { label: 'Total SKUs', value: String(data.inventoryAnalytics.totalSkus), color: '#181725' },
                                    { label: 'Low Stock', value: String(data.inventoryAnalytics.lowStockCount), color: '#F59E0B' },
                                    { label: 'Out of Stock', value: String(data.inventoryAnalytics.outOfStockCount), color: '#E74C3C' },
                                ].map(stat => (
                                    <div key={stat.label} className="bg-[#FAFAFA] rounded-[10px] p-4">
                                        <p className="text-[10px] font-bold text-[#AEAEAE] uppercase tracking-wide mb-1.5">{stat.label}</p>
                                        <p className="text-[18px] font-extrabold" style={{ color: stat.color }}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                            {data.inventoryAnalytics.deadStock.length > 0 ? (
                                <>
                                    <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide mb-3">
                                        Dead Stock — no orders in period
                                    </p>
                                    <div className="space-y-2">
                                        {data.inventoryAnalytics.deadStock.map(item => (
                                            <div key={item.productId} className="flex items-center justify-between">
                                                <p className="text-[12px] font-bold text-[#181725] truncate flex-1 mr-4">{item.name}</p>
                                                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-[6px] shrink-0">
                                                    {item.qty} in stock
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-[12px] text-[#AEAEAE] text-center py-4">All stocked SKUs had orders this period</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
