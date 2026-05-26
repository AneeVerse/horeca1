'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LedgerEntry {
  id: string;
  date: string;
  type: 'order' | 'credit_debit' | 'credit_payment' | 'wallet_credit' | 'wallet_debit' | 'settlement';
  description: string;
  referenceNumber: string | null;
  credit: number;
  debit: number;
  balance: number;
}

interface Pagination {
  page: number;
  take: number;
  total: number;
  totalPages: number;
}

const TYPE_LABELS: Record<LedgerEntry['type'], string> = {
  order: 'Order',
  credit_debit: 'Credit Issued',
  credit_payment: 'Credit Paid',
  wallet_credit: 'Wallet Cr.',
  wallet_debit: 'Wallet Dr.',
  settlement: 'Settlement',
};

const TYPE_COLORS: Record<LedgerEntry['type'], string> = {
  order: 'bg-blue-50 text-blue-600',
  credit_debit: 'bg-amber-50 text-amber-600',
  credit_payment: 'bg-[#EEF8F1] text-[#299E60]',
  wallet_credit: 'bg-[#EEF8F1] text-[#299E60]',
  wallet_debit: 'bg-[#FFF0F0] text-[#E74C3C]',
  settlement: 'bg-purple-50 text-purple-600',
};

export default function VendorLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [summary, setSummary] = useState({ walletBalance: 0, pendingAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchLedger = useCallback(async (p: number, fromDate: string, toDate: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const res = await fetch(`/api/v1/vendor/ledger?${params}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data.entries);
        setPagination(json.data.pagination);
        setSummary(json.data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLedger(page, from, to); }, [fetchLedger, page, from, to]);

  const downloadCsv = () => {
    const header = ['Date', 'Type', 'Description', 'Reference', 'Credit (₹)', 'Debit (₹)', 'Balance (₹)'];
    const rows = entries.map((e) => [
      new Date(e.date).toLocaleDateString('en-IN'),
      TYPE_LABELS[e.type],
      e.description,
      e.referenceNumber ?? '',
      e.credit > 0 ? e.credit.toFixed(2) : '',
      e.debit > 0 ? e.debit.toFixed(2) : '',
      e.balance.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${from || 'all'}-${to || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLedger(1, from, to);
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#181725]">Ledger</h1>
          <p className="text-[12px] text-[#AEAEAE]">Complete financial history — orders, credit, wallet & settlements</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadCsv}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-4 h-[36px] rounded-[10px] border border-[#EEEEEE] bg-white text-[12px] font-semibold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] p-4">
          <p className="text-[11px] text-[#AEAEAE] font-semibold uppercase tracking-wide">Wallet Balance</p>
          <p className="text-[20px] font-bold text-[#299E60] mt-0.5">
            ₹{summary.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] p-4">
          <p className="text-[11px] text-[#AEAEAE] font-semibold uppercase tracking-wide">Pending Credit</p>
          <p className="text-[20px] font-bold text-amber-500 mt-0.5">
            ₹{summary.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Date filter */}
      <form onSubmit={handleFilter} className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-semibold text-[#7C7C7C]">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-[36px] px-3 rounded-[10px] border border-[#EEEEEE] text-[12px] outline-none focus:border-[#299E60]/40 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-semibold text-[#7C7C7C]">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-[36px] px-3 rounded-[10px] border border-[#EEEEEE] text-[12px] outline-none focus:border-[#299E60]/40 bg-white"
          />
        </div>
        <button
          type="submit"
          className="h-[36px] px-4 rounded-[10px] bg-[#299E60] text-white text-[12px] font-bold hover:bg-[#238a54] transition-colors"
        >
          Apply
        </button>
        {(from || to) && (
          <button
            type="button"
            onClick={() => { setFrom(''); setTo(''); setPage(1); }}
            className="h-[36px] px-4 rounded-[10px] border border-[#EEEEEE] bg-white text-[12px] font-semibold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#299E60]" size={28} />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-14 text-center">
            <BookOpen size={36} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-[13px] font-bold text-[#AEAEAE]">No ledger entries found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#F5F5F5]">
                    <th className="text-left px-4 py-3 font-semibold text-[#7C7C7C]">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#7C7C7C]">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#7C7C7C]">Description</th>
                    <th className="text-left px-4 py-3 font-semibold text-[#7C7C7C]">Reference</th>
                    <th className="text-right px-4 py-3 font-semibold text-[#7C7C7C]">Credit</th>
                    <th className="text-right px-4 py-3 font-semibold text-[#7C7C7C]">Debit</th>
                    <th className="text-right px-4 py-3 font-semibold text-[#7C7C7C]">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-3 text-[#7C7C7C] whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', TYPE_COLORS[entry.type])}>
                          {TYPE_LABELS[entry.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#181725] max-w-[240px]">
                        <p className="truncate">{entry.description}</p>
                      </td>
                      <td className="px-4 py-3 text-[#7C7C7C] font-mono">{entry.referenceNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#299E60]">
                        {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#E74C3C]">
                        {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#181725]">
                        ₹{entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-[#F5F5F5] flex items-center justify-between">
                <p className="text-[12px] text-[#AEAEAE]">
                  Showing {(pagination.page - 1) * pagination.take + 1}–{Math.min(pagination.page * pagination.take, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[#EEEEEE] disabled:opacity-40 hover:bg-[#F5F5F5] transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[12px] font-semibold text-[#181725]">{page} / {pagination.totalPages}</span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= pagination.totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[#EEEEEE] disabled:opacity-40 hover:bg-[#F5F5F5] transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
