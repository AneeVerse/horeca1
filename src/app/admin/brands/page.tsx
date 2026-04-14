'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Check, X, Search, Clock, CheckCircle, Loader2, ClipboardList, Store,
    GitMerge, MessageSquare, Package, ExternalLink, LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Brand {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    tagline: string | null;
    approvalStatus: string;
    isActive: boolean;
    createdAt: string;
    user: { id: string; fullName: string; email: string };
    _count: { masterProducts: number; productMappings: number };
}

interface PendingMapping {
    id: string;
    confidenceScore: number;
    status: string;
    createdAt: string;
    brandMasterProduct: {
        id: string;
        name: string;
        packSize: string | null;
        brand: { id: string; name: string; slug: string };
    };
    distributorProduct: {
        id: string;
        name: string;
        basePrice: number;
        vendor: { id: string; businessName: string };
    };
}

type SectionTab = 'Brands' | 'Mappings';

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminBrandsPage() {
    const router = useRouter();
    const [sectionTab, setSectionTab] = useState<SectionTab>('Brands');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [brands, setBrands] = useState<Brand[]>([]);
    const [brandFilter, setBrandFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const [mappings, setMappings] = useState<PendingMapping[]>([]);
    const [rejectTarget, setRejectTarget] = useState<{ type: 'brand' | 'mapping'; id: string; name: string } | null>(null);
    const [rejectNote, setRejectNote] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [brandsRes, mappingsRes] = await Promise.all([
                fetch('/api/v1/admin/brands'),
                fetch('/api/v1/admin/brands/mappings?limit=50'),
            ]);
            const [brandsJson, mappingsJson] = await Promise.all([brandsRes.json(), mappingsRes.json()]);
            if (brandsJson.success) setBrands(brandsJson.data ?? []);
            if (mappingsJson.success) setMappings(mappingsJson.data ?? []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Impersonation ──
    const viewBrandPortal = async (brand: Brand) => {
        await fetch('/api/v1/admin/impersonate/brand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId: brand.id }),
        });
        router.push('/brand/portal');
    };

    // ── Brand actions ──
    const handleApproveBrand = async (brand: Brand) => {
        setActionLoading(brand.id);
        try {
            const res = await fetch(`/api/v1/admin/brands/${brand.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' }),
            });
            if ((await res.json()).success) {
                setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, approvalStatus: 'approved' } : b));
            }
        } catch { /* silent */ }
        finally { setActionLoading(null); }
    };

    const handleRejectBrand = async (id: string, note: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/v1/admin/brands/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', reviewNote: note }),
            });
            if ((await res.json()).success) {
                setBrands(prev => prev.map(b => b.id === id ? { ...b, approvalStatus: 'rejected' } : b));
            }
        } catch { /* silent */ }
        finally { setActionLoading(null); setRejectTarget(null); setRejectNote(''); }
    };

    // ── Mapping actions ──
    const handleVerifyMapping = async (mapping: PendingMapping) => {
        setActionLoading(mapping.id);
        try {
            const res = await fetch(`/api/v1/admin/brands/mappings/${mapping.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'verified' }),
            });
            if ((await res.json()).success) {
                setMappings(prev => prev.filter(m => m.id !== mapping.id));
            }
        } catch { /* silent */ }
        finally { setActionLoading(null); }
    };

    const handleRejectMapping = async (id: string, note: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/v1/admin/brands/mappings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected', reviewNote: note }),
            });
            if ((await res.json()).success) {
                setMappings(prev => prev.filter(m => m.id !== id));
            }
        } catch { /* silent */ }
        finally { setActionLoading(null); setRejectTarget(null); setRejectNote(''); }
    };

    // ── Filter ──
    const q = searchQuery.toLowerCase();
    const filteredBrands = brands
        .filter(b => brandFilter === 'all' || b.approvalStatus === brandFilter)
        .filter(b => !q || b.name.toLowerCase().includes(q) || b.user.email.toLowerCase().includes(q));
    const filteredMappings = mappings.filter(m =>
        !q || m.brandMasterProduct.name.toLowerCase().includes(q) || m.distributorProduct.vendor.businessName.toLowerCase().includes(q)
    );

    const pendingBrandsCount = brands.filter(b => b.approvalStatus === 'pending').length;
    const pendingMappingsCount = mappings.length;

    const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
        pending: { bg: '#FFF7E6', text: '#F59E0B' },
        approved: { bg: '#EEF8F1', text: '#53B175' },
        rejected: { bg: '#FEF2F2', text: '#E74C3C' },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-[#299E60]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-6">
            {/* Header */}
            <div>
                <h1 className="text-[22px] md:text-[28px] font-[900] text-[#181725] tracking-tight">Brands</h1>
                <p className="text-[#7C7C7C] font-medium mt-1">Review brand applications and manage distributor mappings</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Total Brands', value: brands.length, icon: Store, color: '#3B82F6', bg: '#EFF6FF' },
                    { label: 'Pending Approval', value: pendingBrandsCount, icon: Clock, color: '#F59E0B', bg: '#FFF7E6' },
                    { label: 'Approved Brands', value: brands.filter(b => b.approvalStatus === 'approved').length, icon: CheckCircle, color: '#299E60', bg: '#EEF8F1' },
                    { label: 'Pending Mappings', value: pendingMappingsCount, icon: GitMerge, color: '#8B5CF6', bg: '#F3F0FF' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-4 md:p-5 rounded-[16px] border border-[#EEEEEE] shadow-sm flex items-center gap-3 md:gap-4">
                        <div className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] rounded-[14px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: stat.bg, color: stat.color }}>
                            <stat.icon size={20} strokeWidth={2.5} className="md:w-[24px] md:h-[24px]" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-[20px] md:text-[26px] font-[900] text-[#181725] leading-none mt-0.5">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Section Tabs */}
            <div className="flex items-center gap-2 bg-[#F8F9FB] p-1.5 rounded-[16px] w-full md:w-fit overflow-x-auto">
                {([
                    { key: 'Brands' as SectionTab, icon: Store, count: pendingBrandsCount },
                    { key: 'Mappings' as SectionTab, icon: GitMerge, count: pendingMappingsCount },
                ]).map(({ key, icon: Icon, count }) => (
                    <button
                        key={key}
                        onClick={() => { setSectionTab(key); setSearchQuery(''); }}
                        className={cn(
                            'flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-[12px] text-[13px] md:text-[14px] font-bold transition-all whitespace-nowrap',
                            sectionTab === key ? 'bg-white text-[#181725] shadow-sm' : 'text-[#AEAEAE] hover:text-[#7C7C7C]'
                        )}
                    >
                        <Icon size={18} strokeWidth={2.5} />
                        {key}
                        {count > 0 && (
                            <span className={cn('px-2 py-0.5 rounded-[6px] text-[11px] font-[900]',
                                sectionTab === key ? 'bg-[#E74C3C] text-white' : 'bg-[#EEEEEE] text-[#AEAEAE]')}>
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-[24px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 md:p-6 border-b border-[#EEEEEE] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-[16px] md:text-[18px] font-[900] text-[#181725]">
                        {sectionTab === 'Brands' ? 'Brand Applications' : 'Pending Mappings Review'}
                    </h2>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        {sectionTab === 'Brands' && (
                            <div className="flex items-center gap-1 overflow-x-auto">
                                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                                    <button key={f} onClick={() => setBrandFilter(f)}
                                        className={cn('px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all capitalize',
                                            brandFilter === f ? 'bg-[#299E60] text-white' : 'bg-[#F8F9FB] text-[#AEAEAE] hover:text-[#7C7C7C]')}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={15} />
                            <input
                                type="text"
                                placeholder={`Search ${sectionTab.toLowerCase()}...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full md:w-[240px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* ── BRANDS TABLE ── */}
                {sectionTab === 'Brands' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="bg-[#F8F9FB]">
                                    {['Brand', 'Owner', 'Products', 'Mappings', 'Date', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-6 py-4 text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filteredBrands.map(brand => {
                                    const sc = STATUS_COLORS[brand.approvalStatus] ?? STATUS_COLORS.pending;
                                    return (
                                        <tr key={brand.id} className="hover:bg-[#FAFAFA] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {brand.logoUrl ? (
                                                        <img src={brand.logoUrl} alt="" className="w-9 h-9 rounded-[8px] object-cover border border-[#EEEEEE]" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold bg-[#EEF8F1] text-[#299E60]">
                                                            {getInitials(brand.name)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-[14px] font-bold text-[#181725]">{brand.name}</p>
                                                        <Link href={`/brand/${brand.slug}`} target="_blank"
                                                            className="text-[11px] text-[#299E60] hover:underline flex items-center gap-0.5">
                                                            /{brand.slug} <ExternalLink size={10} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[13px] font-semibold text-[#181725]">{brand.user.fullName}</p>
                                                <p className="text-[11px] text-[#AEAEAE]">{brand.user.email}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-1 text-[13px] font-bold text-[#181725]">
                                                    <Package size={13} className="text-[#AEAEAE]" />
                                                    {brand._count.masterProducts}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[13px] font-bold text-[#181725]">{brand._count.productMappings}</td>
                                            <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{formatDate(brand.createdAt)}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] font-[900] px-2.5 py-1 rounded-[6px] uppercase"
                                                    style={{ backgroundColor: sc.bg, color: sc.text }}>
                                                    {brand.approvalStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => viewBrandPortal(brand)}
                                                        className="flex items-center gap-1 h-[32px] px-3 bg-[#F0F4FF] text-[#3B82F6] rounded-[8px] text-[12px] font-bold hover:bg-[#3B82F6] hover:text-white transition-colors"
                                                        title="View Brand Portal"
                                                    >
                                                        <LayoutDashboard size={13} /> Portal
                                                    </button>
                                                    {brand.approvalStatus !== 'approved' && (
                                                        <button onClick={() => handleApproveBrand(brand)} disabled={!!actionLoading}
                                                            className="flex items-center gap-1 h-[32px] px-3 bg-[#299E60] text-white rounded-[8px] text-[12px] font-bold disabled:opacity-50">
                                                            {actionLoading === brand.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                                                        </button>
                                                    )}
                                                    {brand.approvalStatus !== 'rejected' && (
                                                        <button
                                                            onClick={() => setRejectTarget({ type: 'brand', id: brand.id, name: brand.name })}
                                                            className="flex items-center gap-1 h-[32px] px-3 bg-[#E74C3C] text-white rounded-[8px] text-[12px] font-bold">
                                                            <X size={13} /> Reject
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredBrands.length === 0 && (
                                    <tr><td colSpan={7} className="py-16 text-center">
                                        <ClipboardList size={36} className="mx-auto text-[#EEEEEE] mb-2" />
                                        <p className="text-[#AEAEAE] font-bold text-[14px]">No brands found</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── MAPPINGS TABLE ── */}
                {sectionTab === 'Mappings' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[700px]">
                            <thead>
                                <tr className="bg-[#F8F9FB]">
                                    {['Brand Product', 'Distributor Product', 'Vendor', 'Confidence', 'Date', 'Actions'].map(h => (
                                        <th key={h} className="px-6 py-4 text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filteredMappings.map(mapping => (
                                    <tr key={mapping.id} className="hover:bg-[#FAFAFA] transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-[13px] font-bold text-[#181725]">{mapping.brandMasterProduct.name}</p>
                                            <p className="text-[11px] text-[#AEAEAE]">{mapping.brandMasterProduct.brand.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] font-semibold text-[#181725]">
                                            {mapping.distributorProduct.name}
                                        </td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{mapping.distributorProduct.vendor.businessName}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-16 bg-[#F0F0F0] rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#299E60] rounded-full" style={{ width: `${Math.round(mapping.confidenceScore * 100)}%` }} />
                                                </div>
                                                <span className="text-[12px] font-bold text-[#181725]">{Math.round(mapping.confidenceScore * 100)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{formatDate(mapping.createdAt)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleVerifyMapping(mapping)} disabled={!!actionLoading}
                                                    className="flex items-center gap-1 h-[32px] px-3 bg-[#299E60] text-white rounded-[8px] text-[12px] font-bold disabled:opacity-50">
                                                    {actionLoading === mapping.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Verify
                                                </button>
                                                <button onClick={() => setRejectTarget({ type: 'mapping', id: mapping.id, name: mapping.brandMasterProduct.name })}
                                                    className="flex items-center gap-1 h-[32px] px-3 bg-[#E74C3C] text-white rounded-[8px] text-[12px] font-bold">
                                                    <X size={13} /> Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMappings.length === 0 && (
                                    <tr><td colSpan={6} className="py-16 text-center">
                                        <GitMerge size={36} className="mx-auto text-[#EEEEEE] mb-2" />
                                        <p className="text-[#AEAEAE] font-bold text-[14px]">No pending mappings</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="p-5 bg-[#FDFDFD] border-t border-[#EEEEEE]">
                    <p className="text-[11px] text-[#AEAEAE] font-bold uppercase tracking-wider">
                        {sectionTab === 'Brands' ? `${filteredBrands.length} brand${filteredBrands.length !== 1 ? 's' : ''}` : `${filteredMappings.length} pending mapping${filteredMappings.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
            </div>

            {/* Rejection Modal */}
            {rejectTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setRejectTarget(null)}>
                    <div className="bg-white rounded-[16px] w-full max-w-[440px] p-5 md:p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare size={20} className="text-[#E74C3C]" />
                            <h3 className="text-[16px] font-bold text-[#181725]">Reject: {rejectTarget.name}</h3>
                        </div>
                        <textarea
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            placeholder="Reason for rejection (optional)..."
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
                                    if (rejectTarget.type === 'brand') handleRejectBrand(rejectTarget.id, rejectNote);
                                    else handleRejectMapping(rejectTarget.id, rejectNote);
                                }}
                                disabled={!!actionLoading}
                                className="h-[40px] px-5 bg-[#E74C3C] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-50 flex items-center gap-1.5">
                                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
