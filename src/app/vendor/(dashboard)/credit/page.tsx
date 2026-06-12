'use client';

/**
 * Vendor → Credit tab (client-doc "Vendor-backed credit" MUST-HAVE).
 *
 * Flow per brief: Vendor >> Sees Customer List >> Fills Credit Limit >>
 * Chooses Payment Terms >> Configures Interest & other T&Cs.
 *
 * Writes through POST /api/v1/vendor/credit → creditWalletService — the SAME
 * CreditWallet engine the customer checkout reads, so an assigned line shows
 * up under "DiSCCO Credit Line" immediately. Empty term fields fall back to
 * the platform's global credit config.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Loader2, CreditCard, Search, X, Pencil, Plus, IndianRupee,
  AlertTriangle, ShieldOff, Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────

type WalletStatus = 'ACTIVE' | 'BLOCKED' | 'BLACKLISTED';
type RepaymentMode = 'REPAY_BEFORE_NEXT_USE' | 'ALLOW_USAGE_TILL_DUE';
type BillingModel = 'BILL_TO_BILL' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';

interface WalletInfo {
  id: string;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
  outstandingAmount: number;
  status: WalletStatus;
  currentDueDate: string | null;
  overdueDays: number;
  repaymentMode: RepaymentMode | null;
  billingModel: BillingModel | null;
  creditTenureDays: number | null;
  gracePeriodDays: number | null;
  blacklistDays: number | null;
  interestRatePct: number | null;
  interestFrequencyDays: number | null;
  penaltyAmount: number | null;
  penaltyFrequencyDays: number | null;
}

interface CustomerRow {
  userId: string;
  name: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  orderCount: number;
  lastOrderAt: string | null;
  wallet: WalletInfo | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const inr = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);

const STATUS_STYLE: Record<WalletStatus, { label: string; cls: string }> = {
  ACTIVE:      { label: 'Active',      cls: 'bg-[#EEF8F1] text-[#299E60]' },
  BLOCKED:     { label: 'Blocked',     cls: 'bg-amber-50 text-amber-700' },
  BLACKLISTED: { label: 'Blacklisted', cls: 'bg-red-50 text-red-600' },
};

// ─── Assign / edit modal ───────────────────────────────────────────────────

function CreditModal({ row, onClose, onSaved }: {
  row: CustomerRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const w = row.wallet;
  const [limit, setLimit] = useState(w ? String(w.creditLimit) : '');
  // 'default' = no override → platform global settings decide.
  const [terms, setTerms] = useState<'default' | RepaymentMode>(w?.repaymentMode ?? 'default');
  const [tenure, setTenure] = useState(w?.creditTenureDays != null ? String(w.creditTenureDays) : '');
  const [cycle, setCycle] = useState<BillingModel>(w?.billingModel && w.billingModel !== 'BILL_TO_BILL' ? w.billingModel : 'MONTHLY');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [grace, setGrace] = useState(w?.gracePeriodDays != null ? String(w.gracePeriodDays) : '');
  const [interest, setInterest] = useState(w?.interestRatePct != null ? String(w.interestRatePct) : '');
  const [interestFreq, setInterestFreq] = useState(w?.interestFrequencyDays != null ? String(w.interestFrequencyDays) : '');
  const [penalty, setPenalty] = useState(w?.penaltyAmount != null ? String(w.penaltyAmount) : '');
  const [penaltyFreq, setPenaltyFreq] = useState(w?.penaltyFrequencyDays != null ? String(w.penaltyFrequencyDays) : '');
  const [blacklist, setBlacklist] = useState(w?.blacklistDays != null ? String(w.blacklistDays) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const limitNum = parseFloat(limit);
    if (!Number.isFinite(limitNum) || limitNum < 0) {
      toast.error('Enter a valid credit limit');
      return;
    }
    const overrides: Record<string, unknown> = {};
    if (terms !== 'default') {
      overrides.repaymentMode = terms;
      if (terms === 'REPAY_BEFORE_NEXT_USE') {
        overrides.billingModel = 'BILL_TO_BILL';
        if (tenure.trim()) overrides.creditTenureDays = parseInt(tenure, 10);
      } else {
        overrides.billingModel = cycle;
      }
    }
    if (grace.trim()) overrides.gracePeriodDays = parseInt(grace, 10);
    if (interest.trim()) overrides.interestRatePct = parseFloat(interest);
    if (interestFreq.trim()) overrides.interestFrequencyDays = parseInt(interestFreq, 10);
    if (penalty.trim()) overrides.penaltyAmount = parseFloat(penalty);
    if (penaltyFreq.trim()) overrides.penaltyFrequencyDays = parseInt(penaltyFreq, 10);
    if (blacklist.trim()) overrides.blacklistDays = parseInt(blacklist, 10);

    setSaving(true);
    try {
      const res = await fetch('/api/v1/vendor/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: row.userId,
          creditLimit: limitNum,
          ...(Object.keys(overrides).length > 0 && { overrides }),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Failed to save credit line');
      toast.success(w ? 'Credit line updated' : `Credit line of ${inr(limitNum)} given to ${row.name}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save credit line');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full h-[40px] px-3 rounded-[10px] border border-[#EEEEEE] text-[13px] outline-none focus:border-[#299E60]/50 bg-white';
  const labelCls = 'block text-[12px] font-semibold text-[#7C7C7C] mb-1';

  return (
    <div className="fixed inset-0 z-[10001] bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[16px] w-full max-w-[460px] shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-[#181725]">{w ? 'Edit credit line' : 'Give credit'}</h2>
            <p className="text-[12px] text-[#AEAEAE]">{row.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-[6px] hover:bg-[#F5F5F5]">
            <X size={16} strokeWidth={1.5} className="text-[#AEAEAE]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Limit */}
          <div>
            <label className={labelCls}>Credit limit (₹)</label>
            <div className="relative">
              <IndianRupee size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEAE]" />
              <input
                type="number" min="0" step="100" autoFocus
                value={limit} onChange={(e) => setLimit(e.target.value)}
                placeholder="e.g. 25000"
                className={cn(inputCls, 'pl-8')}
              />
            </div>
            {w && w.usedCredit > 0 && (
              <p className="text-[11px] text-[#AEAEAE] mt-1">
                {inr(w.usedCredit)} is currently in use — lowering the limit below that pauses further credit until they repay.
              </p>
            )}
          </div>

          {/* Payment terms */}
          <div>
            <label className={labelCls}>Payment terms</label>
            <div className="space-y-2">
              {([
                { v: 'default', title: 'Platform default', desc: 'Use the standard Horeca1 credit terms' },
                { v: 'REPAY_BEFORE_NEXT_USE', title: 'Pay before next use', desc: 'Customer must clear dues before buying on credit again' },
                { v: 'ALLOW_USAGE_TILL_DUE', title: 'Use until a due date', desc: 'Customer keeps ordering; consolidated dues by cycle date' },
              ] as const).map((opt) => (
                <label
                  key={opt.v}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-[12px] border cursor-pointer transition-colors',
                    terms === opt.v ? 'border-[#299E60] bg-[#EEF8F1]/50' : 'border-[#EEEEEE] hover:border-[#299E60]/40',
                  )}
                >
                  <input
                    type="radio" name="terms" checked={terms === opt.v}
                    onChange={() => setTerms(opt.v)}
                    className="mt-0.5 accent-[#299E60]"
                  />
                  <span>
                    <span className="block text-[13px] font-semibold text-[#181725]">{opt.title}</span>
                    <span className="block text-[11.5px] text-[#AEAEAE]">{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            {terms === 'REPAY_BEFORE_NEXT_USE' && (
              <div className="mt-3">
                <label className={labelCls}>Credit tenure (days after each bill)</label>
                <input
                  type="number" min="0" max="365"
                  value={tenure} onChange={(e) => setTenure(e.target.value)}
                  placeholder="Platform default"
                  className={inputCls}
                />
              </div>
            )}
            {terms === 'ALLOW_USAGE_TILL_DUE' && (
              <div className="mt-3">
                <label className={labelCls}>Billing cycle</label>
                <select value={cycle} onChange={(e) => setCycle(e.target.value as BillingModel)} className={inputCls}>
                  <option value="WEEKLY">Weekly — dues consolidated per week</option>
                  <option value="FORTNIGHTLY">Fortnightly — dues consolidated per fortnight</option>
                  <option value="MONTHLY">Monthly — dues consolidated per month</option>
                </select>
              </div>
            )}
          </div>

          {/* Advanced */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-[12.5px] font-semibold text-[#299E60] hover:underline"
            >
              {showAdvanced ? 'Hide' : 'Show'} advanced settings (interest, penalty, grace)
            </button>
            {showAdvanced && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Grace period (days)</label>
                  <input type="number" min="0" value={grace} onChange={(e) => setGrace(e.target.value)} placeholder="Default" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Blacklist after (days)</label>
                  <input type="number" min="0" value={blacklist} onChange={(e) => setBlacklist(e.target.value)} placeholder="Default" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Interest (%)</label>
                  <input type="number" min="0" step="0.1" value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Default" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>…per how many days</label>
                  <input type="number" min="1" value={interestFreq} onChange={(e) => setInterestFreq(e.target.value)} placeholder="Default" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Late fee (₹)</label>
                  <input type="number" min="0" value={penalty} onChange={(e) => setPenalty(e.target.value)} placeholder="Default" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>…per how many days</label>
                  <input type="number" min="1" value={penaltyFreq} onChange={(e) => setPenaltyFreq(e.target.value)} placeholder="Default" className={inputCls} />
                </div>
                <p className="col-span-2 text-[11px] text-[#AEAEAE]">
                  Leave any field empty to use the platform&apos;s global credit settings.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EEEEEE] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 h-[38px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-semibold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 h-[38px] rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {w ? 'Save changes' : 'Give credit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

type Filter = 'all' | 'with' | 'without' | 'overdue';

export default function VendorCreditPage() {
  const { data: session } = useSession();
  const canApprove = useMemo(() => {
    const perms = ((session?.user as Record<string, unknown> | undefined)?.permissions as string[] | undefined) ?? [];
    return perms.includes('creditLine.approve');
  }, [session]);

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<CustomerRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/vendor/credit/customers');
      const json = await res.json();
      if (json.success) setRows(json.data.customers);
      else toast.error(json.error?.message || 'Failed to load customers');
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !(`${r.name} ${r.fullName ?? ''} ${r.email ?? ''} ${r.phone ?? ''}`.toLowerCase().includes(q))) return false;
      if (filter === 'with') return !!r.wallet;
      if (filter === 'without') return !r.wallet;
      if (filter === 'overdue') return !!r.wallet && r.wallet.overdueDays > 0 && r.wallet.outstandingAmount > 0;
      return true;
    });
  }, [rows, search, filter]);

  const stats = useMemo(() => {
    const withCredit = rows.filter((r) => r.wallet);
    return {
      lines: withCredit.length,
      exposure: withCredit.reduce((s, r) => s + (r.wallet?.creditLimit ?? 0), 0),
      outstanding: withCredit.reduce((s, r) => s + (r.wallet?.outstandingAmount ?? 0), 0),
      overdue: withCredit.filter((r) => (r.wallet?.overdueDays ?? 0) > 0 && (r.wallet?.outstandingAmount ?? 0) > 0).length,
    };
  }, [rows]);

  const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: 'All customers' },
    { key: 'with', label: 'With credit' },
    { key: 'without', label: 'No credit yet' },
    { key: 'overdue', label: 'Overdue' },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-bold text-[#181725]">Credit</h1>
          <p className="text-[12px] text-[#AEAEAE]">Give trusted customers a credit line — they order now and pay by the due date</p>
        </div>
        <Link
          href="/vendor/collections"
          className="flex items-center gap-2 px-4 h-[38px] rounded-[10px] bg-white border border-[#EEEEEE] text-[13px] font-semibold text-[#181725] hover:border-[#299E60]/40 transition-colors"
        >
          <Landmark size={15} strokeWidth={1.5} />
          Collections &amp; recovery
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Credit lines given', value: String(stats.lines), Icon: CreditCard, tint: 'text-[#299E60] bg-[#EEF8F1]' },
          { label: 'Total limit given', value: inr(stats.exposure), Icon: IndianRupee, tint: 'text-blue-600 bg-blue-50' },
          { label: 'Outstanding', value: inr(stats.outstanding), Icon: AlertTriangle, tint: 'text-amber-600 bg-amber-50' },
          { label: 'Overdue customers', value: String(stats.overdue), Icon: ShieldOff, tint: 'text-red-500 bg-red-50' },
        ].map(({ label, value, Icon, tint }) => (
          <div key={label} className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', tint)}>
              <Icon size={16} strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#181725] truncate">{value}</p>
              <p className="text-[11px] text-[#AEAEAE]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEAE]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, phone, email…"
            className="w-full h-[38px] pl-8 pr-3 rounded-[10px] border border-[#EEEEEE] text-[12.5px] outline-none focus:border-[#299E60]/40 bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-3 h-[32px] rounded-full text-[12px] font-semibold transition-colors',
                filter === f.key ? 'bg-[#299E60] text-white' : 'bg-white border border-[#EEEEEE] text-[#7C7C7C] hover:border-[#299E60]/40',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#299E60]" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] py-16 text-center shadow-sm">
          <CreditCard size={36} strokeWidth={1.5} className="text-[#E5E7EB] mx-auto mb-3" />
          <p className="text-[14px] font-bold text-[#AEAEAE]">
            {rows.length === 0 ? 'No customers yet' : 'No customers match'}
          </p>
          <p className="text-[12px] text-[#AEAEAE] mt-1">
            {rows.length === 0
              ? 'Customers appear here once they order from your store or you add them in Customers.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-[#F5F5F5]">
                {['Customer', 'Orders', 'Limit', 'Used', 'Available', 'Outstanding', 'Due date', 'Status', ''].map((h, i) => (
                  <th key={i} className={cn(
                    'px-4 py-3 text-[10.5px] font-bold text-[#AEAEAE] uppercase tracking-wider whitespace-nowrap',
                    i <= 1 ? 'text-left' : i >= 7 ? 'text-left' : 'text-right',
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {filtered.map((r) => {
                const w = r.wallet;
                return (
                  <tr key={r.userId} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#181725]">{r.name}</p>
                      <p className="text-[11px] text-[#AEAEAE]">{r.phone ?? r.email ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-[#7C7C7C]">{r.orderCount}</td>
                    <td className="px-4 py-3 text-right text-[12.5px] font-semibold text-[#181725]">{w ? inr(w.creditLimit) : '—'}</td>
                    <td className="px-4 py-3 text-right text-[12.5px] text-[#7C7C7C]">{w ? inr(w.usedCredit) : '—'}</td>
                    <td className="px-4 py-3 text-right text-[12.5px] font-semibold text-[#299E60]">{w ? inr(w.availableCredit) : '—'}</td>
                    <td className={cn('px-4 py-3 text-right text-[12.5px] font-semibold', w && w.outstandingAmount > 0 ? 'text-amber-600' : 'text-[#7C7C7C]')}>
                      {w ? inr(w.outstandingAmount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] text-[#7C7C7C] whitespace-nowrap">
                      {w?.currentDueDate ? new Date(w.currentDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      {w && w.overdueDays > 0 && w.outstandingAmount > 0 && (
                        <span className="block text-[10.5px] font-bold text-red-500">{w.overdueDays}d overdue</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {w ? (
                        <span className={cn('inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold', STATUS_STYLE[w.status].cls)}>
                          {STATUS_STYLE[w.status].label}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#AEAEAE]">No credit</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canApprove && (
                        w ? (
                          <button
                            onClick={() => setEditing(r)}
                            className="flex items-center gap-1.5 px-3 h-[30px] rounded-[8px] border border-[#EEEEEE] text-[12px] font-semibold text-[#181725] hover:border-[#299E60]/40 transition-colors whitespace-nowrap"
                          >
                            <Pencil size={12} strokeWidth={1.5} /> Edit
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditing(r)}
                            className="flex items-center gap-1.5 px-3 h-[30px] rounded-[8px] bg-[#299E60] text-white text-[12px] font-bold hover:bg-[#238a54] transition-colors whitespace-nowrap"
                          >
                            <Plus size={12} strokeWidth={2} /> Give credit
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!canApprove && !loading && rows.length > 0 && (
        <p className="text-[12px] text-[#AEAEAE]">
          You can view credit lines but not change them — ask the account owner for the &ldquo;Approve Credit&rdquo; permission.
        </p>
      )}

      {editing && (
        <CreditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
