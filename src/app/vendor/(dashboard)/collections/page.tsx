'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Loader2, CreditCard, AlertTriangle, CheckCircle2, X,
    IndianRupee, TrendingUp, Clock, ChevronDown, ChevronUp, Settings,
} from 'lucide-react';
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
    accruedInterest: number;
    accruedPenalty: number;
    totalDue: number;
    graceDays: number;
    interestRatePct: number;
    penaltyRatePct: number;
    freezeOnOverdueDays: number;
    createdAt: string;
    user: { id: string; fullName: string; email: string; phone?: string | null; businessName?: string | null };
}

interface Summary {
    totalOutstanding: number;
    totalOverdue: number;
    dueToday: number;
    totalLimit: number;
    totalInterestPenalty: number;
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
    account, onClose, onSuccess,
}: {
    account: CreditAccountRow;
    onClose: () => void;
    onSuccess: (paid: number) => void;
}) {
    const [amount, setAmount] = useState(String(account.totalDue || account.creditUsed));
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
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[440px]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5F5F5]">
                    <div>
                        <p className="text-[15px] font-bold text-[#181725]">Record Payment</p>
                        <p className="text-[12px] text-[#AEAEAE]">
                            {account.user.businessName ?? account.user.fullName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-[#F5F5F5]">
                        <X size={15} className="text-[#7C7C7C]" />
                    </button>
                </div>

                {/* Balance breakdown */}
                {account.totalDue > account.creditUsed && (
                    <div className="mx-6 mt-4 bg-amber-50 rounded-[10px] p-3 text-[12px] space-y-1">
                        <div className="flex justify-between text-[#7C7C7C]">
                            <span>Outstanding principal</span>
                            <span className="font-semibold">{formatINR(account.creditUsed)}</span>
                        </div>
                        {account.accruedInterest > 0 && (
                            <div className="flex justify-between text-amber-600">
                                <span>Accrued interest</span>
                                <span className="font-semibold">+{formatINR(account.accruedInterest)}</span>
                            </div>
                        )}
                        {account.accruedPenalty > 0 && (
                            <div className="flex justify-between text-[#E74C3C]">
                                <span>Penalty charges</span>
                                <span className="font-semibold">+{formatINR(account.accruedPenalty)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[#181725] font-bold pt-1 border-t border-amber-200">
                            <span>Total due</span>
                            <span>{formatINR(account.totalDue)}</span>
                        </div>
                    </div>
                )}

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Amount Received (₹)</label>
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
                        <button onClick={onClose} className="flex-1 h-[42px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all">
                            Cancel
                        </button>
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

// ─── Edit Account Modal ───────────────────────────────────────────────────────

function EditAccountModal({
    account, onClose, onSuccess,
}: {
    account: CreditAccountRow;
    onClose: () => void;
    onSuccess: (updated: Partial<CreditAccountRow>) => void;
}) {
    const [limit, setLimit] = useState(String(account.creditLimit));
    const [status, setStatus] = useState<'active' | 'suspended' | 'closed'>(
        account.status === 'pending' ? 'active' : account.status as 'active' | 'suspended' | 'closed'
    );
    const [graceDays, setGraceDays] = useState(String(account.graceDays));
    const [interestRate, setInterestRate] = useState(String(account.interestRatePct));
    const [penaltyRate, setPenaltyRate] = useState(String(account.penaltyRatePct));
    const [freezeAfter, setFreezeAfter] = useState(String(account.freezeOnOverdueDays));
    const [showRules, setShowRules] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        const lmt = parseFloat(limit);
        if (isNaN(lmt) || lmt < 0) { toast.error('Enter a valid limit'); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/vendor/collections/${account.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creditLimit: lmt,
                    status,
                    graceDays: parseInt(graceDays) || 0,
                    interestRatePct: parseFloat(interestRate) || 0,
                    penaltyRatePct: parseFloat(penaltyRate) || 0,
                    freezeOnOverdueDays: parseInt(freezeAfter) || 0,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            toast.success('Credit account updated');
            onSuccess({
                creditLimit: lmt,
                creditAvailable: Math.max(0, lmt - account.creditUsed),
                status: status as CreditAccountRow['status'],
                graceDays: parseInt(graceDays) || 0,
                interestRatePct: parseFloat(interestRate) || 0,
                penaltyRatePct: parseFloat(penaltyRate) || 0,
                freezeOnOverdueDays: parseInt(freezeAfter) || 0,
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[460px] max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5F5F5] sticky top-0 bg-white z-10">
                    <div>
                        <p className="text-[15px] font-bold text-[#181725]">Edit Credit Account</p>
                        <p className="text-[12px] text-[#AEAEAE]">
                            {account.user.businessName ?? account.user.fullName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-[#F5F5F5]">
                        <X size={15} className="text-[#7C7C7C]" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Basic */}
                    <div className="space-y-4">
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
                    </div>

                    {/* Credit Rules — collapsible */}
                    <div className="border border-[#EEEEEE] rounded-[12px] overflow-hidden">
                        <button
                            onClick={() => setShowRules(v => !v)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-[#FAFAFA] hover:bg-[#F5F5F5] transition-colors"
                        >
                            <div className="flex items-center gap-2 text-[13px] font-bold text-[#181725]">
                                <Settings size={14} className="text-[#AEAEAE]" />
                                Credit Rules
                            </div>
                            {showRules ? <ChevronUp size={14} className="text-[#AEAEAE]" /> : <ChevronDown size={14} className="text-[#AEAEAE]" />}
                        </button>

                        {showRules && (
                            <div className="px-4 py-4 space-y-4 border-t border-[#EEEEEE]">
                                <p className="text-[11px] text-[#AEAEAE]">
                                    These rules are enforced automatically when this customer places credit orders or when interest/penalties are computed.
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Grace Period (days)</label>
                                        <input
                                            type="number" min="0" max="365"
                                            value={graceDays}
                                            onChange={e => setGraceDays(e.target.value)}
                                            className="mt-1 w-full h-[38px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/50"
                                        />
                                        <p className="text-[10px] text-[#AEAEAE] mt-0.5">Days after due date before overdue clock starts</p>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Freeze After (days)</label>
                                        <input
                                            type="number" min="0" max="365"
                                            value={freezeAfter}
                                            onChange={e => setFreezeAfter(e.target.value)}
                                            className="mt-1 w-full h-[38px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/50"
                                        />
                                        <p className="text-[10px] text-[#AEAEAE] mt-0.5">0 = never auto-freeze</p>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Interest Rate (% / month)</label>
                                        <input
                                            type="number" min="0" max="100" step="0.1"
                                            value={interestRate}
                                            onChange={e => setInterestRate(e.target.value)}
                                            className="mt-1 w-full h-[38px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/50"
                                        />
                                        <p className="text-[10px] text-[#AEAEAE] mt-0.5">0 = no interest</p>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Penalty Rate (% / day)</label>
                                        <input
                                            type="number" min="0" max="100" step="0.01"
                                            value={penaltyRate}
                                            onChange={e => setPenaltyRate(e.target.value)}
                                            className="mt-1 w-full h-[38px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/50"
                                        />
                                        <p className="text-[10px] text-[#AEAEAE] mt-0.5">0 = no penalty</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 h-[42px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all">
                            Cancel
                        </button>
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

    const fetchCollections = useCallback(async () => {
        setLoading(true);
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
            totalDue: Math.max(0, a.totalDue - paid),
        }));
        setSummary(prev => prev ? { ...prev, totalOutstanding: Math.max(0, prev.totalOutstanding - paid) } : prev);
        setModal(null);
    };

    const handleEditSuccess = (accountId: string, updates: Partial<CreditAccountRow>) => {
        setAccounts(prev => prev.map(a => a.id !== accountId ? a : { ...a, ...updates }));
        setModal(null);
    };

    const FILTER_TABS: { key: FilterTab; label: string }[] = [
        { key: 'all', label: 'All' },
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
            <div>
                <h1 className="text-[24px] font-bold text-[#181725]">Collections</h1>
                <p className="text-[12px] text-[#AEAEAE]">Monitor credit, overdue balances, interest & penalties</p>
            </div>

            {/* Stats bar */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[
                        { label: 'Total Outstanding', value: formatINR(summary.totalOutstanding), icon: IndianRupee, color: 'text-[#181725]', bg: 'bg-white' },
                        { label: 'Overdue Amount', value: formatINR(summary.totalOverdue), icon: AlertTriangle, color: 'text-[#E74C3C]', bg: summary.totalOverdue > 0 ? 'bg-red-50 border-red-100' : 'bg-white' },
                        { label: 'Interest & Penalties', value: formatINR(summary.totalInterestPenalty ?? 0), icon: TrendingUp, color: 'text-amber-600', bg: (summary.totalInterestPenalty ?? 0) > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white' },
                        { label: 'Total Credit Limit', value: formatINR(summary.totalLimit), icon: CreditCard, color: 'text-[#299E60]', bg: 'bg-white' },
                        { label: 'Active Accounts', value: String(summary.count), icon: Clock, color: 'text-blue-600', bg: 'bg-white' },
                    ].map(stat => (
                        <div key={stat.label} className={cn('rounded-[14px] border border-[#EEEEEE] shadow-sm p-4 flex items-start gap-3', stat.bg)}>
                            <div className="p-2 rounded-[8px] bg-[#F5F5F5] shrink-0">
                                <stat.icon size={16} className={stat.color} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-[#AEAEAE] font-bold uppercase tracking-wide leading-tight">{stat.label}</p>
                                <p className={cn('text-[18px] font-bold leading-tight mt-0.5', stat.color)}>{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex items-center gap-2">
                <div className="flex bg-[#F5F5F5] rounded-[10px] p-0.5 gap-0.5">
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                'h-[30px] px-4 rounded-[8px] text-[12px] font-semibold transition-all',
                                activeTab === tab.key
                                    ? 'bg-white text-[#181725] shadow-sm'
                                    : 'text-[#7C7C7C] hover:text-[#181725]'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
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
                        <p className="text-[12px] text-[#AEAEAE] mt-1">Credit accounts appear when customers choose credit payment</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                    <th className="px-5 py-3 text-left font-bold text-[#AEAEAE] uppercase tracking-wide">Customer</th>
                                    <th className="px-4 py-3 text-right font-bold text-[#AEAEAE] uppercase tracking-wide">Limit</th>
                                    <th className="px-4 py-3 text-right font-bold text-[#AEAEAE] uppercase tracking-wide">Outstanding</th>
                                    <th className="px-4 py-3 text-right font-bold text-[#AEAEAE] uppercase tracking-wide">Interest + Penalty</th>
                                    <th className="px-4 py-3 text-right font-bold text-[#AEAEAE] uppercase tracking-wide">Total Due</th>
                                    <th className="px-4 py-3 text-center font-bold text-[#AEAEAE] uppercase tracking-wide">Aging</th>
                                    <th className="px-4 py-3 text-center font-bold text-[#AEAEAE] uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-3 text-center font-bold text-[#AEAEAE] uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filtered.map(acc => {
                                    const hasCharges = acc.accruedInterest + acc.accruedPenalty > 0;
                                    return (
                                        <tr key={acc.id} className={cn('hover:bg-[#FAFAFA] transition-colors', acc.overdueAmount > 0 && 'bg-red-50/20')}>
                                            <td className="px-5 py-4">
                                                <p className="font-bold text-[#181725] truncate max-w-[160px]">
                                                    {acc.user.businessName ?? acc.user.fullName}
                                                </p>
                                                {acc.user.businessName && (
                                                    <p className="text-[#AEAEAE] truncate">{acc.user.fullName}</p>
                                                )}
                                                <p className="text-[#AEAEAE] truncate">{acc.user.email}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-[#181725]">
                                                {formatINR(acc.creditLimit)}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className={cn('font-bold', acc.creditUsed > 0 ? 'text-[#E74C3C]' : 'text-[#AEAEAE]')}>
                                                    {formatINR(acc.creditUsed)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {hasCharges ? (
                                                    <div>
                                                        <span className="font-bold text-amber-600">
                                                            {formatINR(acc.accruedInterest + acc.accruedPenalty)}
                                                        </span>
                                                        <p className="text-[#AEAEAE] text-[10px]">
                                                            {acc.interestRatePct > 0 && `${acc.interestRatePct}%/mo`}
                                                            {acc.interestRatePct > 0 && acc.penaltyRatePct > 0 && ' · '}
                                                            {acc.penaltyRatePct > 0 && `${acc.penaltyRatePct}%/day`}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[#AEAEAE]">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {acc.totalDue > 0 ? (
                                                    <span className={cn('font-bold', acc.totalDue > acc.creditUsed ? 'text-amber-600' : 'text-[#E74C3C]')}>
                                                        {formatINR(acc.totalDue)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[#AEAEAE]">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {acc.daysOverdue > 0 ? (
                                                    <div>
                                                        <span className={cn('font-bold', AGING_STYLE[acc.aging] || 'text-[#E74C3C]')}>
                                                            {acc.daysOverdue}d
                                                        </span>
                                                        <p className="text-[#AEAEAE] text-[10px]">{acc.aging} days</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[#AEAEAE]">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={cn('font-bold px-2.5 py-1 rounded-[6px] capitalize', STATUS_STYLE[acc.status] || 'bg-gray-100 text-gray-500')}>
                                                    {acc.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                    {acc.creditUsed > 0 && (
                                                        <button
                                                            onClick={() => setModal({ type: 'payment', account: acc })}
                                                            className="h-[28px] px-3 rounded-[7px] bg-[#299E60] text-white text-[11px] font-bold hover:bg-[#238a54] transition-all whitespace-nowrap"
                                                        >
                                                            Record Payment
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setModal({ type: 'edit', account: acc })}
                                                        className="h-[28px] px-3 rounded-[7px] border border-[#EEEEEE] text-[11px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all whitespace-nowrap"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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
                <EditAccountModal
                    account={modal.account}
                    onClose={() => setModal(null)}
                    onSuccess={(updates) => handleEditSuccess(modal.account.id, updates)}
                />
            )}
        </div>
    );
}
