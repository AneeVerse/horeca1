'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Loader2, MoreVertical, CheckCircle, XCircle,
  PauseCircle, Tag, ChevronDown, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceList {
  id: string;
  name: string;
  discountPercent: number;
}

interface VendorCustomerUser {
  id: string;
  fullName: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
}

interface VendorCustomer {
  id: string;
  userId: string;
  status: 'active' | 'blocked' | 'suspended';
  priceListId: string | null;
  territory: string | null;
  tags: string[];
  notes: string | null;
  paymentTerms: string | null;
  createdAt: string;
  user: VendorCustomerUser;
  priceList: PriceList | null;
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string | null;
}

const STATUS_ICONS = {
  active: <CheckCircle size={13} className="text-[#299E60]" />,
  blocked: <XCircle size={13} className="text-[#E74C3C]" />,
  suspended: <PauseCircle size={13} className="text-amber-500" />,
};

const STATUS_LABELS = { active: 'Active', blocked: 'Blocked', suspended: 'Suspended' };

function relativeTime(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ─── Edit Customer Modal ─────────────────────────────────────────────────────

interface EditModalProps {
  customer: VendorCustomer;
  priceLists: PriceList[];
  onClose: () => void;
  onSave: (updated: VendorCustomer) => void;
}

function EditModal({ customer, priceLists, onClose, onSave }: EditModalProps) {
  const [status, setStatus] = useState(customer.status);
  const [priceListId, setPriceListId] = useState(customer.priceListId ?? '');
  const [territory, setTerritory] = useState(customer.territory ?? '');
  const [paymentTerms, setPaymentTerms] = useState(customer.paymentTerms ?? '');
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/vendor/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          priceListId: priceListId || null,
          territory: territory || null,
          paymentTerms: paymentTerms || null,
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onSave({ ...customer, ...json.data });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-[16px] w-full max-w-[480px] shadow-2xl">
        <div className="px-6 py-4 border-b border-[#EEEEEE]">
          <h2 className="text-[16px] font-bold text-[#181725]">Edit Customer</h2>
          <p className="text-[12px] text-[#AEAEAE]">
            {customer.user.businessName ?? customer.user.fullName}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#7C7C7C] mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full h-[40px] px-3 rounded-[10px] border border-[#EEEEEE] text-[13px] outline-none focus:border-[#299E60]/50 bg-white"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#7C7C7C] mb-1">Price List</label>
            <select
              value={priceListId}
              onChange={(e) => setPriceListId(e.target.value)}
              className="w-full h-[40px] px-3 rounded-[10px] border border-[#EEEEEE] text-[13px] outline-none focus:border-[#299E60]/50 bg-white"
            >
              <option value="">Default pricing</option>
              {priceLists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} ({pl.discountPercent}% off)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#7C7C7C] mb-1">Territory</label>
              <input
                type="text"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                placeholder="e.g. North Zone"
                className="w-full h-[40px] px-3 rounded-[10px] border border-[#EEEEEE] text-[13px] outline-none focus:border-[#299E60]/50 bg-white"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#7C7C7C] mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30"
                className="w-full h-[40px] px-3 rounded-[10px] border border-[#EEEEEE] text-[13px] outline-none focus:border-[#299E60]/50 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#7C7C7C] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-[10px] border border-[#EEEEEE] text-[13px] outline-none focus:border-[#299E60]/50 bg-white resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#EEEEEE] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 h-[38px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-semibold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 h-[38px] rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorCustomersPage() {
  const [customers, setCustomers] = useState<VendorCustomer[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editCustomer, setEditCustomer] = useState<VendorCustomer | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchCustomers = useCallback(async (p = 1, q = '', s = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set('search', q);
      if (s) params.set('status', s);
      const [custRes, plRes] = await Promise.all([
        fetch(`/api/v1/vendor/customers?${params}`),
        fetch('/api/v1/vendor/price-lists'),
      ]);
      const [custJson, plJson] = await Promise.all([custRes.json(), plRes.json()]);
      if (custJson.success) {
        setCustomers(custJson.data.customers);
        setHasMore(custJson.data.hasMore);
      }
      if (plJson.success) setPriceLists(plJson.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(1, search, statusFilter); }, [fetchCustomers, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers(1, search, statusFilter);
  };

  const handleCustomerSaved = (updated: VendorCustomer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const FILTERS = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Blocked', value: 'blocked' },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#181725]">Customers</h1>
          <p className="text-[12px] text-[#AEAEAE]">Manage your B2B customer accounts, pricing, and credit terms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEAE]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-[260px] h-[36px] pl-8 pr-3 rounded-[10px] border border-[#EEEEEE] bg-white text-[12px] outline-none focus:border-[#299E60]/40"
          />
        </form>

        <div className="flex bg-[#F5F5F5] rounded-[10px] p-0.5 gap-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={cn(
                'h-[30px] px-3 rounded-[8px] text-[12px] font-semibold transition-all',
                statusFilter === f.value
                  ? 'bg-white text-[#181725] shadow-sm'
                  : 'text-[#7C7C7C] hover:text-[#181725]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#299E60]" size={28} />
          </div>
        ) : customers.length === 0 ? (
          <div className="py-14 text-center">
            <Users size={36} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-[13px] font-bold text-[#AEAEAE]">No customers found</p>
            <p className="text-[12px] text-[#AEAEAE] mt-1">Customers appear here once they place an order with you</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#F5F5F5]">
                  <th className="text-left px-5 py-3 font-semibold text-[#7C7C7C]">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#7C7C7C]">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#7C7C7C]">Price List</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#7C7C7C]">Territory</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#7C7C7C]">Orders</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#7C7C7C]">Total Spend</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#7C7C7C]">Last Order</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F5]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[#181725] truncate max-w-[160px]">
                        {c.user.businessName ?? c.user.fullName}
                      </p>
                      <p className="text-[#AEAEAE] truncate">{c.user.email ?? c.user.phone ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICONS[c.status]}
                        <span className="text-[#181725]">{STATUS_LABELS[c.status]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.priceList ? (
                        <span className="flex items-center gap-1 text-[#299E60]">
                          <Tag size={11} />
                          {c.priceList.name}
                        </span>
                      ) : (
                        <span className="text-[#AEAEAE]">Default</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[#7C7C7C]">{c.territory ?? '—'}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-[#181725]">{c.orderCount}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-[#181725]">
                      ₹{c.totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#AEAEAE]">
                      {c.lastOrderAt ? relativeTime(c.lastOrderAt) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setEditCustomer(c)}
                        className="p-1.5 rounded-[6px] hover:bg-[#F5F5F5] transition-colors text-[#7C7C7C]"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editCustomer && (
        <EditModal
          customer={editCustomer}
          priceLists={priceLists}
          onClose={() => setEditCustomer(null)}
          onSave={handleCustomerSaved}
        />
      )}
    </div>
  );
}
