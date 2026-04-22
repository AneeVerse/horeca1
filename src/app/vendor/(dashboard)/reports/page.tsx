'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, ShoppingBag, IndianRupee, Package } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface RevenuePoint { month: string; label: string; revenue: number; orders: number }
interface TopProduct { productId: string; name: string; qty: number; revenue: number }
interface ReportsData {
  totals: { revenue: number; orders: number };
  revenueByMonth: RevenuePoint[];
  topProducts: TopProduct[];
  statusBreakdown: Record<string, number>;
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', processing: '#8B5CF6',
  out_for_delivery: '#F97316', delivered: '#299E60', cancelled: '#EF4444',
};

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function VendorReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/vendor/reports')
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 size={32} className="animate-spin text-[#299E60]" />
    </div>
  );

  if (!data) return (
    <div className="flex justify-center items-center h-[60vh] text-[#AEAEAE] text-[14px]">
      Failed to load reports
    </div>
  );

  const statCards = [
    { label: 'Total Revenue', value: fmt(data.totals.revenue), icon: IndianRupee, color: '#299E60' },
    { label: 'Total Orders', value: data.totals.orders, icon: ShoppingBag, color: '#3B82F6' },
    { label: 'Delivered', value: data.statusBreakdown['delivered'] ?? 0, icon: TrendingUp, color: '#10B981' },
    { label: 'Cancelled', value: data.statusBreakdown['cancelled'] ?? 0, icon: Package, color: '#EF4444' },
  ];

  const maxRevenue = Math.max(...data.topProducts.map(p => p.revenue), 1);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-[#181725]">Reports</h1>
        <p className="text-[13px] text-[#7C7C7C] mt-1">Revenue and performance overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-[#AEAEAE] uppercase tracking-wide">{s.label}</p>
              <div className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center"
                style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                <s.icon size={18} />
              </div>
            </div>
            <p className="text-[24px] font-extrabold text-[#181725]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue area chart */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
        <h2 className="text-[16px] font-bold text-[#181725] mb-5">Revenue — Last 6 Months</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.revenueByMonth} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#299E60" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#299E60" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#AEAEAE' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#AEAEAE' }} axisLine={false} tickLine={false}
              tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v) => [fmt(Number(v ?? 0)), 'Revenue']}
              contentStyle={{ borderRadius: 10, border: '1px solid #EEEEEE', fontSize: 13 }} />
            <Area type="monotone" dataKey="revenue" stroke="#299E60" strokeWidth={2.5}
              fill="url(#revenueGrad)" dot={{ fill: '#299E60', r: 4 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Orders bar chart */}
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
          <h2 className="text-[16px] font-bold text-[#181725] mb-5">Orders per Month</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.revenueByMonth} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#AEAEAE' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#AEAEAE' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #EEEEEE', fontSize: 13 }} />
              <Bar dataKey="orders" fill="#299E60" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order status breakdown */}
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
          <h2 className="text-[16px] font-bold text-[#181725] mb-5">Order Status Breakdown</h2>
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
                        <span className="text-[13px] font-bold text-[#181725] capitalize">{status.replace(/_/g, ' ')}</span>
                        <span className="text-[13px] font-bold" style={{ color }}>{count} ({pct}%)</span>
                      </div>
                      <div className="h-[6px] bg-[#F5F5F5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Top products */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
        <h2 className="text-[16px] font-bold text-[#181725] mb-5">Top Products by Revenue</h2>
        {data.topProducts.length === 0 ? (
          <p className="text-[13px] text-[#AEAEAE] text-center py-10">No sales data yet</p>
        ) : (
          <div className="space-y-3">
            {data.topProducts.map((p, i) => (
              <div key={p.productId} className="flex items-center gap-4">
                <span className="text-[13px] font-bold text-[#AEAEAE] w-[20px] shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-bold text-[#181725] truncate">{p.name}</p>
                    <span className="text-[13px] font-bold text-[#299E60] ml-3 shrink-0">{fmt(p.revenue)}</span>
                  </div>
                  <div className="h-[6px] bg-[#F5F5F5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#299E60] rounded-full transition-all"
                      style={{ width: `${Math.round((p.revenue / maxRevenue) * 100)}%` }} />
                  </div>
                  <p className="text-[11px] text-[#AEAEAE] mt-0.5">{p.qty} units sold</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
