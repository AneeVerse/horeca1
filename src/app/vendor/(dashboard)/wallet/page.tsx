'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
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

export default function VendorWalletPage() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [txns, setTxns] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchWallet = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true);
    else setLoadingMore(true);
    try {
      const url = `/api/v1/vendor/wallet${cursor ? `?cursor=${cursor}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        if (!cursor) {
          setWallet(json.data.wallet);
          setTxns(json.data.transactions);
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
    </div>
  );
}
