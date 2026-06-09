'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, ShieldAlert, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type WalletStatus = 'ACTIVE' | 'BLOCKED' | 'BLACKLISTED';

interface CreditWalletRow {
    id: string;
    userId: string;
    vendorId: string | null;
    status: WalletStatus;
    creditLimit: string | number;
    availableCredit: string | number;
    usedCredit: string | number;
    outstandingAmount: string | number;
    currentDueDate: string | null;
    overdueDays: number;
    createdAt: string;
    user: { id: string; fullName: string; phone: string | null; email: string | null };
    vendor: { businessName: string } | null;
}

interface OverdueRow {
    customer: string;
    phone: string | null;
    vendor: string;
    creditLimit: number;
    outstanding: number;
    dueDate: string | null;
    overdueDays: number;
    status: WalletStatus;
    highlightRed: boolean;
}

interface UtilizationStats {
    totalCreditIssued: number;
    totalCreditUtilized: number;
    totalRepayments: number;
    outstandingAmount: number;
    activeCustomers: number;
    blacklistedCustomers: number;
}

interface InterestRow {
    customer: string;
    interestApplied: number;
    date: string | null;
    outstandingBaseAmount: number;
}

interface AuditRow {
    customer: string;
    action: string;
    performedBy: string;
    previousValue: string | null;
    newValue: string | null;
    remarks: string | null;
    timestamp: string;
}

interface ReportsData {
    overdue?: OverdueRow[];
    utilization?: UtilizationStats;
    interest?: InterestRow[];
    audit?: AuditRow[];
}

interface GlobalConfig {
    id: string;
    repaymentMode: 'REPAY_BEFORE_NEXT_USE' | 'ALLOW_USAGE_TILL_DUE';
    billingModel: 'BILL_TO_BILL' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
    creditLimit: string | number;
    creditTenureDays: number;
    gracePeriodDays: number;
    blacklistDays: number;
    interestRatePct: string | number;
    interestFrequencyDays: number;
    penaltyAmount: string | number;
    penaltyFrequencyDays: number;
    eligiblePurchaseCount: number;
    unlockCreditAmount: string | number;
}

type TabKey = 'lines' | 'reports' | 'config';

const STATUS_STYLE: Record<WalletStatus, string> = {
    ACTIVE: 'bg-[#EEF8F1] text-[#299E60]',
    BLOCKED: 'bg-[#FFF4E5] text-[#976538]',
    BLACKLISTED: 'bg-[#FFF0F0] text-[#E74C3C]',
};

const inputCls = 'w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40 transition-colors bg-white';

const fmtMoney = (v: string | number) => `₹ ${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (v: string | null) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminCreditPage() {
    const [tab, setTab] = useState<TabKey>('lines');

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Credit & Wallet</h1>
                <p className="text-[#000000] text-[13px] font-medium opacity-70">Assign credit lines, monitor utilization, and tune global credit policy</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-white border border-[#DCDCDC] rounded-[12px] p-1.5 max-w-fit shadow-sm">
                {([
                    { key: 'lines', label: 'Credit Lines' },
                    { key: 'reports', label: 'Reports' },
                    { key: 'config', label: 'Global Config' },
                ] as { key: TabKey; label: string }[]).map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={cn(
                            'h-[40px] px-6 rounded-[9px] text-[13px] font-bold transition-all',
                            tab === t.key ? 'bg-[#299E60] text-white shadow-sm shadow-[#299E60]/20' : 'text-[#4B4B4B] hover:bg-[#F8F9FB]'
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'lines' && <CreditLinesSection />}
            {tab === 'reports' && <ReportsSection />}
            {tab === 'config' && <GlobalConfigSection />}
        </div>
    );
}

// ─── Section A: Credit Lines ────────────────────────────────────────────────

function CreditLinesSection() {
    const [wallets, setWallets] = useState<CreditWalletRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    // Assign form state
    const [formUserId, setFormUserId] = useState('');
    const [formVendorId, setFormVendorId] = useState('');
    const [formCreditLimit, setFormCreditLimit] = useState('');
    const [formRemark, setFormRemark] = useState('');
    const [formRepaymentMode, setFormRepaymentMode] = useState('');
    const [formCreditTenureDays, setFormCreditTenureDays] = useState('');
    const [formInterestRatePct, setFormInterestRatePct] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Inline edit of credit limit
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const loadWallets = useCallback(() => {
        setLoading(true);
        const url = new URL('/api/v1/admin/credit', window.location.origin);
        if (search.trim()) url.searchParams.set('search', search.trim());
        if (statusFilter) url.searchParams.set('status', statusFilter);
        fetch(url.toString())
            .then((res) => res.json())
            .then((json) => { if (json.success) setWallets(json.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [search, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(loadWallets, search ? 300 : 0);
        return () => clearTimeout(timer);
    }, [loadWallets, search]);

    const submitAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formUserId.trim() || !formCreditLimit.trim()) {
            toast.error('User ID and credit limit are required');
            return;
        }
        const overrides: Record<string, number | string> = {};
        if (formRepaymentMode) overrides.repaymentMode = formRepaymentMode;
        if (formCreditTenureDays.trim()) overrides.creditTenureDays = Number(formCreditTenureDays);
        if (formInterestRatePct.trim()) overrides.interestRatePct = Number(formInterestRatePct);

        setSubmitting(true);
        try {
            const res = await fetch('/api/v1/admin/credit/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: formUserId.trim(),
                    vendorId: formVendorId.trim() ? formVendorId.trim() : null,
                    creditLimit: Number(formCreditLimit),
                    ...(Object.keys(overrides).length > 0 && { overrides }),
                    ...(formRemark.trim() && { remark: formRemark.trim() }),
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error?.message || json.message || 'Failed to assign credit');
            toast.success('Credit line assigned');
            setFormUserId(''); setFormVendorId(''); setFormCreditLimit(''); setFormRemark('');
            setFormRepaymentMode(''); setFormCreditTenureDays(''); setFormInterestRatePct('');
            loadWallets();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to assign credit');
        } finally {
            setSubmitting(false);
        }
    };

    const startEdit = (w: CreditWalletRow) => {
        setEditingId(w.id);
        setEditValue(String(w.creditLimit));
    };

    const saveEdit = async (w: CreditWalletRow) => {
        const newLimit = Number(editValue);
        if (!Number.isFinite(newLimit) || newLimit < 0) {
            toast.error('Enter a valid credit limit');
            return;
        }
        const prevLimit = w.creditLimit;
        setBusyId(w.id);
        setWallets((ws) => ws.map((x) => x.id === w.id ? { ...x, creditLimit: newLimit } : x)); // optimistic
        setEditingId(null);
        try {
            const res = await fetch('/api/v1/admin/credit/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: w.userId, vendorId: w.vendorId, creditLimit: newLimit, remark: 'Credit limit updated by admin' }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error?.message || json.message || 'Failed to update credit limit');
            toast.success('Credit limit updated');
            loadWallets();
        } catch (err) {
            setWallets((ws) => ws.map((x) => x.id === w.id ? { ...x, creditLimit: prevLimit } : x)); // revert
            toast.error(err instanceof Error ? err.message : 'Failed to update credit limit');
        } finally {
            setBusyId(null);
        }
    };

    const reactivate = async (w: CreditWalletRow) => {
        const reason = window.prompt(`Reactivate ${w.user.fullName}'s wallet — enter a reason:`);
        if (!reason || !reason.trim()) return;
        setBusyId(w.id);
        try {
            const res = await fetch('/api/v1/wallet/reactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletId: w.id, reason: reason.trim() }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error?.message || json.message || 'Failed to reactivate wallet');
            toast.success('Wallet reactivated');
            setWallets((ws) => ws.map((x) => x.id === w.id ? { ...x, status: 'ACTIVE' } : x));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to reactivate wallet');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Assign credit form */}
            <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm max-w-[1360px]">
                <h3 className="text-[18px] font-bold text-[#000000] mb-6">Assign Credit</h3>
                <form onSubmit={submitAssign} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="block text-[13px] font-bold text-[#181725] mb-1.5">User ID<span className="text-[#E74C3C] ml-0.5">*</span></label>
                        <input type="text" value={formUserId} onChange={(e) => setFormUserId(e.target.value)} placeholder="customer user UUID" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Vendor ID <span className="text-[#7C7C7C] font-medium">(blank = H1 Wallet)</span></label>
                        <input type="text" value={formVendorId} onChange={(e) => setFormVendorId(e.target.value)} placeholder="vendor UUID (optional)" className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Credit Limit (₹)<span className="text-[#E74C3C] ml-0.5">*</span></label>
                        <input type="number" min="0" value={formCreditLimit} onChange={(e) => setFormCreditLimit(e.target.value)} placeholder="e.g. 50000" className={inputCls} />
                    </div>

                    <div className="md:col-span-3 border-t border-[#EEEEEE] pt-5">
                        <p className="text-[13px] font-bold text-[#181725] mb-4">Overrides <span className="text-[#7C7C7C] font-medium">(optional — leave blank to use global config)</span></p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Repayment Mode</label>
                                <select value={formRepaymentMode} onChange={(e) => setFormRepaymentMode(e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
                                    <option value="">— default —</option>
                                    <option value="REPAY_BEFORE_NEXT_USE">Repay before next use</option>
                                    <option value="ALLOW_USAGE_TILL_DUE">Allow usage till due</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Credit Tenure (days)</label>
                                <input type="number" min="0" value={formCreditTenureDays} onChange={(e) => setFormCreditTenureDays(e.target.value)} placeholder="e.g. 7" className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Interest Rate (%)</label>
                                <input type="number" min="0" step="0.01" value={formInterestRatePct} onChange={(e) => setFormInterestRatePct(e.target.value)} placeholder="e.g. 1.5" className={inputCls} />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Remark</label>
                        <input type="text" value={formRemark} onChange={(e) => setFormRemark(e.target.value)} placeholder="optional note for the audit log" className={inputCls} />
                    </div>

                    <div className="md:col-span-3">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="h-[44px] px-8 bg-[#299E60] text-white rounded-[10px] text-[14px] font-bold hover:bg-[#238a54] disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm shadow-[#299E60]/20"
                        >
                            {submitting && <Loader2 className="animate-spin" size={16} />}
                            Assign / Update Credit
                        </button>
                    </div>
                </form>
            </div>

            {/* Wallets table */}
            <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm max-w-[1360px]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h3 className="text-[18px] font-bold text-[#000000]">All Credit Lines</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative group w-full max-w-[240px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                            <input
                                type="text"
                                placeholder="search customer name / phone / email"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-[40px] w-full bg-white border border-[#DCDCDC] rounded-[10px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-[40px] bg-white border border-[#DCDCDC] rounded-[10px] px-3 text-[13px] font-semibold outline-none focus:border-[#299E60]/40 cursor-pointer shadow-sm"
                        >
                            <option value="">All statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="BLACKLISTED">Blacklisted</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#299E60]" size={32} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-[#EFEFEF] h-[52px]">
                                    <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] first:rounded-l-[10px]">Customer</th>
                                    <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Vendor / H1</th>
                                    <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Credit Limit</th>
                                    <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Available</th>
                                    <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Outstanding</th>
                                    <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Due Date</th>
                                    <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Status</th>
                                    <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] last:rounded-r-[10px]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EEEEEE]">
                                {wallets.length > 0 ? (
                                    wallets.map((w) => (
                                        <tr key={w.id} className="hover:bg-gray-50/30 transition-colors">
                                            <td className="py-5 px-6 text-center">
                                                <div className="font-bold text-[14px] text-[#181725]">{w.user.fullName}</div>
                                                <div className="text-[12px] text-[#7C7C7C] font-medium">{w.user.phone || w.user.email || '—'}</div>
                                            </td>
                                            <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{w.vendor?.businessName ?? 'H1 Wallet'}</td>
                                            <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">
                                                {editingId === w.id ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(w); if (e.key === 'Escape') setEditingId(null); }}
                                                            className="h-[36px] w-[110px] border border-[#DCDCDC] rounded-[8px] px-2 text-[13px] outline-none focus:border-[#299E60]/40 text-center"
                                                        />
                                                        <button
                                                            onClick={() => saveEdit(w)}
                                                            disabled={busyId === w.id}
                                                            title="Save"
                                                            className="h-[32px] w-[32px] flex items-center justify-center rounded-[8px] bg-[#299E60] text-white hover:bg-[#238a54] disabled:opacity-50 transition-colors"
                                                        >
                                                            <Save size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(w)}
                                                        title="Click to edit credit limit"
                                                        className="hover:underline decoration-dotted underline-offset-4 hover:text-[#299E60] transition-colors"
                                                    >
                                                        {fmtMoney(w.creditLimit)}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{fmtMoney(w.availableCredit)}</td>
                                            <td className={cn('py-5 px-6 text-center text-[14px] font-semibold', Number(w.outstandingAmount) > 0 ? 'text-[#E74C3C]' : 'text-[#181725]')}>{fmtMoney(w.outstandingAmount)}</td>
                                            <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{fmtDate(w.currentDueDate)}</td>
                                            <td className="py-5 px-6 text-center">
                                                <span className={cn('inline-flex rounded-[8px] text-[13px] font-semibold capitalize px-4 py-2', STATUS_STYLE[w.status])}>
                                                    {w.status.toLowerCase()}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                {w.status === 'BLACKLISTED' ? (
                                                    <button
                                                        onClick={() => reactivate(w)}
                                                        disabled={busyId === w.id}
                                                        className="inline-flex items-center gap-1.5 h-[36px] px-4 rounded-[8px] bg-[#EEF8F1] text-[#299E60] text-[13px] font-bold hover:bg-[#299E60] hover:text-white disabled:opacity-50 transition-colors"
                                                    >
                                                        {busyId === w.id ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                                                        Reactivate
                                                    </button>
                                                ) : (
                                                    <span className="text-[13px] text-[#AEAEAE] font-medium">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-[14px] text-[#7C7C7C] font-medium">No credit wallets found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Section B: Reports ─────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="bg-white p-6 rounded-[12px] border border-[#DCDCDC] shadow-sm">
            <p className="text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wide mb-2">{label}</p>
            <p className="text-[22px] font-bold text-[#181725]">{value}</p>
        </div>
    );
}

function ReportsSection() {
    const [data, setData] = useState<ReportsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/v1/wallet/reports?type=all')
            .then((res) => res.json())
            .then((json) => { if (!cancelled && json.success) setData(json.data); })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm max-w-[1360px] flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#299E60]" size={32} />
            </div>
        );
    }

    const u = data?.utilization;
    const overdue = data?.overdue ?? [];
    const interest = data?.interest ?? [];
    const audit = data?.audit ?? [];

    return (
        <div className="space-y-8 max-w-[1360px]">
            {/* Utilization stat cards */}
            {u && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                    <StatCard label="Credit Issued" value={fmtMoney(u.totalCreditIssued)} />
                    <StatCard label="Credit Utilized" value={fmtMoney(u.totalCreditUtilized)} />
                    <StatCard label="Total Repayments" value={fmtMoney(u.totalRepayments)} />
                    <StatCard label="Outstanding" value={fmtMoney(u.outstandingAmount)} />
                    <StatCard label="Active Customers" value={u.activeCustomers} />
                    <StatCard label="Blacklisted" value={u.blacklistedCustomers} />
                </div>
            )}

            {/* Overdue */}
            <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm">
                <h3 className="text-[18px] font-bold text-[#000000] mb-6">Overdue Accounts</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-[#EFEFEF] h-[52px]">
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] first:rounded-l-[10px]">Customer</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Vendor</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Credit Limit</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Outstanding</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Due Date</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] last:rounded-r-[10px]">Overdue Days</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {overdue.length > 0 ? overdue.map((r, i) => (
                                <tr key={i} className={cn('transition-colors', r.highlightRed ? 'bg-[#FFF0F0] hover:bg-[#FFE3E3]' : 'hover:bg-gray-50/30')}>
                                    <td className="py-5 px-6 text-center font-bold text-[14px] text-[#181725]">{r.customer}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{r.vendor}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{fmtMoney(r.creditLimit)}</td>
                                    <td className="py-5 px-6 text-center text-[14px] font-semibold text-[#E74C3C]">{fmtMoney(r.outstanding)}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{fmtDate(r.dueDate)}</td>
                                    <td className={cn('py-5 px-6 text-center text-[14px] font-bold', r.highlightRed ? 'text-[#E74C3C]' : 'text-[#181725]')}>{r.overdueDays}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="py-12 text-center text-[14px] text-[#7C7C7C] font-medium">No overdue accounts.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Interest */}
            <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm">
                <h3 className="text-[18px] font-bold text-[#000000] mb-6">Interest Applied</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-[#EFEFEF] h-[52px]">
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] first:rounded-l-[10px]">Customer</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Interest Applied</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Date</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] last:rounded-r-[10px]">Outstanding Base</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {interest.length > 0 ? interest.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="py-5 px-6 text-center font-bold text-[14px] text-[#181725]">{r.customer}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{fmtMoney(r.interestApplied)}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{fmtDate(r.date)}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{fmtMoney(r.outstandingBaseAmount)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="py-12 text-center text-[14px] text-[#7C7C7C] font-medium">No interest entries.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit log */}
            <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm">
                <h3 className="text-[18px] font-bold text-[#000000] mb-6">Audit Log</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-[#EFEFEF] h-[52px]">
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] first:rounded-l-[10px]">Customer</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Action</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">By</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Previous → New</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B]">Remarks</th>
                                <th className="px-6 text-center text-[14px] font-bold text-[#4B4B4B] last:rounded-r-[10px]">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {audit.length > 0 ? audit.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="py-5 px-6 text-center font-bold text-[14px] text-[#181725]">{r.customer}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold capitalize">{r.action.replace(/_/g, ' ')}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{r.performedBy}</td>
                                    <td className="py-5 px-6 text-center text-[13px] text-[#7C7C7C] font-medium">{r.previousValue ?? '—'} → {r.newValue ?? '—'}</td>
                                    <td className="py-5 px-6 text-center text-[13px] text-[#7C7C7C] font-medium">{r.remarks ?? '—'}</td>
                                    <td className="py-5 px-6 text-center text-[14px] text-[#181725] font-semibold">{fmtDate(r.timestamp)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="py-12 text-center text-[14px] text-[#7C7C7C] font-medium">No audit entries.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Section C: Global Config ───────────────────────────────────────────────

function GlobalConfigSection() {
    const [config, setConfig] = useState<GlobalConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable form fields (kept as strings for controlled inputs)
    const [form, setForm] = useState<Record<string, string>>({});

    const loadConfig = useCallback(() => {
        setLoading(true);
        fetch('/api/v1/admin/credit/config')
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    const c = json.data as GlobalConfig;
                    setConfig(c);
                    setForm({
                        repaymentMode: c.repaymentMode,
                        billingModel: c.billingModel,
                        creditLimit: String(c.creditLimit),
                        creditTenureDays: String(c.creditTenureDays),
                        gracePeriodDays: String(c.gracePeriodDays),
                        blacklistDays: String(c.blacklistDays),
                        interestRatePct: String(c.interestRatePct),
                        interestFrequencyDays: String(c.interestFrequencyDays),
                        penaltyAmount: String(c.penaltyAmount),
                        penaltyFrequencyDays: String(c.penaltyFrequencyDays),
                        eligiblePurchaseCount: String(c.eligiblePurchaseCount),
                        unlockCreditAmount: String(c.unlockCreditAmount),
                    });
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;
        setSaving(true);
        try {
            const body = {
                repaymentMode: form.repaymentMode as GlobalConfig['repaymentMode'],
                billingModel: form.billingModel as GlobalConfig['billingModel'],
                creditLimit: Number(form.creditLimit),
                creditTenureDays: Number(form.creditTenureDays),
                gracePeriodDays: Number(form.gracePeriodDays),
                blacklistDays: Number(form.blacklistDays),
                interestRatePct: Number(form.interestRatePct),
                interestFrequencyDays: Number(form.interestFrequencyDays),
                penaltyAmount: Number(form.penaltyAmount),
                penaltyFrequencyDays: Number(form.penaltyFrequencyDays),
                eligiblePurchaseCount: Number(form.eligiblePurchaseCount),
                unlockCreditAmount: Number(form.unlockCreditAmount),
            };
            const res = await fetch('/api/v1/admin/credit/config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error?.message || json.message || 'Failed to save config');
            toast.success('Global credit config updated');
            loadConfig();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save config');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm max-w-[1360px] flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#299E60]" size={32} />
            </div>
        );
    }

    if (!config) {
        return (
            <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm max-w-[1360px] flex flex-col items-center justify-center py-20 gap-3">
                <ShieldAlert className="text-[#E74C3C]" size={32} />
                <p className="text-[14px] text-[#7C7C7C] font-medium">Could not load global config.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 md:p-10 rounded-[12px] border border-[#DCDCDC] shadow-sm max-w-[1360px]">
            <h3 className="text-[18px] font-bold text-[#000000] mb-6">Global Credit Config</h3>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Repayment Mode</label>
                    <select value={form.repaymentMode ?? ''} onChange={(e) => setField('repaymentMode', e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
                        <option value="REPAY_BEFORE_NEXT_USE">Repay before next use</option>
                        <option value="ALLOW_USAGE_TILL_DUE">Allow usage till due</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Billing Model</label>
                    <select value={form.billingModel ?? ''} onChange={(e) => setField('billingModel', e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
                        <option value="BILL_TO_BILL">Bill to bill</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="FORTNIGHTLY">Fortnightly</option>
                        <option value="MONTHLY">Monthly</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Default Credit Limit (₹)</label>
                    <input type="number" min="0" value={form.creditLimit ?? ''} onChange={(e) => setField('creditLimit', e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Credit Tenure (days)</label>
                    <input type="number" min="0" value={form.creditTenureDays ?? ''} onChange={(e) => setField('creditTenureDays', e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Grace Period (days)</label>
                    <input type="number" min="0" value={form.gracePeriodDays ?? ''} onChange={(e) => setField('gracePeriodDays', e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Blacklist After (days)</label>
                    <input type="number" min="0" value={form.blacklistDays ?? ''} onChange={(e) => setField('blacklistDays', e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Interest Rate (%)</label>
                    <input type="number" min="0" step="0.001" value={form.interestRatePct ?? ''} onChange={(e) => setField('interestRatePct', e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Interest Frequency (days)</label>
                    <input type="number" min="1" value={form.interestFrequencyDays ?? ''} onChange={(e) => setField('interestFrequencyDays', e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Penalty Amount (₹)</label>
                    <input type="number" min="0" value={form.penaltyAmount ?? ''} onChange={(e) => setField('penaltyAmount', e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Penalty Frequency (days)</label>
                    <input type="number" min="1" value={form.penaltyFrequencyDays ?? ''} onChange={(e) => setField('penaltyFrequencyDays', e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Eligible Purchase Count</label>
                    <input type="number" min="0" value={form.eligiblePurchaseCount ?? ''} onChange={(e) => setField('eligiblePurchaseCount', e.target.value)} className={inputCls} />
                </div>
                <div>
                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Unlock Credit Amount (₹)</label>
                    <input type="number" min="0" value={form.unlockCreditAmount ?? ''} onChange={(e) => setField('unlockCreditAmount', e.target.value)} className={inputCls} />
                </div>

                <div className="md:col-span-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="h-[44px] px-8 bg-[#299E60] text-white rounded-[10px] text-[14px] font-bold hover:bg-[#238a54] disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm shadow-[#299E60]/20"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
