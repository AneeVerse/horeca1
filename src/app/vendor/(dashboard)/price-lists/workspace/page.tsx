'use client';

/**
 * Smart Pricelist Workspace — a Google-Sheets-style grid for vendor pricing.
 * Rows = products, columns = price lists. Cells hold the explicit override
 * price for that (product, list); empty cells show the resolved fallback
 * (list global discount or base price) in muted text. Supports:
 *   • click-to-edit cells, Enter/Tab/Arrow navigation, batched save
 *   • per-column formula apply (=BASE-3%, =COD+2%, =BASE*1.05, =BASE-2)
 *   • frozen Product / SKU / Base columns + sticky header
 *   • search + paginated load-more
 * Final prices are stored (not formulas) — the formula is only an entry tool.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, Loader2, Save, FunctionSquare, Check, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PriceListCol { id: string; name: string; discountPercent: number }
interface ProductRow {
  id: string; name: string; sku: string | null; unit: string | null; packSize: string | null;
  basePrice: number; taxPercent: number; cells: Record<string, number | null>;
}

const inr = (n: number | null | undefined) =>
  n == null || isNaN(Number(n)) ? '' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// Fallback price shown (muted) when a cell has no explicit override.
function fallbackPrice(row: ProductRow, col: PriceListCol): number {
  if (col.discountPercent > 0) return Math.round(row.basePrice * (1 - col.discountPercent / 100) * 100) / 100;
  return row.basePrice;
}
// Effective value of a column for a row (override if set, else fallback).
function effective(row: ProductRow, col: PriceListCol, dirty: Record<string, number | null>): number {
  const key = `${row.id}:${col.id}`;
  const ov = key in dirty ? dirty[key] : row.cells[col.id];
  return ov != null ? ov : fallbackPrice(row, col);
}

export default function PricelistWorkspacePage() {
  const [cols, setCols] = useState<PriceListCol[]>([]);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // Dirty cells keyed `${rowId}:${listId}` → new value (null = cleared). Saved in a batch.
  const [dirty, setDirty] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);

  // Active cell for keyboard nav + the cell currently being edited.
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [editVal, setEditVal] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  // Column formula popover
  const [formulaCol, setFormulaCol] = useState<string | null>(null);
  const [formulaText, setFormulaText] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 350); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async (reset: boolean, cursor?: string | null) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const qs = new URLSearchParams();
      if (debounced) qs.set('search', debounced);
      if (cursor) qs.set('cursor', cursor);
      qs.set('limit', '50');
      const res = await fetch(`/api/v1/vendor/price-lists/workspace?${qs}`);
      const json = await res.json();
      if (!json.success) { toast.error(json.error?.message || 'Failed to load workspace'); return; }
      setCols(json.data.priceLists);
      setRows(prev => reset ? json.data.products : [...prev, ...json.data.products]);
      setNextCursor(json.data.pagination.nextCursor);
    } catch { toast.error('Failed to load workspace'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [debounced]);

  useEffect(() => { load(true); }, [load]);

  useEffect(() => { if (editing) { setTimeout(() => editRef.current?.select(), 0); } }, [editing]);

  const dirtyCount = Object.keys(dirty).length;

  const setCell = (rowId: string, listId: string, value: number | null) => {
    setDirty(prev => ({ ...prev, [`${rowId}:${listId}`]: value }));
  };

  const commitEdit = (r: number, c: number) => {
    const row = rows[r]; const col = cols[c];
    if (!row || !col) { setEditing(null); return; }
    const trimmed = editVal.trim();
    if (trimmed === '') {
      setCell(row.id, col.id, null); // clear override
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num > 0) setCell(row.id, col.id, Math.round(num * 100) / 100);
    }
    setEditing(null);
  };

  const startEdit = (r: number, c: number) => {
    const row = rows[r]; const col = cols[c];
    if (!row || !col) return;
    const key = `${row.id}:${col.id}`;
    const cur = key in dirty ? dirty[key] : row.cells[col.id];
    setEditVal(cur != null ? String(cur) : '');
    setEditing({ r, c });
    setActive({ r, c });
  };

  // Keyboard navigation across the grid.
  const onGridKeyDown = (e: React.KeyboardEvent) => {
    if (!active || editing) return;
    const { r, c } = active;
    if (e.key === 'ArrowRight' || e.key === 'Tab') { e.preventDefault(); setActive({ r, c: Math.min(cols.length - 1, c + 1) }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setActive({ r, c: Math.max(0, c - 1) }); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive({ r: Math.min(rows.length - 1, r + 1), c }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive({ r: Math.max(0, r - 1), c }); }
    else if (e.key === 'Enter') { e.preventDefault(); startEdit(r, c); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); const row = rows[r], col = cols[c]; if (row && col) setCell(row.id, col.id, null); }
    else if (/^[0-9.]$/.test(e.key)) { startEdit(r, c); setEditVal(e.key); }
  };

  const applyFormula = () => {
    if (!formulaCol) return;
    const m = formulaText.trim().replace(/\s+/g, '').match(/^=([A-Za-z0-9_]+)([+\-*])(\d+(?:\.\d+)?)(%?)$/i);
    if (!m) { toast.error('Use e.g. =BASE-3%, =BASE+5, =BASE*1.05, or =<ListName>+2%'); return; }
    const [, srcRaw, op, numStr, pct] = m;
    const num = parseFloat(numStr);
    const src = srcRaw.toUpperCase();
    const srcCol = src === 'BASE' ? null : cols.find(c => c.name.toUpperCase().replace(/\s+/g, '') === src.replace(/\s+/g, ''));
    if (src !== 'BASE' && !srcCol) { toast.error(`Unknown column "${srcRaw}". Use BASE or a price list name.`); return; }

    const targetCol = cols.find(c => c.id === formulaCol)!;
    const next: Record<string, number | null> = { ...dirty };
    for (const row of rows) {
      const baseVal = srcCol ? effective(row, srcCol, dirty) : row.basePrice;
      let out = baseVal;
      if (op === '+') out = pct ? baseVal * (1 + num / 100) : baseVal + num;
      else if (op === '-') out = pct ? baseVal * (1 - num / 100) : baseVal - num;
      else if (op === '*') out = baseVal * num;
      out = Math.round(out * 100) / 100;
      if (out > 0) next[`${row.id}:${targetCol.id}`] = out;
    }
    setDirty(next);
    setFormulaCol(null);
    setFormulaText('');
    toast.success(`Formula applied to ${rows.length} rows in "${targetCol.name}" — review and Save`);
  };

  const save = async () => {
    const cells = Object.entries(dirty).map(([key, customPrice]) => {
      const [productId, priceListId] = key.split(':');
      return { productId, priceListId, customPrice };
    });
    if (cells.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/vendor/price-lists/workspace', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cells }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error?.message || 'Save failed'); return; }
      // Fold saved values into rows so they persist visually, then clear dirty.
      setRows(prev => prev.map(row => {
        const nc = { ...row.cells };
        for (const [key, val] of Object.entries(dirty)) {
          const [pid, lid] = key.split(':');
          if (pid === row.id) nc[lid] = val;
        }
        return { ...row, cells: nc };
      }));
      setDirty({});
      toast.success(`Saved · ${json.data.upserted} set, ${json.data.cleared} cleared`);
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/vendor/price-lists" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500"><ChevronLeft size={18} /></Link>
          <div>
            <h1 className="text-[22px] font-black text-[#181725]">Pricelist Workspace</h1>
            <p className="text-[12px] text-gray-400 font-medium">Spreadsheet pricing across all your price lists. Empty cells use the list/base price.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product / SKU"
              className="h-9 pl-9 pr-3 w-[240px] bg-white border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#299E60]" />
          </div>
          <button onClick={save} disabled={dirtyCount === 0 || saving}
            className="h-9 px-4 bg-[#299E60] hover:bg-[#238a53] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-[13px] font-bold flex items-center gap-1.5 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
          </button>
        </div>
      </div>

      {cols.length === 0 && !loading ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <p className="text-[15px] font-bold text-[#181725] mb-1">No price lists yet</p>
          <p className="text-[13px] text-gray-400 mb-4">Create a price list first, then come back to edit prices in the grid.</p>
          <Link href="/vendor/price-lists" className="inline-block px-5 py-2.5 bg-[#299E60] text-white rounded-lg text-[13px] font-bold">Go to Price Lists</Link>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin text-[#299E60]" /></div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
            <Info size={13} /> Click a cell to edit · Enter to edit/commit · arrows/Tab to move · empty = uses fallback (shown faint) · use ƒ on a column header for a formula
          </div>
          <div className="bg-white border border-[#EEEEEE] rounded-[14px] overflow-auto shadow-sm" tabIndex={0} onKeyDown={onGridKeyDown}>
            <table className="border-collapse text-[13px]">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#FAFAFA] text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                  <th className="px-3 py-3 text-left sticky left-0 bg-[#FAFAFA] z-10 min-w-[220px] border-b border-r border-[#EEEEEE]">Product</th>
                  <th className="px-3 py-3 text-left sticky left-[220px] bg-[#FAFAFA] z-10 w-[120px] border-b border-r border-[#EEEEEE]">SKU</th>
                  <th className="px-3 py-3 text-right sticky left-[340px] bg-[#FAFAFA] z-10 w-[100px] border-b border-r-2 border-[#E2E2E2]">Base ₹</th>
                  {cols.map(col => (
                    <th key={col.id} className="px-3 py-2.5 text-right w-[130px] border-b border-[#EEEEEE] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="truncate max-w-[90px]" title={col.name}>{col.name}</span>
                        <button onClick={() => { setFormulaCol(col.id); setFormulaText('=BASE'); }} title="Apply formula to this column"
                          className="text-gray-400 hover:text-[#299E60]"><FunctionSquare size={14} /></button>
                      </div>
                      {col.discountPercent > 0 && <span className="block text-[9px] text-gray-400 font-medium normal-case">−{col.discountPercent}% default</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={row.id} className="hover:bg-[#FCFCFC]">
                    <td className="px-3 py-2 text-left sticky left-0 bg-white z-10 border-b border-r border-[#F0F0F0] font-semibold text-[#181725]">
                      <div className="truncate max-w-[210px]" title={row.name}>{row.name}</div>
                      {(row.unit || row.packSize) && <div className="text-[10px] text-gray-400">{[row.packSize, row.unit].filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td className="px-3 py-2 text-left sticky left-[220px] bg-white z-10 border-b border-r border-[#F0F0F0] text-gray-500">{row.sku || '—'}</td>
                    <td className="px-3 py-2 text-right sticky left-[340px] bg-white z-10 border-b border-r-2 border-[#E2E2E2] font-bold text-[#181725]">{inr(row.basePrice)}</td>
                    {cols.map((col, c) => {
                      const key = `${row.id}:${col.id}`;
                      const isDirty = key in dirty;
                      const override = isDirty ? dirty[key] : row.cells[col.id];
                      const showVal = override != null ? inr(override) : '';
                      const fb = inr(fallbackPrice(row, col));
                      const isActive = active?.r === r && active?.c === c;
                      const isEditing = editing?.r === r && editing?.c === c;
                      return (
                        <td key={col.id}
                          onClick={() => setActive({ r, c })}
                          onDoubleClick={() => startEdit(r, c)}
                          className={cn(
                            'px-2 py-1.5 text-right border-b border-[#F0F0F0] cursor-cell tabular-nums',
                            isActive && 'ring-2 ring-[#299E60] ring-inset bg-[#299E60]/5',
                            isDirty && 'bg-amber-50',
                          )}
                        >
                          {isEditing ? (
                            <input ref={editRef} value={editVal} autoFocus
                              onChange={e => setEditVal(e.target.value.replace(/[^0-9.]/g, ''))}
                              onBlur={() => commitEdit(r, c)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); commitEdit(r, c); setActive({ r: Math.min(rows.length - 1, r + 1), c }); }
                                else if (e.key === 'Tab') { e.preventDefault(); commitEdit(r, c); setActive({ r, c: Math.min(cols.length - 1, c + 1) }); }
                                else if (e.key === 'Escape') { e.preventDefault(); setEditing(null); }
                              }}
                              className="w-full text-right outline-none bg-white border border-[#299E60] rounded px-1 py-0.5 text-[13px]" />
                          ) : (
                            <span className={cn(override != null ? 'text-[#181725] font-semibold' : 'text-gray-300')}>
                              {showVal || fb}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nextCursor && (
            <div className="flex justify-center">
              <button onClick={() => load(false, nextCursor)} disabled={loadingMore}
                className="px-5 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:border-[#299E60] hover:text-[#299E60] flex items-center gap-2">
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null} Load more products
              </button>
            </div>
          )}
        </>
      )}

      {/* Column formula popover */}
      {formulaCol && (
        <div className="fixed inset-0 z-[10000] bg-black/30 flex items-center justify-center p-4" onClick={() => setFormulaCol(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-black text-[#181725] flex items-center gap-2"><FunctionSquare size={17} /> Column formula</h3>
              <button onClick={() => setFormulaCol(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-3">
              Applies to all loaded rows in <strong className="text-[#181725]">{cols.find(c => c.id === formulaCol)?.name}</strong>.
              Reference <code className="bg-gray-100 px-1 rounded">BASE</code> or any price list name.
            </p>
            <input value={formulaText} onChange={e => setFormulaText(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') applyFormula(); }}
              placeholder="=BASE-3%"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[14px] font-mono outline-none focus:border-[#299E60] mb-3" />
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['=BASE-3%', '=BASE+5%', '=BASE*1.05', '=BASE-2'].map(ex => (
                <button key={ex} onClick={() => setFormulaText(ex)} className="text-[11px] font-mono bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">{ex}</button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setFormulaCol(null)} className="px-4 py-2 text-[13px] font-bold text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
              <button onClick={applyFormula} className="px-4 py-2 bg-[#299E60] hover:bg-[#238a53] text-white rounded-lg text-[13px] font-bold flex items-center gap-1.5"><Check size={14} /> Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
