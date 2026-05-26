'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Loader2, Search, Plus, Trash2, Tag, Users, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  basePrice: number;
  unit: string | null;
  packSize: string | null;
}

interface PriceListItem {
  id: string;
  productId: string;
  customPrice: number;
  product: Product;
}

interface Customer {
  id: string;
  user: { fullName: string; businessName: string | null };
}

interface PriceListDetail {
  id: string;
  name: string;
  discountPercent: number;
  isActive: boolean;
  items: PriceListItem[];
  customers: Customer[];
}

interface VendorProduct {
  id: string;
  name: string;
  basePrice: number;
  unit: string | null;
  packSize: string | null;
  sku: string | null;
}

export default function PriceListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [priceList, setPriceList] = useState<PriceListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [name, setName] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [items, setItems] = useState<Array<{ productId: string; customPrice: string; product: Product }>>([]);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<VendorProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPriceList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/vendor/price-lists/${id}`);
      const json = await res.json();
      if (json.success) {
        const pl: PriceListDetail = json.data;
        setPriceList(pl);
        setName(pl.name);
        setDiscountPercent(String(pl.discountPercent));
        setItems(
          pl.items.map((item) => ({
            productId: item.productId,
            customPrice: String(item.customPrice),
            product: item.product,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPriceList(); }, [fetchPriceList]);

  // Debounced product search
  useEffect(() => {
    if (!productSearch.trim()) { setSearchResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/v1/vendor/products?search=${encodeURIComponent(productSearch)}&limit=10`);
        const json = await res.json();
        if (json.success) {
          const alreadyAdded = new Set(items.map((i) => i.productId));
          setSearchResults((json.data.products ?? json.data ?? []).filter((p: VendorProduct) => !alreadyAdded.has(p.id)));
        }
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [productSearch, items]);

  const addProduct = (product: VendorProduct) => {
    setItems((prev) => [
      ...prev,
      { productId: product.id, customPrice: String(product.basePrice), product: product as Product },
    ]);
    setProductSearch('');
    setSearchResults([]);
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/vendor/price-lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          discountPercent: parseFloat(discountPercent) || 0,
          items: items.map((i) => ({
            productId: i.productId,
            customPrice: parseFloat(i.customPrice) || 0,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) await fetchPriceList();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#299E60]" size={28} />
      </div>
    );
  }

  if (!priceList) {
    return (
      <div className="text-center py-20">
        <p className="text-[14px] text-[#AEAEAE]">Price list not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[#EEEEEE] hover:bg-[#F5F5F5] transition-colors text-[#7C7C7C]"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-[22px] font-bold text-[#181725]">{priceList.name}</h1>
            <p className="text-[12px] text-[#AEAEAE]">Edit pricing rules and product overrides</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 h-[38px] rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save Changes
        </button>
      </div>

      {/* Basic settings */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5 space-y-4">
        <h2 className="text-[14px] font-bold text-[#181725]">Price List Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#7C7C7C] mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-[40px] px-3 rounded-[10px] border border-[#EEEEEE] text-[13px] outline-none focus:border-[#299E60]/50 bg-white"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#7C7C7C] mb-1">
              Global Discount (%)
              <span className="ml-1 text-[#AEAEAE] font-normal">— applies to products without a specific override</span>
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
        </div>

        <div className="flex items-center gap-6 pt-1 text-[12px] text-[#7C7C7C]">
          <div className="flex items-center gap-1.5">
            <Package size={13} />
            <span>{items.length} product override{items.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={13} />
            <span>{priceList.customers.length} customer{priceList.customers.length !== 1 ? 's' : ''} assigned</span>
          </div>
        </div>
      </div>

      {/* Product overrides */}
      <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-[#181725]">Product Price Overrides</h2>
          <p className="text-[12px] text-[#AEAEAE]">Set a fixed price per product that overrides the global discount</p>
        </div>

        {/* Add product */}
        <div className="px-5 py-4 border-b border-[#F5F5F5] relative">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEAE]" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products to add override…"
              className="w-full h-[38px] pl-8 pr-4 rounded-[10px] border border-[#EEEEEE] text-[12px] outline-none focus:border-[#299E60]/40 bg-white"
            />
            {searching && (
              <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#AEAEAE]" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute z-20 left-5 right-5 mt-1 bg-white rounded-[12px] border border-[#EEEEEE] shadow-lg overflow-hidden">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F5F5F5] transition-colors text-left"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[#181725]">{p.name}</p>
                    <p className="text-[11px] text-[#AEAEAE]">
                      {p.packSize ?? p.unit ?? ''} · Base ₹{Number(p.basePrice).toFixed(2)}
                    </p>
                  </div>
                  <Plus size={14} className="text-[#299E60] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Tag size={32} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-[13px] font-bold text-[#AEAEAE]">No product overrides</p>
            <p className="text-[12px] text-[#AEAEAE] mt-1">
              {Number(discountPercent) > 0
                ? `All products will get ${discountPercent}% off (global discount)`
                : 'Search above to add specific product price overrides'}
            </p>
          </div>
        ) : (
          <>
            <div className="px-5 py-2 bg-[#FAFAFA] border-b border-[#F5F5F5] grid grid-cols-12 gap-3 text-[11px] font-semibold text-[#AEAEAE]">
              <div className="col-span-5">Product</div>
              <div className="col-span-2 text-right">Base Price</div>
              <div className="col-span-3 text-right">Custom Price (excl. GST)</div>
              <div className="col-span-2 text-right">Saving</div>
            </div>
            <div className="divide-y divide-[#F5F5F5]">
              {items.map((item) => {
                const base = item.product.basePrice;
                const custom = parseFloat(item.customPrice) || 0;
                const saving = base > 0 ? Math.round(((base - custom) / base) * 100) : 0;
                return (
                  <div key={item.productId} className="px-5 py-3 grid grid-cols-12 gap-3 items-center hover:bg-[#FAFAFA] transition-colors">
                    <div className="col-span-5 min-w-0">
                      <p className="text-[13px] font-semibold text-[#181725] truncate">{item.product.name}</p>
                      <p className="text-[11px] text-[#AEAEAE]">{item.product.packSize ?? item.product.unit ?? ''}</p>
                    </div>
                    <div className="col-span-2 text-right text-[12px] text-[#AEAEAE]">
                      ₹{Number(base).toFixed(2)}
                    </div>
                    <div className="col-span-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[12px] text-[#7C7C7C]">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.customPrice}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.productId === item.productId ? { ...i, customPrice: e.target.value } : i
                              )
                            )
                          }
                          className="w-24 h-[32px] px-2 rounded-[8px] border border-[#EEEEEE] text-[12px] text-right outline-none focus:border-[#299E60]/50 bg-white"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {saving > 0 && (
                        <span className="text-[11px] font-bold text-[#299E60]">{saving}% off</span>
                      )}
                      {saving < 0 && (
                        <span className="text-[11px] font-bold text-[#E74C3C]">{Math.abs(saving)}% up</span>
                      )}
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="w-6 h-6 flex items-center justify-center rounded-[6px] hover:bg-[#FFF0F0] transition-colors text-[#E74C3C]"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Assigned customers */}
      {priceList.customers.length > 0 && (
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
          <h2 className="text-[14px] font-bold text-[#181725] mb-3">Assigned Customers</h2>
          <div className="flex flex-wrap gap-2">
            {priceList.customers.map((c) => (
              <span key={c.id} className="px-3 py-1.5 bg-[#F5F5F5] rounded-full text-[12px] font-semibold text-[#181725]">
                {c.user.businessName ?? c.user.fullName}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[#AEAEAE] mt-3">
            Manage assignments from the <a href="/vendor/customers" className="text-[#299E60] hover:underline">Customers page</a>.
          </p>
        </div>
      )}
    </div>
  );
}
