'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    Mail,
    Phone,
    CheckCircle2,
    Send,
    BarChart2,
    Pencil,
    FileText,
    Package,
    DollarSign,
    ArrowDownLeft,
    ChevronRight,
    MapPin,
    Globe,
    CreditCard,
    Settings,
    ChevronDown,
    Plus,
    MoreVertical,
    TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

const BALANCE_DATA = [
    { name: 'Jan', value: 30 },
    { name: 'Feb', value: 45 },
    { name: 'Mar', value: 35 },
    { name: 'Apr', value: 50 },
    { name: 'May', value: 40 },
    { name: 'Jun', value: 60 },
    { name: 'Jul', value: 50 },
    { name: 'Aug', value: 70 },
    { name: 'Sep', value: 55 },
    { name: 'Oct', value: 65 },
    { name: 'Nov', value: 50 },
    { name: 'Dec', value: 45 }
];

const TRANSACTION_HISTORY = [
    { id: '#INV2540', status: 'Completed', amount: '$421.00', date: '07 Jan, 2023', method: 'Mastercard' },
    { id: '#INV3924', status: 'Cancel', amount: '$736.00', date: '03 Dec, 2023', method: 'Visa' },
    { id: '#INV5032', status: 'Completed', amount: '$347.00', date: '28 Sep, 2023', method: 'Paypal' },
    { id: '#INV1695', status: 'Pending', amount: '$457.00', date: '10 Aug, 2023', method: 'Mastercard' },
    { id: '#INV8473', status: 'Completed', amount: '$414.00', date: '22 May, 2023', method: 'Visa' },
];

export default function CustomerDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-6 pb-10">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 text-[14px] text-[#4B4B4B]">
                <button onClick={() => router.back()} className="hover:text-[#299E60] flex items-center gap-1 transition-colors">
                    <ChevronLeft size={16} />
                    Back
                </button>
                <span className="text-gray-300">|</span>
                <span className="font-bold text-[#181725]">Customer Details</span>
            </div>

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* Left Column (Span 4) */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden shrink-0">
                        <div className="h-24 bg-[#299E60] relative">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
                        </div>
                        <div className="px-6 pb-6 relative">
                            <div className="absolute -top-10 left-6">
                                <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Michael" alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="pt-12">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-[20px] font-[800] text-[#181725]">Michael A. Miner</h2>
                                    <CheckCircle2 size={18} className="text-[#299E60]" fill="#EEF8F1" />
                                </div>
                                <p className="text-[14px] text-[#299E60] font-bold mb-4">@michael_cus_2024</p>
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-[14px] text-[#4B4B4B]">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#7C7C7C]"><Mail size={16} /></div>
                                        <span className="font-bold">michaelaminer@dayrep.com</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[14px] text-[#4B4B4B]">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#7C7C7C]"><Phone size={16} /></div>
                                        <span className="font-bold">+28 (57) 760-010-27</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="flex-1 bg-[#299E60] text-white py-2.5 rounded-xl text-[14px] font-[800] hover:bg-[#238a53] transition-all flex items-center justify-center gap-2 shadow-sm">
                                        <Send size={16} /> Send Message
                                    </button>
                                    <button className="flex-1 bg-[#F5F5F5] text-[#4B4B4B] py-2.5 rounded-xl text-[14px] font-[800] hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                                        <BarChart2 size={16} /> Analytics
                                    </button>
                                    <button className="w-10 h-10 border border-[#EEEEEE] rounded-xl flex items-center justify-center text-[#7C7C7C] hover:bg-gray-50 transition-all"><Pencil size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Details Card */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden shrink-0">
                        <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
                            <h3 className="font-[800] text-[16px] text-[#181725]">Customer Details</h3>
                            <span className="bg-[#EEF8F1] text-[#299E60] text-[11px] font-[800] px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#299E60] animate-pulse shadow-[0_0_8px_rgba(41,158,96,0.5)]"></span>
                                Active User
                            </span>
                        </div>
                        <div className="divide-y divide-[#EEEEEE]">
                            <div className="px-6 py-4 flex items-center justify-between text-[13px]">
                                <span className="font-[800] text-[#4B4B4B]">Account ID :</span>
                                <span className="font-[800] text-[#181725]">#AC-278699</span>
                            </div>
                            <div className="px-6 py-4 flex items-center justify-between text-[13px]">
                                <span className="font-[800] text-[#4B4B4B]">Invoice Email :</span>
                                <span className="font-[800] text-[#181725]">michaelaminer@dayrep.com</span>
                            </div>
                            <div className="px-6 py-4 flex items-start justify-between gap-4 text-[13px]">
                                <span className="font-[800] text-[#4B4B4B] shrink-0">Delivery Address :</span>
                                <span className="font-[800] text-[#181725] leading-relaxed text-right">62, rue des Nations Unies 22000 SAINT-BRIEUC</span>
                            </div>
                            <div className="px-6 py-4 flex items-center justify-between text-[13px]">
                                <span className="font-[800] text-[#4B4B4B]">Language :</span>
                                <span className="font-[800] text-[#181725]">English</span>
                            </div>
                            <div className="px-6 py-4 flex items-center justify-between text-[13px]">
                                <span className="font-[800] text-[#4B4B4B]">Latest Invoice Id :</span>
                                <span className="font-[800] text-[#181725]">#INV2540</span>
                            </div>
                        </div>
                    </div>

                    {/* Latest Invoice Card */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-[16px] font-[800] text-[#181725]">Latest Invoice</h3>
                                <p className="text-[12px] text-[#7C7C7C] font-bold">Total 234 file, 2.5GB used</p>
                            </div>
                            <button className="px-3 py-1.5 bg-[#299E60] text-white rounded-[8px] text-[12px] font-[800] hover:bg-[#238a53] transition-all">View All</button>
                        </div>
                        <div className="space-y-3" ref={menuRef}>
                            {[
                                { id: '#INV2540', date: '16 May 2024' },
                                { id: '#INV0914', date: '17 Jan 2024' },
                                { id: '#INV3801', date: '09 Nov 2023' },
                                { id: '#INV4782', date: '21 Aug 2023' }
                            ].map((inv, i) => (
                                <div key={i} className="flex items-center justify-between p-3.5 bg-[#fcfcfd] rounded-lg border border-[#F1F4F9] hover:border-[#299E60]/20 transition-all cursor-pointer group relative">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-[10px] bg-[#EAF7EF] flex items-center justify-center text-[#299E60] shadow-sm">
                                            <FileText size={20} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="text-[13px] font-[800] text-[#181725]">Invoice Id {inv.id}</h4>
                                            <p className="text-[11px] text-[#7C7C7C] font-[800]">{inv.date}</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenu(openMenu === i ? null : i);
                                            }}
                                            className="p-1 text-[#C0C0C0] hover:text-[#181725] transition-colors cursor-pointer"
                                        >
                                            <MoreVertical size={18} />
                                        </button>

                                        {openMenu === i && (
                                            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-[#EEEEEE] py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                <button className="w-full text-left px-4 py-2.5 text-[13px] font-[800] text-[#4B4B4B] hover:bg-[#EEF8F1] hover:text-[#299E60] transition-colors cursor-pointer">Download</button>
                                                <button className="w-full text-left px-4 py-2.5 text-[13px] font-[800] text-[#4B4B4B] hover:bg-[#EEF8F1] hover:text-[#299E60] transition-colors cursor-pointer">Share</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column (Span 8) */}
                <div className="xl:col-span-8 flex flex-col gap-6 h-full">

                    {/* Summary Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                        {[
                            { label: 'Total Invoice', value: '234', icon: FileText },
                            { label: 'Total Order', value: '219', icon: Package },
                            { label: 'Total Expense', value: '$2,189', icon: DollarSign }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-5 rounded-[14px] border border-[#EEEEEE] flex items-center justify-between shadow-sm">
                                <div className="space-y-1">
                                    <p className="text-[13px] font-[800] text-[#7C7C7C]">{stat.label}</p>
                                    <h4 className="text-[22px] font-[800] text-[#181725]">{stat.value}</h4>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-[#299E60]/10 flex items-center justify-center text-[#299E60]"><stat.icon size={20} /></div>
                            </div>
                        ))}
                    </div>

                    {/* Transaction History Table */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden p-6 pb-0 shrink-0">
                        <h3 className="text-[18px] font-[800] text-[#181725] mb-4">Transaction History</h3>
                        <div className="overflow-x-auto -mx-6">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#EEEEEE]">
                                        <th className="px-6 py-4 text-left text-[13px] font-[800] text-[#4B4B4B]">Invoice ID</th>
                                        <th className="px-6 py-4 text-left text-[13px] font-[800] text-[#4B4B4B]">Status</th>
                                        <th className="px-6 py-4 text-left text-[13px] font-[800] text-[#4B4B4B]">Total Amount</th>
                                        <th className="px-6 py-4 text-left text-[13px] font-[800] text-[#4B4B4B]">Due Date</th>
                                        <th className="px-6 py-4 text-left text-[13px] font-[800] text-[#4B4B4B]">Payment Method</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EEEEEE]">
                                    {TRANSACTION_HISTORY.map((tx, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-[13px] font-[800] text-[#7C7C7C]">{tx.id}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center justify-center px-3 py-1 rounded-md text-[10px] font-[800] min-w-[75px]",
                                                    tx.status === 'Completed' ? "bg-[#EEF8F1] text-[#299E60]" :
                                                        tx.status === 'Cancel' ? "bg-[#FFF0F0] text-[#E74C3C]" : "bg-[#FFF7ED] text-[#F59E0B]"
                                                )}>{tx.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-[14px] font-[800] text-[#181725] text-left">{tx.amount}</td>
                                            <td className="px-6 py-4 text-[13px] font-[800] text-[#7C7C7C]">{tx.date}</td>
                                            <td className="px-6 py-4 text-[13px] font-[800] text-[#7C7C7C]">
                                                <div className="flex items-center gap-2">
                                                    {tx.method === 'Mastercard' && <div className="w-6 h-4 bg-[#EB001B]/10 rounded-sm flex items-center justify-center text-[8px] font-black text-[#EB001B]">MC</div>}
                                                    {tx.method === 'Visa' && <div className="w-6 h-4 bg-[#1434CB]/10 rounded-sm flex items-center justify-center text-[8px] font-black text-[#1434CB]">VISA</div>}
                                                    {tx.method === 'Paypal' && <div className="w-6 h-4 bg-[#003087]/10 rounded-sm flex items-center justify-center text-[8px] font-black text-[#003087]">PP</div>}
                                                    {tx.method}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 h-[643px] shrink-0">
                        {/* Points Card - High Fidelity Alignment */}
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm text-center flex flex-col h-full overflow-hidden">
                            <div className="w-full shrink-0">
                                <img
                                    src="/images/admin/reward-earn-celebration.png"
                                    alt="Reward"
                                    className="w-full h-[450px] object-cover animate-[float_4s_ease-in-out_infinite]"
                                    style={{ filter: 'hue-rotate(110deg) saturate(1.2)' }}
                                />
                                <style jsx global>{`
                                    @keyframes float {
                                        0%, 100% { transform: translateY(0) scale(1.02); }
                                        50% { transform: translateY(-8px) scale(1.02); }
                                    }
                                `}</style>
                            </div>

                            <div className="px-8 pb-6 flex-1 flex flex-col justify-end">
                                <div className="space-y-1 mb-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-[#299E60] flex items-center justify-center text-[10px] text-white">
                                            <DollarSign size={13} strokeWidth={3} />
                                        </div>
                                        <h4 className="text-[20px] font-[900] text-[#181725] tracking-tight">3,764 Points Earned</h4>
                                    </div>
                                    <p className="text-[13px] text-[#7C7C7C] font-[800] opacity-80 px-4">Collect reward points with each purchase.</p>
                                </div>

                                <div className="pt-6 border-t border-[#EEEEEE] flex gap-4">
                                    <button className="flex-1 bg-[#299E60] text-white py-3 rounded-xl text-[14px] font-[900] hover:bg-[#238a53] shadow-md transition-all active:scale-95">Earn Point</button>
                                    <button className="flex-1 bg-[#EEF8F1] text-[#299E60] py-3 rounded-xl text-[14px] font-[900] hover:bg-[#e2f2e7] transition-all active:scale-95">View Items</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 h-full">
                            {/* Payment Arrived Card */}
                            <div className="bg-white p-7 rounded-[14px] border border-[#EEEEEE] shadow-sm flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-full bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shadow-sm">
                                        <ArrowDownLeft size={28} />
                                    </div>
                                    <div>
                                        <h4 className="text-[17px] font-[800] text-[#181725] leading-none mb-1.5">Payment Arrived</h4>
                                        <p className="text-[13px] text-[#7C7C7C] font-[800] opacity-70">23 min ago</p>
                                    </div>
                                </div>
                                <span className="text-[22px] font-[900] text-[#181725] tracking-tight">$ 1,340</span>
                            </div>

                            {/* Balance Card - Aligned with Points Card */}
                            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-8 flex-1 flex flex-col">
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#EEF8F1] shadow-sm">
                                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Michael" alt="Avatar" />
                                            </div>
                                            <div>
                                                <h4 className="text-[16px] font-[800] text-[#181725]">Michael A. Miner</h4>
                                                <p className="text-[12px] text-[#7C7C7C] font-[800]">Welcome Back</p>
                                            </div>
                                        </div>
                                        <button className="w-10 h-10 rounded-xl border border-[#EEEEEE] flex items-center justify-center text-[#7C7C7C] hover:bg-gray-50 transition-colors"><Settings size={20} /></button>
                                    </div>

                                    <div className="flex items-end justify-between mb-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] font-[800] text-[#181725]">All Account</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                <span className="text-[13px] font-[800] text-[#7C7C7C]">Total Balance</span>
                                            </div>
                                            <h3 className="text-[32px] font-[900] text-[#181725] tracking-tighter leading-none flex items-center gap-3">
                                                $4,700
                                                <span className="bg-[#EEF8F1] text-[#299E60] text-[13px] font-[900] px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <TrendingUp size={12} />
                                                    +$232
                                                </span>
                                            </h3>
                                        </div>
                                        <div className="bg-gray-50 px-3 py-2 rounded-lg text-[12px] font-[800] text-[#7C7C7C] flex items-center gap-2 border border-[#EEEEEE] cursor-pointer hover:bg-gray-100 transition-colors">UTS <ChevronDown size={14} /></div>
                                    </div>

                                    <div className="h-54 w-full mt-6">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={BALANCE_DATA}>
                                                <defs>
                                                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#299E60" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#299E60" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid #EEEEEE', boxShadow: '0 8px 16px rgba(0,0,0,0.08)', padding: '8px 12px' }}
                                                    itemStyle={{ color: '#299E60', fontWeight: '900', fontSize: '13px' }}
                                                    cursor={{ stroke: '#299E60', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#299E60"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#balanceGradient)"
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6 shrink-0">
                                    <button className="flex-1 bg-[#299E60] text-white py-3 rounded-xl text-[14px] font-[900] shadow-md hover:bg-[#238a53] transition-all active:scale-95">Send</button>
                                    <button className="flex-1 bg-[#EEF8F1] text-[#299E60] py-3 rounded-xl text-[14px] font-[900] hover:bg-[#e2f2e7] transition-all active:scale-95">Receive</button>
                                    <button className="w-12 h-12 bg-[#EEF8F1] text-[#299E60] rounded-xl flex items-center justify-center hover:bg-[#e2f2e7] transition-all active:scale-95"><Plus size={20} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

