'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, CreditCard, AlertTriangle, CheckCircle2, X, IndianRupee, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreditAccountRow {
    id: string;
    status: 'pending' | 'active' | 'suspended' | 'closed';
    creditLimit: number;
    creditUsed: number;
    creditAvailable: number;
    overdueAmount: number;
    daysOverdue: number;
    aging: string;
    createdAt: string;
    user: { id: string; fullName: string; email: string; phone?: string | null; businessName?: string | null };
}

interface Summary {
    totalOutstanding: number;
    totalOverdue: number;
    dueToday: number;
    totalLimit: number;
    count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(v: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);
}

const STATUS_STYLE: Record<string, string> = {
    active: 'bg-[#EEF8F1] text-[#299E60]',
    suspended: 'bg-amber-50 text-amber-600',
    closed: 'bg-[#F3F4F6] text-[#6B7280]',
    pending: 'bg-blue-50 text-blue-600',
};

const AGING_STYLE: Record<string, string> = {
    current: 'text-[#299E60]',
    '1-30': 'text-amber-500',
    '31-60': 'text-orange-500',
    '61-90': 'text-[#E74C3C]',
    '90+': 'text-[#E74C3C] font-[900]',
};

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({
    account,
    onClose,
    onSuccess,
}: {
    account: CreditAccountRow;
    onClose: () => void;
    onSuccess: (paid: number) => void;
}) {
    const [amount, setAmount] = useState(String(account.creditUsed));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/vendor/collections/${account.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt, notes: notes.trim() || undefined }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            toast.success(`Payment of ${formatINR(json.data.paid)} recorded`);
            onSuccess(json.data.paid);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5F5F5]">
                    <div>
                        <p className="text-[15px] font-bold text-[#181725]">Record Payment</p>
                        <p className="text-[12px] text-[#AEAEAE]">{account.user.fullName} · Outstanding {formatINR(account.creditUsed)}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-[#F5F5F5]"><X size={15} className="text-[#7C7C7C]" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Amount (₹)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="mt-1.5 w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] font-bold outline-none focus:border-[#299E60]/50"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Notes (optional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="mt-1.5 w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-4 text-[13px] outline-none focus:border-[#299E60]/50"
                            placeholder="Cheque no., NEFT ref…"
                        />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 h-[42px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex-1 h-[42px] rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Record Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Limit Modal ─────────────────────────────────────────────────────────

function EditLimitModal({
    account,
    onClose,
    onSuccess,
}: {
    account: CreditAccountRow;
    onClose: () => void;
    onSuccess: (newLimit: number, newStatus: string) => void;
}) {
    const [limit, setLimit] = useState(String(account.creditLimit));
    const [status, setStatus] = useState<'active' | 'suspended' | 'closed'>(
        account.status === 'pending' ? 'active' : account.status as 'active' | 'suspended' | 'closed'
    );
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        const lmt = parseFloat(limit);
        if (isNaN(lmt) || lmt < 0) { toast.error('Enter a valid limit'); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/vendor/collections/${account.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creditLimit: lmt, status }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            toast.success('Credit account updated');
            onSuccess(lmt, status);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5F5F5]">
                    <div>
                        <p className="text-[15px] font-bold text-[#181725]">Edit Credit Account</p>
                        <p className="text-[12px] text-[#AEAEAE]">{account.user.fullName}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-[#F5F5F5]"><X size={15} className="text-[#7C7C7C]" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Credit Limit (₹)</label>
                        <input
                            type="number"
                            value={limit}
                            onChange={e => setLimit(e.target.value)}
                            className="mt-1.5 w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] font-bold outline-none focus:border-[#299E60]/50"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Status</label>
                        <div className="mt-1.5 flex gap-2">
                            {(['active', 'suspended', 'closed'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={cn(
                                        'flex-1 h-[36px] rounded-[8px] text-[12px] font-bold capitalize transition-all border',
                                        status === s
                                            ? s === 'active' ? 'bg-[#299E60] text-white border-[#299E60]'
                                                : s === 'suspended' ? 'bg-amber-500 text-white border-amber-500'
                                                    : 'bg-[#6B7280] text-white border-[#6B7280]'
                                            : 'bg-white text-[#7C7C7C] border-[#EEEEEE] hover:bg-[#F5F5F5]'
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 h-[42px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex-1 h-[42px] rounded-[10px] bg-[#181725] text-white text-[13px] font-bold hover:bg-[#2d2d40] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type ModalState =
    | { type: 'payment'; account: CreditAccountRow }
    | { type: 'edit'; account: CreditAccountRow }
    | null;

type FilterTab = 'all' | 'overdue' | 'active' | 'suspended';

export default function VendorCollectionsPage() {
    const [accounts, setAccounts] = useState<CreditAccountRow[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');

    const fetchCollections = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch('/api/v1/vendor/collections');
            const json = await res.json();
            if (json.success) {
                setAccounts(json.data.accounts);
                setSummary(json.data.summary);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCollections(); }, [fetchCollections]);

    const handlePaymentSuccess = (accountId: string, paid: number) => {
        setAccounts(prev => prev.map(a => a.id !== accountId ? a : {
            ...a,
            creditUsed: Math.max(0, a.creditUsed - paid),
            creditAvailable: Math.min(a.creditLimit, a.creditAvailable + paid),
            overdueAmount: Math.max(0, a.overdueAmount - paid),
        }));
        setSummary(prev => prev ? { ...prev, totalOutstanding: Math.max(0, prev.totalOutstanding - paid) } : prev);
        setModal(null);
    };

    const handleEditSuccess = (accountId: string, newLimit: number, newStatus: string) => {
        setAccounts(prev => prev.map(a => a.id !== accountId ? a : {
            ...a,
            creditLimit: newLimit,
            creditAvailable: Math.max(0, newLimit - a.creditUsed),
            status: newStatus as CreditAccountRow['status'],
        }));
        setModal(null);
    };

    const FILTER_TABS: { key: FilterTab; label: string }[] = [
        { key: 'all', label: 'All Customers' },
        { key: 'overdue', label: 'Overdue' },
        { key: 'active', label: 'Active' },
        { key: 'suspended', label: 'Suspended' },
    ];

    const filtered = accounts.filter(a => {
        if (activeTab === 'overdue') return a.overdueAmount > 0;
        if (activeTab === 'active') return a.status === 'active';
        if (activeTab === 'suspended') return a.status === 'suspended';
        return true;
    });

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-[24px] font-bold text-[#181725]">Collections</h1>
                <p className="text-[12px] text-[#AEAEAE]">Monitor customer credit, outstanding balances, and overdue accounts</p>
            </div>

            {/* Stats bar */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Outstanding', value: formatINR(summary.totalOutstanding), icon: IndianRupee, color: 'text-[#181725]', bg: 'bg-white' },
                        { label: 'Overdue', value: formatINR(summary.totalOverdue), icon: AlertTriangle, color: 'text-[#E74C3C]', bg: summary.totalOverdue > 0 ? 'bg-red-50 border-red-100' : 'bg-white' },
                        { label: 'Total Credit Limit', value: formatINR(summary.totalLimit), icon: TrendingUp, color: 'text-[#299E60]', bg: 'bg-white' },
                        { label: 'Active Accounts', value: String(summary.count), icon: Clock, color: 'text-blue-600', bg: 'bg-white' },
                    ].map(stat => (
                        <div key={stat.label} className={cn('rounded-[14px] border border-[#EEEEEE] shadow-sm p-5 flex items-start gap-4', stat.bg)}>
                            <div className={cn('p-2.5 rounded-[10px] bg-[#F5F5F5]')}>
                                <stat.icon size={18} className={stat.color} />
                            </div>
                            <div>
                                <p className="text-[11px] text-[#AEAEAE] font-bold uppercase tracking-wide">{stat.label}</p>
                                <p className={cn('text-[22px] font-bold leading-tight mt-0.5', stat.color)}>{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            'h-[34px] px-4 rounded-[8px] text-[12px] font-bold transition-all',
                            activeTab === tab.key
                                ? 'bg-[#299E60] text-white shadow-sm'
                                : 'bg-white border border-[#EEEEEE] text-[#7C7C7C] hover:border-[#299E60]/30'
                        )}
                    >
                        {tab.label}
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
                        <CreditCard size={36} className="text-[#E5E7EB] mx-auto mb-3" />
                        <p className="text-[14px] font-bold text-[#AEAEAE]">No credit accounts yet</p>
                        <p className="text-[12px] text-[#AEAEAE] mt-1">Credit accounts are created when customers choose credit payment</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                    <th className="px-5 py-3 text-left text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Customer</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Limit</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Used</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Available</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Aging</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Status</th>
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filtered.map(acc => (
                                    <tr key={acc.id} className={cn('hover:bg-[#FAFAFA] transition-colors', acc.overdueAmount > 0 && 'bg-red-50/30')}>
                                        <td className="px-5 py-4">
                                            <p className="text-[13px] font-bold text-[#181725]">{acc.user.fullName}</p>
                                            {acc.user.businessName && (
                                                <p className="text-[11px] text-[#AEAEAE]">{acc.user.businessName}</p>
                                            )}
                                            <p className="text-[11px] text-[#AEAEAE]">{acc.user.email}</p>
                                        </td>
                                        <td className="px-5 py-4 text-right text-[13px] font-bold text-[#181725]">{formatINR(acc.creditLimit)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <span className={cn('text-[13px] font-bold', acc.creditUsed > 0 ? 'text-[#E74C3C]' : 'text-[#AEAEAE]')}>
                                                {formatINR(acc.creditUsed)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right text-[13px] font-bold text-[#299E60]">{formatINR(acc.creditAvailable)}</td>
                                        <td className="px-5 py-4 text-center">
                                            {acc.daysOverdue > 0 ? (
                                                <div>
                                                    <span className={cn('text-[12px] font-bold', AGING_STYLE[acc.aging] || 'text-[#E74C3C]')}>
                                                        {acc.daysOverdue}d overdue
                                                    </span>
                                                    <p className="text-[10px] text-[#AEAEAE]">{acc.aging} days</p>
                                                </div>
                                            ) : (
                                                <span className="text-[12px] text-[#AEAEAE]">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-[6px] capitalize', STATUS_STYLE[acc.status] || 'bg-gray-100 text-gray-500')}>
                                                {acc.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {acc.creditUsed > 0 && (
                                                    <button
                                                        onClick={() => setModal({ type: 'payment', account: acc })}
                                                        className="h-[30px] px-3 rounded-[7px] bg-[#299E60] text-white text-[11px] font-bold hover:bg-[#238a54] transition-all"
                                                    >
                                                        Record Payment
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setModal({ type: 'edit', account: acc })}
                                                    className="h-[30px] px-3 rounded-[7px] border border-[#EEEEEE] text-[11px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all"
                                                >
                                                    Edit Limit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-[#F5F5F5]">
                        <p className="text-[12px] text-[#AEAEAE]">
                            {filtered.length} account{filtered.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {modal?.type === 'payment' && (
                <RecordPaymentModal
                    account={modal.account}
                    onClose={() => setModal(null)}
                    onSuccess={(paid) => handlePaymentSuccess(modal.account.id, paid)}
                />
            )}
            {modal?.type === 'edit' && (
                <EditLimitModal
                    account={modal.account}
                    onClose={() => setModal(null)}
                    onSuccess={(limit, status) => handleEditSuccess(modal.account.id, limit, status)}
                />
            )}
        </div>
    );
}
