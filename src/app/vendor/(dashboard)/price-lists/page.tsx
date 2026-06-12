'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Tag, Plus, Loader2, Pencil, Trash2, Users, Package, X, Grid3x3 } from 'lucide-react';

interface PriceList {
  id: string;
  name: string;
  discountPercent: number;
  isActive: boolean;
  createdAt: string;
  _count: { items: number; customers: number };
}

// ─── Create Modal ────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: (pl: PriceList) => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [name, setName] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/v1/vendor/price-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), discountPercent: parseFloat(discountPercent) || 0 }),
      });
      const json = await res.json();
      if (json.success) {
        onCreated({ ...json.data, _count: { items: 0, customers: 0 } });
        onClose();
      } else {
        setError(json.error ?? 'Failed to create');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-[16px] w-full max-w-[400px] shadow-2xl">
        <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#181725]">New Price List</h2>
          <button onClick={onClose} className="p-1 rounded-[6px] hover:bg-[#F5F5F5]">
            <X size={16} className="text-[#AEAEAE]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#7C7C7C] mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VIP Customers, Bulk Buyers"
              className="w-full h-[40px] px-3 rounded-[10px] border border-[#EEEEEE] text-[13px] outline-none focus:border-[#299E60]/50 bg-white"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#7C7C7C] mb-1">
              Global Discount (%) <span className="text-[#AEAEAE] font-normal">— applies to all products unless overridden</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-full h-[40px] px-3 rounded-[10px] border border-[#EEEEEE] text-[13px] outline-none focus:border-[#299E60]/50 bg-white"
            />
          </div>
          {error && <p className="text-[12px] text-[#E74C3C]">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-[#EEEEEE] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 h-[38px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-semibold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-5 h-[38px] rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorPriceListsPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPriceLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/vendor/price-lists');
      const json = await res.json();
      if (json.success) setPriceLists(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPriceLists(); }, [fetchPriceLists]);

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this price list? Assigned customers will revert to default pricing.')) return;
    setDeleting(id);
    try {
      await fetch(`/api/v1/vendor/price-lists/${id}`, { method: 'DELETE' });
      setPriceLists((prev) => prev.filter((pl) => pl.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleCreated = (pl: PriceList) => {
    setPriceLists((prev) => [pl, ...prev]);
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#181725]">Price Lists</h1>
          <p className="text-[12px] text-[#AEAEAE]">Give special prices to specific customers, areas, or groups</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/vendor/price-lists/workspace"
            className="flex items-center gap-2 px-4 h-[38px] rounded-[10px] bg-white border border-[#299E60] text-[#299E60] text-[13px] font-bold hover:bg-[#299E60]/5 transition-colors"
          >
            <Grid3x3 size={15} />
            Open Workspace
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 h-[38px] rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] transition-colors"
          >
            <Plus size={15} />
            New Price List
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#299E60]" size={28} />
        </div>
      ) : priceLists.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] py-16 text-center shadow-sm">
          <Tag size={36} className="text-[#E5E7EB] mx-auto mb-3" />
          <p className="text-[14px] font-bold text-[#AEAEAE]">No price lists yet</p>
          <p className="text-[12px] text-[#AEAEAE] mt-1">Create price lists to offer custom rates to specific customer segments</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-2 mx-auto px-4 h-[36px] rounded-[10px] bg-[#299E60] text-white text-[12px] font-bold hover:bg-[#238a54] transition-colors"
          >
            <Plus size={13} />
            Create first price list
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {priceLists.map((pl) => (
            <div key={pl.id} className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] font-bold text-[#181725]">{pl.name}</p>
                  <p className="text-[12px] text-[#AEAEAE]">
                    {pl.discountPercent > 0 ? `${pl.discountPercent}% off all products` : 'Per-product pricing'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/vendor/price-lists/${pl.id}`}
                    className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#F5F5F5] transition-colors text-[#7C7C7C]"
                  >
                    <Pencil size={13} />
                  </a>
                  <button
                    onClick={() => handleDelete(pl.id)}
                    disabled={deleting === pl.id}
                    className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#FFF0F0] transition-colors text-[#E74C3C] disabled:opacity-40"
                  >
                    {deleting === pl.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[12px] text-[#7C7C7C]">
                <div className="flex items-center gap-1">
                  <Package size={12} />
                  <span>{pl._count.items} products</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  <span>{pl._count.customers} customers</span>
                </div>
              </div>

              {pl.discountPercent > 0 && (
                <div className="bg-[#EEF8F1] rounded-[8px] px-3 py-2">
                  <p className="text-[11px] font-bold text-[#299E60]">
                    {pl.discountPercent}% discount applied to all base prices
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
