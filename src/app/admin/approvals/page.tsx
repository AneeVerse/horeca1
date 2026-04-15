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
    Package,
    Tag,
    MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';

// ── Interfaces ──

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
    _count: { products: number; orders: number };
}

interface PendingProduct {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    imageUrl: string | null;
    approvalStatus: string;
    approvalNote: string | null;
    createdAt: string;
    vendor: { id: string; businessName: string };
    category: { id: string; name: string } | null;
}

interface PendingCategory {
    id: string;
    name: string;
    slug: string;
    approvalStatus: string;
    approvalNote: string | null;
    suggestedBy: string | null;
    createdAt: string;
    parent: { id: string; name: string } | null;
    _count?: { products: number };
}

type SectionTab = 'Vendors' | 'Products' | 'Categories';

function getInitials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatINR(n: number): string {
    return `₹${n.toLocaleString('en-IN')}`;
}

export default function ApprovalsPage() {
    const [sectionTab, setSectionTab] = useState<SectionTab>('Vendors');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Vendor state
    const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
    const [approvedVendors, setApprovedVendors] = useState<Vendor[]>([]);
    const [vendorTab, setVendorTab] = useState<'Pending' | 'Approved' | 'All'>('Pending');

    // Product state
    const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);

    // Category state
    const [pendingCategories, setPendingCategories] = useState<PendingCategory[]>([]);

    // Rejection modal
    const [rejectTarget, setRejectTarget] = useState<{ type: 'product' | 'category'; id: string; name: string } | null>(null);
    const [rejectNote, setRejectNote] = useState('');

    // Summary counts
    const [summary, setSummary] = useState({ pendingVendors: 0, pendingProducts: 0, pendingCategories: 0 });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pendingVRes, approvedVRes, productsRes, categoriesRes, summaryRes] = await Promise.all([
                fetch('/api/v1/admin/vendors?verified=false&limit=50'),
                fetch('/api/v1/admin/vendors?verified=true&limit=50'),
                fetch('/api/v1/admin/products?approvalStatus=pending&limit=50'),
                fetch('/api/v1/admin/categories?approvalStatus=pending'),
                fetch('/api/v1/admin/approvals/summary'),
            ]);

            const [pv, av, pr, cat, sum] = await Promise.all([
                pendingVRes.json(), approvedVRes.json(), productsRes.json(), categoriesRes.json(), summaryRes.json(),
            ]);

            if (pv.success) setPendingVendors(pv.data.vendors);
            if (av.success) setApprovedVendors(av.data.vendors);
            if (pr.success) setPendingProducts(pr.data.products || []);
            if (cat.success) setPendingCategories(cat.data || []);
            if (sum.success) setSummary(sum.data);
        } catch (err) {
            console.error('Failed to fetch approvals:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Vendor Actions ──
    const handleApproveVendor = async (vendor: Vendor) => {
        setActionLoading(vendor.id);
        try {
            const res = await fetch(`/api/v1/admin/vendors/${vendor.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isVerified: true }),
            });
            if ((await res.json()).success || res.ok) {
                setPendingVendors(prev => prev.filter(v => v.id !== vendor.id));
                setApprovedVendors(prev => [{ ...vendor, isVerified: true }, ...prev]);
                setSummary(prev => ({ ...prev, pendingVendors: prev.pendingVendors - 1 }));
            }
        } catch (err) { console.error(err); }
        finally { setActionLoading(null); }
    };

    const handleRevokeVendor = async (vendor: Vendor) => {
        setActionLoading(vendor.id);
        try {
            const res = await fetch(`/api/v1/admin/vendors/${vendor.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isVerified: false }),
            });
            if ((await res.json()).success || res.ok) {
                setApprovedVendors(prev => prev.filter(v => v.id !== vendor.id));
                setPendingVendors(prev => [{ ...vendor, isVerified: false }, ...prev]);
                setSummary(prev => ({ ...prev, pendingVendors: prev.pendingVendors + 1 }));
            }
        } catch (err) { console.error(err); }
        finally { setActionLoading(null); }
    };

    // ── Product Actions ──
    const handleApproveProduct = async (product: PendingProduct) => {
        setActionLoading(product.id);
        try {
            const res = await fetch(`/api/v1/admin/products/${product.id}/approval`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' }),
            });
            if ((await res.json()).success || res.ok) {
                setPendingProducts(prev => prev.filter(p => p.id !== product.id));
                setSummary(prev => ({ ...prev, pendingProducts: prev.pendingProducts - 1 }));
            }
        } catch (err) { console.error(err); }
        finally { setActionLoading(null); }
    };

    const handleRejectProduct = async (id: string, note: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/v1/admin/products/${id}/approval`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', note }),
            });
            if ((await res.json()).success || res.ok) {
                setPendingProducts(prev => prev.filter(p => p.id !== id));
                setSummary(prev => ({ ...prev, pendingProducts: prev.pendingProducts - 1 }));
            }
        } catch (err) { console.error(err); }
        finally { setActionLoading(null); setRejectTarget(null); setRejectNote(''); }
    };

    // ── Category Actions ──
    const handleApproveCategory = async (cat: PendingCategory) => {
        setActionLoading(cat.id);
        try {
            const res = await fetch(`/api/v1/admin/categories/${cat.id}/approval`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' }),
            });
            if ((await res.json()).success || res.ok) {
                setPendingCategories(prev => prev.filter(c => c.id !== cat.id));
                setSummary(prev => ({ ...prev, pendingCategories: prev.pendingCategories - 1 }));
            }
        } catch (err) { console.error(err); }
        finally { setActionLoading(null); }
    };

    const handleRejectCategory = async (id: string, note: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/v1/admin/categories/${id}/approval`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', note }),
            });
            if ((await res.json()).success || res.ok) {
                setPendingCategories(prev => prev.filter(c => c.id !== id));
                setSummary(prev => ({ ...prev, pendingCategories: prev.pendingCategories - 1 }));
            }
        } catch (err) { console.error(err); }
        finally { setActionLoading(null); setRejectTarget(null); setRejectNote(''); }
    };

    // ── Filter logic ──
    const q = searchQuery.toLowerCase();
    const allVendors = [...pendingVendors, ...approvedVendors];
    const getDisplayVendors = () => {
        let list = vendorTab === 'Pending' ? pendingVendors : vendorTab === 'Approved' ? approvedVendors : allVendors;
        if (q) list = list.filter(v => v.businessName.toLowerCase().includes(q) || v.user.fullName.toLowerCase().includes(q));
        return list;
    };
    const filteredProducts = q ? pendingProducts.filter(p => p.name.toLowerCase().includes(q) || p.vendor.businessName.toLowerCase().includes(q)) : pendingProducts;
    const filteredCategories = q ? pendingCategories.filter(c => c.name.toLowerCase().includes(q)) : pendingCategories;

    const totalPending = summary.pendingVendors + summary.pendingProducts + summary.pendingCategories;

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
                <h1 className="text-[28px] font-[900] text-[#181725] tracking-tight">Approvals</h1>
                <p className="text-[#7C7C7C] font-medium mt-1">Review and manage pending approvals</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                    { label: 'Pending Vendors', value: summary.pendingVendors, icon: Store, color: '#F59E0B', bg: '#FFF7E6' },
                    { label: 'Pending Products', value: summary.pendingProducts, icon: Package, color: '#3B82F6', bg: '#EFF6FF' },
                    { label: 'Pending Categories', value: summary.pendingCategories, icon: Tag, color: '#8B5CF6', bg: '#F3F0FF' },
                    { label: 'Total Pending', value: totalPending, icon: Clock, color: '#E74C3C', bg: '#FEF2F2' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-[16px] border border-[#EEEEEE] shadow-sm flex items-center gap-4">
                        <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: stat.bg, color: stat.color }}>
                            <stat.icon size={26} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-[#AEAEAE] uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-[26px] font-[900] text-[#181725] leading-none mt-0.5">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Section Tabs */}
            <div className="flex items-center gap-2 bg-[#F8F9FB] p-1.5 rounded-[16px] w-fit">
                {([
                    { key: 'Vendors' as SectionTab, icon: Store, count: summary.pendingVendors },
                    { key: 'Products' as SectionTab, icon: Package, count: summary.pendingProducts },
                    { key: 'Categories' as SectionTab, icon: Tag, count: summary.pendingCategories },
                ]).map(({ key, icon: Icon, count }) => (
                    <button
                        key={key}
                        onClick={() => { setSectionTab(key); setSearchQuery(''); }}
                        className={cn(
                            'flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[14px] font-bold transition-all',
                            sectionTab === key ? 'bg-white text-[#181725] shadow-sm' : 'text-[#AEAEAE] hover:text-[#7C7C7C]'
                        )}
                    >
                        <Icon size={18} strokeWidth={2.5} />
                        {key}
                        {count > 0 && (
                            <span className={cn(
                                'px-2 py-0.5 rounded-[6px] text-[11px] font-[900]',
                                sectionTab === key ? 'bg-[#E74C3C] text-white' : 'bg-[#EEEEEE] text-[#AEAEAE]'
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-[24px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {/* Search */}
                <div className="p-6 border-b border-[#EEEEEE] flex items-center justify-between gap-4">
                    <h2 className="text-[18px] font-[900] text-[#181725]">
                        {sectionTab === 'Vendors' ? `${vendorTab} Vendors` : `Pending ${sectionTab}`}
                    </h2>
                    <div className="relative min-w-[280px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                        <input
                            type="text"
                            placeholder={`Search ${sectionTab.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white"
                        />
                    </div>
                </div>

                {/* Vendor sub-tabs */}
                {sectionTab === 'Vendors' && (
                    <div className="px-6 pt-4 flex gap-2">
                        {(['Pending', 'Approved', 'All'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setVendorTab(tab)}
                                className={cn(
                                    'px-4 py-1.5 rounded-[8px] text-[13px] font-bold transition-all',
                                    vendorTab === tab ? 'bg-[#299E60] text-white' : 'bg-[#F8F9FB] text-[#AEAEAE] hover:text-[#7C7C7C]'
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── VENDORS TABLE ── */}
                {sectionTab === 'Vendors' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F8F9FB]">
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Vendor</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Owner</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Products</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Date</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Status</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {getDisplayVendors().map(vendor => (
                                    <tr key={vendor.id} className="hover:bg-[#FAFAFA] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {vendor.logoUrl ? (
                                                    <img src={vendor.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover border" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold bg-[#EEF8F1] text-[#299E60]">
                                                        {getInitials(vendor.businessName)}
                                                    </div>
                                                )}
                                                <Link href={`/admin/vendors/${vendor.id}`} className="text-[14px] font-bold text-[#181725] hover:text-[#299E60]">
                                                    {vendor.businessName}
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] font-semibold text-[#181725]">{vendor.user.fullName}</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-[#181725]">{vendor._count.products}</td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{formatDate(vendor.createdAt)}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                'text-[11px] font-[900] px-2.5 py-1 rounded-[6px] uppercase',
                                                vendor.isVerified ? 'bg-[#EEF8F1] text-[#299E60]' : 'bg-[#FFF7E6] text-[#F59E0B]'
                                            )}>
                                                {vendor.isVerified ? 'Verified' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {vendor.isVerified ? (
                                                <button onClick={() => handleRevokeVendor(vendor)} disabled={actionLoading === vendor.id}
                                                    className="flex items-center gap-1 h-[34px] px-3 bg-[#E74C3C] text-white rounded-[8px] text-[12px] font-bold disabled:opacity-50">
                                                    {actionLoading === vendor.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Revoke
                                                </button>
                                            ) : (
                                                <button onClick={() => handleApproveVendor(vendor)} disabled={actionLoading === vendor.id}
                                                    className="flex items-center gap-1 h-[34px] px-3 bg-[#299E60] text-white rounded-[8px] text-[12px] font-bold disabled:opacity-50">
                                                    {actionLoading === vendor.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {getDisplayVendors().length === 0 && (
                                    <tr><td colSpan={6} className="py-16 text-center">
                                        <ClipboardList size={36} className="mx-auto text-[#EEEEEE] mb-2" />
                                        <p className="text-[#AEAEAE] font-bold text-[14px]">No {vendorTab.toLowerCase()} vendors</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── PRODUCTS TABLE ── */}
                {sectionTab === 'Products' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F8F9FB]">
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Product</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Vendor</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Category</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Price</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Submitted</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-[#FAFAFA] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt="" className="w-9 h-9 rounded-[8px] object-cover border" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-[8px] bg-[#F8F9FB] flex items-center justify-center text-[#AEAEAE]">
                                                        <Package size={16} />
                                                    </div>
                                                )}
                                                <span className="text-[14px] font-bold text-[#181725]">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] font-semibold text-[#181725]">{product.vendor.businessName}</td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{product.category?.name || '—'}</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-[#181725]">{formatINR(Number(product.basePrice))}</td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{formatDate(product.createdAt)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleApproveProduct(product)} disabled={actionLoading === product.id}
                                                    className="flex items-center gap-1 h-[34px] px-3 bg-[#299E60] text-white rounded-[8px] text-[12px] font-bold disabled:opacity-50">
                                                    {actionLoading === product.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                                                </button>
                                                <button onClick={() => setRejectTarget({ type: 'product', id: product.id, name: product.name })}
                                                    className="flex items-center gap-1 h-[34px] px-3 bg-[#E74C3C] text-white rounded-[8px] text-[12px] font-bold">
                                                    <X size={14} /> Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr><td colSpan={6} className="py-16 text-center">
                                        <Package size={36} className="mx-auto text-[#EEEEEE] mb-2" />
                                        <p className="text-[#AEAEAE] font-bold text-[14px]">No pending products</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── CATEGORIES TABLE ── */}
                {sectionTab === 'Categories' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F8F9FB]">
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Category</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Parent</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Submitted</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#7C7C7C] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filteredCategories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-[#FAFAFA] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-[8px] bg-[#F3F0FF] flex items-center justify-center text-[#8B5CF6]">
                                                    <Tag size={16} />
                                                </div>
                                                <span className="text-[14px] font-bold text-[#181725]">{cat.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{cat.parent?.name || 'Top-level'}</td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{formatDate(cat.createdAt)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleApproveCategory(cat)} disabled={actionLoading === cat.id}
                                                    className="flex items-center gap-1 h-[34px] px-3 bg-[#299E60] text-white rounded-[8px] text-[12px] font-bold disabled:opacity-50">
                                                    {actionLoading === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                                                </button>
                                                <button onClick={() => setRejectTarget({ type: 'category', id: cat.id, name: cat.name })}
                                                    className="flex items-center gap-1 h-[34px] px-3 bg-[#E74C3C] text-white rounded-[8px] text-[12px] font-bold">
                                                    <X size={14} /> Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCategories.length === 0 && (
                                    <tr><td colSpan={4} className="py-16 text-center">
                                        <Tag size={36} className="mx-auto text-[#EEEEEE] mb-2" />
                                        <p className="text-[#AEAEAE] font-bold text-[14px]">No pending categories</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 bg-[#FDFDFD] border-t border-[#EEEEEE]">
                    <p className="text-[12px] text-[#AEAEAE] font-bold uppercase tracking-wider">
                        {sectionTab === 'Vendors' && `${getDisplayVendors().length} vendor${getDisplayVendors().length !== 1 ? 's' : ''}`}
                        {sectionTab === 'Products' && `${filteredProducts.length} pending product${filteredProducts.length !== 1 ? 's' : ''}`}
                        {sectionTab === 'Categories' && `${filteredCategories.length} pending categor${filteredCategories.length !== 1 ? 'ies' : 'y'}`}
                    </p>
                </div>
            </div>

            {/* ── Rejection Note Modal ── */}
            {rejectTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRejectTarget(null)}>
                    <div className="bg-white rounded-[16px] w-full max-w-[440px] p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare size={20} className="text-[#E74C3C]" />
                            <h3 className="text-[16px] font-bold text-[#181725]">Reject {rejectTarget.name}</h3>
                        </div>
                        <textarea
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            placeholder="Reason for rejection (required)..."
                            rows={3}
                            className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-3 text-[14px] outline-none focus:border-[#E74C3C]/40 resize-none mb-4"
                        />
                        <div className="flex items-center gap-3 justify-end">
                            <button onClick={() => { setRejectTarget(null); setRejectNote(''); }}
                                className="h-[40px] px-5 bg-gray-100 rounded-[10px] text-[13px] font-bold text-[#7C7C7C] hover:bg-gray-200">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!rejectNote.trim()) { toast.error('Please provide a reason'); return; }
                                    if (rejectTarget.type === 'product') handleRejectProduct(rejectTarget.id, rejectNote);
                                    else handleRejectCategory(rejectTarget.id, rejectNote);
                                }}
                                disabled={!rejectNote.trim() || !!actionLoading}
                                className="h-[40px] px-5 bg-[#E74C3C] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-50 flex items-center gap-1.5">
                                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
