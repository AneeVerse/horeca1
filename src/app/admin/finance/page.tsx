'use client';

import React, { useState } from 'react';
import {
    Wallet,
    TrendingUp,
    Coins,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    MoreVertical,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    Building2,
    Calendar,
    Download,
    CheckCircle,
    Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

const getVendorSlug = (name: string) => name.toLowerCase().split(' ')[0];

const REVENUE_DATA_MONTHLY = [
    { name: 'Jan', total: 4000 },
    { name: 'Feb', total: 3000 },
    { name: 'Mar', total: 9000 },
    { name: 'Apr', total: 2780 },
    { name: 'May', total: 9890 },
    { name: 'Jun', total: 2390 },
    { name: 'Jul', total: 8490 },
    { name: 'Aug', total: 4000 },
    { name: 'Sep', total: 5000 },
    { name: 'Oct', total: 3000 },
    { name: 'Nov', total: 7000 },
    { name: 'Dec', total: 6500 },
];

const REVENUE_DATA_WEEKLY = [
    { name: 'Mon', total: 1200 },
    { name: 'Tue', total: 2100 },
    { name: 'Wed', total: 1800 },
    { name: 'Thu', total: 5800 },
    { name: 'Fri', total: 3200 },
    { name: 'Sat', total: 4100 },
    { name: 'Sun', total: 3800 },
];

const REVENUE_DATA_DAILY = [
    { name: '08:00', total: 400 },
    { name: '10:00', total: 850 },
    { name: '12:00', total: 1200 },
    { name: '14:00', total: 1100 },
    { name: '16:00', total: 950 },
    { name: '18:00', total: 1500 },
    { name: '20:00', total: 1800 },
    { name: '22:00', total: 1300 },
];

const FINANCE_STATS = [
    {
        label: 'Available to Pay',
        value: '$12,450.00',
        trend: '+12.5%',
        isPositive: true,
        icon: Wallet,
        color: '#299E60',
        bgColor: '#EEF8F1'
    },
    {
        label: 'Projected Revenue',
        value: '$48,200.00',
        trend: '+8.2%',
        isPositive: true,
        icon: TrendingUp,
        color: '#3B82F6',
        bgColor: '#EFF6FF'
    },
    {
        label: 'Commission Earned',
        value: '$3,840.45',
        trend: '-2.4%',
        isPositive: false,
        icon: Coins,
        color: '#F59E0B',
        bgColor: '#FFF7E6'
    }
];

const PAYOUT_REQUESTS = [
    {
        id: 1,
        vendor: 'ZARA International',
        logo: '/images/admin/vendors/zara.svg',
        amount: '$4,250.00',
        bank: 'Chase Bank',
        accNo: '**** 4432',
        date: 'Oct 26, 2023',
        status: 'Pending'
    },
    {
        id: 2,
        vendor: 'Rolex Watches',
        logo: '/images/admin/vendors/rolex.svg',
        amount: '$12,800.00',
        bank: 'Bank of America',
        accNo: '**** 8821',
        date: 'Oct 25, 2023',
        status: 'Processing'
    },
    {
        id: 3,
        vendor: 'Dyson Machinery',
        logo: '/images/admin/vendors/dyson.svg',
        amount: '$8,400.00',
        bank: 'Wells Fargo',
        accNo: '**** 9901',
        date: 'Oct 24, 2023',
        status: 'Pending'
    },
    {
        id: 4,
        vendor: 'GoPro Camera',
        logo: '/images/admin/vendors/gopro.svg',
        amount: '$2,150.00',
        bank: 'HSBC',
        accNo: '**** 2210',
        date: 'Oct 23, 2023',
        status: 'Completed'
    },
    {
        id: 5,
        vendor: 'Nike International',
        logo: '/images/admin/vendors/nike.svg',
        amount: '$5,820.00',
        bank: 'Citibank',
        accNo: '**** 1155',
        date: 'Oct 27, 2023',
        status: 'Pending'
    }
];

export default function FinancePage() {
    const [payouts, setPayouts] = useState(PAYOUT_REQUESTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [processingIds, setProcessingIds] = useState<number[]>([]);
    const [toast, setToast] = useState<{ show: boolean, message: string } | null>(null);
    const [activePayoutTab, setActivePayoutTab] = useState<'Pending' | 'Completed'>('Pending');

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleProcessPayout = (id: number) => {
        setProcessingIds(prev => [...prev, id]);

        setTimeout(() => {
            setPayouts(prev => prev.map(p =>
                p.id === id ? { ...p, status: 'Completed' } : p
            ));
            setProcessingIds(prev => prev.filter(pid => pid !== id));
            showToast('Bank transfer completed successfully!');
        }, 1500);
    };

    const handleDownloadReceipt = (vendor: string) => {
        showToast(`Downloading receipt for ${vendor}...`);
        const element = document.createElement('a');
        const file = new Blob(['Sample Receipt Content for ' + vendor], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `receipt_${vendor.toLowerCase().replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(element);
        element.click();
    };

    const chartData = timeRange === 'daily' ? REVENUE_DATA_DAILY :
        timeRange === 'weekly' ? REVENUE_DATA_WEEKLY :
            REVENUE_DATA_MONTHLY;

    const filteredPayouts = payouts.filter(p => {
        const matchesTab = activePayoutTab === 'Completed' ? p.status === 'Completed' : p.status !== 'Completed';
        const matchesSearch = p.vendor.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const pendingCount = payouts.filter(p => p.status !== 'Completed').length;
    const completedCount = payouts.filter(p => p.status === 'Completed').length;

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-12 text-[#181725]">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-[900] tracking-tight">Finance Management</h1>
                    <p className="text-[#7C7C7C] font-medium mt-1">Monitor revenue, platform earnings, and vendor payouts</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="h-[44px] px-6 bg-white border border-[#EEEEEE] rounded-[12px] text-[14px] font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
                        <Calendar size={18} />
                        Select Date
                    </button>
                    <button className="h-[44px] px-6 bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-all flex items-center gap-2 shadow-sm shadow-[#299E60]/20">
                        <Download size={18} />
                        Export Ledger
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {FINANCE_STATS.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[24px] border border-[#EEEEEE] shadow-sm flex items-center gap-6 hover:shadow-md transition-all group">
                        <div
                            className="w-[68px] h-[68px] rounded-[20px] flex items-center justify-center shrink-0 transition-transform"
                            style={{ backgroundColor: stat.bgColor, color: stat.color }}
                        >
                            <stat.icon size={34} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[13px] font-bold text-[#AEAEAE] mb-1 uppercase tracking-wider">{stat.label}</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-[28px] font-[900] text-[#181725] leading-none">{stat.value}</h3>
                                <div className={cn(
                                    "flex items-center gap-0.5 text-[12px] font-extrabold px-2 py-1 rounded-full",
                                    stat.isPositive ? "bg-[#EEF8F1] text-[#299E60]" : "bg-[#FFF2F0] text-[#E74C3C]"
                                )}>
                                    {stat.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {stat.trend}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Revenue Analytics Chart */}
            <div className="bg-white p-8 rounded-[32px] border border-[#EEEEEE] shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-[20px] font-[900] text-[#181725]">Total Platform Revenue</h2>
                        <p className="text-[14px] text-[#AEAEAE] font-medium">Monthly growth and commission overview</p>
                    </div>
                    <div className="flex items-center gap-4 bg-[#F8F9FB] p-1.5 rounded-[12px]">
                        <button
                            onClick={() => setTimeRange('daily')}
                            className={cn(
                                "px-4 py-1.5 text-[13px] font-bold transition-all rounded-[8px]",
                                timeRange === 'daily' ? "bg-white shadow-sm text-[#181725]" : "text-[#AEAEAE] hover:text-[#181725]"
                            )}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setTimeRange('weekly')}
                            className={cn(
                                "px-4 py-1.5 text-[13px] font-bold transition-all rounded-[8px]",
                                timeRange === 'weekly' ? "bg-white shadow-sm text-[#181725]" : "text-[#AEAEAE] hover:text-[#181725]"
                            )}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setTimeRange('monthly')}
                            className={cn(
                                "px-4 py-1.5 text-[13px] font-bold transition-all rounded-[8px]",
                                timeRange === 'monthly' ? "bg-white shadow-sm text-[#181725]" : "text-[#AEAEAE] hover:text-[#181725]"
                            )}
                        >
                            Monthly
                        </button>
                    </div>
                </div>

                <div className="h-[360px] w-full mt-4">
                    {isMounted && (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#299E60" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#299E60" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#AEAEAE', fontSize: 13, fontWeight: 600 }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#AEAEAE', fontSize: 13, fontWeight: 600 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                        padding: '12px 16px'
                                    }}
                                    labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#181725' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#299E60"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Payout Governance Section */}
            <div className="bg-white rounded-[28px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-8 border-b border-[#EEEEEE]">
                    <div className="flex flex-col gap-8">
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-2 bg-[#F8F9FB] p-1.5 rounded-[16px] w-fit">
                            <button
                                onClick={() => setActivePayoutTab('Pending')}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[14px] font-bold transition-all",
                                    activePayoutTab === 'Pending'
                                        ? "bg-white text-[#181725] shadow-sm"
                                        : "text-[#AEAEAE] hover:text-[#7C7C7C]"
                                )}
                            >
                                <Clock size={18} strokeWidth={2.5} />
                                Payout Queue
                                <span className={cn(
                                    "px-2 py-0.5 rounded-[6px] text-[11px] font-[900]",
                                    activePayoutTab === 'Pending' ? "bg-[#299E60] text-white" : "bg-[#EEEEEE] text-[#AEAEAE]"
                                )}>{pendingCount}</span>
                            </button>
                            <button
                                onClick={() => setActivePayoutTab('Completed')}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[14px] font-bold transition-all",
                                    activePayoutTab === 'Completed'
                                        ? "bg-white text-[#181725] shadow-sm"
                                        : "text-[#AEAEAE] hover:text-[#7C7C7C]"
                                )}
                            >
                                <Archive size={18} strokeWidth={2.5} />
                                Completed
                                <span className={cn(
                                    "px-2 py-0.5 rounded-[6px] text-[11px] font-[900]",
                                    activePayoutTab === 'Completed' ? "bg-[#299E60] text-white" : "bg-[#EEEEEE] text-[#AEAEAE]"
                                )}>{completedCount}</span>
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-[48px] h-[48px] bg-[#EEF8F1] rounded-[14px] flex items-center justify-center text-[#299E60]">
                                    {activePayoutTab === 'Pending' ? <CreditCard size={24} /> : <CheckCircle size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-[20px] font-[900] text-[#181725]">
                                        {activePayoutTab === 'Pending' ? 'Payout Queue' : 'Completed Transfers'}
                                    </h2>
                                    <p className="text-[14px] text-[#AEAEAE] font-medium">
                                        {activePayoutTab === 'Pending' ? 'Review and process pending seller payouts' : 'Registry of all successfully executed bank transfers'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search vendor..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-[260px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[14px] py-2.5 pl-11 pr-4 text-[14px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white"
                                    />
                                </div>
                                <button className="h-[44px] px-4 border border-[#EEEEEE] rounded-[14px] text-[14px] font-bold text-[#181725] hover:bg-gray-50 flex items-center gap-2">
                                    <Filter size={18} />
                                    Filter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F8F9FB]">
                                <th className="px-8 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">Bank Details</th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider text-left">Status</th>
                                <th className="px-8 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider text-left">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {filteredPayouts.map((payout) => (
                                <tr key={payout.id} className="hover:bg-[#FDFDFD] transition-colors group">
                                    <td className="px-8 py-5">
                                        <Link
                                            href={`/admin/vendors/${getVendorSlug(payout.vendor)}`}
                                            className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit"
                                        >
                                            <div className="w-10 h-10 rounded-[10px] bg-[#F8F9FB] border border-[#EEEEEE] p-2 flex items-center justify-center">
                                                <img src={payout.logo} alt="" className="w-full h-full object-contain" />
                                            </div>
                                            <span className="text-[15px] font-extrabold text-[#181725]">{payout.vendor}</span>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-[16px] font-[900] text-[#181725] leading-none mb-1">{payout.amount}</span>
                                            <span className="text-[12px] text-[#AEAEAE] font-bold uppercase">{payout.date}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={16} className="text-[#AEAEAE]" />
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-bold text-[#181725] leading-none mb-1">{payout.bank}</span>
                                                <span className="text-[12px] text-[#AEAEAE] font-semibold tracking-wider">{payout.accNo}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-left">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-[900] uppercase tracking-wider border",
                                            payout.status === 'Completed' ? "bg-[#EEF8F1] text-[#299E60] border-[#299E60]/10" :
                                                payout.status === 'Processing' || processingIds.includes(payout.id) ? "bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]/10" :
                                                    "bg-[#FFF7E6] text-[#F59E0B] border-[#F59E0B]/10"
                                        )}>
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                payout.status === 'Completed' ? "bg-[#299E60]" :
                                                    payout.status === 'Processing' || processingIds.includes(payout.id) ? "bg-[#3B82F6] animate-pulse" : "bg-[#F59E0B]"
                                            )}></span>
                                            {processingIds.includes(payout.id) ? 'Processing...' : payout.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {payout.status === 'Completed' ? (
                                            <button
                                                onClick={() => handleDownloadReceipt(payout.vendor)}
                                                className="flex items-center gap-1.5 h-[40px] px-4 bg-white border border-[#EEEEEE] text-[#299E60] rounded-[10px] text-[13px] font-[800] hover:bg-[#F8F9FB] transition-all active:scale-95"
                                            >
                                                <Download size={16} strokeWidth={2.5} />
                                                Download Receipt
                                            </button>
                                        ) : (
                                            <button
                                                disabled={processingIds.includes(payout.id)}
                                                onClick={() => handleProcessPayout(payout.id)}
                                                className={cn(
                                                    "h-[40px] px-5 rounded-[10px] text-[13px] font-[800] transition-all shadow-sm active:scale-[0.98] min-w-[130px]",
                                                    processingIds.includes(payout.id)
                                                        ? "bg-[#F8F9FB] text-[#AEAEAE] cursor-wait"
                                                        : "bg-[#299E60] text-white hover:bg-[#238a54] shadow-[#299E60]/20"
                                                )}
                                            >
                                                {processingIds.includes(payout.id) ? (
                                                    <span className="flex items-center gap-2">
                                                        <Clock size={14} className="animate-spin" />
                                                        Processing
                                                    </span>
                                                ) : 'Process Payout'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredPayouts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-[#F8F9FB] rounded-full flex items-center justify-center text-[#AEAEAE]">
                                                {activePayoutTab === 'Pending' ? <CreditCard size={32} /> : <Archive size={32} />}
                                            </div>
                                            <p className="text-[#AEAEAE] font-bold uppercase tracking-widest text-[12px]">No {activePayoutTab.toLowerCase()} payouts found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-8 bg-[#FDFDFD] border-t border-[#EEEEEE] flex items-center justify-between">
                    <p className="text-[13px] text-[#AEAEAE] font-bold uppercase tracking-wider">
                        {activePayoutTab === 'Pending' ? 'Active Volume' : 'Total Executed'}: <span className="text-[#181725] font-[900]">$27,600.00</span>
                    </p>
                    <div className="flex items-center">
                        <div className="flex items-center border border-[#EEEEEE] rounded-[12px] overflow-hidden bg-white">
                            <button className="px-5 py-2.5 text-[14px] font-bold text-[#181725] hover:bg-[#F8F9FB] border-r border-[#EEEEEE]">Previous</button>
                            <button className="w-[44px] h-[44px] flex items-center justify-center text-[14px] font-bold bg-[#299E60] text-white">1</button>
                            <button className="w-[44px] h-[44px] flex items-center justify-center text-[14px] font-bold text-[#181725] hover:bg-[#F8F9FB] border-l border-[#EEEEEE]">2</button>
                            <button className="px-5 py-2.5 text-[14px] font-bold text-[#181725] hover:bg-[#F8F9FB] border-l border-[#EEEEEE]">Next</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {toast && (
                <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-[#181725] text-white px-6 py-4 rounded-[16px] shadow-2xl flex items-center gap-3 border border-white/10">
                        <div className="w-8 h-8 rounded-full bg-[#299E60] flex items-center justify-center">
                            <CheckCircle2 size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[14px] font-bold">{toast.message}</p>
                            <p className="text-[12px] text-[#AEAEAE]">Platform Finance Ledger Updated</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
