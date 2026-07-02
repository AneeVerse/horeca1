'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
    GitMerge, Search, Check, Loader2, Package, AlertCircle, Unlink, Pencil, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatPackSize } from '@/lib/utils';
import { mappingStatusLabel, TONE_STYLES } from '@/lib/brandMappingLabels';

interface BrandOption {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
}

interface BrandCatalogItem {
    id: string;
    name: string;
    packSize: string | null;
    unit: string | null;
    sku: string | null;
    imageUrl: string | null;
    brand: BrandOption;
}

interface TableRow {
    productId: string;
    distributorProductName: string;
    distributorPackSize: string | null;
    distributorImage: string | null;
    basePrice: number;
    brandId: string | null;
    brandName: string | null;
    brandMasterProductId: string | null;
    brandItemName: string | null;
    brandPackSize: string | null;
    brandSku: string | null;
    mappingId: string | null;
    mappingStatus: 'mapped' | 'pending' | 'unmapped';
    linkStatus: 'auto_mapped' | 'verified' | 'pending_review' | null;
    distributorAuthStatus: 'pending' | 'approved' | 'rejected' | null;
}

type StatusFilter = 'all' | 'mapped' | 'pending' | 'unmapped';

export default function VendorBrandMappingsPage() {
    const [rows, setRows] = useState<TableRow[]>([]);
    const [brands, setBrands] = useState<BrandOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [brandId, setBrandId] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [vendorSearch, setVendorSearch] = useState('');
    const [catalog, setCatalog] = useState<BrandCatalogItem[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ view: 'table' });
            if (brandId) qs.set('brandId', brandId);
            const r = await fetch(`/api/v1/vendor/brand-mappings?${qs}`);
            const j = await r.json();
            if (j.success) {
                setRows(j.data.rows ?? []);
                setBrands(j.data.brands ?? []);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [brandId]);

    useEffect(() => { load(); }, [load]);

    const loadCatalog = useCallback(async (bid: string, q: string) => {
        if (!bid) { setCatalog([]); return; }
        setCatalogLoading(true);
        try {
            const qs = new URLSearchParams({ brandId: bid, limit: '50' });
            if (q.trim().length >= 2) qs.set('q', q.trim());
            const r = await fetch(`/api/v1/brand-master-products?${qs}`);
            const j = await r.json();
            setCatalog(j.data?.products ?? []);
        } catch { setCatalog([]); }
        finally { setCatalogLoading(false); }
    }, []);

    useEffect(() => {
        if (!brandId || !panelOpen) return;
        const t = setTimeout(() => loadCatalog(brandId, catalogSearch), 250);
        return () => clearTimeout(t);
    }, [brandId, catalogSearch, panelOpen, loadCatalog]);

    const filteredRows = useMemo(() => {
        let list = rows;
        if (statusFilter !== 'all') list = list.filter((r) => r.mappingStatus === statusFilter);
        if (brandId) list = list.filter((r) => !r.brandId || r.brandId === brandId);
        return list;
    }, [rows, statusFilter, brandId]);

    const vendorProducts = useMemo(() => {
        const q = vendorSearch.trim().toLowerCase();
        const deduped = new Map<string, TableRow>();
        for (const r of rows) {
            const existing = deduped.get(r.productId);
            if (!existing) {
                deduped.set(r.productId, r);
                continue;
            }
            if (r.mappingStatus === 'mapped' && existing.mappingStatus !== 'mapped') {
                deduped.set(r.productId, r);
            }
        }
        let list = [...deduped.values()];
        if (brandId) {
            list = list.filter((r) => !r.brandId || r.brandId === brandId || r.mappingStatus === 'unmapped');
        }
        if (q) list = list.filter((r) => r.distributorProductName.toLowerCase().includes(q));
        return list;
    }, [rows, vendorSearch, brandId]);

    const counts = useMemo(() => ({
        mapped: rows.filter((r) => r.mappingStatus === 'mapped').length,
        pending: rows.filter((r) => r.mappingStatus === 'pending').length,
        unmapped: rows.filter((r) => r.mappingStatus === 'unmapped').length,
    }), [rows]);

    const saveMapping = async (productId: string, master: BrandCatalogItem) => {
        setSaving(true);
        try {
            const r = await fetch('/api/v1/vendor/brand-mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ distributorProductId: productId, brandMasterProductId: master.id }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Mapping failed');
            toast.success(`Mapped to ${master.brand.name} — ${master.name}`);
            setSelectedProductId(null);
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Mapping failed');
        } finally {
            setSaving(false);
        }
    };

    const handlePickCatalog = (master: BrandCatalogItem) => {
        if (!selectedProductId || saving) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => saveMapping(selectedProductId, master), 200);
    };

    const handleConfirmPending = async (row: TableRow) => {
        if (!row.mappingId) return;
        setSaving(true);
        try {
            const r = await fetch(`/api/v1/vendor/brand-mappings/${row.mappingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'verified' }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Confirm failed');
            toast.success('Mapping confirmed');
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Confirm failed');
        } finally {
            setSaving(false);
        }
    };

    const handleUnlink = async (row: TableRow) => {
        if (!row.mappingId) return;
        const ok = window.confirm(`Unlink from ${row.brandName}?`);
        if (!ok) return;
        setSaving(true);
        try {
            const r = await fetch(`/api/v1/vendor/brand-mappings/${row.mappingId}`, { method: 'DELETE' });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Unlink failed');
            toast.success('Unlinked');
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Unlink failed');
        } finally {
            setSaving(false);
        }
    };

    const handleRejectPending = async (row: TableRow) => {
        if (!row.mappingId) return;
        setSaving(true);
        try {
            const r = await fetch(`/api/v1/vendor/brand-mappings/${row.mappingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Reject failed');
            toast.success('Mapping rejected');
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Reject failed');
        } finally {
            setSaving(false);
        }
    };

    const openEditor = (row: TableRow) => {
        if (row.brandId) setBrandId(row.brandId);
        setSelectedProductId(row.productId);
        setPanelOpen(true);
        setCatalogSearch('');
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#53B175]" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight flex items-center gap-2">
                        <GitMerge size={26} className="text-[#53B175]" /> Brand Mappings
                    </h1>
                    <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px] max-w-2xl">
                        Link your inventory to brand catalog SKUs. Brand + admin must approve you as a distributor before items appear on the brand storefront.
                    </p>
                </div>
                <button
                    onClick={() => { setPanelOpen(true); setSelectedProductId(null); }}
                    className="h-[40px] px-5 bg-[#53B175] text-white rounded-[12px] text-[13px] font-bold hover:bg-[#3d9e5f]"
                >
                    Map products
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Mapped', value: counts.mapped, tone: TONE_STYLES.live },
                    { label: 'Pending', value: counts.pending, tone: TONE_STYLES.pending },
                    { label: 'Unmapped', value: counts.unmapped, tone: TONE_STYLES.low },
                ].map((s) => (
                    <div key={s.label} className={cn('bg-white rounded-2xl border p-4', s.tone.border)}>
                        <p className={cn('text-[11px] font-bold uppercase tracking-wider', s.tone.text)}>{s.label}</p>
                        <p className="text-[26px] font-black text-[#181725] mt-0.5">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="h-[38px] border border-gray-200 rounded-[10px] px-3 text-[13px] bg-white min-w-[180px]"
                >
                    <option value="">All brands</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-[10px]">
                    {(['all', 'mapped', 'pending', 'unmapped'] as StatusFilter[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={cn(
                                'px-3 h-[30px] rounded-[8px] text-[12px] font-bold capitalize transition-colors',
                                statusFilter === f ? 'bg-white text-[#181725] shadow-sm' : 'text-gray-500',
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {panelOpen && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                            <select
                                value={brandId}
                                onChange={(e) => setBrandId(e.target.value)}
                                className="h-[36px] border border-gray-200 rounded-[10px] px-3 text-[13px] min-w-[160px]"
                            >
                                <option value="">Select brand…</option>
                                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            {selectedProductId && (
                                <span className="text-[12px] text-[#53B175] font-bold">
                                    Selected: {rows.find((r) => r.productId === selectedProductId)?.distributorProductName}
                                </span>
                            )}
                        </div>
                        <button onClick={() => setPanelOpen(false)} className="text-[12px] font-bold text-gray-500">Close panel</button>
                    </div>
                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 min-h-[320px]">
                        <div className="p-4 space-y-3">
                            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Brand catalog</p>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                    placeholder="Search brand SKUs…"
                                    disabled={!brandId}
                                    className="w-full h-[36px] pl-9 pr-3 border border-gray-200 rounded-[10px] text-[13px] disabled:opacity-50"
                                />
                            </div>
                            {!brandId ? (
                                <p className="text-[12px] text-gray-400 py-8 text-center">Pick a brand to browse its catalog</p>
                            ) : catalogLoading ? (
                                <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[#53B175]" /></div>
                            ) : (
                                <div className="space-y-1 max-h-[280px] overflow-y-auto">
                                    {catalog.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            disabled={!selectedProductId || saving}
                                            onClick={() => handlePickCatalog(item)}
                                            className={cn(
                                                'w-full flex items-center gap-2 p-2 rounded-xl text-left transition-colors',
                                                selectedProductId ? 'hover:bg-[#EEF8F1] cursor-pointer' : 'opacity-60',
                                            )}
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-gray-100 relative shrink-0 overflow-hidden">
                                                {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="36px" className="object-cover" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold text-[#181725] truncate">{item.name}</p>
                                                <p className="text-[10px] text-gray-400">{formatPackSize(item.packSize, item.unit) || '—'} · {item.sku ?? '—'}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">Your items</p>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={vendorSearch}
                                    onChange={(e) => setVendorSearch(e.target.value)}
                                    placeholder="Search your products…"
                                    className="w-full h-[36px] pl-9 pr-3 border border-gray-200 rounded-[10px] text-[13px]"
                                />
                            </div>
                            <div className="space-y-1 max-h-[280px] overflow-y-auto">
                                {vendorProducts.map((row) => (
                                    <button
                                        key={row.productId}
                                        type="button"
                                        onClick={() => setSelectedProductId(row.productId)}
                                        className={cn(
                                            'w-full flex items-center gap-2 p-2 rounded-xl text-left border transition-colors',
                                            selectedProductId === row.productId
                                                ? 'border-[#53B175] bg-[#EEF8F1]'
                                                : 'border-transparent hover:bg-gray-50',
                                        )}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-gray-100 relative shrink-0 overflow-hidden">
                                            {row.distributorImage && <Image src={row.distributorImage} alt="" fill sizes="36px" className="object-cover" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-bold text-[#181725] truncate">{row.distributorProductName}</p>
                                            <p className="text-[10px] text-gray-400">{row.distributorPackSize ?? '—'}</p>
                                            {row.mappingStatus === 'mapped' && (
                                                <span className="text-[9px] font-bold text-[#53B175] uppercase">Mapped</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                <AlertCircle size={12} /> Select your item, then click a brand SKU to auto-save
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                {['Brand Item', 'Distributor Item', 'Brand SKU', 'Status', 'Brand', ''].map((h) => (
                                    <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredRows.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-12 text-center text-[13px] text-gray-400">No rows match your filters</td></tr>
                            ) : filteredRows.map((row) => {
                                const statusMeta = mappingStatusLabel(row.linkStatus ?? row.mappingStatus);
                                const tone = TONE_STYLES[statusMeta.tone];
                                return (
                                    <tr key={`${row.productId}-${row.mappingId ?? 'u'}`} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 text-[13px] font-medium text-[#181725]">{row.brandItemName ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-[13px] font-bold text-[#181725]">{row.distributorProductName}</p>
                                            {row.distributorPackSize && (
                                                <p className="text-[10px] text-gray-400 mt-0.5">{row.distributorPackSize}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-[12px] text-gray-500 font-mono">{row.brandSku ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase', tone.bg, tone.text)}>
                                                {row.mappingStatus === 'mapped' ? 'Mapped' : row.mappingStatus === 'pending' ? 'Pending' : 'Unmapped'}
                                            </span>
                                            {row.distributorAuthStatus === 'pending' && (
                                                <p className="text-[10px] text-amber-600 mt-0.5">Awaiting brand approval</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-[12px] text-gray-500">{row.brandName ?? '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {row.mappingStatus === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleConfirmPending(row)} disabled={saving}
                                                            className="p-1.5 rounded-lg hover:bg-green-50 text-[#53B175]" title="Confirm">
                                                            <Check size={14} />
                                                        </button>
                                                        <button onClick={() => handleRejectPending(row)} disabled={saving}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject">
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                {row.mappingStatus === 'mapped' && (
                                                    <button onClick={() => handleUnlink(row)} disabled={saving}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Unlink">
                                                        <Unlink size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => openEditor(row)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Edit">
                                                    <Pencil size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
