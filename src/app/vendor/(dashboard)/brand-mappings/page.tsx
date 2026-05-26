'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
    GitMerge, Search, X, Check, Loader2, Package, AlertCircle, ChevronRight, Sparkles, Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { confidenceLabel, mappingStatusLabel, TONE_STYLES } from '@/lib/brandMappingLabels';

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

interface PendingSuggestion {
    mappingId: string;
    confidenceScore: number;
    brandMasterProduct: BrandMasterPick;
}

interface PendingReviewGroup {
    productId: string;
    productName: string;
    productImage: string | null;
    brand: string | null;
    packSize: string | null;
    basePrice: number;
    suggestions: PendingSuggestion[];
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
        <div className="fixed inset-0 z-[10001] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
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
    const [pendingReview, setPendingReview] = useState<PendingReviewGroup[]>([]);
    const [mapped, setMapped] = useState<MappedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pickerFor, setPickerFor] = useState<UnmappedProduct | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    // Optimistic rejections: mappingIds that the user just dismissed (either explicitly or
    // because they confirmed a sibling). Used so the row visually fades before the reload
    // settles. Cleared on every successful reload.
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/v1/vendor/brand-mappings');
            const j = await r.json();
            if (j.success) {
                setUnmapped(j.data.unmapped);
                setPendingReview(j.data.pendingReview);
                setMapped(j.data.mapped);
                setDismissedIds(new Set());
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

    // Reject a single pending suggestion (used both for "Not this one" and as part of
    // confirming a sibling). Stays silent so the caller can batch a single toast.
    const rejectMapping = async (mappingId: string): Promise<boolean> => {
        try {
            const r = await fetch(`/api/v1/vendor/brand-mappings/${mappingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' }),
            });
            const j = await r.json();
            return !!j.success;
        } catch {
            return false;
        }
    };

    const handleConfirmSuggestion = async (group: PendingReviewGroup, picked: PendingSuggestion) => {
        setSavingId(picked.mappingId);
        // Optimistically dismiss all siblings so the row shrinks immediately.
        const siblings = group.suggestions.filter(s => s.mappingId !== picked.mappingId);
        setDismissedIds(prev => {
            const next = new Set(prev);
            siblings.forEach(s => next.add(s.mappingId));
            return next;
        });
        try {
            // Confirm the chosen one
            const r = await fetch(`/api/v1/vendor/brand-mappings/${picked.mappingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'verified' }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Confirm failed');

            // Reject every sibling in parallel (fire-and-forget; we batch the toast).
            if (siblings.length > 0) {
                await Promise.all(siblings.map(s => rejectMapping(s.mappingId)));
                toast.success(`Confirmed as ${picked.brandMasterProduct.brand.name} — ${picked.brandMasterProduct.name}, dismissed ${siblings.length} other ${siblings.length === 1 ? 'suggestion' : 'suggestions'}.`);
            } else {
                toast.success(`Confirmed as ${picked.brandMasterProduct.brand.name} — ${picked.brandMasterProduct.name}.`);
            }
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Confirm failed');
            // Roll back optimistic dismissals on failure.
            setDismissedIds(prev => {
                const next = new Set(prev);
                siblings.forEach(s => next.delete(s.mappingId));
                return next;
            });
        } finally {
            setSavingId(null);
        }
    };

    const handleRejectSuggestion = async (suggestion: PendingSuggestion) => {
        setSavingId(suggestion.mappingId);
        setDismissedIds(prev => new Set(prev).add(suggestion.mappingId));
        const ok = await rejectMapping(suggestion.mappingId);
        if (ok) {
            toast.success('Suggestion dismissed.');
            await load();
        } else {
            toast.error('Could not dismiss suggestion.');
            setDismissedIds(prev => {
                const next = new Set(prev);
                next.delete(suggestion.mappingId);
                return next;
            });
        }
        setSavingId(null);
    };

    const handleUnlink = async (item: MappedItem) => {
        const ok = window.confirm(
            `Unlink this product from ${item.brandMasterProduct.brand.name}? Customers shopping ${item.brandMasterProduct.brand.name} won't see this stock anymore. You can re-link it later if needed.`
        );
        if (!ok) return;
        setSavingId(item.mappingId);
        try {
            const r = await fetch(`/api/v1/vendor/brand-mappings/${item.mappingId}`, {
                method: 'DELETE',
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Unlink failed');
            toast.success(`Unlinked from ${item.brandMasterProduct.brand.name}.`);
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Unlink failed');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#53B175]" /></div>;
    }

    // Filter pending groups so empty (fully dismissed) groups disappear optimistically.
    const visiblePending = pendingReview
        .map(g => ({ ...g, suggestions: g.suggestions.filter(s => !dismissedIds.has(s.mappingId)) }))
        .filter(g => g.suggestions.length > 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight flex items-center gap-2">
                        <GitMerge size={26} className="text-[#53B175]" /> Brand Mappings
                    </h1>
                    <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px] max-w-2xl">
                        Match your products to a brand&rsquo;s official catalog. Customers will see the brand&rsquo;s name on your stock everywhere they shop.
                    </p>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
                <div className={cn('bg-white rounded-2xl border p-4', TONE_STYLES.low.border)}>
                    <p className={cn('text-[11px] font-bold uppercase tracking-wider', TONE_STYLES.low.text)}>Unmapped</p>
                    <p className="text-[26px] font-black text-[#181725] mt-0.5">{unmapped.length}</p>
                </div>
                <div className={cn('bg-white rounded-2xl border p-4', TONE_STYLES.pending.border)}>
                    <p className={cn('text-[11px] font-bold uppercase tracking-wider', TONE_STYLES.pending.text)}>Awaiting your review</p>
                    <p className={cn('text-[26px] font-black mt-0.5', TONE_STYLES.pending.text)}>{visiblePending.length}</p>
                </div>
                <div className={cn('bg-white rounded-2xl border p-4', TONE_STYLES.live.border)}>
                    <p className={cn('text-[11px] font-bold uppercase tracking-wider', TONE_STYLES.live.text)}>Live mappings</p>
                    <p className={cn('text-[26px] font-black mt-0.5', TONE_STYLES.live.text)}>{mapped.length}</p>
                </div>
            </div>

            {/* Pending review (suggestions from auto-mapper) — shown FIRST as it is the most actionable */}
            {visiblePending.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
                    <div className="p-5 border-b border-amber-100 bg-amber-50/40 flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-600" />
                        <h2 className="text-[15px] font-bold text-amber-900">Auto-detected suggestions</h2>
                        <span className="ml-auto text-[11px] text-amber-700 font-semibold">Please confirm or dismiss</span>
                    </div>
                    <div className="divide-y divide-amber-50">
                        {visiblePending.map(group => (
                            <div key={group.productId} className="p-4 space-y-3">
                                {/* Product header */}
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                                        {group.productImage ? (
                                            <Image src={group.productImage} alt="" fill sizes="48px" className="object-cover" />
                                        ) : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-gray-300" /></div>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Your product</p>
                                        <p className="text-[13px] font-bold text-[#181725] truncate">{group.productName}</p>
                                        <p className="text-[11px] text-gray-400">
                                            {group.brand ? <>Brand field: <span className="text-gray-600 font-medium">{group.brand}</span> · </> : null}
                                            {group.packSize ?? '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Hint if multiple candidates */}
                                {group.suggestions.length > 1 && (
                                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                                        We found {group.suggestions.length} possible matches — pick the one that&rsquo;s the same product, or reject all.
                                    </p>
                                )}

                                {/* Candidate rows */}
                                <div className="space-y-2">
                                    {group.suggestions.map(s => {
                                        const conf = confidenceLabel(s.confidenceScore);
                                        const tone = TONE_STYLES[conf.tone];
                                        const isSaving = savingId === s.mappingId;
                                        return (
                                            <div
                                                key={s.mappingId}
                                                className="flex items-center gap-3 p-3 bg-gray-50/60 border border-gray-100 rounded-xl"
                                            >
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shrink-0 relative border border-gray-100">
                                                    {s.brandMasterProduct.imageUrl ? (
                                                        <Image src={s.brandMasterProduct.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                                                    ) : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-gray-300" /></div>}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        {s.brandMasterProduct.brand.logoUrl && (
                                                            <Image src={s.brandMasterProduct.brand.logoUrl} alt={s.brandMasterProduct.brand.name} width={14} height={14} className="rounded-sm object-contain" />
                                                        )}
                                                        <span className="text-[11px] font-bold text-[#53B175] uppercase tracking-wide">{s.brandMasterProduct.brand.name}</span>
                                                    </div>
                                                    <p className="text-[13px] font-semibold text-[#181725] truncate">{s.brandMasterProduct.name}</p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {s.brandMasterProduct.packSize ?? '—'} · SKU {s.brandMasterProduct.sku ?? '—'}
                                                    </p>
                                                </div>
                                                <span
                                                    title={`Confidence ${conf.percent}%`}
                                                    className={cn(
                                                        'text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap border',
                                                        tone.text, tone.bg, tone.border,
                                                    )}
                                                >
                                                    {conf.label}
                                                </span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleConfirmSuggestion(group, s)}
                                                        disabled={isSaving || savingId !== null}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-[#53B175] text-white text-[12px] font-bold rounded-lg hover:bg-[#3d9e5f] transition-colors disabled:opacity-60"
                                                    >
                                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                        Confirm this match
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectSuggestion(s)}
                                                        disabled={isSaving || savingId !== null}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-[12px] font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-60"
                                                    >
                                                        <X size={12} /> Not this one
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                            <h2 className="text-[15px] font-bold text-[#181725]">Products needing a brand match</h2>
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
                                    className="px-4 py-2 bg-[#53B175] text-white text-[12px] font-bold rounded-lg hover:bg-[#3d9e5f] transition-colors disabled:opacity-60 flex items-center gap-1.5"
                                >
                                    {savingId === p.productId ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
                                    Match to brand SKU
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Live mappings — visible by default, with per-link unlink controls */}
            {mapped.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-[15px] font-bold text-[#181725] flex items-center gap-2">
                                <Check size={16} className="text-[#53B175]" /> Live mappings
                            </h2>
                            <p className="text-[12px] text-gray-500 mt-0.5">These links are live for customers right now. Unlink any you didn&rsquo;t want.</p>
                        </div>
                        <span className="text-[11px] font-bold text-gray-400">{mapped.length} live</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {mapped.map(m => {
                            const status = mappingStatusLabel(m.status);
                            const statusTone = TONE_STYLES[status.tone];
                            const conf = confidenceLabel(m.confidenceScore);
                            const confTone = TONE_STYLES[conf.tone];
                            const isSaving = savingId === m.mappingId;
                            return (
                                <div key={m.mappingId} className="p-4 flex items-center gap-3">
                                    {/* Vendor product */}
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                                            {m.productImage ? <Image src={m.productImage} alt="" fill sizes="40px" className="object-cover" /> :
                                                <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-gray-300" /></div>}
                                        </div>
                                        <p className="text-[12px] font-semibold text-[#181725] truncate">{m.productName}</p>
                                    </div>

                                    <ChevronRight size={14} className="text-gray-300 shrink-0" />

                                    {/* Brand master */}
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                                            {m.brandMasterProduct.imageUrl ? (
                                                <Image src={m.brandMasterProduct.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                                            ) : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-gray-300" /></div>}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                {m.brandMasterProduct.brand.logoUrl && (
                                                    <Image src={m.brandMasterProduct.brand.logoUrl} alt={m.brandMasterProduct.brand.name} width={12} height={12} className="rounded-sm object-contain" />
                                                )}
                                                <span className="text-[10px] font-bold text-[#53B175] uppercase tracking-wide">{m.brandMasterProduct.brand.name}</span>
                                            </div>
                                            <p className="text-[12px] font-semibold text-[#181725] truncate">{m.brandMasterProduct.name}</p>
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={cn(
                                            'text-[10px] font-bold px-2 py-1 rounded-md border whitespace-nowrap',
                                            m.status === 'auto_mapped'
                                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                : cn(statusTone.text, statusTone.bg, statusTone.border),
                                        )}>
                                            {status.label}
                                        </span>
                                        <span
                                            title={`Confidence ${conf.percent}%`}
                                            className={cn(
                                                'text-[10px] font-bold px-2 py-1 rounded-md border whitespace-nowrap',
                                                confTone.text, confTone.bg, confTone.border,
                                            )}
                                        >
                                            {conf.label}
                                        </span>
                                        <button
                                            onClick={() => handleUnlink(m)}
                                            disabled={isSaving}
                                            title="Unlink this mapping"
                                            className="ml-1 flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 text-gray-500 text-[11px] font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-60"
                                        >
                                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                                            Unlink
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {unmapped.length === 0 && visiblePending.length === 0 && mapped.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Package size={36} className="mx-auto text-gray-200 mb-3" />
                    <h3 className="text-[15px] font-bold text-[#181725]">No products yet</h3>
                    <p className="text-[13px] text-gray-400 mt-1">Add products in the Products page first, then come back here to map them to brand SKUs.</p>
                </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[12px] text-blue-900 leading-relaxed space-y-1.5">
                    <p className="font-bold">How brand mapping works</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>When you confirm a mapping, customers searching that brand see your stock under the brand&rsquo;s official product name.</li>
                        <li>Auto-detected matches (high confidence) go live automatically — you can always unlink them.</li>
                        <li>Your prices, inventory, and SKU stay yours. Only the display name changes.</li>
                    </ul>
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
