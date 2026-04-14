'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Search,
    Star,
    Mail,
    Phone,
    Loader2,
    Package,
    ShoppingBag,
    CheckCircle,
    XCircle,
    LayoutGrid,
    List,
    LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminVendor {
    id: string;
    businessName: string;
    slug: string;
    logoUrl: string | null;
    rating: number;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    user: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
    };
    _count: {
        products: number;
        orders: number;
    };
}

export default function VendorsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [vendors, setVendors] = useState<AdminVendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    const viewDashboard = async (vendorId: string) => {
        await fetch('/api/v1/admin/impersonate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId }),
        });
        router.push('/vendor/dashboard');
    };

    useEffect(() => {
        fetch('/api/v1/admin/vendors?limit=50')
            .then(res => res.json())
            .then(json => { if (json.success) setVendors(json.data.vendors); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filteredVendors = vendors.filter(vendor =>
        vendor.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleVerified = async (vendorId: string, isVerified: boolean) => {
        try {
            const res = await fetch(`/api/v1/admin/vendors/${vendorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isVerified: !isVerified }),
            });
            const json = await res.json();
            if (json.success) {
                setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, isVerified: !isVerified } : v));
            }
        } catch (err) {
            console.error('Failed to toggle vendor verification:', err);
        }
    };

    return (
        <div className="space-y-6 md:space-y-8 pb-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] md:text-[28px] font-bold text-[#000000] leading-none mb-1">Vendors List</h1>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70">Whole data about your Vendors</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group w-full md:w-[240px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                        <input
                            type="text"
                            placeholder="Search Vendors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-[44px] w-full bg-white border border-[#EEEEEE] rounded-[12px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                        />
                    </div>
                    {/* Grid / Table toggle — hidden on mobile (mobile always shows grid) */}
                    <div className="hidden md:flex items-center bg-white border border-[#EEEEEE] rounded-[10px] p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-2 rounded-[8px] transition-all",
                                viewMode === 'grid' ? "bg-[#299E60] text-white shadow-sm" : "text-[#AEAEAE] hover:text-[#181725]"
                            )}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-2 rounded-[8px] transition-all",
                                viewMode === 'table' ? "bg-[#299E60] text-white shadow-sm" : "text-[#AEAEAE] hover:text-[#181725]"
                            )}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-[#299E60]" size={32} />
                </div>
            ) : filteredVendors.length === 0 ? (
                <div className="bg-white rounded-[16px] border border-[#EEEEEE] p-20 text-center text-[#AEAEAE] font-medium">
                    {searchQuery ? `No vendors found matching "${searchQuery}"` : 'No vendors yet'}
                </div>
            ) : (
            /* Vendors — always grid on mobile, respect viewMode on desktop */
            (viewMode === 'grid' || typeof window !== 'undefined' && window.innerWidth < 768) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-[24px]">
                {filteredVendors.map((vendor) => (
                    <div
                        key={vendor.id}
                        className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all w-full"
                    >
                        {/* Top Logo Box */}
                        <div className="p-3">
                            <div className="bg-[#F1F4F9] rounded-[12px] h-[144px] relative flex items-center justify-center p-6">
                                {/* Verification badge */}
                                <div className={cn(
                                    "absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
                                    vendor.isVerified ? "bg-[#EEF8F1] text-[#299E60]" : "bg-[#FFF4E5] text-[#976538]"
                                )}>
                                    {vendor.isVerified ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                    {vendor.isVerified ? 'Verified' : 'Pending'}
                                </div>
                                {vendor.logoUrl ? (
                                    <img
                                        src={vendor.logoUrl}
                                        alt={vendor.businessName}
                                        className="w-[100px] h-[100px] object-contain rounded-full"
                                    />
                                ) : (
                                    <div className="w-[100px] h-[100px] rounded-full bg-[#299E60]/10 flex items-center justify-center">
                                        <span className="text-[32px] font-black text-[#299E60]">
                                            {vendor.businessName.charAt(0)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="px-6 pb-6 pt-2 flex flex-col flex-1">
                            <div className="mb-4">
                                <div className="flex items-center justify-between gap-1.5">
                                    <h3 className="text-[17px] font-extrabold text-[#181725] line-clamp-1">{vendor.businessName}</h3>
                                    <div className="flex items-center gap-1.5 bg-[#F5F9FD] px-2 py-1 rounded-md shrink-0">
                                        <Star size={14} fill="#F59E0B" className="text-[#F59E0B]" />
                                        <span className="text-[13px] font-bold text-[#181725]">{Number(vendor.rating).toFixed(1)}</span>
                                    </div>
                                </div>
                                <p className="text-[13px] text-[#7C7C7C] font-medium mt-1">Owner: {vendor.user.fullName}</p>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-3 my-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-[32px] h-[32px] rounded-[10px] bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <Mail size={15} />
                                    </div>
                                    <span className="text-[13px] font-[800] text-[#7C7C7C] truncate">{vendor.user.email}</span>
                                </div>
                                {vendor.user.phone && (
                                <div className="flex items-center gap-3">
                                    <div className="w-[32px] h-[32px] rounded-[10px] bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <Phone size={15} />
                                    </div>
                                    <span className="text-[13px] font-[800] text-[#7C7C7C]">{vendor.user.phone}</span>
                                </div>
                                )}
                            </div>

                            {/* Stats Row */}
                            <div className="mt-auto flex items-center border-t border-[#EEEEEE] -mx-6 pt-6 px-6">
                                <div className="flex-1 text-center">
                                    <p className="text-[16px] font-[900] text-[#181725] leading-none">{vendor._count.products}</p>
                                    <p className="text-[12px] font-bold text-[#AEAEAE] mt-2">Products</p>
                                </div>
                                <div className="w-[1px] h-10 bg-[#EEEEEE]" />
                                <div className="flex-1 text-center">
                                    <p className="text-[16px] font-[900] text-[#181725] leading-none">{vendor._count.orders}</p>
                                    <p className="text-[12px] font-bold text-[#AEAEAE] mt-2">Orders</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 border-t border-[#EEEEEE] flex flex-col gap-2">
                            <button
                                onClick={() => viewDashboard(vendor.id)}
                                className="w-full h-[42px] bg-[#299E60] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#238a54] transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                <LayoutDashboard size={14} />
                                View Dashboard
                            </button>
                            <div className="flex items-center gap-2">
                            <Link
                                href={`/admin/vendors/${vendor.id}`}
                                className="flex-1 h-[38px] bg-[#EEF8F1] text-[#299E60] rounded-[10px] text-[13px] font-bold hover:bg-[#e0f0e5] transition-all flex items-center justify-center"
                            >
                                Details
                            </Link>
                            {!vendor.isVerified ? (
                                <button
                                    onClick={() => toggleVerified(vendor.id, vendor.isVerified)}
                                    className="flex-1 h-[38px] bg-[#EEF8F1] text-[#299E60] rounded-[10px] text-[13px] font-bold hover:bg-[#e0f0e5] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <CheckCircle size={14} />
                                    Approve
                                </button>
                            ) : (
                                <button
                                    onClick={() => toggleVerified(vendor.id, vendor.isVerified)}
                                    className="flex-1 h-[38px] bg-[#FFF0F0] text-[#E74C3C] rounded-[10px] text-[13px] font-bold hover:bg-[#ffe5e5] transition-all flex items-center justify-center gap-1.5"
                                >
                                    <XCircle size={16} />
                                    Revoke
                                </button>
                            )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            ) : (
            /* Table View — only on md+ */
            <div className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden hidden md:block">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#FAFAFA] border-b border-[#EEEEEE] text-[12px] font-bold text-[#AEAEAE] uppercase">
                    <div className="col-span-1">#</div>
                    <div className="col-span-2">Vendor</div>
                    <div className="col-span-2">Owner</div>
                    <div className="col-span-2">Contact</div>
                    <div className="col-span-1 text-center">Products</div>
                    <div className="col-span-1 text-center">Orders</div>
                    <div className="col-span-3 text-center">Actions</div>
                </div>
                {filteredVendors.map((vendor, i) => (
                    <div
                        key={vendor.id}
                        className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F5F5F5] items-center hover:bg-[#FAFAFA] transition-colors"
                    >
                        <div className="col-span-1 text-[13px] font-bold text-[#AEAEAE]">{i + 1}</div>
                        <div className="col-span-2 flex items-center gap-3">
                            <div className="w-[40px] h-[40px] rounded-full bg-[#F1F4F9] overflow-hidden shrink-0 flex items-center justify-center">
                                {vendor.logoUrl ? (
                                    <img src={vendor.logoUrl} alt={vendor.businessName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[16px] font-black text-[#299E60]">{vendor.businessName.charAt(0)}</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[14px] font-bold text-[#181725] truncate">{vendor.businessName}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Star size={11} fill="#F59E0B" className="text-[#F59E0B]" />
                                    <span className="text-[11px] font-bold text-[#7C7C7C]">{Number(vendor.rating).toFixed(1)}</span>
                                    <span className={cn(
                                        "ml-1 text-[10px] font-[900] px-1.5 py-0.5 rounded-full",
                                        vendor.isVerified ? "bg-[#EEF8F1] text-[#299E60]" : "bg-[#FFF4E5] text-[#976538]"
                                    )}>
                                        {vendor.isVerified ? 'Verified' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2 text-[13px] font-medium text-[#4B4B4B] truncate">{vendor.user.fullName}</div>
                        <div className="col-span-2 min-w-0">
                            <p className="text-[12px] font-medium text-[#4B4B4B] truncate">{vendor.user.email}</p>
                            {vendor.user.phone && <p className="text-[11px] text-[#AEAEAE] font-medium mt-0.5">{vendor.user.phone}</p>}
                        </div>
                        <div className="col-span-1 text-center text-[14px] font-bold text-[#181725]">{vendor._count.products}</div>
                        <div className="col-span-1 text-center text-[14px] font-bold text-[#181725]">{vendor._count.orders}</div>
                        <div className="col-span-3 flex items-center justify-center gap-2">
                            <button
                                onClick={() => viewDashboard(vendor.id)}
                                className="h-[34px] px-3 bg-[#299E60] text-white rounded-[8px] text-[12px] font-bold hover:bg-[#238a54] transition-all flex items-center justify-center gap-1"
                            >
                                <LayoutDashboard size={12} />
                                Dashboard
                            </button>
                            <Link
                                href={`/admin/vendors/${vendor.id}`}
                                className="h-[34px] px-3 bg-[#EEF8F1] text-[#299E60] rounded-[8px] text-[12px] font-bold hover:bg-[#e0f0e5] transition-all flex items-center justify-center"
                            >
                                Details
                            </Link>
                            {!vendor.isVerified ? (
                                <button
                                    onClick={() => toggleVerified(vendor.id, vendor.isVerified)}
                                    className="h-[34px] px-3 bg-[#EEF8F1] text-[#299E60] rounded-[8px] text-[12px] font-bold hover:bg-[#e0f0e5] transition-all flex items-center justify-center gap-1"
                                >
                                    <CheckCircle size={13} />
                                    Approve
                                </button>
                            ) : (
                                <button
                                    onClick={() => toggleVerified(vendor.id, vendor.isVerified)}
                                    className="h-[34px] px-3 bg-[#FFF0F0] text-[#E74C3C] rounded-[8px] text-[12px] font-bold hover:bg-[#ffe5e5] transition-all flex items-center justify-center gap-1"
                                >
                                    <XCircle size={13} />
                                    Revoke
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            )
            )}
        </div>
    );
}
