'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RotateCcw, CheckCircle2, XCircle, Clock, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReturnRequest {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    adminNote: string | null;
    refundAmount: string | null;
    createdAt: string;
    order: { id: string; orderNumber: string; totalAmount: string };
    customer: { id: string; fullName: string; email: string; businessName?: string | null };
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
    request,
    onClose,
    onDone,
}: {
    request: ReturnRequest;
    onClose: () => void;
    onDone: (id: string, status: 'approved' | 'rejected') => void;
}) {
    const [note, setNote] = useState('');
    const [refundAmount, setRefundAmount] = useState(String(Number(request.order.totalAmount)));
    const [action, setAction] = useState<'approved' | 'rejected' | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!action) return;
        setSaving(true);
        try {
            const body: Record<string, unknown> = { status: action, adminNote: note.trim() || undefined };
            if (action === 'approved') body.refundAmount = parseFloat(refundAmount) || 0;
            const res = await fetch(`/api/v1/vendor/returns/${request.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            toast.success(`Return ${action}`);
            onDone(request.id, action);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[480px]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5F5F5]">
                    <div>
                        <p className="text-[15px] font-bold text-[#181725]">Review Return — {request.order.orderNumber}</p>
                        <p className="text-[12px] text-[#AEAEAE]">{request.customer.fullName}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-[#F5F5F5]"><X size={15} className="text-[#7C7C7C]" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Customer reason */}
                    <div className="bg-[#FAFAFA] rounded-[10px] p-4">
                        <p className="text-[10px] font-bold text-[#AEAEAE] uppercase tracking-wide mb-1.5">Customer Reason</p>
                        <p className="text-[13px] text-[#181725]">{request.reason}</p>
                    </div>

                    {/* Action picker */}
                    <div>
                        <p className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide mb-2">Decision</p>
                        <div className="flex gap-2">
                            <button onClick={() => setAction('approved')}
                                className={cn('flex-1 h-[40px] rounded-[10px] text-[13px] font-bold border transition-all flex items-center justify-center gap-2',
                                    action === 'approved' ? 'bg-[#299E60] text-white border-[#299E60]' : 'bg-white text-[#7C7C7C] border-[#EEEEEE] hover:bg-[#EEF8F1]'
                                )}>
                                <CheckCircle2 size={14} /> Approve
                            </button>
                            <button onClick={() => setAction('rejected')}
                                className={cn('flex-1 h-[40px] rounded-[10px] text-[13px] font-bold border transition-all flex items-center justify-center gap-2',
                                    action === 'rejected' ? 'bg-[#E74C3C] text-white border-[#E74C3C]' : 'bg-white text-[#7C7C7C] border-[#EEEEEE] hover:bg-red-50'
                                )}>
                                <XCircle size={14} /> Reject
                            </button>
                        </div>
                    </div>

                    {/* Refund amount — only when approving */}
                    {action === 'approved' && (
                        <div>
                            <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Refund Amount (₹)</label>
                            <input
                                type="number"
                                value={refundAmount}
                                onChange={e => setRefundAmount(e.target.value)}
                                className="mt-1.5 w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] font-bold outline-none focus:border-[#299E60]/50"
                            />
                            <p className="text-[11px] text-[#AEAEAE] mt-1">Order total: ₹{Number(request.order.totalAmount).toLocaleString('en-IN')}</p>
                        </div>
                    )}

                    {/* Note */}
                    <div>
                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Note to customer (optional)</label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={2}
                            placeholder="Explain your decision..."
                            className="mt-1.5 w-full border border-[#EEEEEE] rounded-[10px] px-4 py-3 text-[13px] outline-none focus:border-[#299E60]/50 resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 h-[42px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={!action || saving}
                            className={cn(
                                'flex-1 h-[42px] rounded-[10px] text-[13px] font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50',
                                action === 'rejected' ? 'bg-[#E74C3C] hover:bg-[#d44234] text-white' : 'bg-[#299E60] hover:bg-[#238a54] text-white'
                            )}
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            {action === 'approved' ? 'Approve & Set Refund' : action === 'rejected' ? 'Reject Return' : 'Select Decision'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_STYLE: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600',
    approved: 'bg-[#EEF8F1] text-[#299E60]',
    rejected: 'bg-[#FFF0F0] text-[#E74C3C]',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    pending: <Clock size={11} />,
    approved: <CheckCircle2 size={11} />,
    rejected: <XCircle size={11} />,
};

export default function VendorReturnsPage() {
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [reviewing, setReviewing] = useState<ReturnRequest | null>(null);

    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/vendor/returns');
            const json = await res.json();
            if (json.success) setReturns(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReturns(); }, [fetchReturns]);

    const handleDone = (id: string, status: 'approved' | 'rejected') => {
        setReturns(prev => prev.map(r => r.id !== id ? r : { ...r, status }));
        setReviewing(null);
    };

    const TABS: { key: FilterTab; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Pending' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' },
    ];

    const pendingCount = returns.filter(r => r.status === 'pending').length;
    const filtered = activeTab === 'all' ? returns : returns.filter(r => r.status === activeTab);

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-[24px] font-bold text-[#181725]">Returns & Claims</h1>
                    <p className="text-[12px] text-[#AEAEAE]">Review customer return requests for your orders</p>
                </div>
                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-[10px] px-4 py-2.5">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <span className="text-[13px] font-bold text-amber-700">{pendingCount} pending review</span>
                    </div>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2">
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            'h-[34px] px-4 rounded-[8px] text-[12px] font-bold transition-all',
                            activeTab === tab.key
                                ? 'bg-[#299E60] text-white shadow-sm'
                                : 'bg-white border border-[#EEEEEE] text-[#7C7C7C] hover:border-[#299E60]/30'
                        )}>
                        {tab.label}
                        {tab.key === 'pending' && pendingCount > 0 && (
                            <span className={cn('ml-1.5 text-[10px] font-[900] px-1.5 py-0.5 rounded-full',
                                activeTab === tab.key ? 'bg-white/20' : 'bg-amber-100 text-amber-600'
                            )}>{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#299E60]" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <RotateCcw size={36} className="text-[#E5E7EB] mx-auto mb-3" />
                        <p className="text-[14px] font-bold text-[#AEAEAE]">
                            {activeTab === 'all' ? 'No return requests yet' : `No ${activeTab} returns`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                    <th className="px-5 py-3 text-left text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Order</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Customer</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Reason</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Date</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Refund</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Status</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filtered.map(req => (
                                    <tr key={req.id} className={cn('hover:bg-[#FAFAFA] transition-colors', req.status === 'pending' && 'bg-amber-50/20')}>
                                        <td className="px-5 py-4">
                                            <p className="text-[13px] font-bold text-[#181725]">{req.order.orderNumber}</p>
                                            <p className="text-[11px] text-[#AEAEAE]">₹{Number(req.order.totalAmount).toLocaleString('en-IN')}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-[13px] font-bold text-[#181725]">{req.customer.fullName}</p>
                                            {req.customer.businessName && (
                                                <p className="text-[11px] text-[#AEAEAE]">{req.customer.businessName}</p>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 max-w-[220px]">
                                            <p className="text-[12px] text-[#7C7C7C] line-clamp-2">{req.reason}</p>
                                            {req.adminNote && (
                                                <p className="text-[11px] text-[#AEAEAE] mt-0.5 italic">{req.adminNote}</p>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center text-[12px] text-[#AEAEAE]">
                                            {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </td>
                                        <td className="px-5 py-4 text-center text-[13px] font-bold text-[#181725]">
                                            {req.refundAmount ? `₹${Number(req.refundAmount).toLocaleString('en-IN')}` : '—'}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-[6px] capitalize', STATUS_STYLE[req.status])}>
                                                {STATUS_ICON[req.status]}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {req.status === 'pending' ? (
                                                <button
                                                    onClick={() => setReviewing(req)}
                                                    className="h-[30px] px-3 rounded-[7px] bg-[#181725] text-white text-[11px] font-bold hover:bg-[#2d2d40] transition-all"
                                                >
                                                    Review
                                                </button>
                                            ) : (
                                                <span className="text-[12px] text-[#AEAEAE]">Done</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-[#F5F5F5]">
                        <p className="text-[12px] text-[#AEAEAE]">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</p>
                    </div>
                )}
            </div>

            {reviewing && (
                <ReviewModal
                    request={reviewing}
                    onClose={() => setReviewing(null)}
                    onDone={handleDone}
                />
            )}
        </div>
    );
}
