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
    CheckCircle,
    XCircle,
    LayoutGrid,
    List,
    LayoutDashboard,
    Plus,
    X,
    Eye,
    EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

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

interface CreateVendorForm {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    businessName: string;
    description: string;
    minOrderValue: string;
}

export default function VendorsPage() {
    const router = useRouter();
    const perms = useAdminPermissions();
    const [searchQuery, setSearchQuery] = useState('');
    const [vendors, setVendors] = useState<AdminVendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    // Create vendor modal
    const [showCreate, setShowCreate] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [form, setForm] = useState<CreateVendorForm>({
        fullName: '', email: '', password: '', phone: '',
        businessName: '', description: '', minOrderValue: '',
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');
        try {
            const res = await fetch('/api/v1/admin/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: form.fullName,
                    email: form.email,
                    password: form.password,
                    phone: form.phone || undefined,
                    businessName: form.businessName,
                    description: form.description || undefined,
                    minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to create vendor');
            // Add to list and close
            setVendors(prev => [{ ...json.data, _count: { products: 0, orders: 0 } }, ...prev]);
            setShowCreate(false);
            setForm({ fullName: '', email: '', password: '', phone: '', businessName: '', description: '', minOrderValue: '' });
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setCreating(false);
        }
    };

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
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Vendors List</h1>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70">Whole data about your Vendors</p>
                </div>

                <div className="flex items-center gap-3">
                    {perms.canWriteSettings && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="h-[44px] px-5 bg-[#299E60] text-white rounded-[12px] text-[13px] font-bold hover:bg-[#238a54] transition-all shadow-sm flex items-center gap-2 shrink-0"
                        >
                            <Plus size={16} />
                            Add Vendor
                        </button>
                    )}
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
                    {/* Grid / Table toggle */}
                    <div className="flex items-center bg-white border border-[#EEEEEE] rounded-[10px] p-1 shadow-sm">
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
            /* Vendors — Grid or Table view */
            viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-[24px]">
                {filteredVendors.map((vendor) => (
                    <div
                        key={vendor.id}
                        className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all max-w-[381px] w-full mx-auto"
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
            /* Table View */
            <div className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden">
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

            {/* Create Vendor Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
                    <div className="bg-white rounded-[20px] w-full max-w-[520px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE]">
                            <div>
                                <h3 className="text-[18px] font-[900] text-[#181725]">Add Vendor</h3>
                                <p className="text-[12px] text-[#AEAEAE] font-medium mt-0.5">Create a verified vendor account directly</p>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] text-[#AEAEAE]">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">Owner Account</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[12px] font-bold text-[#4B4B4B] mb-1.5 block">Full Name *</label>
                                    <input required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                                        placeholder="John Doe"
                                        className="w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/40 font-medium" />
                                </div>
                                <div>
                                    <label className="text-[12px] font-bold text-[#4B4B4B] mb-1.5 block">Phone</label>
                                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="+91 98765 43210"
                                        className="w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/40 font-medium" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[12px] font-bold text-[#4B4B4B] mb-1.5 block">Email *</label>
                                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="vendor@example.com"
                                    className="w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/40 font-medium" />
                            </div>
                            <div>
                                <label className="text-[12px] font-bold text-[#4B4B4B] mb-1.5 block">Password *</label>
                                <div className="relative">
                                    <input required type={showPassword ? 'text' : 'password'} minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        placeholder="Min 6 characters"
                                        className="w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-3 pr-10 text-[13px] outline-none focus:border-[#299E60]/40 font-medium" />
                                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEAE]">
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-[#EEEEEE]">
                                <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-4">Vendor Profile</p>
                            </div>
                            <div>
                                <label className="text-[12px] font-bold text-[#4B4B4B] mb-1.5 block">Business Name *</label>
                                <input required value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                                    placeholder="Fresh Farms Co."
                                    className="w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/40 font-medium" />
                            </div>
                            <div>
                                <label className="text-[12px] font-bold text-[#4B4B4B] mb-1.5 block">Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Brief description of the vendor..."
                                    rows={2}
                                    className="w-full border border-[#EEEEEE] rounded-[10px] px-3 py-2.5 text-[13px] outline-none focus:border-[#299E60]/40 font-medium resize-none" />
                            </div>
                            <div>
                                <label className="text-[12px] font-bold text-[#4B4B4B] mb-1.5 block">Min Order Value (₹)</label>
                                <input type="number" min="0" value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))}
                                    placeholder="0"
                                    className="w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/40 font-medium" />
                            </div>

                            {createError && (
                                <p className="text-[13px] text-[#E74C3C] font-medium bg-[#FEF2F2] px-3 py-2 rounded-[8px]">{createError}</p>
                            )}
                        </form>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[#EEEEEE] flex items-center justify-end gap-3">
                            <button type="button" onClick={() => setShowCreate(false)}
                                className="h-[42px] px-5 bg-[#F5F5F5] text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-[#EEEEEE]">
                                Cancel
                            </button>
                            <button onClick={handleCreate} disabled={creating}
                                className="h-[42px] px-6 bg-[#299E60] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#238a54] disabled:opacity-60 flex items-center gap-2">
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Create Vendor
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
