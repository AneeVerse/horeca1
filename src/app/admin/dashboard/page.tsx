'use client';

import React from 'react';
import Link from 'next/link';
import {
    ShoppingCart,
    Users,
    Store,
    Wallet,
    TrendingUp,
    Star,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

const STAT_CARDS = [
    { label: 'Total Order Today', value: '469', icon: ShoppingCart, color: 'bg-blue-50 text-blue-600', trend: '+12.5%', trendType: 'up' },
    { label: 'Total Customers', value: '1,446', icon: Users, color: 'bg-yellow-50 text-yellow-600', trend: '+5.4%', trendType: 'up' },
    { label: 'Total Vendors', value: '210', icon: Store, color: 'bg-pink-50 text-pink-600', trend: '+2.1%', trendType: 'up' },
    { label: 'Revenue This Month', value: '₹ 1,15,000', icon: Wallet, color: 'bg-green-50 text-green-600', trend: '+18.2%', trendType: 'up' },
];

const SALES_DATA = [
    { month: 'Jan', value: 30000 },
    { month: 'Feb', value: 38000 },
    { month: 'Mar', value: 55000 },
    { month: 'Apr', value: 65000 },
    { month: 'May', value: 75000 },
    { month: 'Jun', value: 95000 },
    { month: 'Jul', value: 98000 },
    { month: 'Oct', value: 120000 },
];

const REVENUE_DATA = [
    { month: 'Jan', value: 60000 },
    { month: 'Feb', value: 50000 },
    { month: 'Mar', value: 78000 },
    { month: 'Apr', value: 60000 },
    { month: 'May', value: 85000 },
    { month: 'Jun', value: 70000 },
    { month: 'Jul', value: 80000 },
    { month: 'Oct', value: 110000 },
];

const TOP_PRODUCTS = [
    { name: 'Amul Butter 100 gms', sold: '1204 sold', change: '5.89%', image: '/images/dairy/amul-butter.png' },
    { name: 'TATA Salt 1 kg', sold: '1199 sold', change: '5.89%', image: '/images/masala-salt/tata-salt.png' },
    { name: 'Amul Butter 100 gms', sold: '987 sold', change: '5.89%', image: '/images/dairy/amul-butter.png' },
    { name: 'TATA Salt 1 kg', sold: '788 sold', change: '5.89%', image: '/images/masala-salt/tata-salt.png' },
    { name: 'Amul Butter 100 gms', sold: '453 sold', change: '5.89%', image: '/images/dairy/amul-butter.png' },
    { name: 'TATA Salt 1 kg', sold: '233 sold', change: '5.89%', image: '/images/masala-salt/tata-salt.png' },
];

const BEST_SELLERS = [
    { name: 'Emarket', category: 'Grocery & Vegetables', rating: '4.8', image: '/images/admin/dashboard/ecommerce-logo-template_658705-117 2.png' },
    { name: 'Groceri', category: 'Grocery & Fruits', rating: '4.6', image: '/images/admin/dashboard/grociri.png' },
    { name: 'Emarket', category: 'Grocery & Vegetables', rating: '4.5', image: '/images/admin/dashboard/ecommerce-logo-template_658705-117 2.png' },
    { name: 'Groceri', category: 'Grocery & Fruits', rating: '4.3', image: '/images/admin/dashboard/grociri.png' },
    { name: 'Emarket', category: 'Grocery & Vegetables', rating: '3.7', image: '/images/admin/dashboard/ecommerce-logo-template_658705-117 2.png' },
    { name: 'Groceri', category: 'Grocery & Fruits', rating: '3.5', image: '/images/admin/dashboard/grociri.png' },
];

const RECENT_ACTIVITY = [
    { id: '343464', customer: 'Hotel MH27', vendor: 'FreshFoods', status: 'Delivered', date: '24 Apr 2025' },
    { id: '343465', customer: 'Urban Eats', vendor: 'Spice Mart', status: 'Pending', date: '24 Apr 2025' },
    { id: '343466', customer: 'G Mart', vendor: '122 market', status: 'Pending', date: '24 Apr 2025' },
    { id: '343467', customer: 'Urban Eats', vendor: 'Spice Mart', status: 'Pending', date: '24 Apr 2025' },
    { id: '343468', customer: 'Urban Eats', vendor: 'Spice Mart', status: 'Pending', date: '24 Apr 2025' },
    { id: '343469', customer: 'Urban Eats', vendor: 'Spice Mart', status: 'Pending', date: '24 Apr 2025' },
];

const formatYAxis = (value: number) => {
    if (value === 0) return '0';
    if (value >= 100000) return `${Math.floor(value / 100000)},${String(Math.floor((value % 100000) / 1000)).padStart(2, '0')},000`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)},000`;
    return value.toString();
};

/* Custom rounded bar shape with gradient fill */
const RoundedBar = (props: any) => {
    const { x, y, width, height } = props;
    const radius = 5;
    if (height <= 0) return null;
    return (
        <path
            d={`
                M${x},${y + height}
                L${x},${y + radius}
                Q${x},${y} ${x + radius},${y}
                L${x + width - radius},${y}
                Q${x + width},${y} ${x + width},${y + radius}
                L${x + width},${y + height}
                Z
            `}
            fill="url(#barGradient)"
        />
    );
};

/* Custom tooltip */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-[#EEEEEE] rounded-xl shadow-lg px-4 py-3">
                <p className="text-[12px] text-[#7C7C7C] font-medium">{label}</p>
                <p className="text-[16px] font-bold text-[#181725]">₹ {payload[0].value.toLocaleString('en-IN')}</p>
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div>
                <h1 className="text-[26px] font-medium text-[#000000]">Dashboard</h1>
                <p className="text-[#000000] text-[12px] font-light">Whole data about your business here</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {STAT_CARDS.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[14px] border border-[#EEEEEE] shadow-sm hover:shadow-md transition-all h-[145px] flex flex-col justify-between cursor-default">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", stat.color)}>
                                <stat.icon size={22} />
                            </div>
                            <span className="text-[15px] font-bold text-[#4B4B4B]">{stat.label}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <h4 className="text-[28px] font-[800] text-[#181725] leading-none">{stat.value}</h4>
                            <div className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold",
                                stat.trendType === 'up' ? "bg-[#EEF8F1] text-[#299E60]" : "bg-[#FFF0F0] text-[#E74C3C]"
                            )}>
                                {stat.trend}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Previous Stat Cards Layout (Commented Out)
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {STAT_CARDS.map((stat, idx) => (
                    <div key={idx} className="bg-white h-[135px] px-6 rounded-[14px] border border-[#EEEEEE] flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow cursor-default">
                        <div className={cn("w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0", stat.color)}>
                            <stat.icon size={24} />
                        </div>
                        <div className="flex-1 flex flex-col justify-center min-w-0">
                            <p className="text-[#000000] text-[15px] xl:text-[18px] font-medium leading-[1.2] mb-0.5">{stat.label}</p>
                            <p className="text-[26px] xl:text-[35px] font-bold text-[#000000] leading-none whitespace-nowrap">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
            */}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Overview - Area Chart */}
                <div className="bg-white p-10 rounded-[14px] border border-[#EEEEEE] shadow-sm min-h-[411px]">
                    <h3 className="text-[18px] font-bold text-[#181725] mb-6">Sales Overview</h3>
                    <div className="h-[340px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={SALES_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#299E60" />
                                        <stop offset="30%" stopColor="#3DB876" />
                                        <stop offset="60%" stopColor="#7DD4A3" />
                                        <stop offset="85%" stopColor="#C2EDDA" />
                                        <stop offset="100%" stopColor="#FFFFFF" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#C8C8C8" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#7C7C7C', fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: '#7C7C7C', fontWeight: 500 }}
                                    tickFormatter={formatYAxis}
                                    width={65}
                                    domain={[0, 120000]}
                                    ticks={[0, 20000, 40000, 60000, 80000, 100000, 120000]}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="none"
                                    strokeWidth={0}
                                    fill="url(#salesGradient)"
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#fff', stroke: '#299E60', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Revenue - Bar Chart */}
                <div className="bg-white p-10 rounded-[14px] border border-[#EEEEEE] shadow-sm min-h-[411px]">
                    <h3 className="text-[18px] font-bold text-[#181725] mb-6">Monthly Revenue</h3>
                    <div className="h-[340px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={REVENUE_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#55DB94" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#004721" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#C8C8C8" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#7C7C7C', fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: '#7C7C7C', fontWeight: 500 }}
                                    tickFormatter={formatYAxis}
                                    width={65}
                                    domain={[0, 120000]}
                                    ticks={[0, 20000, 40000, 60000, 80000, 100000, 120000]}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="value"
                                    barSize={27}
                                    shape={<RoundedBar />}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Products & Best Sellers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[14px] border border-[#EEEEEE] shadow-sm w-full max-w-[646px] h-fit">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[18px] font-bold text-[#000000]">Top Products</h3>
                        <Link href="#" className="text-[#299E60] text-[12px] font-bold hover:underline">See All</Link>
                    </div>
                    <div className="space-y-3">
                        {TOP_PRODUCTS.map((prod, i) => (
                            <div key={i} className="grid grid-cols-[250px_1fr_110px] items-center px-4 h-[75px] border border-[#EEEEEE] rounded-[10px] hover:shadow-sm transition-all cursor-pointer bg-white">
                                {/* Product Info */}
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-[67px] h-[67px] flex items-center justify-center shrink-0">
                                        <img src={prod.image} alt="" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[14px] font-bold text-[#181725] leading-tight mb-0.5 whitespace-nowrap">{prod.name}</p>
                                        <p className="text-[11px] text-[#7C7C7C] font-medium">{prod.sold}</p>
                                    </div>
                                </div>

                                {/* Logo in Middle */}
                                <div className="flex justify-center">
                                    <div className="w-[65px] h-[65px] flex items-center justify-center">
                                        <img
                                            src="/images/admin/dashboard/ecommerce-logo-template_658705-117 2.png"
                                            alt="Emarket"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>

                                {/* Stats on Right */}
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-[13px] font-bold text-[#181725]">{prod.change}</span>
                                    <TrendingUp size={16} className="text-[#299E60]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[14px] border border-[#EEEEEE] shadow-sm w-full max-w-[646px] h-fit">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[18px] font-bold text-[#000000]">Best Store Sellers</h3>
                        <Link href="#" className="text-[#299E60] text-[12px] font-bold hover:underline">See All</Link>
                    </div>
                    <div className="space-y-3">
                        {BEST_SELLERS.map((seller, i) => (
                            <div key={i} className="flex items-center justify-between px-4 h-[75px] border border-[#EEEEEE] rounded-[10px] hover:shadow-sm transition-all cursor-pointer bg-white">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-[67px] h-[67px] flex items-center justify-center shrink-0">
                                        <img src={seller.image} alt="" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[14px] font-bold text-[#181725] leading-tight mb-0.5 truncate">{seller.name}</p>
                                        <p className="text-[11px] text-[#7C7C7C] font-medium">{seller.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 bg-[#299E60] text-white text-[12px] px-3 py-1 rounded-full font-bold min-w-[54px] justify-center">
                                        <Star size={11} fill="white" className="text-white" />
                                        <span>{seller.rating}</span>
                                    </div>
                                    <TrendingUp size={16} className="text-[#299E60]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white p-10 rounded-[10px] border border-[#DCDCDC] shadow-sm max-w-[1360px]">
                <h3 className="text-[18px] font-bold text-[#000000] mb-8">Recent Activity</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-[#EFEFEF] h-[47px]">
                                <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B] first:rounded-l-[10px]">Order ID</th>
                                <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B]">Customers</th>
                                <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B]">Vendor</th>
                                <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B]">Status</th>
                                <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B]">Date</th>
                                <th className="px-6 text-center text-[13px] font-bold text-[#4B4B4B] last:rounded-r-[10px]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {RECENT_ACTIVITY.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-5 px-6 text-center font-bold text-[14px] text-[#181725]">{row.id}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-medium">{row.customer}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-medium">{row.vendor}</td>
                                    <td className="py-5 px-6 text-center">
                                        <div className="flex justify-center">
                                            <span className={cn(
                                                "inline-flex items-center justify-center rounded-[10px] text-[14px] font-medium",
                                                row.status === 'Delivered'
                                                    ? "bg-[#EEF8F1] text-[#299E60] px-6 py-1.5"
                                                    : "bg-[#FFF4E5] text-[#976538] w-[100px] h-[21px]"
                                            )}>
                                                {row.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-medium">{row.date}</td>
                                    <td className="py-5 px-6 text-center">
                                        <div className="flex justify-center">
                                            <Link href={`/admin/orders/${row.id}`} className="bg-[#299E60] hover:bg-[#238b54] text-white text-[12px] font-bold h-[28px] px-4 rounded-[5px] transition-colors cursor-pointer flex items-center justify-center">
                                                View Details
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-8 flex justify-center">
                    <button className="flex items-center justify-center gap-[3px] w-[149px] h-[41px] border border-[#299E60] rounded-[5px] text-[14px] font-bold text-[#299E60] hover:bg-[#EEF8F1] transition-all pt-[4px] pb-[4px] pl-[3px] pr-[11px] cursor-pointer">
                        <span>View all</span> <ChevronRight size={14} className="text-[#299E60]" />
                    </button>
                </div>
            </div>
        </div>
    );
}
