'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { GitMerge, Search, X, Check, Loader2, Package, AlertCircle, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BrandMasterPick {
    id: string;
    name: string;
    packSize: string | null;
    sku: string | null;
    imageUrl: string | null;
    brand: { id: string; name: string; slug: string; logoUrl: string | null };
}

interface UnmappedProduct {
    productId: string;
    name: string;
    brand: string | null;
    packSize: string | null;
    imageUrl: string | null;
    basePrice: number;
}

interface PendingMapping {
    mappingId: string;
    productId: string;
    productName: string;
    productImage: string | null;
    confidenceScore: number;
    brandMasterProduct: BrandMasterPick;
}

interface MappedItem {
    mappingId: string;
    productId: string;
    productName: string;
    productImage: string | null;
    status: 'auto_mapped' | 'verified';
    confidenceScore: number;
    brandMasterProduct: BrandMasterPick;
}

// ── Brand SKU picker modal ───────────────────────────────────
function BrandPickerModal({
    open,
    onClose,
    onPick,
    suggestQuery,
}: {
    open: boolean;
    onClose: () => void;
    onPick: (master: BrandMasterPick) => void;
    suggestQuery?: string;
}) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState<BrandMasterPick[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && suggestQuery) Promise.resolve().then(() => setQ(suggestQuery));
    }, [open, suggestQuery]);

    useEffect(() => {
        if (!open) return;
        if (q.trim().length < 2 && q.trim().length !== 0) return;
        Promise.resolve().then(() => setLoading(true));
        const timer = setTimeout(() => {
            const url = q.trim().length >= 2
                ? `/api/v1/brand-master-products?q=${encodeURIComponent(q.trim())}&limit=30`
                : `/api/v1/brand-master-products?limit=30`;
            fetch(url)
                .then(r => r.json())
                .then(d => setResults(d.data?.products ?? []))
                .catch(() => setResults([]))
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(timer);
    }, [q, open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-[16px] font-bold text-[#181725]">Match to a brand SKU</h3>
                        <p className="text-[12px] text-gray-500 mt-0.5">Pick the brand master product that matches your inventory item.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
                </div>

                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search brand or product name…"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#53B175]/30"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={20} className="animate-spin text-[#53B175]" />
                        </div>
                    )}
                    {!loading && results.length === 0 && (
                        <div className="text-center py-12 text-[13px] text-gray-400">No brand products found. Try a different search term.</div>
                    )}
                    {!loading && results.map(m => (
                        <button
                            key={m.id}
                            onClick={() => onPick(m)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
                        >
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                                {m.imageUrl ? (
                                    <Image src={m.imageUrl} alt={m.name} fill sizes="48px" className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={18} /></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    {m.brand.logoUrl && (
                                        <Image src={m.brand.logoUrl} alt={m.brand.name} width={14} height={14} className="rounded-sm object-contain" />
                                    )}
                                    <span className="text-[11px] font-bold text-[#53B175] uppercase tracking-wide">{m.brand.name}</span>
                                </div>
                                <p className="text-[13px] font-semibold text-[#181725] truncate">{m.name}</p>
                                <p className="text-[11px] text-gray-400">{m.packSize ?? '—'} · SKU {m.sku ?? '—'}</p>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 shrink-0" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function VendorBrandMappingsPage() {
    const [unmapped, setUnmapped] = useState<UnmappedProduct[]>([]);
    const [pendingReview, setPendingReview] = useState<PendingMapping[]>([]);
    const [mapped, setMapped] = useState<MappedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pickerFor, setPickerFor] = useState<UnmappedProduct | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/v1/vendor/brand-mappings');
            const j = await r.json();
            if (j.success) {
                setUnmapped(j.data.unmapped);
                setPendingReview(j.data.pendingReview);
                setMapped(j.data.mapped);
            }
        } catch {
            toast.error('Failed to load mappings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handlePick = async (master: BrandMasterPick) => {
        if (!pickerFor) return;
        setSavingId(pickerFor.productId);
        try {
            const r = await fetch('/api/v1/vendor/brand-mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ distributorProductId: pickerFor.productId, brandMasterProductId: master.id }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Mapping failed');
            toast.success(`Mapped to ${master.brand.name} — ${master.name}`);
            setPickerFor(null);
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Mapping failed');
        } finally {
            setSavingId(null);
        }
    };

    const reviewPending = async (mappingId: string, status: 'verified' | 'rejected') => {
        setSavingId(mappingId);
        try {
            const r = await fetch(`/api/v1/vendor/brand-mappings/${mappingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Update failed');
            toast.success(status === 'verified' ? 'Mapping confirmed' : 'Mapping rejected');
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Update failed');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#53B175]" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight flex items-center gap-2">
                        <GitMerge size={26} className="text-[#53B175]" /> Brand Mappings
                    </h1>
                    <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px] max-w-2xl">
                        Match your products to brand SKUs once, then customers see the canonical brand name everywhere they discover your inventory.
                    </p>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">Unmapped</p>
                    <p className="text-[26px] font-black text-[#181725] mt-0.5">{unmapped.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-amber-100 p-4">
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Awaiting your review</p>
                    <p className="text-[26px] font-black text-amber-700 mt-0.5">{pendingReview.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#EEF8F1] p-4">
                    <p className="text-[11px] font-bold text-[#53B175] uppercase tracking-wider">Mapped</p>
                    <p className="text-[26px] font-black text-[#53B175] mt-0.5">{mapped.length}</p>
                </div>
            </div>

            {/* Pending review (suggestions from auto-mapper) */}
            {pendingReview.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
                    <div className="p-5 border-b border-amber-100 bg-amber-50/40 flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-600" />
                        <h2 className="text-[15px] font-bold text-amber-900">Suggested matches awaiting your review</h2>
                        <span className="ml-auto text-[11px] text-amber-700 font-semibold">Auto-detected, please confirm</span>
                    </div>
                    <div className="divide-y divide-amber-50">
                        {pendingReview.map(p => (
                            <div key={p.mappingId} className="p-4 flex items-center gap-4">
                                {/* Vendor product side */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                                        {p.productImage ? (
                                            <Image src={p.productImage} alt="" fill sizes="48px" className="object-cover" />
                                        ) : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-gray-300" /></div>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Your product</p>
                                        <p className="text-[13px] font-bold text-[#181725] truncate">{p.productName}</p>
                                    </div>
                                </div>

                                <ChevronRight size={16} className="text-gray-300 shrink-0" />

                                {/* Brand master side */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                                        {p.brandMasterProduct.imageUrl ? (
                                            <Image src={p.brandMasterProduct.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                                        ) : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-gray-300" /></div>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-[#53B175] uppercase">{p.brandMasterProduct.brand.name}</p>
                                        <p className="text-[13px] font-bold text-[#181725] truncate">{p.brandMasterProduct.name}</p>
                                        <p className="text-[10px] text-gray-400">Confidence {(p.confidenceScore * 100).toFixed(0)}%</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => reviewPending(p.mappingId, 'verified')}
                                        disabled={savingId === p.mappingId}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-[#53B175] text-white text-[12px] font-bold rounded-lg hover:bg-[#3d9e5f] transition-colors disabled:opacity-60">
                                        {savingId === p.mappingId ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Confirm
                                    </button>
                                    <button
                                        onClick={() => reviewPending(p.mappingId, 'rejected')}
                                        disabled={savingId === p.mappingId}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-[12px] font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-60">
                                        <X size={12} /> Wrong
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Unmapped */}
            {unmapped.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-[15px] font-bold text-[#181725]">Products without a brand match</h2>
                            <p className="text-[12px] text-gray-500 mt-0.5">Click any product and pick a brand SKU. One-time setup.</p>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400">{unmapped.length} products</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {unmapped.map(p => (
                            <div key={p.productId} className="p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                                    {p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="48px" className="object-cover" /> :
                                        <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-gray-300" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-[#181725] truncate">{p.name}</p>
                                    <p className="text-[11px] text-gray-400">{p.brand ?? '—'} · {p.packSize ?? '—'} · ₹{p.basePrice}</p>
                                </div>
                                <button
                                    onClick={() => setPickerFor(p)}
                                    disabled={savingId === p.productId}
                                    className="px-4 py-2 bg-[#53B175] text-white text-[12px] font-bold rounded-lg hover:bg-[#3d9e5f] transition-colors disabled:opacity-60 flex items-center gap-1.5">
                                    {savingId === p.productId ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
                                    Match to brand SKU
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {unmapped.length === 0 && pendingReview.length === 0 && mapped.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Package size={36} className="mx-auto text-gray-200 mb-3" />
                    <h3 className="text-[15px] font-bold text-[#181725]">No products yet</h3>
                    <p className="text-[13px] text-gray-400 mt-1">Add products in the Products page first, then come back here to map them to brand SKUs.</p>
                </div>
            )}

            {/* Mapped (collapsed by default would be nicer, but list for now) */}
            {mapped.length > 0 && (
                <details className="bg-white rounded-2xl border border-gray-100 overflow-hidden group">
                    <summary className="p-5 border-b border-gray-100 cursor-pointer flex items-center justify-between list-none">
                        <div>
                            <h2 className="text-[15px] font-bold text-[#181725] flex items-center gap-2"><Check size={16} className="text-[#53B175]" /> Active mappings</h2>
                            <p className="text-[12px] text-gray-500 mt-0.5">Live links between your products and brand SKUs.</p>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 group-open:rotate-180 transition-transform"><ChevronRight size={14} /></span>
                    </summary>
                    <div className="divide-y divide-gray-50">
                        {mapped.map(m => (
                            <div key={m.mappingId} className="p-4 flex items-center gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                                        {m.productImage ? <Image src={m.productImage} alt="" fill sizes="40px" className="object-cover" /> :
                                            <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-gray-300" /></div>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-semibold text-[#181725] truncate">{m.productName}</p>
                                        <p className="text-[10px] text-gray-400">→ {m.brandMasterProduct.brand.name} · {m.brandMasterProduct.name}</p>
                                    </div>
                                </div>
                                <span className={cn(
                                    'text-[10px] font-bold px-2 py-1 rounded-md uppercase',
                                    m.status === 'verified' ? 'bg-[#EEF8F1] text-[#53B175]' : 'bg-blue-50 text-blue-600'
                                )}>
                                    {m.status === 'verified' ? 'Manual' : 'Auto'}
                                </span>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {/* Tips */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[12px] text-blue-900 leading-relaxed">
                    <p className="font-bold mb-0.5">How brand mapping works</p>
                    <p>When you map your product to a brand&rsquo;s SKU, customers searching the brand or shopping the brand store will see your stock under the canonical brand name. You keep your prices and inventory — only the display name uses the brand&rsquo;s official wording.</p>
                </div>
            </div>

            <BrandPickerModal
                open={!!pickerFor}
                onClose={() => setPickerFor(null)}
                onPick={handlePick}
                suggestQuery={pickerFor?.brand ?? pickerFor?.name?.split(' ')[0]}
            />
        </div>
    );
}
