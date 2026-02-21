'use client';

import React, { useState } from 'react';
import {
    Check,
    X,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    Timer,
    ArrowUpRight,
    MoreVertical,
    CheckSquare,
    ClipboardList,
    XCircle,
    CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion } from 'framer-motion';



const APPROVAL_STATS = [
    {
        label: 'Total Pending',
        value: '42',
        trend: '3 urgent',
        icon: Clock,
        color: '#299E60',
        bgColor: '#EEF8F1',
        trendColor: '#E74C3C'
    },
    {
        label: 'Approved Today',
        value: '15',
        trend: '+5 from yesterday',
        icon: CheckCircle2,
        color: '#F59E0B',
        bgColor: '#FFF7E6',
        trendColor: '#299E60'
    },
    {
        label: 'Avg. Response Time',
        value: '1.2 hrs',
        trend: 'Target: < 2 hrs',
        icon: Timer,
        color: '#3B82F6',
        bgColor: '#EFF6FF',
        trendColor: '#7C7C7C'
    }
];

const INITIAL_REQUESTS = [
    {
        id: 1,
        requester: { name: 'Sarah L.', initials: 'SL', color: '#FFEBE6', textColor: '#E74C3C' },
        type: 'Refund',
        amount: '$150.00',
        date: 'Oct 26, 2023',
        status: 'Pending',
        typeColor: '#FFF7E6',
        typeTextColor: '#F59E0B',
        href: '/admin/customers/sarah-l'
    },
    {
        id: 2,
        requester: { name: 'Michael C.', initials: 'MC', color: '#E6F4FF', textColor: '#0958D9' },
        type: 'New Vendor',
        amount: '-',
        date: 'Oct 26, 2023',
        status: 'Pending',
        typeColor: '#E6F4FF',
        typeTextColor: '#0958D9',
        href: '/admin/vendors/michael'
    },
    {
        id: 3,
        requester: { name: 'Anya B.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' },
        type: 'Price Change',
        amount: '+$2,500.00',
        date: 'Oct 25, 2023',
        status: 'Pending',
        typeColor: '#F9F0FF',
        typeTextColor: '#722ED1',
        href: '/admin/vendors/anya'
    },
    {
        id: 4,
        requester: { name: 'David K.', initials: 'DK', color: '#F6FFED', textColor: '#389E0D' },
        type: 'Expense',
        amount: '$45.20',
        date: 'Oct 25, 2023',
        status: 'Pending',
        typeColor: '#FFF7E6',
        typeTextColor: '#D46B08',
        href: '/admin/customers/david-k'
    },
    {
        id: 5,
        requester: { name: 'James W.', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop' },
        type: 'Withdrawal',
        amount: '$1,200.00',
        date: 'Oct 24, 2023',
        status: 'Pending',
        typeColor: '#E6FFFB',
        typeTextColor: '#08979C',
        href: '/admin/vendors/james'
    }
];

export default function ApprovalsPage() {
    const [requests, setRequests] = useState(INITIAL_REQUESTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');

    const handleAction = (id: number, newStatus: 'Approved' | 'Rejected') => {
        setRequests(prev => prev.map(req =>
            req.id === id ? { ...req, status: newStatus } : req
        ));
    };

    const filteredRequests = requests.filter(req => {
        const matchesTab = req.status === activeTab;
        const matchesSearch = req.requester.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const counts = {
        Pending: requests.filter(r => r.status === 'Pending').length,
        Approved: requests.filter(r => r.status === 'Approved').length,
        Rejected: requests.filter(r => r.status === 'Rejected').length,
    };

    const totalProcessed = counts.Approved + counts.Rejected;
    // Simulate improving response time based on processing activity
    const baseTime = 1.2;
    const peakEfficiency = 0.8;
    const efficiencyFactor = Math.min(totalProcessed * 0.05, baseTime - peakEfficiency);
    const dynamicResponseTime = (baseTime - efficiencyFactor).toFixed(1);

    const dynamicStats = [
        {
            label: 'Total Pending',
            value: counts.Pending,
            trend: 'Needs Review',
            icon: Clock,
            color: '#299E60',
            bgColor: '#EEF8F1',
            trendColor: '#F59E0B'
        },
        {
            label: 'Approved Today',
            value: 15 + counts.Approved,
            trend: '+5 from yesterday',
            icon: CheckCircle2,
            color: '#F59E0B',
            bgColor: '#FFF7E6',
            trendColor: '#299E60'
        },
        {
            label: 'Rejected Summary',
            value: counts.Rejected,
            trend: 'Non-compliant',
            icon: XCircle,
            color: '#E74C3C',
            bgColor: '#FFF2F0',
            trendColor: '#AEAEAE'
        },
        {
            label: 'Avg. Response Time',
            value: `${dynamicResponseTime} hrs`,
            trend: totalProcessed > 0 ? 'Improving Efficiency' : 'Target: < 2 hrs',
            icon: Timer,
            color: '#3B82F6',
            bgColor: '#EFF6FF',
            trendColor: totalProcessed > 0 ? '#299E60' : '#7C7C7C'
        }
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-[900] text-[#181725] tracking-tight">
                        Approval Requests
                    </h1>
                    <p className="text-[#7C7C7C] font-medium mt-1">Manage and review all incoming system requests</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="h-[44px] px-6 bg-white border border-[#EEEEEE] rounded-[12px] text-[14px] font-bold text-[#181725] hover:bg-gray-50 transition-all flex items-center gap-2">
                        Export Report <ArrowUpRight size={16} />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dynamicStats.map((stat, idx) => (
                    <div
                        key={idx}
                        className="bg-white p-6 rounded-[20px] border border-[#EEEEEE] shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow"
                    >
                        <div
                            className="w-[64px] h-[64px] rounded-[16px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: stat.bgColor, color: stat.color }}
                        >
                            <stat.icon size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[14px] font-bold text-[#AEAEAE] mb-1 uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-[32px] font-[900] text-[#181725] leading-none mb-2">
                                {stat.value}
                            </h3>
                            <div className="flex items-center gap-1">
                                <span className="text-[12px] font-extrabold" style={{ color: stat.trendColor }}>{stat.trend}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-[24px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-8 border-b border-[#EEEEEE]">
                    <div className="flex flex-col gap-8">
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-2 bg-[#F8F9FB] p-1.5 rounded-[16px] w-fit">
                            <button
                                onClick={() => setActiveTab('Pending')}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[14px] font-bold transition-all",
                                    activeTab === 'Pending'
                                        ? "bg-white text-[#181725] shadow-sm"
                                        : "text-[#AEAEAE] hover:text-[#7C7C7C]"
                                )}
                            >
                                <Clock size={18} strokeWidth={2.5} />
                                Pending
                                <span className={cn(
                                    "px-2 py-0.5 rounded-[6px] text-[11px] font-[900]",
                                    activeTab === 'Pending' ? "bg-[#299E60] text-white" : "bg-[#EEEEEE] text-[#AEAEAE]"
                                )}>{counts.Pending}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('Approved')}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[14px] font-bold transition-all",
                                    activeTab === 'Approved'
                                        ? "bg-white text-[#181725] shadow-sm"
                                        : "text-[#AEAEAE] hover:text-[#7C7C7C]"
                                )}
                            >
                                <CheckCircle size={18} strokeWidth={2.5} />
                                Approved
                                <span className={cn(
                                    "px-2 py-0.5 rounded-[6px] text-[11px] font-[900]",
                                    activeTab === 'Approved' ? "bg-[#299E60] text-white" : "bg-[#EEEEEE] text-[#AEAEAE]"
                                )}>{counts.Approved}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('Rejected')}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[14px] font-bold transition-all",
                                    activeTab === 'Rejected'
                                        ? "bg-white text-[#181725] shadow-sm"
                                        : "text-[#AEAEAE] hover:text-[#7C7C7C]"
                                )}
                            >
                                <XCircle size={18} strokeWidth={2.5} />
                                Rejected
                                <span className={cn(
                                    "px-2 py-0.5 rounded-[6px] text-[11px] font-[900]",
                                    activeTab === 'Rejected' ? "bg-[#E74C3C] text-white" : "bg-[#EEEEEE] text-[#AEAEAE]"
                                )}>{counts.Rejected}</span>
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <h2 className="text-[20px] font-[900] text-[#181725]">
                                {activeTab} Requests
                            </h2>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search Bar */}
                                <div className="relative group min-w-[300px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or type..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#F8F9FB] border border-[#EEEEEE] rounded-[14px] py-3 pl-11 pr-4 text-[14px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                    />
                                </div>

                                {/* Filter Button */}
                                <button className="h-[48px] px-5 border border-[#EEEEEE] rounded-[14px] text-[14px] font-bold text-[#181725] hover:bg-gray-50 transition-all flex items-center gap-2">
                                    <Filter size={18} />
                                    Filter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F8F9FB]">
                                <th className="px-8 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">Requester</th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">Type</th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider text-left">Status</th>
                                {activeTab === 'Pending' && (
                                    <th className="px-8 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider text-left">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {filteredRequests.map((request) => (
                                <tr key={request.id} className="hover:bg-[#FDFDFD] transition-colors group">
                                    <td className="px-8 py-5">
                                        <Link
                                            href={(request as any).href || '#'}
                                            className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity"
                                        >
                                            {request.requester.avatar ? (
                                                <img src={request.requester.avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                            ) : (
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold border-2 border-white shadow-sm"
                                                    style={{ backgroundColor: request.requester.color, color: request.requester.textColor }}
                                                >
                                                    {request.requester.initials}
                                                </div>
                                            )}
                                            <span className="text-[15px] font-extrabold text-[#181725]">{request.requester.name}</span>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span
                                            className="px-3.5 py-1.5 rounded-full text-[12px] font-[800] tracking-wide"
                                            style={{ backgroundColor: request.typeColor, color: request.typeTextColor }}
                                        >
                                            {request.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={cn(
                                            "text-[15px] font-[900]",
                                            request.amount.startsWith('+') ? "text-[#299E60]" : "text-[#181725]"
                                        )}>
                                            {request.amount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-[14px] text-[#7C7C7C] font-semibold">{request.date}</span>
                                    </td>
                                    <td className="px-6 py-5 text-left">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 text-[11px] font-[900] px-3 py-1.5 rounded-[8px] uppercase tracking-wider border",
                                            request.status === 'Pending' ? "bg-[#FFF7E6] text-[#F59E0B] border-[#F59E0B]/10" :
                                                request.status === 'Approved' ? "bg-[#EEF8F1] text-[#299E60] border-[#299E60]/10" :
                                                    "bg-[#FFF2F0] text-[#E74C3C] border-[#E74C3C]/10"
                                        )}>
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                request.status === 'Pending' ? "bg-[#F59E0B]" :
                                                    request.status === 'Approved' ? "bg-[#299E60]" : "bg-[#E74C3C]"
                                            )}></span> {request.status}
                                        </span>
                                    </td>
                                    {activeTab === 'Pending' && (
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2.5">
                                                <button
                                                    onClick={() => handleAction(request.id, 'Approved')}
                                                    className="flex items-center gap-1.5 h-[42px] px-4 bg-[#299E60] hover:bg-[#238a54] text-white rounded-[10px] text-[13px] font-bold shadow-sm shadow-[#299E60]/20 transition-all active:scale-95"
                                                >
                                                    <Check size={16} strokeWidth={3} />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(request.id, 'Rejected')}
                                                    className="flex items-center gap-1.5 h-[42px] px-4 bg-[#E74C3C] hover:bg-[#cf4436] text-white rounded-[10px] text-[13px] font-bold shadow-sm shadow-[#E74C3C]/20 transition-all active:scale-95"
                                                >
                                                    <X size={16} strokeWidth={3} />
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-[#F8F9FB] rounded-full flex items-center justify-center text-[#AEAEAE]">
                                                <ClipboardList size={32} />
                                            </div>
                                            <p className="text-[#AEAEAE] font-bold">No {activeTab.toLowerCase()} requests found</p>
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
                        Showing <span className="text-[#181725]">{filteredRequests.length}</span> of <span className="text-[#181725]">{requests.filter(r => r.status === activeTab).length}</span> {activeTab.toLowerCase()} requests
                    </p>
                    <div className="flex items-center">
                        <div className="flex items-center border border-[#EEEEEE] rounded-[12px] overflow-hidden bg-white">
                            <button className="px-5 py-2.5 text-[14px] font-bold text-[#181725] hover:bg-[#F8F9FB] border-r border-[#EEEEEE] transition-colors">
                                Previous
                            </button>
                            <button className="w-[44px] h-[44px] flex items-center justify-center text-[14px] font-bold bg-[#299E60] text-white transition-colors">
                                1
                            </button>
                            <button className="w-[44px] h-[44px] flex items-center justify-center text-[14px] font-bold text-[#181725] hover:bg-[#F8F9FB] border-l border-[#EEEEEE] transition-colors">
                                2
                            </button>
                            <button className="px-5 py-2.5 text-[14px] font-bold text-[#181725] hover:bg-[#F8F9FB] border-l border-[#EEEEEE] transition-colors">
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
