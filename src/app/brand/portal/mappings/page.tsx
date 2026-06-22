'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GitMerge, Loader2, CheckCircle, Clock, XCircle, Zap, Store, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { confidenceLabel, mappingStatusLabel, TONE_STYLES } from '@/lib/brandMappingLabels';

interface CoverageItem {
    masterProductId: string;
    masterProductName: string;
    packSize: string | null;
    mappings: Array<{
        id: string;
        status: string;
        confidenceScore: number;
        distributorProduct: {
            id: string;
            name: string;
            basePrice: number;
            vendor: { id: string; businessName: string; logoUrl: string | null } | null;
        };
    }>;
}

interface RunMappingResponse {
    success: boolean;
    message?: string;
    before?: number;
    after?: number;
    newMappings?: number;
    error?: { message?: string };
}

// Icon per status — labels + colours come from the shared helper.
const STATUS_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    auto_mapped: CheckCircle,
    verified: CheckCircle,
    pending_review: Clock,
    rejected: XCircle,
};

export default function BrandMappingsPage() {
    const [coverage, setCoverage] = useState<CoverageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningAll, setRunningAll] = useState(false);

    const fetchCoverage = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/brand/coverage');
            const json = await res.json();
            if (json.success) setCoverage(json.data ?? []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCoverage(); }, [fetchCoverage]);

    const handleRunAll = async () => {
        setRunningAll(true);
        try {
            const res = await fetch('/api/v1/brand/coverage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const result: RunMappingResponse = await res.json();
            if (result.success) {
                toast.success(result.message ?? 'Auto-mapping complete');
            } else {
                toast.error(result.error?.message ?? 'Auto-mapping failed');
            }
            await fetchCoverage();
        } catch {
            toast.error('Network error — please try again');
        }
        finally { setRunningAll(false); }
    };

    const totalCovered = coverage.filter(c => c.mappings.length > 0).length;
    const activeMappings = coverage.reduce((sum, item) =>
        sum + item.mappings.filter(m => m.status === 'auto_mapped' || m.status === 'verified').length, 0);
    const pendingMappings = coverage.reduce((s, c) =>
        s + c.mappings.filter(m => m.status === 'pending_review').length, 0);

    return (
        <div className="max-w-[1100px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight">Distributor Map</h1>
                    <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px]">
                        See which distributors carry your products and at what price
                    </p>
                </div>
                <button
                    onClick={handleRunAll}
                    disabled={runningAll}
                    title="Scans all approved distributor catalogs for products that match your brand. New matches show up below."
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#3d9e41] transition-colors disabled:opacity-60"
                >
                    {runningAll ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    Run Auto-Mapping
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Products Covered', value: totalCovered, color: '#3B82F6', bg: '#EFF6FF' },
                    { label: 'Active Mappings', value: activeMappings, color: '#53B175', bg: '#EEF8F1' },
                    { label: 'Pending Review', value: pendingMappings, color: '#F59E0B', bg: '#FFF7E6' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white p-4 rounded-[14px] border border-[#EEEEEE] shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: stat.bg }}>
                            <GitMerge size={18} style={{ color: stat.color }} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-[#AEAEAE] uppercase tracking-wider">{stat.label}</p>
                            <p className="text-[22px] font-[900] text-[#181725] leading-none">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Coverage list */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[#53B175]" />
                </div>
            ) : coverage.length === 0 ? (
                <div className="bg-white rounded-[20px] border border-[#EEEEEE] p-12 text-center">
                    <GitMerge size={40} className="mx-auto text-[#EEEEEE] mb-3" />
                    <p className="text-[16px] font-bold text-[#AEAEAE]">No mapping data yet</p>
                    <p className="text-[13px] text-[#AEAEAE] mt-1 mb-5">Add products first, then run auto-mapping to find distributors</p>
                    <button onClick={handleRunAll} disabled={runningAll}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold mx-auto disabled:opacity-60">
                        <Zap size={14} /> Run Auto-Mapping
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {coverage.map(item => (
                        <div key={item.masterProductId} className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
                                <div>
                                    <p className="text-[15px] font-[900] text-[#181725]">{item.masterProductName}</p>
                                    {item.packSize && <p className="text-[12px] text-[#AEAEAE] mt-0.5">{item.packSize}</p>}
                                </div>
                                <span className={cn(
                                    'text-[12px] font-[900] px-2.5 py-1 rounded-[6px]',
                                    item.mappings.length > 0 ? 'bg-[#EEF8F1] text-[#53B175]' : 'bg-[#F8F9FB] text-[#AEAEAE]'
                                )}>
                                    {item.mappings.length} distributor{item.mappings.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {item.mappings.length === 0 ? (
                                <div className="px-5 py-4 text-[13px] text-[#AEAEAE] font-bold flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-2">
                                        <Store size={14} /> No distributors found yet
                                    </span>
                                    <span className="text-[11px] text-[#AEAEAE] font-medium">
                                        Click <span className="text-[#53B175] font-bold">Run Auto-Mapping</span> above to scan vendor catalogs
                                    </span>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#F5F5F5]">
                                    {item.mappings.map(mapping => {
                                        const status = mappingStatusLabel(mapping.status);
                                        const statusTone = TONE_STYLES[status.tone];
                                        const StatusIcon = STATUS_ICONS[mapping.status] ?? Clock;
                                        const confidence = confidenceLabel(mapping.confidenceScore);
                                        const confidenceTone = TONE_STYLES[confidence.tone];
                                        return (
                                            <div key={mapping.id} className="px-5 py-3 flex items-center gap-3">
                                                {mapping.distributorProduct.vendor?.logoUrl ? (
                                                    <img src={mapping.distributorProduct.vendor.logoUrl} alt=""
                                                        className="w-9 h-9 rounded-[8px] object-contain border border-[#EEEEEE] p-1 bg-white shrink-0" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-[8px] bg-[#F8F9FB] flex items-center justify-center text-[#AEAEAE] shrink-0">
                                                        <Store size={16} />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[14px] font-bold text-[#181725] truncate">
                                                        {mapping.distributorProduct.vendor?.businessName ?? 'Unassigned product'}
                                                    </p>
                                                    <p className="text-[12px] text-[#AEAEAE] truncate">{mapping.distributorProduct.name}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[15px] font-[900] text-[#181725]">
                                                        ₹{Number(mapping.distributorProduct.basePrice).toFixed(0)}
                                                    </p>
                                                    <div className="flex items-center gap-1 justify-end mt-0.5">
                                                        <StatusIcon size={11} className={statusTone.text} />
                                                        <span className={cn('text-[10px] font-bold', statusTone.text)}>{status.label}</span>
                                                    </div>
                                                </div>
                                                <div
                                                    className="text-right shrink-0 ml-2"
                                                    title={`${confidence.percent}% confidence`}
                                                >
                                                    <span className={cn('text-[10px] font-bold', confidenceTone.text)}>
                                                        {confidence.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* How this works tip */}
            <div className="bg-[#F8F9FB] border border-[#EEEEEE] rounded-[14px] p-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#EEF8F1] flex items-center justify-center shrink-0">
                    <Info size={16} className="text-[#53B175]" />
                </div>
                <div>
                    <p className="text-[13px] font-[900] text-[#181725]">How distributor mapping works</p>
                    <p className="text-[12px] text-[#7C7C7C] font-medium mt-1 leading-relaxed">
                        Distributors carrying your brand are matched to your catalog automatically. High-confidence matches go live; lower-confidence ones wait for distributor confirmation. Click <span className="font-bold text-[#181725]">Run Auto-Mapping</span> to re-scan any time.
                    </p>
                </div>
            </div>
        </div>
    );
}
