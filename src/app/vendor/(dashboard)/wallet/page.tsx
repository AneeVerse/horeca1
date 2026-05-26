'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Loader2,
  RefreshCw,
  Building2,
  ChevronRight,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletInfo {
  balance: number;
  pendingAmount: number;
  nextSettlementDate: string;
}

interface WalletTxn {
  id: string;
  type: 'order_credit' | 'settlement_debit' | 'adjustment' | 'refund_debit';
  amount: number;
  balanceAfter: number;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

interface Payout {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'settled' | 'failed';
  reference: string | null;
  periodStart: string;
  periodEnd: string;
  settledAt: string | null;
  createdAt: string;
}

function txnLabel(type: WalletTxn['type']) {
  if (type === 'order_credit') return 'Order payment received';
  if (type === 'settlement_debit') return 'Settlement transferred';
  if (type === 'refund_debit') return 'Refund issued';
  return 'Adjustment';
}

function txnColor(type: WalletTxn['type']) {
  return type === 'order_credit' || type === 'adjustment'
    ? 'text-[#299E60]'
    : 'text-[#E74C3C]';
}

function relativeTime(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function payoutStatusBadge(status: Payout['status']) {
  switch (status) {
    case 'settled':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF8F1] text-[#299E60]">
          Completed
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#3B82F6]">
          Processing
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF0F0] text-[#E74C3C]">
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F5F5F5] text-[#7C7C7C]">
          Pending
        </span>
      );
  }
}

export default function VendorWalletPage() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [txns, setTxns] = useState<WalletTxn[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingPayout, setPendingPayout] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchWallet = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true);
    else setLoadingMore(true);
    try {
      const url = `/api/v1/vendor/wallet${cursor ? `?cursor=${cursor}` : ''}`;
      const res = await fetch(url);
      const json = await res.json() as {
        success: boolean;
        data: {
          wallet: WalletInfo;
          transactions: WalletTxn[];
          nextCursor: string | null;
          payouts: Payout[];
          pendingPayout: number;
        };
      };
      if (json.success) {
        if (!cursor) {
          setWallet(json.data.wallet);
          setTxns(json.data.transactions);
          setPayouts(json.data.payouts);
          setPendingPayout(json.data.pendingPayout);
        } else {
          setTxns((prev) => [...prev, ...json.data.transactions]);
        }
        setNextCursor(json.data.nextCursor);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#181725]">Wallet</h1>
          <p className="text-[12px] text-[#AEAEAE]">Earnings, settlements & transaction history</p>
        </div>
        <button
          onClick={() => fetchWallet()}
          className="flex items-center gap-2 px-4 h-[36px] rounded-[10px] border border-[#EEEEEE] bg-white text-[12px] font-semibold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#299E60] rounded-[14px] p-5 text-white">
          <p className="text-[12px] font-semibold opacity-80">Available Balance</p>
          {loading ? (
            <Loader2 size={20} className="animate-spin mt-2" />
          ) : (
            <p className="text-[30px] font-extrabold mt-1">
              ₹{Number(wallet?.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>

        <div className="bg-white rounded-[14px] border border-[#EEEEEE] p-5">
          <div className="flex items-center gap-2 text-[#AEAEAE] mb-1">
            <Clock size={14} />
            <p className="text-[12px] font-semibold">Pending Settlement</p>
          </div>
          {loading ? (
            <Loader2 size={16} className="animate-spin text-[#AEAEAE]" />
          ) : (
            <>
              <p className="text-[22px] font-bold text-[#181725]">
                ₹{Number(wallet?.pendingAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              {wallet?.nextSettlementDate && (
                <p className="text-[11px] text-[#AEAEAE] mt-0.5">
                  Next settlement: {new Date(wallet.nextSettlementDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </p>
              )}
            </>
          )}
        </div>

        <div className="bg-white rounded-[14px] border border-[#EEEEEE] p-5">
          <div className="flex items-center gap-2 text-[#AEAEAE] mb-1">
            <Wallet size={14} />
            <p className="text-[12px] font-semibold">Settlement Cycle</p>
          </div>
          <p className="text-[16px] font-bold text-[#181725]">Weekly (Monday)</p>
          <p className="text-[11px] text-[#AEAEAE] mt-0.5">Delivered orders credited within 2 days</p>
        </div>
      </div>

      {/* Pending Payout Banner */}
      {!loading && pendingPayout > 0 && (
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-[12px] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarClock size={20} className="text-[#92400E] shrink-0" />
            <div>
              <p className="text-[14px] font-bold text-[#92400E]">Upcoming Payout</p>
              <p className="text-[12px] text-[#A16207]">
                ₹{pendingPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })} will be transferred on next Monday
              </p>
            </div>
          </div>
          <span className="text-[20px] font-bold text-[#92400E] shrink-0">
            ₹{pendingPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Bank Account Card */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F0FDF4] flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-[#299E60]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#181725]">Bank Account (for settlements)</p>
              <p className="text-[11px] text-[#AEAEAE] mt-0.5">Payouts are transferred to your registered bank account</p>
            </div>
          </div>
          <Link
            href="/vendor/settings"
            className="flex items-center gap-1 text-[12px] font-semibold text-[#299E60] hover:text-[#238a54] transition-colors shrink-0"
          >
            Configure
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#F9FAFB] rounded-[10px] px-4 py-3">
            <p className="text-[10px] font-semibold text-[#AEAEAE] uppercase tracking-wide">Bank</p>
            <p className="text-[13px] font-bold text-[#181725] mt-0.5">Not configured</p>
          </div>
          <div className="bg-[#F9FAFB] rounded-[10px] px-4 py-3">
            <p className="text-[10px] font-semibold text-[#AEAEAE] uppercase tracking-wide">Account Number</p>
            <p className="text-[13px] font-bold text-[#181725] mt-0.5">—</p>
          </div>
          <div className="bg-[#F9FAFB] rounded-[10px] px-4 py-3">
            <p className="text-[10px] font-semibold text-[#AEAEAE] uppercase tracking-wide">IFSC Code</p>
            <p className="text-[13px] font-bold text-[#181725] mt-0.5">—</p>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5]">
          <h2 className="text-[15px] font-bold text-[#181725]">Transaction History</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#299E60]" size={28} />
          </div>
        ) : txns.length === 0 ? (
          <div className="py-14 text-center">
            <Wallet size={36} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-[13px] font-bold text-[#AEAEAE]">No transactions yet</p>
            <p className="text-[12px] text-[#AEAEAE] mt-1">Order payments will appear here once delivered</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#F5F5F5]">
              {txns.map((txn) => {
                const isCredit = txn.type === 'order_credit' || txn.type === 'adjustment';
                return (
                  <div key={txn.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] transition-colors">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      isCredit ? 'bg-[#EEF8F1]' : 'bg-[#FFF0F0]'
                    )}>
                      {isCredit
                        ? <ArrowDownCircle size={16} className="text-[#299E60]" />
                        : <ArrowUpCircle size={16} className="text-[#E74C3C]" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#181725]">{txnLabel(txn.type)}</p>
                      {txn.notes && (
                        <p className="text-[11px] text-[#AEAEAE] truncate">{txn.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-[14px] font-bold', txnColor(txn.type))}>
                        {isCredit ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-[#AEAEAE]">{relativeTime(txn.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {nextCursor && (
              <div className="px-5 py-4 border-t border-[#F5F5F5]">
                <button
                  onClick={() => fetchWallet(nextCursor)}
                  disabled={loadingMore}
                  className="w-full text-center text-[12px] font-semibold text-[#299E60] hover:text-[#238a54] disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5]">
          <h2 className="text-[15px] font-bold text-[#181725]">Payout History</h2>
          <p className="text-[11px] text-[#AEAEAE] mt-0.5">Bank transfers for settled periods</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[#299E60]" size={24} />
          </div>
        ) : payouts.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarClock size={32} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-[13px] font-bold text-[#AEAEAE]">No payouts yet</p>
            <p className="text-[12px] text-[#AEAEAE] mt-1">
              Your first settlement will be processed next Monday
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#F5F5F5]">
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wide">Period</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wide">Settled On</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wide">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F5]">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4 text-[12px] text-[#181725]">
                      {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[#7C7C7C]">
                      {payout.settledAt ? formatDate(payout.settledAt) : '—'}
                    </td>
                    <td className="px-5 py-4 text-[13px] font-bold text-[#181725]">
                      ₹{payout.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      {payoutStatusBadge(payout.status)}
                    </td>
                    <td className="px-5 py-4 text-[11px] text-[#AEAEAE] font-mono">
                      {payout.reference ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
