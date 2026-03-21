'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Check,
    X,
    Search,
    Clock,
    CheckCircle,
    Users,
    Loader2,
    ClipboardList,
    Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface VendorUser {
    id: string;
    fullName: string;
    email: string;
    phone: string;
}

interface Vendor {
    id: string;
    businessName: string;
    slug: string;
    logoUrl: string | null;
    rating: number;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    user: VendorUser;
    _count: {
        products: number;
        orders: number;
    };
}

type TabKey = 'Pending' | 'Approved' | 'All';

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function ApprovalsPage() {
    const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
    const [approvedVendors, setApprovedVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('Pending');

    const fetchVendors = useCallback(async () => {
        setLoading(true);
        try {
            const [pendingRes, approvedRes] = await Promise.all([
                fetch('/api/v1/admin/vendors?verified=false&limit=50'),
                fetch('/api/v1/admin/vendors?verified=true&limit=50'),
            ]);
            const pendingData = await pendingRes.json();
            const approvedData = await approvedRes.json();

            if (pendingData.success) {
                setPendingVendors(pendingData.data.vendors);
            }
            if (approvedData.success) {
                setApprovedVendors(approvedData.data.vendors);
            }
        } catch (err) {
            console.error('Failed to fetch vendors:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);

    const handleApprove = async (vendor: Vendor) => {
        setActionLoading(vendor.id);
        try {
            const res = await fetch(`/api/v1/admin/vendors/${vendor.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isVerified: true }),
            });
            const data = await res.json();
            if (data.success || res.ok) {
                const updated = { ...vendor, isVerified: true };
                setPendingVendors((prev) => prev.filter((v) => v.id !== vendor.id));
                setApprovedVendors((prev) => [updated, ...prev]);
            }
        } catch (err) {
            console.error('Failed to approve vendor:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRevoke = async (vendor: Vendor) => {
        setActionLoading(vendor.id);
        try {
            const res = await fetch(`/api/v1/admin/vendors/${vendor.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isVerified: false }),
            });
            const data = await res.json();
            if (data.success || res.ok) {
                const updated = { ...vendor, isVerified: false };
                setApprovedVendors((prev) => prev.filter((v) => v.id !== vendor.id));
                setPendingVendors((prev) => [updated, ...prev]);
            }
        } catch (err) {
            console.error('Failed to revoke vendor:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const allVendors = [...pendingVendors, ...approvedVendors];

    const getDisplayVendors = (): Vendor[] => {
        let list: Vendor[];
        if (activeTab === 'Pending') list = pendingVendors;
        else if (activeTab === 'Approved') list = approvedVendors;
        else list = allVendors;

        if (!searchQuery.trim()) return list;

        const q = searchQuery.toLowerCase();
        return list.filter(
            (v) =>
                v.businessName.toLowerCase().includes(q) ||
                v.user.fullName.toLowerCase().includes(q) ||
                v.user.email.toLowerCase().includes(q)
        );
    };

    const displayVendors = getDisplayVendors();

    const stats = [
        {
            label: 'Total Pending',
            value: pendingVendors.length,
            icon: Clock,
            color: '#F59E0B',
            bgColor: '#FFF7E6',
        },
        {
            label: 'Approved',
            value: approvedVendors.length,
            icon: CheckCircle,
            color: '#299E60',
            bgColor: '#EEF8F1',
        },
        {
            label: 'Total Vendors',
            value: allVendors.length,
            icon: Users,
            color: '#3B82F6',
            bgColor: '#EFF6FF',
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-[#299E60]" />
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-[28px] font-[900] text-[#181725] tracking-tight">
                    Vendor Approvals
                </h1>
                <p className="text-[#7C7C7C] font-medium mt-1">
                    Review and manage vendor verification requests
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        className="bg-white p-6 rounded-[20px] border border-[#EEEEEE] shadow-sm flex items-center gap-5"
                    >
                        <div
                            className="w-[64px] h-[64px] rounded-[16px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: stat.bgColor, color: stat.color }}
                        >
                            <stat.icon size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[14px] font-bold text-[#AEAEAE] mb-1 uppercase tracking-wider">
                                {stat.label}
                            </p>
                            <h3 className="text-[32px] font-[900] text-[#181725] leading-none">
                                {stat.value}
                            </h3>
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
                            {(['Pending', 'Approved', 'All'] as TabKey[]).map((tab) => {
                                const count =
                                    tab === 'Pending'
                                        ? pendingVendors.length
                                        : tab === 'Approved'
                                          ? approvedVendors.length
                                          : allVendors.length;
                                const TabIcon =
                                    tab === 'Pending'
                                        ? Clock
                                        : tab === 'Approved'
                                          ? CheckCircle
                                          : Users;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            'flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[14px] font-bold transition-all',
                                            activeTab === tab
                                                ? 'bg-white text-[#181725] shadow-sm'
                                                : 'text-[#AEAEAE] hover:text-[#7C7C7C]'
                                        )}
                                    >
                                        <TabIcon size={18} strokeWidth={2.5} />
                                        {tab}
                                        <span
                                            className={cn(
                                                'px-2 py-0.5 rounded-[6px] text-[11px] font-[900]',
                                                activeTab === tab
                                                    ? 'bg-[#299E60] text-white'
                                                    : 'bg-[#EEEEEE] text-[#AEAEAE]'
                                            )}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <h2 className="text-[20px] font-[900] text-[#181725]">
                                {activeTab} Vendors
                            </h2>
                            <div className="relative min-w-[300px]">
                                <Search
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AEAEAE]"
                                    size={18}
                                />
                                <input
                                    type="text"
                                    placeholder="Search by name, owner, or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#F8F9FB] border border-[#EEEEEE] rounded-[14px] py-3 pl-11 pr-4 text-[14px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F8F9FB]">
                                <th className="px-8 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Vendor
                                </th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Owner
                                </th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Products
                                </th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Date Joined
                                </th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-8 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {displayVendors.map((vendor) => (
                                <tr
                                    key={vendor.id}
                                    className="hover:bg-[#F8F9FB] transition-colors group"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            {vendor.logoUrl ? (
                                                <img
                                                    src={vendor.logoUrl}
                                                    alt={vendor.businessName}
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold border-2 border-white shadow-sm bg-[#EEF8F1] text-[#299E60]">
                                                    {getInitials(vendor.businessName)}
                                                </div>
                                            )}
                                            <Link
                                                href={`/admin/vendors/${vendor.id}`}
                                                className="text-[15px] font-extrabold text-[#181725] group-hover:text-[#299E60] transition-colors hover:underline"
                                            >
                                                {vendor.businessName}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-[14px] font-semibold text-[#181725]">
                                            {vendor.user.fullName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-[14px] text-[#7C7C7C] font-medium">
                                            {vendor.user.email}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1.5">
                                            <Store size={14} className="text-[#AEAEAE]" />
                                            <span className="text-[14px] font-bold text-[#181725]">
                                                {vendor._count.products}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-[14px] text-[#7C7C7C] font-semibold">
                                            {formatDate(vendor.createdAt)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1.5 text-[11px] font-[900] px-3 py-1.5 rounded-[8px] uppercase tracking-wider border',
                                                vendor.isVerified
                                                    ? 'bg-[#EEF8F1] text-[#299E60] border-[#299E60]/10'
                                                    : 'bg-[#FFF7E6] text-[#F59E0B] border-[#F59E0B]/10'
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'w-1.5 h-1.5 rounded-full',
                                                    vendor.isVerified
                                                        ? 'bg-[#299E60]'
                                                        : 'bg-[#F59E0B]'
                                                )}
                                            />
                                            {vendor.isVerified ? 'Verified' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        {vendor.isVerified ? (
                                            <button
                                                onClick={() => handleRevoke(vendor)}
                                                disabled={actionLoading === vendor.id}
                                                className="flex items-center gap-1.5 h-[42px] px-4 bg-[#E74C3C] hover:bg-[#cf4436] text-white rounded-[10px] text-[13px] font-bold shadow-sm shadow-[#E74C3C]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {actionLoading === vendor.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <X size={16} strokeWidth={3} />
                                                )}
                                                Revoke
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleApprove(vendor)}
                                                disabled={actionLoading === vendor.id}
                                                className="flex items-center gap-1.5 h-[42px] px-4 bg-[#299E60] hover:bg-[#238a54] text-white rounded-[10px] text-[13px] font-bold shadow-sm shadow-[#299E60]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {actionLoading === vendor.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Check size={16} strokeWidth={3} />
                                                )}
                                                Approve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {displayVendors.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-[#F8F9FB] rounded-full flex items-center justify-center text-[#AEAEAE]">
                                                <ClipboardList size={32} />
                                            </div>
                                            <p className="text-[#AEAEAE] font-bold">
                                                No {activeTab.toLowerCase()} vendors found
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-8 bg-[#FDFDFD] border-t border-[#EEEEEE]">
                    <p className="text-[13px] text-[#AEAEAE] font-bold uppercase tracking-wider">
                        Showing{' '}
                        <span className="text-[#181725]">{displayVendors.length}</span> vendor
                        {displayVendors.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}
