'use client';

/**
 * Vendor Bulk Update — /vendor/bulk-update
 * ----------------------------------------
 * Programmatic mass-edit for products. Distinct from /vendor/bulk-upload
 * (which is Excel-driven and creates products). This page is for in-place
 * edits to existing products: raise prices 5%, mark a category inactive,
 * toggle credit-eligibility, change MOQ, clear stale promo prices, etc.
 *
 * Backend contract: PATCH /api/v1/vendor/products/bulk-update with a
 * { filter, set } body. The endpoint scopes every read+write to the
 * caller's vendor and whitelists every field in `set`.
 *
 * Flow:
 *   1. Pick a filter — category, brand, active state, OR explicit list
 *   2. Page shows how many products match (live count)
 *   3. Pick fields + values to apply (multiple at once allowed)
 *   4. Preview summary + confirm
 *   5. Toast result (matched + updated)
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Layers, Filter, Wand2, AlertCircle, Loader2, Tag, Percent,
  IndianRupee, Power, BadgeCheck, Sparkles, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type AdjustKind = 'set' | 'percent' | 'fixed';

interface Filter {
  categoryId: string;
  brand: string;
  isActive: '' | 'true' | 'false';
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
interface BrandOption { name: string; productCount: number }

export default function BulkUpdatePage() {
  const confirm = useConfirm();

  const [filter, setFilter] = useState<Filter>({ categoryId: '', brand: '', isActive: '' });
  const [setState, setSetState] = useState<SetState>(blankSet);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);

  const [matchedCount, setMatchedCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ matched: number; updated: number } | null>(null);

  // ── Load category + brand dropdown sources once ────────────────────
  useEffect(() => {
    fetch('/api/v1/admin/categories')
      .then((r) => r.json())
      .then((j) => { if (j.success) setCategories(j.data); })
      .catch(() => {});
    // Brand list comes from the vendor's own products. /api/v1/brands
    // returns the global brand catalog; for filter purposes vendors only
    // care about brands they actually sell, but the global list is
    // fine as a starting set and saves a custom endpoint.
    fetch('/api/v1/brands')
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        const arr = Array.isArray(j.data) ? j.data : [];
        setBrands(arr.map((b: { name?: string }) => ({ name: b.name ?? '', productCount: 0 })).filter((b: BrandOption) => b.name));
      })
      .catch(() => {});
  }, []);

  // ── Recompute match count whenever filter changes ──────────────────
  // /api/v1/vendor/products/count is purpose-built to mirror this page's
  // filter surface; cheaper than the full list endpoint and identical
  // semantics to the bulk-update PATCH count.
  const computeFilter = useCallback(() => {
    const qs = new URLSearchParams();
    if (filter.categoryId) qs.set('categoryId', filter.categoryId);
    if (filter.brand) qs.set('brand', filter.brand);
    if (filter.isActive) qs.set('isActive', filter.isActive);
    return qs.toString();
  }, [filter]);

  useEffect(() => {
    const hasAnyFilter = filter.categoryId || filter.brand || filter.isActive;
    if (!hasAnyFilter) { setMatchedCount(null); return; }
    setCounting(true);
    fetch(`/api/v1/vendor/products/count?${computeFilter()}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && typeof j.data?.total === 'number') setMatchedCount(j.data.total);
        else setMatchedCount(null);
      })
      .catch(() => setMatchedCount(null))
      .finally(() => setCounting(false));
  }, [filter, computeFilter]);

  // ── Whether any "set" field carries a real value ───────────────────
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

  const filterIsEmpty = !filter.categoryId && !filter.brand && !filter.isActive;

  // ── Build the request body from local state ────────────────────────
  const buildBody = () => {
    const body: { filter: Record<string, unknown>; set: Record<string, unknown> } = { filter: {}, set: {} };
    if (filter.categoryId) body.filter.categoryId = filter.categoryId;
    if (filter.brand) body.filter.brand = filter.brand;
    if (filter.isActive) body.filter.isActive = filter.isActive === 'true';

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
      const res = await fetch('/api/v1/vendor/products/bulk-update', {
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#ECFDF5] flex items-center justify-center">
            <Wand2 size={20} className="text-[#299E60]" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#181725]">Bulk Update</h1>
            <p className="text-[12px] text-[#7C7C7C]">
              Mass-edit fields on products that match a filter — pricing, status, MOQ, credit-eligibility, description, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Filter card */}
      <Card icon={Filter} title="1. Pick which products to update">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              onChange={(e) => setFilter({ ...filter, isActive: e.target.value as Filter['isActive'] })}
              className={selectCls}
            >
              <option value="">Any status</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </FieldGroup>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-[12px] text-[#7C7C7C]">
            {filterIsEmpty ? (
              <span className="flex items-center gap-1.5 text-amber-700">
                <AlertCircle size={12} /> Add at least one filter — bulk update without a filter is blocked.
              </span>
            ) : counting ? (
              <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Counting…</span>
            ) : matchedCount != null ? (
              <span><strong className="text-[#181725]">{matchedCount}</strong> product{matchedCount !== 1 ? 's' : ''} match this filter</span>
            ) : null}
          </div>
          <button
            onClick={() => setFilter({ categoryId: '', brand: '', isActive: '' })}
            className="text-[11.5px] text-[#7C7C7C] hover:text-[#181725] underline"
          >
            Clear filter
          </button>
        </div>
      </Card>

      {/* Set fields card */}
      <Card icon={Layers} title="2. Pick fields to change">
        <p className="text-[11.5px] text-[#AEAEAE] mb-3">
          Leave a field empty to keep its current value. Any field you fill in here gets written to every matched product.
        </p>

        {/* Status / flags group */}
        <Section label="Status & Flags" icon={Power}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-3 mt-3">
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
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <label className="flex items-center gap-2 text-[12px] text-[#181725] cursor-pointer">
              <input
                type="checkbox"
                checked={setState.applyToSlabs}
                onChange={(e) => setSetState({ ...setState, applyToSlabs: e.target.checked })}
                className="rounded border-gray-300"
              />
              Apply base-price adjustment to every price slab too
            </label>
            <label className="flex items-center gap-2 text-[12px] text-red-700 cursor-pointer">
              <input
                type="checkbox"
                checked={setState.clearPromo}
                onChange={(e) => setSetState({ ...setState, clearPromo: e.target.checked })}
                className="rounded border-red-300"
              />
              <Trash2 size={11} /> Clear any active promo / deal price
            </label>
          </div>
        </Section>

        {/* Catalog group */}
        <Section label="Catalog Metadata" icon={Tag}>
          <div className="grid grid-cols-2 gap-3">
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
          <FieldGroup label="Description (replaces existing)" className="mt-3">
            <textarea
              value={setState.description}
              onChange={(e) => setSetState({ ...setState, description: e.target.value })}
              placeholder="Leave empty to keep existing descriptions"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </FieldGroup>
        </Section>
      </Card>

      {/* Last result */}
      {lastResult && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-[10px]">
          <BadgeCheck size={14} className="text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-emerald-800">
            Last run: matched <strong>{lastResult.matched}</strong>, updated <strong>{lastResult.updated}</strong>.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={() => { setSetState(blankSet); setFilter({ categoryId: '', brand: '', isActive: '' }); setLastResult(null); }}
          disabled={submitting}
          className="h-[42px] px-5 text-[13px] font-bold text-[#7C7C7C] hover:text-[#181725]"
        >
          Reset all
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || filterIsEmpty || setIsEmpty}
          className="h-[44px] px-6 bg-[#299E60] hover:bg-[#238a54] disabled:bg-gray-300 text-white rounded-[10px] text-[13px] font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {submitting ? 'Applying…' : 'Apply Update'}
        </button>
      </div>
    </div>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────

const inputCls = 'w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/40 focus:ring-2 focus:ring-[#299E60]/10 bg-[#FAFAFA] focus:bg-white transition-all';
const selectCls = inputCls;

function Card({ icon: Icon, title, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[#299E60]" />
        <h2 className="text-[14px] font-bold text-[#181725]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Section({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#F5F5F5] pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon size={12} className="text-[#7C7C7C]" />
        <p className="text-[10.5px] font-bold text-[#7C7C7C] uppercase tracking-wider">{label}</p>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[10.5px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">{label}</label>
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
      <label className="block text-[10.5px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex gap-2">
        <select value={kind} onChange={(e) => onKind(e.target.value as '' | AdjustKind)} className={`${selectCls} max-w-[42%]`}>
          <option value="">— No change —</option>
          <option value="set">Set to ₹</option>
          <option value="percent">Adjust by %</option>
          <option value="fixed">Adjust by ₹</option>
        </select>
        <input
          type="number" step="0.01"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          disabled={!kind}
          placeholder={kind === 'percent' ? '+5 or -5' : kind === 'set' ? '120' : '20 or -20'}
          className={`${inputCls} disabled:bg-[#F5F5F5] disabled:cursor-not-allowed`}
        />
        {kind === 'percent' && <span className="absolute"><Percent size={12} className="ml-[-22px] mt-3 text-[#AEAEAE] pointer-events-none" /></span>}
        {(kind === 'set' || kind === 'fixed') && <span className="absolute"><IndianRupee size={12} className="ml-[-22px] mt-3 text-[#AEAEAE] pointer-events-none" /></span>}
      </div>
    </div>
  );
}

