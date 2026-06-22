'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Check, X, Search, Clock, CheckCircle, Loader2, ClipboardList, Store, Pencil, ArrowRight, Sparkles,
    GitMerge, MessageSquare, Package, ExternalLink, LayoutDashboard, Plus, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandFormModal from '@/components/features/admin/BrandFormModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

interface Brand {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    tagline: string | null;
    approvalStatus: string;
    isActive: boolean;
    createdAt: string;
    user: { id: string; fullName: string; email: string } | null;
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
        vendor: { id: string; businessName: string } | null;
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
    const perms = useAdminPermissions();
    const confirm = useConfirm();
    const [sectionTab, setSectionTab] = useState<SectionTab>('Brands');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [brands, setBrands] = useState<Brand[]>([]);
    const [brandFilter, setBrandFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const [mappings, setMappings] = useState<PendingMapping[]>([]);
    const [rejectTarget, setRejectTarget] = useState<{ type: 'brand' | 'mapping'; id: string; name: string } | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [editTarget, setEditTarget] = useState<PendingMapping | null>(null);
    const [editPickerCats, setEditPickerCats] = useState<Array<{ id: string; name: string; packSize: string | null; imageUrl: string | null; sku: string | null }>>([]);
    const [editPickerLoading, setEditPickerLoading] = useState(false);
    const [editPickerQuery, setEditPickerQuery] = useState('');
    const [aiBackfilling, setAiBackfilling] = useState(false);
    const [aiResult, setAiResult] = useState<null | {
        ai: string;
        brandsProcessed: number;
        brandsFailed: number;
        before: { auto_mapped: number; verified: number; pending_review: number; rejected: number };
        after: { auto_mapped: number; verified: number; pending_review: number; rejected: number };
        promoted: number;
        delta: number;
    }>(null);

    // Create brand modal
    const [showCreate, setShowCreate] = useState(false);

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
                body: JSON.stringify({ action: 'approved' }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Approval failed');
            setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, approvalStatus: 'approved' } : b));
            toast.success(`${brand.name} approved`);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Approval failed');
        } finally { setActionLoading(null); }
    };

    const handleRejectBrand = async (id: string, note: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/v1/admin/brands/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'rejected', reviewNote: note || undefined }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Rejection failed');
            setBrands(prev => prev.map(b => b.id === id ? { ...b, approvalStatus: 'rejected' } : b));
            toast.success('Brand rejected');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Rejection failed');
        } finally { setActionLoading(null); setRejectTarget(null); setRejectNote(''); }
    };

    const handleDeleteBrand = async (brand: Brand) => {
        const ok = await confirm({
            title: `Delete ${brand.name}?`,
            message: 'This permanently removes the brand along with all its catalog products, distributor mappings, team members, and distributor invites. Cannot be undone.',
            confirmText: 'Delete brand',
            tone: 'danger',
        });
        if (!ok) return;
        setActionLoading(brand.id);
        try {
            const res = await fetch(`/api/v1/admin/brands/${brand.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Delete failed');
            setBrands(prev => prev.filter(b => b.id !== brand.id));
            toast.success(`${brand.name} deleted`);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Delete failed');
        } finally { setActionLoading(null); }
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

    // ── Edit mapping (re-target to a different brand master product) ──
    const openEditMapping = async (mapping: PendingMapping) => {
        setEditTarget(mapping);
        setEditPickerQuery('');
        setEditPickerLoading(true);
        try {
            const res = await fetch(`/api/v1/brand-master-products?limit=200`);
            const json = await res.json();
            const products: Array<{ id: string; name: string; packSize: string | null; imageUrl: string | null; sku: string | null; brand: { id: string } }> = json.data?.products ?? [];
            // Filter to the same brand as the auto-suggested master product
            const sameBrand = products.filter(p => p.brand.id === mapping.brandMasterProduct.brand.id);
            setEditPickerCats(sameBrand.map(p => ({ id: p.id, name: p.name, packSize: p.packSize, imageUrl: p.imageUrl, sku: p.sku })));
        } catch { setEditPickerCats([]); }
        finally { setEditPickerLoading(false); }
    };

    const runAiMapping = async () => {
        if (aiBackfilling) return;
        setAiBackfilling(true);
        const t = toast.loading('Running AI mapping…');
        try {
            const res = await fetch('/api/v1/admin/brands/run-mapping', { method: 'POST' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Mapping run failed');
            toast.dismiss(t);
            setAiResult(json.data);
            // Refresh the mappings list so the UI reflects the new state, but keep the result modal open.
            const mappingsRes = await fetch('/api/v1/admin/brands/mappings?limit=50').then(r => r.json()).catch(() => null);
            if (mappingsRes?.success) setMappings(mappingsRes.data ?? []);
        } catch (e: unknown) {
            toast.dismiss(t);
            toast.error(e instanceof Error ? e.message : 'Mapping run failed');
        } finally {
            setAiBackfilling(false);
        }
    };

    const submitEditMapping = async (newMasterProductId: string) => {
        if (!editTarget) return;
        if (newMasterProductId === editTarget.brandMasterProduct.id) {
            // Same product — just verify normally
            await handleVerifyMapping(editTarget);
            setEditTarget(null);
            return;
        }
        setActionLoading(editTarget.id);
        try {
            const res = await fetch(`/api/v1/admin/brands/mappings/${editTarget.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'verified', brandMasterProductId: newMasterProductId }),
            });
            if ((await res.json()).success) {
                setMappings(prev => prev.filter(m => m.id !== editTarget.id));
            }
        } catch { /* silent */ }
        finally { setActionLoading(null); setEditTarget(null); }
    };

    // ── Filter ──
    const q = searchQuery.toLowerCase();
    const filteredBrands = brands
        .filter(b => brandFilter === 'all' || b.approvalStatus === brandFilter)
        .filter(b => !q || b.name.toLowerCase().includes(q) || (b.user?.email?.toLowerCase().includes(q) ?? false));
    const filteredMappings = mappings.filter(m =>
        !q || m.brandMasterProduct.name.toLowerCase().includes(q) || (m.distributorProduct.vendor?.businessName.toLowerCase().includes(q) ?? false)
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
        <div className="max-w-[1600px] mx-auto space-y-7 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-[900] text-[#181725] tracking-tight">Brands</h1>
                    <p className="text-[#7C7C7C] font-medium mt-1">Review brand applications and manage distributor mappings</p>
                </div>
                {perms.canWriteSettings && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="h-[44px] px-5 bg-[#299E60] text-white rounded-[12px] text-[13px] font-bold hover:bg-[#238a54] transition-all shadow-sm flex items-center gap-2 shrink-0"
                    >
                        <Plus size={16} />
                        Add Brand
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Brands', value: brands.length, icon: Store, color: '#3B82F6', bg: '#EFF6FF' },
                    { label: 'Pending Approval', value: pendingBrandsCount, icon: Clock, color: '#F59E0B', bg: '#FFF7E6' },
                    { label: 'Approved Brands', value: brands.filter(b => b.approvalStatus === 'approved').length, icon: CheckCircle, color: '#299E60', bg: '#EEF8F1' },
                    { label: 'Pending Mappings', value: pendingMappingsCount, icon: GitMerge, color: '#8B5CF6', bg: '#F3F0FF' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-[16px] border border-[#EEEEEE] shadow-sm flex items-center gap-4">
                        <div className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: stat.bg, color: stat.color }}>
                            <stat.icon size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-[26px] font-[900] text-[#181725] leading-none mt-0.5">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick links */}
            <div className="flex items-center gap-2 flex-wrap">
                <Link href="/admin/brand-distributor-invites"
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-[12px] text-[12px] font-bold text-[#7C7C7C] hover:border-[#53B175]/40 hover:text-[#53B175] transition-colors">
                    <MessageSquare size={13} /> Distributor Invites
                </Link>
            </div>

            {/* Section Tabs */}
            <div className="flex items-center gap-2 bg-[#F8F9FB] p-1.5 rounded-[16px] w-fit">
                {([
                    { key: 'Brands' as SectionTab, icon: Store, count: pendingBrandsCount },
                    { key: 'Mappings' as SectionTab, icon: GitMerge, count: pendingMappingsCount },
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
                <div className="p-6 border-b border-[#EEEEEE] flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="text-[18px] font-[900] text-[#181725]">
                        {sectionTab === 'Brands' ? 'Brand Applications' : 'Pending Mappings Review'}
                    </h2>
                    <div className="flex items-center gap-3">
                        {sectionTab === 'Brands' && (
                            <div className="flex items-center gap-1">
                                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                                    <button key={f} onClick={() => setBrandFilter(f)}
                                        className={cn('px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all capitalize',
                                            brandFilter === f ? 'bg-[#299E60] text-white' : 'bg-[#F8F9FB] text-[#AEAEAE] hover:text-[#7C7C7C]')}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        )}
                        {sectionTab === 'Mappings' && (
                            <button
                                onClick={runAiMapping}
                                disabled={aiBackfilling}
                                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white rounded-[10px] text-[12px] font-bold hover:shadow-md disabled:opacity-60 transition-all"
                                title="Re-run brand mapping for all approved brands using the configured AI provider"
                            >
                                {aiBackfilling ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                {aiBackfilling ? 'Running AI…' : 'Run AI Mapping'}
                            </button>
                        )}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={15} />
                            <input
                                type="text"
                                placeholder={`Search ${sectionTab.toLowerCase()}...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-[240px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* ── BRANDS TABLE ── */}
                {sectionTab === 'Brands' && (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse text-left text-[13px] min-w-[960px]">
                            <thead>
                                <tr className="bg-[#F9FAFB] border-b border-[#EEEEEE] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                                    <th className="px-4 py-4 font-bold text-center w-[48px]">#</th>
                                    <th className="px-4 py-4 font-bold min-w-[220px]">Brand</th>
                                    <th className="px-4 py-4 font-bold min-w-[150px]">Owner</th>
                                    <th className="px-4 py-4 font-bold text-center w-[80px]">Products</th>
                                    <th className="px-4 py-4 font-bold text-center w-[80px]">Mappings</th>
                                    <th className="px-4 py-4 font-bold w-[110px]">Date</th>
                                    <th className="px-4 py-4 font-bold text-right w-[260px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F3F4F6]">
                                {filteredBrands.map((brand, i) => {
                                    const sc = STATUS_COLORS[brand.approvalStatus] ?? STATUS_COLORS.pending;
                                    const isDummyEmail = brand.user?.email?.includes('brand.internal.horeca1') || !brand.user;
                                    return (
                                        <tr
                                            key={brand.id}
                                            onClick={() => router.push(`/admin/brands/${brand.id}`)}
                                            className="group hover:bg-[#F9FAFB]/60 transition-colors cursor-pointer"
                                        >
                                            {/* Index */}
                                            <td className="px-4 py-4 text-center font-bold text-[#9CA3AF] text-[12px]">
                                                {i + 1}
                                            </td>

                                            {/* Brand Info */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar Box */}
                                                    <div className="w-[40px] h-[40px] rounded-[10px] bg-[#F3F4F6] overflow-hidden shrink-0 border border-[#E5E7EB] flex items-center justify-center">
                                                        {brand.logoUrl ? (
                                                            <img src={brand.logoUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[15px] font-black text-[#299E60]">
                                                                {getInitials(brand.name)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Details */}
                                                    <div className="min-w-0">
                                                        <p className="text-[14px] font-bold text-[#181725] truncate group-hover:text-[#299E60] transition-colors">
                                                            {brand.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Link
                                                                href={`/brand/${brand.slug}`}
                                                                target="_blank"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-[11px] text-[#299E60] hover:underline flex items-center gap-0.5"
                                                            >
                                                                /{brand.slug} <ExternalLink size={10} />
                                                            </Link>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB]"></span>
                                                            <span
                                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                                                style={{
                                                                    backgroundColor: sc.bg,
                                                                    color: sc.text,
                                                                    borderColor: `${sc.text}20`,
                                                                }}
                                                            >
                                                                {brand.approvalStatus}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Owner */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className="text-[13px] font-bold text-[#374151] truncate">
                                                        {brand.user?.fullName ?? '—'}
                                                    </span>
                                                    {brand.user?.email && (
                                                        <span className="text-[11px] text-[#9CA3AF] font-semibold truncate">
                                                            {brand.user.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Products Count */}
                                            <td className="px-4 py-4 text-center font-bold text-[#111827] text-[14px]">
                                                {brand._count.masterProducts}
                                            </td>

                                            {/* Mappings Count */}
                                            <td className="px-4 py-4 text-center font-bold text-[#111827] text-[14px]">
                                                {brand._count.productMappings}
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-4 text-[13px] text-[#7C7C7C] whitespace-nowrap">
                                                {formatDate(brand.createdAt)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link
                                                        href={`/admin/brands/${brand.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex items-center gap-1 h-[32px] px-2.5 bg-[#EEF8F1] text-[#299E60] rounded-[8px] text-[12px] font-bold hover:bg-[#299E60] hover:text-white transition-all whitespace-nowrap shrink-0"
                                                        title={isDummyEmail ? 'Create Storefront' : 'Edit Brand Storefront'}
                                                    >
                                                        {isDummyEmail ? <><Plus size={14} strokeWidth={2.5} /> Create Storefront</> : <><Pencil size={13} /> Edit</>}
                                                    </Link>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); viewBrandPortal(brand); }}
                                                        className="flex items-center justify-center h-[32px] w-[32px] bg-[#F0F4FF] text-[#3B82F6] rounded-[8px] hover:bg-[#3B82F6] hover:text-white transition-all shrink-0"
                                                        title="View Brand Portal"
                                                    >
                                                        <LayoutDashboard size={14} />
                                                    </button>
                                                    {brand.approvalStatus !== 'approved' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApproveBrand(brand); }}
                                                            disabled={!!actionLoading}
                                                            className="flex items-center justify-center h-[32px] w-[32px] bg-[#299E60] text-white rounded-[8px] disabled:opacity-50 transition-all shrink-0"
                                                            title="Approve brand"
                                                        >
                                                            {actionLoading === brand.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                        </button>
                                                    )}
                                                    {brand.approvalStatus !== 'rejected' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setRejectTarget({ type: 'brand', id: brand.id, name: brand.name }); }}
                                                            className="flex items-center justify-center h-[32px] w-[32px] bg-[#E74C3C] text-white rounded-[8px] transition-all shrink-0"
                                                            title="Reject brand"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand); }}
                                                        disabled={actionLoading === brand.id}
                                                        title="Delete brand permanently"
                                                        className="flex items-center justify-center h-[32px] w-[32px] bg-[#FEF2F2] text-[#E74C3C] rounded-[8px] hover:bg-[#E74C3C] hover:text-white transition-all disabled:opacity-50 shrink-0"
                                                    >
                                                        {actionLoading === brand.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredBrands.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <ClipboardList size={36} className="mx-auto text-[#EEEEEE] mb-2" />
                                            <p className="text-[#AEAEAE] font-bold text-[14px]">No brands found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── MAPPINGS TABLE ── */}
                {sectionTab === 'Mappings' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
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
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{mapping.distributorProduct.vendor?.businessName ?? '—'}</td>
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
                                                <button onClick={() => openEditMapping(mapping)} disabled={!!actionLoading}
                                                    className="flex items-center gap-1 h-[32px] px-3 bg-[#F0F4FF] text-[#3B82F6] rounded-[8px] text-[12px] font-bold hover:bg-[#3B82F6] hover:text-white transition-colors disabled:opacity-50"
                                                    title="Re-target to a different brand product">
                                                    <Pencil size={13} /> Edit
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

            {showCreate && (
                <BrandFormModal
                    onClose={() => setShowCreate(false)}
                    onCreated={(data) => {
                        setBrands(prev => [{ ...(data as Brand), _count: { masterProducts: 0, productMappings: 0 } }, ...prev]);
                        setShowCreate(false);
                    }}
                />
            )}

            {/* Rejection Modal */}
            {rejectTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRejectTarget(null)}>
                    <div className="bg-white rounded-[16px] w-full max-w-[440px] p-6 shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
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

            {/* AI Mapping Result Modal */}
            {aiResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAiResult(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-[440px] shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[15px] font-bold text-[#181725]">AI Mapping Complete</h3>
                                <p className="text-[11px] text-gray-500 truncate">{aiResult.ai}</p>
                            </div>
                            <button onClick={() => setAiResult(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-gray-500">Brands processed</span>
                                <span className="font-bold text-[#181725]">
                                    {aiResult.brandsProcessed}
                                    {aiResult.brandsFailed > 0 && <span className="text-red-500 ml-1">({aiResult.brandsFailed} failed)</span>}
                                </span>
                            </div>
                            <div className="border-t border-gray-100 pt-3 space-y-2">
                                {[
                                    { label: 'Auto-mapped', key: 'auto_mapped', color: '#53B175', bg: '#EEF8F1' },
                                    { label: 'Pending review', key: 'pending_review', color: '#D97706', bg: '#FFF7E6' },
                                    { label: 'Verified', key: 'verified', color: '#2563EB', bg: '#EFF6FF' },
                                    { label: 'Rejected', key: 'rejected', color: '#DC2626', bg: '#FEF2F2' },
                                ].map(row => {
                                    const before = aiResult.before[row.key as keyof typeof aiResult.before];
                                    const after = aiResult.after[row.key as keyof typeof aiResult.after];
                                    const change = after - before;
                                    return (
                                        <div key={row.key} className="flex items-center justify-between">
                                            <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: row.color }}>{row.label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] text-gray-400">{before}</span>
                                                <span className="text-[10px] text-gray-300">→</span>
                                                <span className="text-[14px] font-[900]" style={{ color: row.color }}>{after}</span>
                                                {change !== 0 && (
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                        change > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                    )}>
                                                        {change > 0 ? `+${change}` : change}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {aiResult.promoted > 0 && (
                                <div className="bg-[#EEF8F1] border border-[#53B175]/20 rounded-lg p-3 text-[12px]">
                                    <strong className="text-[#2e7d46]">{aiResult.promoted}</strong> mapping{aiResult.promoted !== 1 ? 's' : ''} promoted from pending to auto-mapped by AI.
                                </div>
                            )}
                            {aiResult.delta === 0 && aiResult.promoted === 0 && (
                                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-[12px] text-gray-500">
                                    AI evaluated all candidates — no changes needed.
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setAiResult(null)}
                                className="px-4 py-2 bg-[#53B175] text-white rounded-lg text-[13px] font-bold hover:bg-[#3d9e5f]">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Mapping Modal — re-target the auto-mapper's pick to the right brand product */}
            {editTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditTarget(null)}>
                    <div className="bg-white rounded-[16px] w-full max-w-[640px] max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-[#EEEEEE] flex items-start justify-between">
                            <div>
                                <h3 className="text-[16px] font-bold text-[#181725] flex items-center gap-2">
                                    <Pencil size={16} className="text-[#3B82F6]" /> Edit Mapping
                                </h3>
                                <p className="text-[12px] text-gray-500 mt-1">
                                    Auto-mapper picked &ldquo;<strong>{editTarget.brandMasterProduct.name}</strong>&rdquo; for distributor product
                                    &ldquo;<strong>{editTarget.distributorProduct.name}</strong>&rdquo; ({editTarget.distributorProduct.vendor?.businessName ?? 'no vendor'}).
                                    Pick the correct brand product below — or close to keep this and click Verify on the row.
                                </p>
                            </div>
                            <button onClick={() => setEditTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-[#EEEEEE]">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={editPickerQuery}
                                    onChange={e => setEditPickerQuery(e.target.value)}
                                    placeholder={`Search ${editTarget.brandMasterProduct.brand.name} catalog…`}
                                    className="w-full pl-9 pr-3 py-2.5 border border-[#EEEEEE] rounded-[10px] text-[13px] outline-none focus:border-[#53B175]/50"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {editPickerLoading ? (
                                <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-[#53B175]" /></div>
                            ) : (
                                (() => {
                                    const lc = editPickerQuery.toLowerCase().trim();
                                    const filtered = lc
                                        ? editPickerCats.filter(c => c.name.toLowerCase().includes(lc) || (c.sku ?? '').toLowerCase().includes(lc))
                                        : editPickerCats;
                                    if (filtered.length === 0) return (
                                        <p className="text-center py-10 text-[13px] text-gray-400 italic">No brand products match.</p>
                                    );
                                    return (
                                        <div className="divide-y divide-[#F5F5F5]">
                                            {filtered.map(p => {
                                                const isCurrent = p.id === editTarget.brandMasterProduct.id;
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => submitEditMapping(p.id)}
                                                        disabled={!!actionLoading}
                                                        className={cn(
                                                            'w-full p-3 flex items-center gap-3 hover:bg-[#FAFAFA] text-left transition-colors disabled:opacity-50',
                                                            isCurrent && 'bg-[#EEF8F1]'
                                                        )}
                                                    >
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 shrink-0 relative">
                                                            {p.imageUrl ? (
                                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-gray-300" /></div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] font-bold text-[#181725] truncate">{p.name}</p>
                                                            <p className="text-[11px] text-gray-400">{p.packSize ?? '—'}{p.sku ? ` · SKU ${p.sku}` : ''}</p>
                                                        </div>
                                                        {isCurrent ? (
                                                            <span className="text-[10px] font-bold text-[#53B175] uppercase tracking-wider px-2 py-1 bg-[#EEF8F1] rounded">
                                                                Auto-pick
                                                            </span>
                                                        ) : (
                                                            <ArrowRight size={14} className="text-gray-300" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()
                            )}
                        </div>

                        <div className="p-4 border-t border-[#EEEEEE] flex items-center justify-between">
                            <p className="text-[11px] text-gray-400">Picking a row verifies the mapping with the new product.</p>
                            <button onClick={() => setEditTarget(null)}
                                className="h-[36px] px-4 bg-gray-100 rounded-[10px] text-[12px] font-bold text-[#7C7C7C] hover:bg-gray-200">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
