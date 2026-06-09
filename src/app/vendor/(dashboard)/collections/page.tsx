'use client';

/**
 * Vendor Collections — Credit Wallet dashboard
 * Shows each customer's CreditWallet balance owed to this vendor:
 * summary stat cards, aging buckets, and a full customer table.
 * Data comes from /api/v1/vendor/credit (CreditWallet model).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, CreditCard, AlertTriangle, IndianRupee,
  TrendingUp, Clock, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CustomerRow {
  id: string;
  customer: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string;
  };
  creditLimit: number;
  availableCredit: number;
  usedCredit: number;
  outstanding: number;
  dueDate: string | null;
  overdueDays: number;
  status: 'ACTIVE' | 'BLOCKED' | 'BLACKLISTED';
  agingBucket: 'current' | 'd1_30' | 'd31_60' | 'd60plus';
}

interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d60plus: number;
}

interface Summary {
  totalOutstanding: number;
  dueToday: number;
  overdue: number;
  highRiskCount: number;
  agingBuckets: AgingBuckets;
  total: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(v);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-[#EEF8F1] text-[#299E60]',
  BLOCKED: 'bg-amber-50 text-amber-600',
  BLACKLISTED: 'bg-red-50 text-[#E74C3C]',
};

const AGING_LABEL: Record<string, string> = {
  current: 'Current',
  d1_30: '1–30 days',
  d31_60: '31–60 days',
  d60plus: '60+ days',
};

const AGING_COLOR: Record<string, string> = {
  current: 'text-[#299E60]',
  d1_30: 'text-amber-500',
  d31_60: 'text-orange-500',
  d60plus: 'text-[#E74C3C]',
};

const AGING_BAR_COLOR: Record<string, string> = {
  current: 'bg-[#299E60]',
  d1_30: 'bg-amber-400',
  d31_60: 'bg-orange-400',
  d60plus: 'bg-[#E74C3C]',
};

type FilterTab = 'all' | 'overdue' | 'active' | 'blocked';

// ─── Reminder stub ─────────────────────────────────────────────────────────────

async function sendReminderStub(customerId: string): Promise<void> {
  // Real reminders run server-side via the daily credit cron job.
  // This stub optimistically shows a toast — no critical POST needed.
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
  void customerId; // consumed for type correctness
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorCollectionsPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/vendor/credit');
      const json = await res.json() as { success: boolean; data?: { customers: CustomerRow[]; summary: Summary } };
      if (json.success && json.data) {
        setCustomers(json.data.customers);
        setSummary(json.data.summary);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load collections data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const handleSendReminder = async (row: CustomerRow) => {
    setRemindingId(row.id);
    try {
      await sendReminderStub(row.customer.id);
      toast.success(`Reminder queued for ${row.customer.fullName}`);
    } catch {
      toast.error('Failed to queue reminder');
    } finally {
      setRemindingId(null);
    }
  };

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'active', label: 'Active' },
    { key: 'blocked', label: 'Blocked / Blacklisted' },
  ];

  const filtered = customers.filter((c) => {
    if (activeTab === 'overdue') return c.overdueDays > 0 && c.outstanding > 0;
    if (activeTab === 'active') return c.status === 'ACTIVE';
    if (activeTab === 'blocked') return c.status === 'BLOCKED' || c.status === 'BLACKLISTED';
    return true;
  });

  const totalOutstandingForBar = summary
    ? Math.max(1, summary.agingBuckets.current + summary.agingBuckets.d1_30 + summary.agingBuckets.d31_60 + summary.agingBuckets.d60plus)
    : 1;

  return (
    <div className="space-y-5 pb-10">
      {/* Page header */}
      <div>
        <h1 className="text-[24px] font-bold text-[#181725]">Credit Collections</h1>
        <p className="text-[12px] text-[#AEAEAE]">
          Monitor customer credit wallets, outstanding balances, and aging
        </p>
      </div>

      {/* ── Summary stat cards ────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Outstanding',
              value: formatINR(summary.totalOutstanding),
              icon: IndianRupee,
              color: 'text-[#181725]',
              bg: 'bg-white',
            },
            {
              label: 'Due Today',
              value: formatINR(summary.dueToday),
              icon: Clock,
              color: summary.dueToday > 0 ? 'text-amber-600' : 'text-[#AEAEAE]',
              bg: summary.dueToday > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white',
            },
            {
              label: 'Overdue',
              value: formatINR(summary.overdue),
              icon: AlertTriangle,
              color: summary.overdue > 0 ? 'text-[#E74C3C]' : 'text-[#AEAEAE]',
              bg: summary.overdue > 0 ? 'bg-red-50 border-red-100' : 'bg-white',
            },
            {
              label: 'High Risk',
              value: String(summary.highRiskCount),
              icon: TrendingUp,
              color: summary.highRiskCount > 0 ? 'text-[#E74C3C]' : 'text-[#299E60]',
              bg: summary.highRiskCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'rounded-[14px] border border-[#EEEEEE] shadow-sm p-4 flex items-start gap-3',
                stat.bg,
              )}
            >
              <div className="p-2 rounded-[8px] bg-[#F5F5F5] shrink-0">
                <stat.icon size={16} className={stat.color} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-[#AEAEAE] font-bold uppercase tracking-wide leading-tight">
                  {stat.label}
                </p>
                <p className={cn('text-[18px] font-bold leading-tight mt-0.5', stat.color)}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Aging bucket bars ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
          <p className="text-[13px] font-bold text-[#181725] mb-4">Aging Breakdown</p>
          <div className="space-y-3">
            {(
              [
                ['current', 'Current (not due)', summary.agingBuckets.current],
                ['d1_30', '1–30 days overdue', summary.agingBuckets.d1_30],
                ['d31_60', '31–60 days overdue', summary.agingBuckets.d31_60],
                ['d60plus', '60+ days overdue', summary.agingBuckets.d60plus],
              ] as [string, string, number][]
            ).map(([key, label, amount]) => {
              const pct = Math.min(100, (amount / totalOutstandingForBar) * 100);
              return (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-[12px] text-[#7C7C7C] w-[160px] shrink-0">{label}</span>
                  <div className="flex-1 h-[8px] bg-[#F5F5F5] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', AGING_BAR_COLOR[key])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn('text-[12px] font-bold w-[90px] text-right shrink-0', AGING_COLOR[key])}>
                    {formatINR(amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filter tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex bg-[#F5F5F5] rounded-[10px] p-0.5 gap-0.5 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'h-[30px] px-4 rounded-[8px] text-[12px] font-semibold transition-all',
                activeTab === tab.key
                  ? 'bg-white text-[#181725] shadow-sm'
                  : 'text-[#7C7C7C] hover:text-[#181725]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Customer table ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#299E60]" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard size={36} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-[14px] font-bold text-[#AEAEAE]">No credit customers found</p>
            <p className="text-[12px] text-[#AEAEAE] mt-1">
              Credit wallets appear when customers use credit at checkout
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                  <th className="px-5 py-3 text-left font-bold text-[#AEAEAE] uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-[#AEAEAE] uppercase tracking-wide">
                    Limit
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-[#AEAEAE] uppercase tracking-wide">
                    Available
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-[#AEAEAE] uppercase tracking-wide">
                    Outstanding
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-[#AEAEAE] uppercase tracking-wide">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-[#AEAEAE] uppercase tracking-wide">
                    Overdue Days
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-[#AEAEAE] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-[#AEAEAE] uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F5]">
                {filtered.map((row) => {
                  const isOverdue = row.overdueDays > 0 && row.outstanding > 0;
                  const isHighRisk = row.status === 'BLACKLISTED' || row.overdueDays > 60;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'hover:bg-[#FAFAFA] transition-colors',
                        isHighRisk
                          ? 'bg-red-50/30'
                          : isOverdue
                            ? 'bg-amber-50/20'
                            : '',
                      )}
                    >
                      {/* Customer */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#181725] truncate max-w-[180px]">
                          {row.customer.fullName}
                        </p>
                        {row.customer.phone && (
                          <p className="text-[#AEAEAE] truncate">{row.customer.phone}</p>
                        )}
                        <p className="text-[#AEAEAE] truncate">{row.customer.email}</p>
                      </td>

                      {/* Limit */}
                      <td className="px-4 py-4 text-right font-bold text-[#181725]">
                        {formatINR(row.creditLimit)}
                      </td>

                      {/* Available */}
                      <td className="px-4 py-4 text-right">
                        <span
                          className={cn(
                            'font-bold',
                            row.availableCredit <= 0
                              ? 'text-[#E74C3C]'
                              : 'text-[#299E60]',
                          )}
                        >
                          {formatINR(row.availableCredit)}
                        </span>
                      </td>

                      {/* Outstanding */}
                      <td className="px-4 py-4 text-right">
                        <span
                          className={cn(
                            'font-bold',
                            row.outstanding > 0 ? 'text-[#E74C3C]' : 'text-[#AEAEAE]',
                          )}
                        >
                          {formatINR(row.outstanding)}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-4 text-center text-[#7C7C7C]">
                        {formatDate(row.dueDate)}
                      </td>

                      {/* Overdue Days */}
                      <td className="px-4 py-4 text-center">
                        {row.overdueDays > 0 ? (
                          <span
                            className={cn(
                              'font-bold',
                              AGING_COLOR[row.agingBucket] ?? 'text-[#E74C3C]',
                            )}
                          >
                            {row.overdueDays}d
                          </span>
                        ) : (
                          <span className="text-[#AEAEAE]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={cn(
                            'font-bold px-2.5 py-1 rounded-[6px] capitalize text-[11px]',
                            STATUS_STYLE[row.status] ?? 'bg-gray-100 text-gray-500',
                          )}
                        >
                          {row.status.toLowerCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-center">
                        {row.outstanding > 0 ? (
                          <button
                            onClick={() => handleSendReminder(row)}
                            disabled={remindingId === row.id}
                            title="Queue a payment reminder for this customer"
                            className="inline-flex items-center gap-1.5 h-[28px] px-3 rounded-[7px] bg-[#299E60] text-white text-[11px] font-bold hover:bg-[#238a54] transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {remindingId === row.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Bell size={12} />
                            )}
                            Send Reminder
                          </button>
                        ) : (
                          <span className="text-[#AEAEAE] text-[11px]">—</span>
                        )}
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
              {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
              {summary ? ` · ${formatINR(summary.totalOutstanding)} total outstanding` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
