'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GitMerge, Loader2, Zap, Info, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatPackSize } from '@/lib/utils';
import { mappingStatusLabel, distributorAuthLabel, TONE_STYLES } from '@/lib/brandMappingLabels';

interface CoverageRow {
    mappingId: string;
    masterProductId: string;
    masterProductName: string;
    masterPackSize: string | null;
    masterUnit: string | null;
    masterSku: string | null;
    distributorProductName: string;
    status: string;
    vendorName: string;
    distributorAuthStatus: string | null;
    isAuthApproved: boolean;
}

interface CoverageStats {
    productsCovered: number;
    activeMappings: number;
    pendingReview: number;
    pendingApproval: number;
    totalProducts: number;
}

interface CoveragePayload {
    rows: CoverageRow[];
    stats: CoverageStats;
}

type StatusFilter = 'all' | 'mapped' | 'pending';

export default function BrandMappingsPage() {
    const [data, setData] = useState<CoveragePayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [runningAll, setRunningAll] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [rejecting, setRejecting] = useState<string | null>(null);

    const fetchCoverage = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/brand/coverage');
            const json = await res.json();
            if (json.success) setData(json.data ?? { rows: [], stats: { productsCovered: 0, activeMappings: 0, pendingReview: 0, pendingApproval: 0, totalProducts: 0 } });
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCoverage(); }, [fetchCoverage]);

    const handleRunAll = async () => {
        setRunningAll(true);
        try {
            const res = await fetch('/api/v1/brand/coverage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            const result = await res.json();
            if (result.success) toast.success(result.data?.message ?? result.message ?? 'Auto-mapping complete');
            else toast.error(result.error?.message ?? 'Auto-mapping failed');
            await fetchCoverage();
        } catch {
            toast.error('Network error — please try again');
        } finally {
            setRunningAll(false);
        }
    };

    const handleReject = async (mappingId: string) => {
        const note = window.prompt('Reason for rejecting this mapping (optional):') ?? '';
        setRejecting(mappingId);
        try {
            const res = await fetch(`/api/v1/brand/mappings/${mappingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', reviewNote: note || undefined }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Reject failed');
            toast.success('Mapping rejected');
            await fetchCoverage();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Reject failed');
        } finally {
            setRejecting(null);
        }
    };

    const stats = data?.stats ?? { productsCovered: 0, activeMappings: 0, pendingReview: 0, pendingApproval: 0, totalProducts: 0 };
    const rows = data?.rows ?? [];

    const filteredRows = rows.filter((row) => {
        if (statusFilter === 'mapped') {
            return row.status === 'auto_mapped' || row.status === 'verified';
        }
        if (statusFilter === 'pending') {
            return row.status === 'pending_review';
        }
        return true;
    });

    return (
        <div className="max-w-[1100px] mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight">Distributor Map</h1>
                    <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px]">
                        All distributor links for your catalog — approve vendors on the Distributors page
                    </p>
                </div>
                <button
                    onClick={handleRunAll}
                    disabled={runningAll}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#3d9e41] transition-colors disabled:opacity-60"
                >
                    {runningAll ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    Run Auto-Mapping
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Products Covered', value: stats.productsCovered, color: '#3B82F6', bg: '#EFF6FF' },
                    { label: 'Active (approved vendors)', value: stats.activeMappings, color: '#53B175', bg: '#EEF8F1' },
                    { label: 'Pending confirmation', value: stats.pendingReview, color: '#F59E0B', bg: '#FFF7E6' },
                    { label: 'Awaiting vendor approval', value: stats.pendingApproval, color: '#D97706', bg: '#FFF7E6' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-4 rounded-[14px] border border-[#EEEEEE] shadow-sm">
                        <p className="text-[10px] font-bold text-[#AEAEAE] uppercase tracking-wider">{stat.label}</p>
                        <p className="text-[22px] font-[900] text-[#181725] leading-none mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-[10px] w-fit">
                {(['all', 'mapped', 'pending'] as StatusFilter[]).map((f) => (
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

            <div className="bg-white rounded-[16px] border border-[#EEEEEE] overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-[#53B175]" />
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="py-16 text-center text-[14px] text-gray-400 font-medium">
                        No mappings match this filter. Run auto-mapping after adding products.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    {['Brand Item', 'Distributor Item', 'SKU', 'Status', 'Vendor', 'Auth', ''].map((h) => (
                                        <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRows.map((row) => {
                                    const status = mappingStatusLabel(row.status, 'brand');
                                    const auth = distributorAuthLabel(row.distributorAuthStatus);
                                    const tone = TONE_STYLES[status.tone];
                                    const authTone = TONE_STYLES[auth.tone];
                                    return (
                                        <tr key={row.mappingId} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3">
                                                <p className="text-[13px] font-bold text-[#181725]">{row.masterProductName}</p>
                                                <p className="text-[11px] text-gray-400">{formatPackSize(row.masterPackSize, row.masterUnit) || '—'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-[13px] text-gray-600">{row.distributorProductName}</td>
                                            <td className="px-4 py-3 text-[12px] text-gray-500 font-mono">{row.masterSku ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase', tone.bg, tone.text)}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[12px] text-gray-500">{row.vendorName}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', authTone.bg, authTone.text)}>
                                                    {auth.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {row.status === 'pending_review' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReject(row.mappingId)}
                                                            disabled={rejecting === row.mappingId}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                                                            title="Reject incorrect match"
                                                        >
                                                            <XCircle size={14} />
                                                        </button>
                                                    )}
                                                    {!row.isAuthApproved && (
                                                        <Link href="/brand/portal/distributors" className="text-[11px] font-bold text-[#53B175] hover:underline px-2">
                                                            Approve vendor
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-[#F8F9FB] border border-[#EEEEEE] rounded-[14px] p-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#EEF8F1] flex items-center justify-center shrink-0">
                    <Info size={16} className="text-[#53B175]" />
                </div>
                <div>
                    <p className="text-[13px] font-[900] text-[#181725]">How distributor mapping works</p>
                    <p className="text-[12px] text-[#7C7C7C] font-medium mt-1 leading-relaxed">
                        Auto-mapping suggests links between your catalog and vendor inventory. Vendors must confirm each match.
                        Only <span className="font-bold">approved distributors</span> appear on your public brand store.
                        Reject wrong matches (e.g. Jeera mapped to Khus) here; vendors can remap from their portal.
                    </p>
                </div>
            </div>
        </div>
    );
}
