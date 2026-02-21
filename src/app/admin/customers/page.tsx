'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Users,
    Package,
    Headphones,
    ClipboardList,
    TrendingUp,
    TrendingDown,
    Eye,
    Pencil,
    Trash2,
    Search,
    ChevronDown,
    MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATS = [
    {
        label: 'All Customers',
        value: '+22.63k',
        change: '+34.4%',
        trend: 'up',
        icon: Users,
        bgColor: 'bg-[#299E60]/10',
        iconColor: 'text-[#299E60]'
    },
    {
        label: 'Orders',
        value: '+4.5k',
        change: '+8.1%',
        trend: 'down',
        icon: Package,
        bgColor: 'bg-[#299E60]/10',
        iconColor: 'text-[#299E60]'
    },
    {
        label: 'Services Request',
        value: '+1.03k',
        change: '+12.6%',
        trend: 'up',
        icon: Headphones,
        bgColor: 'bg-[#299E60]/10',
        iconColor: 'text-[#299E60]'
    },
    {
        label: 'Invoice & Payment',
        value: '$38,908.00',
        change: '+45.9%',
        trend: 'up',
        icon: ClipboardList,
        bgColor: 'bg-[#299E60]/10',
        iconColor: 'text-[#299E60]'
    },
];

const CUSTOMERS = [
    {
        name: 'Michael A. Miner',
        avatar: '/images/avatars/avatar-1.png',
        invoiceId: '#INV2540',
        status: 'Completed',
        totalAmount: '$4,521',
        amountDue: '$8,901',
        dueDate: '07 Jan, 2023',
        paymentMethod: 'Mastercard'
    },
    {
        name: 'Theresa T. Brose',
        avatar: '/images/avatars/avatar-2.png',
        invoiceId: '#INV3924',
        status: 'Cancel',
        totalAmount: '$7,836',
        amountDue: '$9,902',
        dueDate: '03 Dec, 2023',
        paymentMethod: 'Visa'
    },
    {
        name: 'James L. Erickson',
        avatar: '/images/avatars/avatar-3.png',
        invoiceId: '#INV5032',
        status: 'Completed',
        totalAmount: '$1,347',
        amountDue: '$6,718',
        dueDate: '28 Sep, 2023',
        paymentMethod: 'Paypal'
    },
    {
        name: 'Lily W. Wilson',
        avatar: '/images/avatars/avatar-4.png',
        invoiceId: '#INV1695',
        status: 'Pending',
        totalAmount: '$9,457',
        amountDue: '$3,928',
        dueDate: '10 Aug, 2023',
        paymentMethod: 'Mastercard'
    },
    {
        name: 'Sarah M. Brooks',
        avatar: '/images/avatars/avatar-5.png',
        invoiceId: '#INV8473',
        status: 'Cancel',
        totalAmount: '$4,214',
        amountDue: '$9,814',
        dueDate: '22 May, 2023',
        paymentMethod: 'Visa'
    },
    {
        name: 'Joe K. Hall',
        avatar: '/images/avatars/avatar-6.png',
        invoiceId: '#INV2150',
        status: 'Completed',
        totalAmount: '$2,513',
        amountDue: '$5,891',
        dueDate: '15 Mar, 2023',
        paymentMethod: 'Paypal'
    },
    {
        name: 'Ralph Hueber',
        avatar: '/images/avatars/avatar-7.png',
        invoiceId: '#INV5636',
        status: 'Completed',
        totalAmount: '$3,103',
        amountDue: '$8,415',
        dueDate: '15 Mar, 2023',
        paymentMethod: 'Visa'
    },
    {
        name: 'Sarah Drescher',
        avatar: '/images/avatars/avatar-8.png',
        invoiceId: '#INV2940',
        status: 'Completed',
        totalAmount: '$2,416',
        amountDue: '$7,715',
        dueDate: '15 Mar, 2023',
        paymentMethod: 'Mastercard'
    },
    {
        name: 'Leonie Meister',
        avatar: '/images/avatars/avatar-9.png',
        invoiceId: '#INV9027',
        status: 'Pending',
        totalAmount: '$1,367',
        amountDue: '$3,651',
        dueDate: '15 Mar, 2023',
        paymentMethod: 'Paypal'
    },
];

export default function CustomersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<number | null>(null);

    const filteredCustomers = CUSTOMERS.filter(customer =>
        customer.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Close menu when clicking anywhere else
    React.useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        if (activeMenu !== null) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenu]);

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div>
                <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Customers</h1>
                <p className="text-[#000000] text-[13px] font-medium opacity-70">Whole data about your Customers</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {STATS.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[14px] border border-[#EEEEEE] shadow-sm hover:shadow-md transition-all h-[130px] flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", stat.bgColor)}>
                                <stat.icon size={20} className={stat.iconColor} />
                            </div>
                            <span className="text-[14px] font-bold text-[#4B4B4B]">{stat.label}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <h4 className="text-[22px] font-[800] text-[#181725] leading-none">{stat.value}</h4>
                            <div className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                                stat.trend === 'up' ? "bg-[#EEF8F1] text-[#299E60]" : "bg-[#FFF0F0] text-[#E74C3C]"
                            )}>
                                {stat.change}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Customers Table Section */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#EEEEEE] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-[18px] font-bold text-[#181725]">All Customers List</h3>
                    <div className="flex items-center gap-3">
                        {/* Search Bar */}
                        <div className="relative group w-full md:w-[210px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                            <input
                                type="text"
                                placeholder="search Invoice ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-[40px] w-full bg-white border border-[#DCDCDC] rounded-[10px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 border border-[#EEEEEE] rounded-lg text-[13px] font-bold text-[#4B4B4B] hover:bg-gray-50 transition-colors shrink-0">
                            This Month
                            <ChevronDown size={14} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white">
                                <th className="p-4 w-12 text-center">
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-[#299E60] cursor-pointer" />
                                </th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Customer Name</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Invoice ID</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Status</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Total Amount</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Amount Due</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Due Date</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Payment Method</th>
                                <th className="p-4 text-center text-[14px] font-[800] text-[#4B4B4B]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((customer, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4 text-center">
                                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-[#299E60] cursor-pointer" />
                                        </td>
                                        <td className="p-4">
                                            <Link href="/admin/customers/1" className="flex items-center gap-3 group/name cursor-pointer w-fit">
                                                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0 border border-transparent group-hover/name:border-[#299E60]/30 transition-all">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${customer.name}`}
                                                        alt={customer.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <span className="text-[14px] font-[800] text-[#181725] transition-all tracking-tight">
                                                    {customer.name}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="p-4 text-[13px] font-medium text-[#7C7C7C]">{customer.invoiceId}</td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold ml",
                                                customer.status === 'Completed' ? "bg-[#EEF8F1] text-[#299E60]" :
                                                    customer.status === 'Cancel' ? "bg-[#FFF0F0] text-[#E74C3C]" :
                                                        "bg-[#FFF7ED] text-[#F59E0B]"
                                            )}>
                                                {customer.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[14px] font-bold text-[#181725]">{customer.totalAmount}</td>
                                        <td className="p-4 text-[14px] font-bold text-[#181725]">{customer.amountDue}</td>
                                        <td className="p-4 text-[13px] font-medium text-[#7C7C7C]">{customer.dueDate}</td>
                                        <td className="p-4 text-[13px] font-medium text-[#7C7C7C]">{customer.paymentMethod}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2 relative">
                                                <Link href="/admin/customers/1" className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] bg-[#EEF8F1] text-[#299E60] hover:bg-[#299E60] hover:text-white transition-all shadow-sm">
                                                    <Eye size={16} />
                                                </Link>

                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenu(activeMenu === idx ? null : idx);
                                                        }}
                                                        className={cn(
                                                            "w-[34px] h-[34px] flex items-center justify-center rounded-[10px] transition-all shadow-sm",
                                                            activeMenu === idx ? "bg-gray-100 text-gray-900 border border-gray-200" : "bg-white border border-[#EEEEEE] text-[#7C7C7C] hover:bg-gray-50"
                                                        )}
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeMenu === idx && (
                                                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-[8px] shadow-xl border border-gray-100 z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                            <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-semibold text-[#4B4B4B] hover:bg-gray-50 transition-colors">
                                                                <Pencil size={14} className="text-gray-400" />
                                                                Edit
                                                            </button>
                                                            <div className="h-[1px] bg-gray-100 mx-2" />
                                                            <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors">
                                                                <Trash2 size={14} />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="py-20 text-center text-[#AEAEAE] font-medium">
                                        No customers found matching "{searchQuery}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
