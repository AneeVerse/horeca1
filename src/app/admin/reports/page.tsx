'use client';

import React, { useState } from 'react';
import {
    BarChart3,
    TrendingUp,
    Users,
    ShoppingBag,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Calendar,
    Filter,
    PieChart as PieChartIcon,
    ChevronRight,
    FileText,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend
} from 'recharts';

const SALES_COMPARISON_DATA = [
    { name: 'Jan', current: 4000, previous: 2400 },
    { name: 'Feb', current: 3000, previous: 1398 },
    { name: 'Mar', current: 9000, previous: 9800 },
    { name: 'Apr', current: 2780, previous: 3908 },
    { name: 'May', current: 9890, previous: 4800 },
    { name: 'Jun', current: 2390, previous: 3800 },
    { name: 'Jul', current: 8490, previous: 4300 },
];

const DATA_7D = [
    { name: 'Mon', current: 1200, previous: 900 },
    { name: 'Tue', current: 2100, previous: 1500 },
    { name: 'Wed', current: 1800, previous: 2200 },
    { name: 'Thu', current: 5800, previous: 3100 },
    { name: 'Fri', current: 3200, previous: 2800 },
    { name: 'Sat', current: 4100, previous: 3500 },
    { name: 'Sun', current: 3800, previous: 3200 },
];

const DATA_30D = [
    { name: 'Week 1', current: 14000, previous: 12400 },
    { name: 'Week 2', current: 13000, previous: 11398 },
    { name: 'Week 3', current: 19000, previous: 19800 },
    { name: 'Week 4', current: 12780, previous: 13908 },
];

const DATA_90D = [
    { name: 'Aug', current: 44000, previous: 32400 },
    { name: 'Sep', current: 33000, previous: 41398 },
    { name: 'Oct', current: 59000, previous: 49800 },
];

const CATEGORY_DATA = [
    { name: 'Produce', value: 45, color: '#299E60' },
    { name: 'Dairy', value: 25, color: '#3B82F6' },
    { name: 'Meat', value: 20, color: '#F59E0B' },
    { name: 'Pantry', value: 10, color: '#8B5CF6' },
];

const TOP_VENDORS = [
    { id: 'zara', name: 'ZARA International', growth: '+24%', revenue: '$85,200', image: '/images/admin/vendors/zara.svg' },
    { id: 'nike', name: 'Nike Global', growth: '+18%', revenue: '$64,500', image: '/images/admin/vendors/nike.svg' },
    { id: 'rolex', name: 'Rolex Watches', growth: '+12%', revenue: '$120,800', image: '/images/admin/vendors/rolex.svg' },
    { id: 'dyson', name: 'Dyson Machinery', growth: '-4%', revenue: '$42,300', image: '/images/admin/vendors/dyson.svg' },
];

const RECENT_REPORTS = [
    { id: 1, name: 'Monthly Financial Audit - Oct', date: 'Oct 31, 2023', size: '2.4 MB', type: 'PDF' },
    { id: 2, name: 'Vendor Performance Matrix', date: 'Oct 28, 2023', size: '1.1 MB', type: 'CSV' },
    { id: 3, name: 'Customer Retention Analysis', date: 'Oct 25, 2023', size: '4.8 MB', type: 'PDF' },
];

export default function ReportsPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [activeRange, setActiveRange] = useState('30d');
    const [toast, setToast] = useState<{ show: boolean, message: string } | null>(null);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleGeneratePDF = () => {
        showToast('System is compiling analytics. PDF generation started...');

        setTimeout(() => {
            const name = "Business Intelligence Report - Oct 2023";
            const element = document.createElement('a');
            const file = new Blob([`Performance Report Data for ${activeRange} period\n\nNet Sales: $842,500\nOrders: 4,842\nGrowth: 22.4%`], { type: 'application/pdf' });
            element.href = URL.createObjectURL(file);
            element.download = `horeca_report_${activeRange}.pdf`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            showToast('Performance Report ready for download!');
        }, 1500);
    };

    const handleDownloadReport = (name: string) => {
        showToast(`Downloading ${name}...`);
        const element = document.createElement('a');
        const file = new Blob([`Sample Content for ${name}`], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${name.toLowerCase().replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const getChartData = () => {
        switch (activeRange) {
            case '7d': return DATA_7D;
            case '30d': return DATA_30D;
            case '90d': return DATA_90D;
            default: return SALES_COMPARISON_DATA;
        }
    };

    const stats = [
        { label: 'Net Sales', value: '$842,500', trend: '+14.2%', icon: BarChart3, color: '#299E60', bgColor: '#EEF8F1', href: '/admin/finance' },
        { label: 'New Customers', value: '1,240', trend: '+8.1%', icon: Users, color: '#3B82F6', bgColor: '#EFF6FF', href: '/admin/customers' },
        { label: 'Total Orders', value: '4,842', trend: '+12.5%', icon: ShoppingBag, color: '#F59E0B', bgColor: '#FFF7E6', href: '/admin/orders' },
        { label: 'Revenue Growth', value: '22.4%', trend: '-2.4%', icon: TrendingUp, color: '#8B5CF6', bgColor: '#F5F3FF', href: '/admin/reports' },
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-12 text-[#181725]">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-[900] tracking-tight">Business Intelligence</h1>
                    <p className="text-[#7C7C7C] font-medium mt-1">Advanced analytics and performance reporting</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Link
                        key={idx}
                        href={stat.href}
                        className="bg-white p-6 rounded-[24px] border border-[#EEEEEE] shadow-sm hover:shadow-md transition-all group flex flex-col"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center transition-transform group-hover:scale-105"
                                style={{ backgroundColor: stat.bgColor, color: stat.color }}
                            >
                                <stat.icon size={26} strokeWidth={2.5} />
                            </div>
                            <div className={cn(
                                "flex items-center gap-0.5 text-[12px] font-extrabold px-2 py-1 rounded-full",
                                stat.trend.startsWith('+') ? "bg-[#EEF8F1] text-[#299E60]" : "bg-[#FFF2F0] text-[#E74C3C]"
                            )}>
                                {stat.trend.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {stat.trend}
                            </div>
                        </div>
                        <p className="text-[13px] font-bold text-[#AEAEAE] mb-1 uppercase tracking-wider">{stat.label}</p>
                        <h3 className="text-[28px] font-[900] text-[#181725] leading-none">{stat.value}</h3>
                    </Link>
                ))}
            </div>

            {/* Analytics Dashboard Controls - Restored Previous Design but Above Charts */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3">
                    <div className="w-[44px] h-[44px] bg-white border border-[#EEEEEE] rounded-[14px] flex items-center justify-center text-[#299E60] shadow-sm">
                        <Filter size={20} />
                    </div>
                    <div>
                        <h3 className="text-[17px] font-[900]">Visual Analytics</h3>
                        <p className="text-[12px] text-[#AEAEAE] font-extrabold uppercase tracking-widest">Real-time dynamic reporting</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-white border border-[#EEEEEE] p-1.5 rounded-[12px] shadow-sm">
                        {['7d', '30d', '90d', 'All'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setActiveRange(range)}
                                className={cn(
                                    "px-4 py-2 text-[13px] font-bold rounded-[10px] transition-all",
                                    activeRange === range
                                        ? "bg-[#299E60] text-white shadow-sm shadow-[#299E60]/20"
                                        : "text-[#7C7C7C] hover:bg-gray-50"
                                )}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleGeneratePDF}
                        className="h-[48px] px-6 bg-[#299E60] text-white rounded-[14px] text-[14px] font-bold hover:bg-[#238a54] transition-all flex items-center gap-2 shadow-sm shadow-[#299E60]/20"
                    >
                        <Download size={18} />
                        Generate PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Sales Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-[#EEEEEE] shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-[20px] font-[900]">Revenue Performance</h2>
                            <p className="text-[14px] text-[#AEAEAE] font-medium">Comparing {activeRange} period vs previous year</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#299E60]" />
                                <span className="text-[12px] font-bold text-[#7C7C7C]">2023</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#EEEEEE]" />
                                <span className="text-[12px] font-bold text-[#7C7C7C]">2022</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[380px] w-full mt-4">
                        {isMounted ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getChartData()} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FAFAFA" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={{ stroke: '#EEEEEE', strokeWidth: 1 }}
                                        tickLine={false}
                                        tick={{ fill: '#AEAEAE', fontSize: 13, fontWeight: 600 }}
                                        dy={15}
                                    />
                                    <YAxis
                                        axisLine={{ stroke: '#EEEEEE', strokeWidth: 1 }}
                                        tickLine={false}
                                        tick={{ fill: '#AEAEAE', fontSize: 13, fontWeight: 600 }}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#F8F9FB' }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="current" fill="#299E60" radius={[6, 6, 0, 0]} barSize={24} />
                                    <Bar dataKey="previous" fill="#EEEEEE" radius={[6, 6, 0, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full bg-[#F8F9FB] animate-pulse rounded-[24px]" />
                        )}
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white p-8 rounded-[32px] border border-[#EEEEEE] shadow-sm flex flex-col">
                    <div className="mb-8">
                        <h2 className="text-[20px] font-[900]">Sales by Category</h2>
                        <p className="text-[14px] text-[#AEAEAE] font-medium">Revenue distribution across sectors</p>
                    </div>

                    <div className="h-[280px] w-full flex-1 flex justify-center items-center">
                        {isMounted ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={CATEGORY_DATA}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {CATEGORY_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-[200px] h-[200px] bg-[#F8F9FB] animate-pulse rounded-full" />
                        )}
                    </div>

                    <div className="space-y-4 mt-6">
                        {CATEGORY_DATA.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between group cursor-default">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-[14px] font-bold text-[#181725]">{item.name}</span>
                                </div>
                                <span className="text-[14px] font-extrabold text-[#7C7C7C]">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Vendors Table */}
                <div className="bg-white rounded-[32px] border border-[#EEEEEE] shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-[#EEEEEE] flex items-center justify-between">
                        <div>
                            <h2 className="text-[20px] font-[900]">Market Leaders</h2>
                            <p className="text-[14px] text-[#AEAEAE] font-medium">Top performing vendors by revenue</p>
                        </div>
                        <button className="text-[#299E60] font-bold text-[14px] flex items-center gap-1.5 hover:underline">
                            View All <ArrowRight size={16} />
                        </button>
                    </div>
                    <div className="flex-1">
                        {TOP_VENDORS.map((vendor, idx) => (
                            <Link
                                href={`/admin/vendors/${vendor.id}`}
                                key={vendor.id}
                                className={cn(
                                    "flex items-center justify-between p-6 hover:bg-[#F8F9FB] transition-all group",
                                    idx !== TOP_VENDORS.length - 1 && "border-b border-[#F5F5F5]"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-[52px] h-[52px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[16px] p-2 flex items-center justify-center group-hover:bg-white transition-colors">
                                        <img src={vendor.image} alt="" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h4 className="text-[15px] font-[900] text-[#181725]">{vendor.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[11px] text-[#AEAEAE] font-extrabold uppercase tracking-widest">REVENUE</span>
                                            <span className="text-[13px] font-[900] text-[#299E60]">{vendor.revenue}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[12px] font-[900] whitespace-nowrap shadow-sm",
                                    vendor.growth.startsWith('+') ? "bg-[#EEF8F1] text-[#299E60]" : "bg-[#FFF2F0] text-[#E74C3C]"
                                )}>
                                    {vendor.growth.startsWith('+') ? <TrendingUp size={14} /> : <ArrowDownRight size={14} />}
                                    {vendor.growth}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Reports Hub */}
                <div className="bg-white rounded-[32px] border border-[#EEEEEE] shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-[#EEEEEE]">
                        <h2 className="text-[20px] font-[900]">Report Repository</h2>
                        <p className="text-[14px] text-[#AEAEAE] font-medium">History of generated platform analytics</p>
                    </div>
                    <div className="flex-1 p-8 space-y-6">
                        {RECENT_REPORTS.map((report) => (
                            <div key={report.id} className="flex items-center gap-5 group cursor-pointer" onClick={() => handleDownloadReport(report.name)}>
                                <div className="w-[56px] h-[56px] rounded-[18px] bg-[#F8F9FB] flex items-center justify-center text-[#AEAEAE] group-hover:bg-[#299E60] group-hover:text-white transition-all">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-[15px] font-[900] text-[#181725] group-hover:text-[#299E60] transition-colors">{report.name}</h5>
                                    <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-1.5 text-[12px] text-[#AEAEAE] font-bold">
                                            <Calendar size={14} /> {report.date}
                                        </div>
                                        <div className="text-[12px] text-[#AEAEAE] font-extrabold px-2 py-0.5 bg-[#F5F5F5] rounded-md uppercase tracking-wider">
                                            {report.type} • {report.size}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="w-[40px] h-[40px] rounded-full border border-[#EEEEEE] flex items-center justify-center text-[#AEAEAE] group-hover:border-[#299E60] group-hover:text-[#299E60] transition-all hover:bg-[#EEF8F1]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadReport(report.name);
                                    }}
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {toast && (
                <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-[#181725] text-white px-6 py-4 rounded-[16px] shadow-2xl flex items-center gap-3 border border-white/10">
                        <div className="w-8 h-8 rounded-full bg-[#299E60] flex items-center justify-center">
                            <ArrowUpRight size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[14px] font-bold">{toast.message}</p>
                            <p className="text-[12px] text-[#AEAEAE]">Platform Intelligence Ledger</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
