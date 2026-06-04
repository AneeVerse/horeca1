'use client';

/**
 * ProductBulkUpdateModal — Admin Bulk Product Update Modal
 * --------------------------------------------------------
 * Premium dialog to bulk adjust pricing, status, categories, and brands
 * directly from the Admin products list page.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Layers, Filter, Wand2, AlertCircle, Loader2, Tag, Percent,
  IndianRupee, Power, BadgeCheck, Sparkles, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

type AdjustKind = 'set' | 'percent' | 'fixed';

interface FilterState {
  categoryId: string;
  brand: string;
  isActive: '' | 'true' | 'false';
  vendorId: string;
}

interface SetState {
  isActive:        '' | 'true' | 'false';
  minOrderQty:     string;
  taxPercent:      string;
  creditEligible:  '' | 'true' | 'false';
  isFeatured:      '' | 'true' | 'false';
  vegNonVeg:       '' | 'veg' | 'non_veg' | 'egg' | 'null';
  storageType:     string;
  shelfLifeDays:   string;
  description:     string;
  brand:           string;
  countryOfOrigin: string;
  basePriceKind:   '' | AdjustKind;
  basePriceValue:  string;
  origPriceKind:   '' | AdjustKind;
  origPriceValue:  string;
  applyToSlabs:    boolean;
  clearPromo:      boolean;
}

const blankSet: SetState = {
  isActive: '', minOrderQty: '', taxPercent: '',
  creditEligible: '', isFeatured: '',
  vegNonVeg: '', storageType: '', shelfLifeDays: '',
  description: '', brand: '', countryOfOrigin: '',
  basePriceKind: '', basePriceValue: '',
  origPriceKind: '', origPriceValue: '',
  applyToSlabs: false, clearPromo: false,
};

interface CategoryOption { id: string; name: string }
interface BrandOption { name: string }
interface VendorOption { id: string; businessName: string }

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function ProductBulkUpdateModal({ open, onClose, onComplete }: Props) {
  const confirm = useConfirm();

  const [filter, setFilter] = useState<FilterState>({ categoryId: '', brand: '', isActive: '', vendorId: '' });
  const [setState, setSetState] = useState<SetState>(blankSet);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [matchedCount, setMatchedCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ matched: number; updated: number } | null>(null);

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (open) {
      setFilter({ categoryId: '', brand: '', isActive: '', vendorId: '' });
      setSetState(blankSet);
      setLastResult(null);
      setMatchedCount(null);
    }
  }, [open]);

  // Load selection sources
  useEffect(() => {
    if (!open) return;

    fetch('/api/v1/admin/categories')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const c = j.data?.categories ?? j.data ?? [];
          setCategories(Array.isArray(c) ? c : []);
        }
      })
      .catch(() => {});

    fetch('/api/v1/brands')
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        const arr = j.data?.brands ?? j.data ?? [];
        const finalArr = Array.isArray(arr) ? arr : [];
        setBrands(finalArr.map((b: { name?: string }) => ({ name: b.name ?? '' })).filter((b: BrandOption) => b.name));
      })
      .catch(() => {});

    fetch('/api/v1/admin/vendors')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const v = j.data?.vendors ?? j.data ?? [];
          setVendors(Array.isArray(v) ? v : []);
        }
      })
      .catch(() => {});
  }, [open]);

  // Recompute matching products
  const computeFilter = useCallback(() => {
    const qs = new URLSearchParams();
    if (filter.categoryId) qs.set('categoryId', filter.categoryId);
    if (filter.brand) qs.set('brand', filter.brand);
    if (filter.isActive) qs.set('isActive', filter.isActive);
    if (filter.vendorId) qs.set('vendorId', filter.vendorId);
    return qs.toString();
  }, [filter]);

  useEffect(() => {
    if (!open) return;
    const hasAnyFilter = filter.categoryId || filter.brand || filter.isActive || filter.vendorId;
    if (!hasAnyFilter) { setMatchedCount(null); return; }
    setCounting(true);
    fetch(`/api/v1/admin/products/count?${computeFilter()}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && typeof j.data?.total === 'number') setMatchedCount(j.data.total);
        else setMatchedCount(null);
      })
      .catch(() => setMatchedCount(null))
      .finally(() => setCounting(false));
  }, [filter, computeFilter, open]);

  const setIsEmpty = useMemo(() => {
    return (
      !setState.isActive && !setState.minOrderQty && !setState.taxPercent &&
      !setState.creditEligible && !setState.isFeatured && !setState.vegNonVeg &&
      !setState.storageType && !setState.shelfLifeDays && !setState.description &&
      !setState.brand && !setState.countryOfOrigin &&
      !setState.basePriceKind && !setState.origPriceKind &&
      !setState.applyToSlabs && !setState.clearPromo
    );
  }, [setState]);

  const filterIsEmpty = !filter.categoryId && !filter.brand && !filter.isActive && !filter.vendorId;

  const buildBody = () => {
    const body: { filter: Record<string, unknown>; set: Record<string, unknown> } = { filter: {}, set: {} };
    if (filter.categoryId) body.filter.categoryId = filter.categoryId;
    if (filter.brand) body.filter.brand = filter.brand;
    if (filter.isActive) body.filter.isActive = filter.isActive === 'true';
    if (filter.vendorId) {
      body.filter.vendorId = filter.vendorId === 'null' ? null : filter.vendorId;
    }

    if (setState.isActive)        body.set.isActive = setState.isActive === 'true';
    if (setState.minOrderQty)     body.set.minOrderQty = Number(setState.minOrderQty);
    if (setState.taxPercent)      body.set.taxPercent = Number(setState.taxPercent);
    if (setState.creditEligible)  body.set.creditEligible = setState.creditEligible === 'true';
    if (setState.isFeatured)      body.set.isFeatured = setState.isFeatured === 'true';
    if (setState.vegNonVeg)       body.set.vegNonVeg = setState.vegNonVeg === 'null' ? null : setState.vegNonVeg;
    if (setState.storageType)     body.set.storageType = setState.storageType;
    if (setState.shelfLifeDays)   body.set.shelfLifeDays = Number(setState.shelfLifeDays);
    if (setState.description)     body.set.description = setState.description;
    if (setState.brand)           body.set.brand = setState.brand;
    if (setState.countryOfOrigin) body.set.countryOfOrigin = setState.countryOfOrigin;
    if (setState.basePriceKind && setState.basePriceValue) {
      body.set.basePrice = { type: setState.basePriceKind, value: Number(setState.basePriceValue) };
    }
    if (setState.origPriceKind && setState.origPriceValue) {
      body.set.originalPrice = { type: setState.origPriceKind, value: Number(setState.origPriceValue) };
    }
    if (setState.applyToSlabs) body.set.applyToSlabs = true;
    if (setState.clearPromo)   body.set.clearPromo = true;

    return body;
  };

  const handleSubmit = async () => {
    if (filterIsEmpty || setIsEmpty) {
      toast.error('Pick at least one filter and one field to change.');
      return;
    }
    const ok = await confirm({
      title: `Update ${matchedCount ?? '?'} products?`,
      message: 'This change is permanent and applies to every product that currently matches the filter. Continue?',
      confirmText: 'Apply update',
      tone: 'primary',
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/products/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || 'Bulk update failed');
        return;
      }
      setLastResult(json.data);
      toast.success(`Updated ${json.data.updated} product${json.data.updated !== 1 ? 's' : ''}`);
      setSetState(blankSet);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[60] animate-in fade-in duration-200" onClick={onClose} />

      {/* Modal Box */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-[#F8F9FB] rounded-[20px] border border-[#EEEEEE] shadow-2xl w-full max-w-[960px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-[#EEEEEE] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#ECFDF5] flex items-center justify-center">
                <Wand2 size={20} className="text-[#299E60]" />
              </div>
              <div>
                <h2 className="text-[20px] font-[900] text-[#181725]">Bulk Product Update</h2>
                <p className="text-[12px] text-[#7C7C7C] font-semibold mt-0.5">
                  Filter master catalog or vendor items and adjust prices, GST, and metadata in bulk.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-[12px] flex items-center justify-center hover:bg-[#F8F9FB] text-[#7C7C7C] hover:text-[#181725] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Filter Section */}
            <Card icon={Filter} title="1. Pick which products to update">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <FieldGroup label="Vendor Scope">
                  <select
                    value={filter.vendorId}
                    onChange={(e) => setFilter({ ...filter, vendorId: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Any vendor</option>
                    <option value="null">Catalog Products (Global)</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.businessName}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label="Category">
                  <select
                    value={filter.categoryId}
                    onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Any category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label="Brand (exact)">
                  <select
                    value={filter.brand}
                    onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Any brand</option>
                    {brands.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label="Current Status">
                  <select
                    value={filter.isActive}
                    onChange={(e) => setFilter({ ...filter, isActive: e.target.value as FilterState['isActive'] })}
                    className={selectCls}
                  >
                    <option value="">Any status</option>
                    <option value="true">Active only</option>
                    <option value="false">Inactive only</option>
                  </select>
                </FieldGroup>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#F5F5F5] pt-3">
                <div className="text-[12px] text-[#7C7C7C] font-semibold">
                  {filterIsEmpty ? (
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <AlertCircle size={14} /> Add at least one filter — bulk update without a filter is blocked.
                    </span>
                  ) : counting ? (
                    <span className="flex items-center gap-1.5 font-bold"><Loader2 size={12} className="animate-spin text-[#299E60]" /> Counting…</span>
                  ) : matchedCount != null ? (
                    <span className="text-[#299E60] bg-[#EEF8F1] px-2.5 py-1 rounded-[8px] uppercase tracking-wider font-extrabold text-[11px]">
                      {matchedCount} product{matchedCount !== 1 ? 's' : ''} match this filter
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => setFilter({ categoryId: '', brand: '', isActive: '', vendorId: '' })}
                  className="text-[11.5px] font-bold text-[#AEAEAE] hover:text-[#181725] underline transition-colors"
                >
                  Clear filter
                </button>
              </div>
            </Card>

            {/* Set Fields Section */}
            <Card icon={Layers} title="2. Pick fields to change">
              <p className="text-[11.5px] text-[#AEAEAE] font-semibold mb-4 uppercase tracking-wider">
                Leave a field empty to keep its current value. Any field you fill in here gets written to every matched product.
              </p>

              {/* Status / flags group */}
              <Section label="Status & Flags" icon={Power}>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <FieldGroup label="Active">
                    <TristateSelect value={setState.isActive} onChange={(v) => setSetState({ ...setState, isActive: v })} />
                  </FieldGroup>
                  <FieldGroup label="Credit Eligible">
                    <TristateSelect value={setState.creditEligible} onChange={(v) => setSetState({ ...setState, creditEligible: v })} />
                  </FieldGroup>
                  <FieldGroup label="Featured">
                    <TristateSelect value={setState.isFeatured} onChange={(v) => setSetState({ ...setState, isFeatured: v })} />
                  </FieldGroup>
                  <FieldGroup label="Veg / Non-Veg">
                    <select
                      value={setState.vegNonVeg}
                      onChange={(e) => setSetState({ ...setState, vegNonVeg: e.target.value as SetState['vegNonVeg'] })}
                      className={selectCls}
                    >
                      <option value="">— No change —</option>
                      <option value="veg">Veg</option>
                      <option value="non_veg">Non-Veg</option>
                      <option value="egg">Egg</option>
                      <option value="null">Clear (set to null)</option>
                    </select>
                  </FieldGroup>
                </div>
              </Section>

              {/* Pricing group */}
              <Section label="Pricing" icon={IndianRupee}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PriceAdjust
                    label="Base Price"
                    kind={setState.basePriceKind}
                    value={setState.basePriceValue}
                    onKind={(v) => setSetState({ ...setState, basePriceKind: v })}
                    onValue={(v) => setSetState({ ...setState, basePriceValue: v })}
                  />
                  <PriceAdjust
                    label="MRP / Original Price"
                    kind={setState.origPriceKind}
                    value={setState.origPriceValue}
                    onKind={(v) => setSetState({ ...setState, origPriceKind: v })}
                    onValue={(v) => setSetState({ ...setState, origPriceValue: v })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <FieldGroup label="GST %">
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={setState.taxPercent}
                      onChange={(e) => setSetState({ ...setState, taxPercent: e.target.value })}
                      placeholder="No change"
                      className={inputCls}
                    />
                  </FieldGroup>
                  <FieldGroup label="MOQ (Min Order Qty)">
                    <input
                      type="number" min="1" step="1"
                      value={setState.minOrderQty}
                      onChange={(e) => setSetState({ ...setState, minOrderQty: e.target.value })}
                      placeholder="No change"
                      className={inputCls}
                    />
                  </FieldGroup>
                </div>
                <div className="flex items-center gap-4 mt-4 flex-wrap border-t border-[#F5F5F5] pt-3">
                  <label className="flex items-center gap-2.5 text-[13px] text-[#181725] font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setState.applyToSlabs}
                      onChange={(e) => setSetState({ ...setState, applyToSlabs: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#299E60] focus:ring-[#299E60]"
                    />
                    Apply base-price adjustment to every price slab too
                  </label>
                  <label className="flex items-center gap-2.5 text-[13px] text-red-600 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setState.clearPromo}
                      onChange={(e) => setSetState({ ...setState, clearPromo: e.target.checked })}
                      className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                    />
                    <Trash2 size={13} className="text-red-500" /> Clear any active promo / deal price
                  </label>
                </div>
              </Section>

              {/* Catalog group */}
              <Section label="Catalog Metadata" icon={Tag}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup label="Brand (exact name)">
                    <input
                      type="text" value={setState.brand}
                      onChange={(e) => setSetState({ ...setState, brand: e.target.value })}
                      placeholder="No change"
                      className={inputCls}
                    />
                  </FieldGroup>
                  <FieldGroup label="Country of Origin">
                    <input
                      type="text" value={setState.countryOfOrigin}
                      onChange={(e) => setSetState({ ...setState, countryOfOrigin: e.target.value })}
                      placeholder="No change"
                      className={inputCls}
                    />
                  </FieldGroup>
                  <FieldGroup label="Storage Type">
                    <input
                      type="text" value={setState.storageType}
                      onChange={(e) => setSetState({ ...setState, storageType: e.target.value })}
                      placeholder="ambient / chilled / frozen"
                      className={inputCls}
                    />
                  </FieldGroup>
                  <FieldGroup label="Shelf Life (days)">
                    <input
                      type="number" min="0" step="1" value={setState.shelfLifeDays}
                      onChange={(e) => setSetState({ ...setState, shelfLifeDays: e.target.value })}
                      placeholder="No change"
                      className={inputCls}
                    />
                  </FieldGroup>
                </div>
                <FieldGroup label="Description (replaces existing)" className="mt-4">
                  <textarea
                    value={setState.description}
                    onChange={(e) => setSetState({ ...setState, description: e.target.value })}
                    placeholder="Leave empty to keep existing descriptions"
                    rows={3}
                    className={`${inputCls} h-auto py-2.5 resize-none`}
                  />
                </FieldGroup>
              </Section>
            </Card>

            {/* Success result logs */}
            {lastResult && (
              <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-100 rounded-[12px] shadow-sm">
                <BadgeCheck size={18} className="text-emerald-600 shrink-0" />
                <p className="text-[13px] text-emerald-800 font-semibold">
                  Last run: matched <strong>{lastResult.matched}</strong>, updated <strong>{lastResult.updated}</strong> product{lastResult.updated !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-8 py-5 bg-white border-t border-[#EEEEEE] shrink-0">
            <button
              onClick={() => { setSetState(blankSet); setFilter({ categoryId: '', brand: '', isActive: '', vendorId: '' }); setLastResult(null); }}
              disabled={submitting}
              className="h-[44px] px-6 text-[13px] font-bold text-[#7C7C7C] hover:text-[#181725] transition-colors"
            >
              Reset all
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              className="h-[44px] px-6 border border-[#EEEEEE] hover:bg-[#F8F9FB] rounded-[12px] text-[13px] font-bold text-[#181725] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || filterIsEmpty || setIsEmpty}
              className="h-[44px] px-8 bg-[#299E60] hover:bg-[#238a54] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-[12px] text-[13px] font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {submitting ? 'Applying…' : 'Apply Update'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────

const inputCls = 'w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] font-medium outline-none focus:border-[#299E60]/40 focus:ring-2 focus:ring-[#299E60]/10 bg-[#FAFAFA] focus:bg-white transition-all';
const selectCls = inputCls;

function Card({ icon: Icon, title, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-[#299E60]" />
        <h2 className="text-[15px] font-bold text-[#181725]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Section({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#F5F5F5] pt-5 mt-5 first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon size={14} className="text-[#7C7C7C]" />
        <p className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">{label}</p>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

function TristateSelect({
  value, onChange,
}: { value: '' | 'true' | 'false'; onChange: (v: '' | 'true' | 'false') => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as '' | 'true' | 'false')} className={selectCls}>
      <option value="">— No change —</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

function PriceAdjust({
  label, kind, value, onKind, onValue,
}: {
  label: string;
  kind: '' | AdjustKind;
  value: string;
  onKind: (v: '' | AdjustKind) => void;
  onValue: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-2">{label}</label>
      <div className="flex gap-2">
        <select value={kind} onChange={(e) => onKind(e.target.value as '' | AdjustKind)} className={`${selectCls} max-w-[42%]`}>
          <option value="">— No change —</option>
          <option value="set">Set to ₹</option>
          <option value="percent">Adjust by %</option>
          <option value="fixed">Adjust by ₹</option>
        </select>
        <div className="relative flex-1">
          <input
            type="number" step="0.01"
            value={value}
            onChange={(e) => onValue(e.target.value)}
            disabled={!kind}
            placeholder={kind === 'percent' ? '+5 or -5' : kind === 'set' ? '120' : '20 or -20'}
            className={`${inputCls} disabled:bg-[#F5F5F5] disabled:cursor-not-allowed`}
          />
          {kind === 'percent' && <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEAE] pointer-events-none" />}
          {(kind === 'set' || kind === 'fixed') && <IndianRupee size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEAE] pointer-events-none" />}
        </div>
      </div>
    </div>
  );
}
