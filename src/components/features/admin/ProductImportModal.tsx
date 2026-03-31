'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  X, Upload, Download, Loader2, ChevronLeft, ChevronRight,
  CheckCircle, AlertTriangle, Plus, Pencil, SkipForward,
  FileSpreadsheet, ArrowRight, RotateCcw, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──

interface Vendor { id: string; businessName: string }

interface PreviewItem {
  row: number;
  action: 'create' | 'update' | 'skip';
  name: string;
  sku?: string;
  category?: string;
  basePrice: number;
  grossRate: number;
  taxPercent: number;
  stock?: number;
  bulkSlabCount: number;
  hasPromo: boolean;
  existing?: {
    id: string; name: string; basePrice: number;
    taxPercent: number; stock: number; brand?: string; sku?: string;
  };
  skipReason?: string;
}

interface ParseError { row: number; field?: string; message: string }

interface PreviewData {
  totalRows: number;
  creates: number;
  updates: number;
  skips: number;
  errors: ParseError[];
  items: PreviewItem[];
}

interface CommitResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
  backupId: string;
}

type Step = 'upload' | 'review' | 'result';

interface Props {
  open: boolean;
  onClose: () => void;
  vendors: Vendor[];
  onComplete: () => void; // refresh product list
}

// ── Component ──

export default function ProductImportModal({ open, onClose, vendors, onComplete }: Props) {
  // Step state
  const [step, setStep] = useState<Step>('upload');

  // Upload step
  const [file, setFile] = useState<File | null>(null);
  const [vendorId, setVendorId] = useState('');
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Review step
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [skipRows, setSkipRows] = useState<Set<number>>(new Set());
  const [reviewIdx, setReviewIdx] = useState(0); // current item index for left/right nav
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // Commit step
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [backupData, setBackupData] = useState<string | null>(null); // JSON backup
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);

  // ── Reset ──
  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setVendorId('');
    setParsing(false);
    setPreview(null);
    setSkipRows(new Set());
    setReviewIdx(0);
    setViewMode('list');
    setCommitting(false);
    setResult(null);
    setBackupData(null);
    setUndoing(false);
    setUndone(false);
  }, []);

  const handleClose = () => {
    if (!committing && !parsing) {
      reset();
      onClose();
    }
  };

  // ── Step 1: Upload & Preview ──
  const handlePreview = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (vendorId) fd.append('vendorId', vendorId);
      fd.append('mode', 'preview');

      const res = await fetch('/api/v1/admin/products/import', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.success && json.data) {
        setPreview(json.data);
        setSkipRows(new Set());
        setReviewIdx(0);
        setStep('review');
      } else {
        setPreview({
          totalRows: 0, creates: 0, updates: 0, skips: 0,
          errors: [{ row: 0, message: json.error?.message || 'Failed to parse file' }],
          items: [],
        });
        setStep('review');
      }
    } catch {
      setPreview({
        totalRows: 0, creates: 0, updates: 0, skips: 0,
        errors: [{ row: 0, message: 'Network error' }],
        items: [],
      });
      setStep('review');
    } finally {
      setParsing(false);
    }
  };

  // ── Step 2: Commit ──
  const handleCommit = async () => {
    if (!file || !preview) return;
    setCommitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (vendorId) fd.append('vendorId', vendorId);
      fd.append('mode', 'commit');
      if (skipRows.size > 0) {
        fd.append('skipRows', JSON.stringify([...skipRows]));
      }

      const res = await fetch('/api/v1/admin/products/import', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.success && json.data) {
        setResult({
          created: json.data.created,
          updated: json.data.updated,
          errors: json.data.errors || [],
          backupId: json.data.backupId,
        });
        // Store backup for undo
        if (json.data.backup) {
          setBackupData(JSON.stringify(json.data.backup));
        }
        setStep('result');
        onComplete();
      }
    } catch {
      setResult({ created: 0, updated: 0, errors: [{ row: 0, message: 'Network error' }], backupId: '' });
      setStep('result');
    } finally {
      setCommitting(false);
    }
  };

  // ── Undo (restore backup) ──
  const handleUndo = async () => {
    if (!backupData) return;
    setUndoing(true);
    try {
      const backup = JSON.parse(backupData);
      // Restore each backed-up product
      for (const p of backup) {
        await fetch(`/api/v1/admin/products/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: p.name,
            sku: p.sku,
            hsn: p.hsn,
            brand: p.brand,
            unit: p.unit,
            basePrice: p.basePrice,
            taxPercent: p.taxPercent,
            promoPrice: p.promoPrice,
          }),
        });
      }
      setUndone(true);
      onComplete();
    } catch {
      // Best effort
    } finally {
      setUndoing(false);
    }
  };

  // ── Download backup ──
  const downloadBackup = () => {
    if (!backupData) return;
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Template download ──
  const downloadTemplate = () => {
    const params = new URLSearchParams({ template: 'true', format: 'xlsx' });
    window.open(`/api/v1/admin/products/export?${params}`, '_blank');
  };

  // ── Skip toggle ──
  const toggleSkip = (row: number) => {
    setSkipRows(prev => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row); else next.add(row);
      return next;
    });
  };

  // ── Review navigation ──
  const activeItems = preview?.items.filter(i => !skipRows.has(i.row)) ?? [];
  const currentItem = activeItems[reviewIdx];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[80] animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-[20px] border border-[#EEEEEE] shadow-2xl w-full max-w-[820px] max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* ═══ Header ═══ */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-[#EEEEEE] shrink-0">
            <div className="flex items-center gap-4">
              {step === 'review' && (
                <button
                  onClick={() => setStep('upload')}
                  className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center hover:bg-[#F8F9FB] text-[#7C7C7C] transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <div>
                <h2 className="text-[20px] font-[900] text-[#181725]">
                  {step === 'upload' && 'Import Products'}
                  {step === 'review' && 'Review Import'}
                  {step === 'result' && 'Import Complete'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {['upload', 'review', 'result'].map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'w-[8px] h-[8px] rounded-full transition-colors',
                        step === s ? 'bg-[#299E60]' : i < ['upload', 'review', 'result'].indexOf(step) ? 'bg-[#299E60]/40' : 'bg-[#DCDCDC]',
                      )} />
                      {i < 2 && <div className="w-[16px] h-[2px] bg-[#EEEEEE]" />}
                    </React.Fragment>
                  ))}
                  <span className="text-[11px] text-[#AEAEAE] font-medium ml-2">
                    Step {['upload', 'review', 'result'].indexOf(step) + 1} of 3
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center hover:bg-[#F8F9FB] text-[#7C7C7C] hover:text-[#181725] transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* ═══ Body ═══ */}
          <div className="flex-1 overflow-y-auto">
            {/* ── STEP 1: Upload ── */}
            {step === 'upload' && (
              <div className="px-8 py-8 space-y-6">
                {/* Vendor (optional) */}
                <div>
                  <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                    Vendor <span className="text-[11px] font-medium text-[#AEAEAE] normal-case tracking-normal">(optional — leave blank for catalog)</span>
                  </label>
                  <select
                    value={vendorId}
                    onChange={e => setVendorId(e.target.value)}
                    className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all focus:border-[#299E60]/40 focus:bg-white cursor-pointer"
                  >
                    <option value="">Catalog (no vendor)</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.businessName}</option>
                    ))}
                  </select>
                </div>

                {/* File */}
                <div>
                  <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                    File <span className="text-[#E74C3C]">*</span>
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-[#EEEEEE] rounded-[14px] p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#299E60]/40 hover:bg-[#F8F9FB] transition-all"
                  >
                    <div className="w-[48px] h-[48px] bg-[#EEF8F1] rounded-[14px] flex items-center justify-center text-[#299E60]">
                      <Upload size={22} />
                    </div>
                    {file ? (
                      <div className="text-center">
                        <p className="text-[14px] font-bold text-[#181725]">{file.name}</p>
                        <p className="text-[12px] text-[#AEAEAE] font-medium mt-1">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-[14px] font-semibold text-[#181725]">Click to upload</p>
                        <p className="text-[12px] text-[#AEAEAE] font-medium mt-1">Supports .xlsx and .csv</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={e => { setFile(e.target.files?.[0] ?? null); e.target.value = ''; }}
                  />
                </div>

                {/* Template */}
                <button onClick={downloadTemplate} className="text-[13px] font-bold text-[#299E60] hover:underline flex items-center gap-2">
                  <Download size={14} />
                  Download Import Template (.xlsx)
                </button>

                {/* Format info */}
                <div className="bg-[#F8F9FB] rounded-[12px] p-4 text-[12px] text-[#7C7C7C] font-medium space-y-1">
                  <p className="font-bold text-[#181725] text-[13px] mb-2">Expected columns:</p>
                  <p>SKU, Product Name, HSN, Unit, Brand, Category</p>
                  <p>Taxable Rate (Amt), Tax %, Gross Rate 1Pc</p>
                  <p>Bulk Rates 1 - Qty/Rate, Bulk Rates 2 - Qty/Rate</p>
                  <p>6pm-9am Promo Rates, Available Stock, Image URL</p>
                </div>
              </div>
            )}

            {/* ── STEP 2: Review ── */}
            {step === 'review' && preview && (
              <div className="px-8 py-6 space-y-5">
                {/* Summary cards */}
                <div className="grid grid-cols-4 gap-3">
                  <SummaryCard label="Total" value={preview.totalRows} color="#181725" bg="#F8F9FB" />
                  <SummaryCard label="New" value={preview.creates - [...skipRows].filter(r => preview.items.find(i => i.row === r)?.action === 'create').length} color="#299E60" bg="#EEF8F1" />
                  <SummaryCard label="Update" value={preview.updates - [...skipRows].filter(r => preview.items.find(i => i.row === r)?.action === 'update').length} color="#3B82F6" bg="#EFF6FF" />
                  <SummaryCard label="Errors" value={preview.errors.length} color="#E74C3C" bg="#FFF0F0" />
                </div>

                {/* Parse errors */}
                {preview.errors.length > 0 && (
                  <div className="bg-[#FFF0F0] rounded-[12px] p-4">
                    <p className="text-[13px] font-bold text-[#E74C3C] mb-2">Parse Errors</p>
                    <div className="space-y-1 max-h-[100px] overflow-y-auto">
                      {preview.errors.map((e, i) => (
                        <p key={i} className="text-[12px] text-[#E74C3C]/80 font-medium">
                          Row {e.row}: {e.field ? `${e.field} — ` : ''}{e.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* View toggle */}
                {preview.items.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-[#F8F9FB] rounded-[10px] p-1">
                      <button
                        onClick={() => setViewMode('list')}
                        className={cn('px-4 py-2 rounded-[8px] text-[12px] font-bold transition-all', viewMode === 'list' ? 'bg-white shadow-sm text-[#181725]' : 'text-[#7C7C7C]')}
                      >
                        List View
                      </button>
                      <button
                        onClick={() => { setViewMode('detail'); setReviewIdx(0); }}
                        className={cn('px-4 py-2 rounded-[8px] text-[12px] font-bold transition-all flex items-center gap-1.5', viewMode === 'detail' ? 'bg-white shadow-sm text-[#181725]' : 'text-[#7C7C7C]')}
                      >
                        <Eye size={13} />
                        Detail View
                      </button>
                    </div>
                    <p className="text-[12px] text-[#AEAEAE] font-medium">
                      {skipRows.size > 0 && <span className="text-[#F59E0B]">{skipRows.size} skipped · </span>}
                      {preview.items.length} items
                    </p>
                  </div>
                )}

                {/* ── List view ── */}
                {viewMode === 'list' && preview.items.length > 0 && (
                  <div className="border border-[#EEEEEE] rounded-[14px] overflow-hidden max-h-[340px] overflow-y-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-[#F8F9FB] sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-bold text-[#7C7C7C] w-[50px]">Row</th>
                          <th className="px-4 py-3 font-bold text-[#7C7C7C]">Product</th>
                          <th className="px-4 py-3 font-bold text-[#7C7C7C] w-[90px]">Category</th>
                          <th className="px-4 py-3 font-bold text-[#7C7C7C] w-[90px] text-right">Gross Rate</th>
                          <th className="px-4 py-3 font-bold text-[#7C7C7C] w-[70px] text-center">Action</th>
                          <th className="px-4 py-3 font-bold text-[#7C7C7C] w-[50px]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEEEE]">
                        {preview.items.map(item => {
                          const isSkipped = skipRows.has(item.row);
                          return (
                            <tr key={item.row} className={cn('transition-colors', isSkipped ? 'opacity-40 bg-[#FAFAFA]' : 'hover:bg-[#F8F9FB]')}>
                              <td className="px-4 py-3 text-[#AEAEAE] font-mono text-[12px]">{item.row}</td>
                              <td className="px-4 py-3">
                                <p className={cn('font-semibold text-[#181725]', isSkipped && 'line-through')}>{item.name}</p>
                                {item.sku && <p className="text-[11px] text-[#AEAEAE] font-medium">{item.sku}</p>}
                              </td>
                              <td className="px-4 py-3 text-[#7C7C7C] font-medium">{item.category || '—'}</td>
                              <td className="px-4 py-3 text-right font-bold text-[#181725]">₹{item.grossRate.toFixed(2)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={cn(
                                  'inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-bold',
                                  item.action === 'create' && 'bg-[#EEF8F1] text-[#299E60]',
                                  item.action === 'update' && 'bg-[#EFF6FF] text-[#3B82F6]',
                                )}>
                                  {item.action === 'create' && <><Plus size={10} /> New</>}
                                  {item.action === 'update' && <><Pencil size={10} /> Update</>}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => toggleSkip(item.row)}
                                  title={isSkipped ? 'Include this row' : 'Skip this row'}
                                  className={cn(
                                    'w-[28px] h-[28px] rounded-[8px] flex items-center justify-center transition-all',
                                    isSkipped ? 'bg-[#FFF7E6] text-[#F59E0B] hover:bg-[#FFE7B3]' : 'hover:bg-[#FFF0F0] text-[#AEAEAE] hover:text-[#E74C3C]',
                                  )}
                                >
                                  <SkipForward size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Detail view (left/right review) ── */}
                {viewMode === 'detail' && currentItem && (
                  <div className="space-y-4">
                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setReviewIdx(Math.max(0, reviewIdx - 1))}
                        disabled={reviewIdx === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-bold hover:bg-[#F8F9FB] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <span className="text-[13px] font-bold text-[#181725]">
                        {reviewIdx + 1} / {activeItems.length}
                      </span>
                      <button
                        onClick={() => setReviewIdx(Math.min(activeItems.length - 1, reviewIdx + 1))}
                        disabled={reviewIdx >= activeItems.length - 1}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-bold hover:bg-[#F8F9FB] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Detail card */}
                    <div className="border border-[#EEEEEE] rounded-[14px] p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-[16px] font-bold text-[#181725]">{currentItem.name}</h3>
                          <p className="text-[12px] text-[#AEAEAE] font-medium">
                            Row {currentItem.row} · {currentItem.sku || 'No SKU'} · {currentItem.category || 'No category'}
                          </p>
                        </div>
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-bold',
                          currentItem.action === 'create' && 'bg-[#EEF8F1] text-[#299E60]',
                          currentItem.action === 'update' && 'bg-[#EFF6FF] text-[#3B82F6]',
                        )}>
                          {currentItem.action === 'create' ? <><Plus size={12} /> New Product</> : <><Pencil size={12} /> Update Existing</>}
                        </span>
                      </div>

                      {/* Fields comparison (for updates) */}
                      {currentItem.action === 'update' && currentItem.existing && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#FFF0F0]/50 rounded-[12px] p-4">
                            <p className="text-[11px] font-bold text-[#E74C3C] uppercase mb-3">Current</p>
                            <div className="space-y-2 text-[13px]">
                              <FieldRow label="Name" value={currentItem.existing.name} />
                              <FieldRow label="Taxable Rate" value={`₹${currentItem.existing.basePrice}`} />
                              <FieldRow label="Tax %" value={`${currentItem.existing.taxPercent}%`} />
                              <FieldRow label="Stock" value={String(currentItem.existing.stock)} />
                            </div>
                          </div>
                          <div className="bg-[#EEF8F1]/50 rounded-[12px] p-4">
                            <p className="text-[11px] font-bold text-[#299E60] uppercase mb-3">New (from file)</p>
                            <div className="space-y-2 text-[13px]">
                              <FieldRow label="Name" value={currentItem.name} changed={currentItem.name !== currentItem.existing.name} />
                              <FieldRow label="Taxable Rate" value={`₹${currentItem.basePrice}`} changed={currentItem.basePrice !== currentItem.existing.basePrice} />
                              <FieldRow label="Tax %" value={`${currentItem.taxPercent}%`} changed={currentItem.taxPercent !== currentItem.existing.taxPercent} />
                              <FieldRow label="Stock" value={currentItem.stock !== undefined ? String(currentItem.stock) : '—'} changed={currentItem.stock !== undefined && currentItem.stock !== currentItem.existing.stock} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fields (for creates) */}
                      {currentItem.action === 'create' && (
                        <div className="bg-[#F8F9FB] rounded-[12px] p-4">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
                            <FieldRow label="Taxable Rate" value={`₹${currentItem.basePrice}`} />
                            <FieldRow label="Gross Rate" value={`₹${currentItem.grossRate}`} />
                            <FieldRow label="Tax %" value={`${currentItem.taxPercent}%`} />
                            <FieldRow label="Stock" value={currentItem.stock !== undefined ? String(currentItem.stock) : '—'} />
                            <FieldRow label="Bulk Slabs" value={String(currentItem.bulkSlabCount)} />
                            <FieldRow label="Has Promo" value={currentItem.hasPromo ? 'Yes' : 'No'} />
                          </div>
                        </div>
                      )}

                      {/* Skip button */}
                      <button
                        onClick={() => toggleSkip(currentItem.row)}
                        className={cn(
                          'w-full h-[40px] rounded-[10px] text-[13px] font-bold transition-all flex items-center justify-center gap-2',
                          skipRows.has(currentItem.row)
                            ? 'bg-[#FFF7E6] text-[#F59E0B] hover:bg-[#FFE7B3]'
                            : 'bg-[#F8F9FB] text-[#7C7C7C] hover:bg-[#FFF0F0] hover:text-[#E74C3C]',
                        )}
                      >
                        <SkipForward size={14} />
                        {skipRows.has(currentItem.row) ? 'Include this row' : 'Skip this row'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Result ── */}
            {step === 'result' && result && (
              <div className="px-8 py-8 space-y-6">
                {/* Success/Error card */}
                <div className={cn(
                  'rounded-[14px] p-6 text-center',
                  result.created + result.updated > 0 ? 'bg-[#EEF8F1]' : 'bg-[#FFF0F0]',
                )}>
                  <div className={cn(
                    'w-[56px] h-[56px] rounded-full mx-auto mb-4 flex items-center justify-center',
                    result.created + result.updated > 0 ? 'bg-[#299E60]/20 text-[#299E60]' : 'bg-[#E74C3C]/20 text-[#E74C3C]',
                  )}>
                    {result.created + result.updated > 0 ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
                  </div>
                  <h3 className="text-[18px] font-[900] text-[#181725] mb-1">
                    {result.created + result.updated > 0 ? 'Import Successful' : 'Import Failed'}
                  </h3>
                  <p className="text-[14px] text-[#7C7C7C] font-medium">
                    {result.created > 0 && <span className="text-[#299E60] font-bold">{result.created} created</span>}
                    {result.created > 0 && result.updated > 0 && ' · '}
                    {result.updated > 0 && <span className="text-[#3B82F6] font-bold">{result.updated} updated</span>}
                    {result.errors.length > 0 && ` · ${result.errors.length} errors`}
                  </p>
                </div>

                {/* Errors */}
                {result.errors.length > 0 && (
                  <div className="border border-[#EEEEEE] rounded-[14px] overflow-hidden max-h-[200px] overflow-y-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-[#FFF0F0] sticky top-0">
                        <tr>
                          <th className="px-4 py-3 font-bold text-[#E74C3C] w-[60px]">Row</th>
                          <th className="px-4 py-3 font-bold text-[#E74C3C]">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEEEE]">
                        {result.errors.map((e, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-bold text-[#181725]">{e.row || '—'}</td>
                            <td className="px-4 py-3 text-[#7C7C7C] font-medium">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Backup actions */}
                {backupData && result.updated > 0 && (
                  <div className="bg-[#FFF7E6] rounded-[14px] p-5 space-y-3">
                    <p className="text-[13px] font-bold text-[#8B6914]">
                      {undone ? 'Undo complete — original values restored.' : `A backup of ${result.updated} updated products was created.`}
                    </p>
                    {!undone && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleUndo}
                          disabled={undoing}
                          className="h-[38px] px-5 bg-white border border-[#EEEEEE] rounded-[10px] text-[13px] font-bold text-[#181725] hover:bg-[#F8F9FB] transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {undoing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                          Undo Changes
                        </button>
                        <button
                          onClick={downloadBackup}
                          className="h-[38px] px-5 bg-white border border-[#EEEEEE] rounded-[10px] text-[13px] font-bold text-[#181725] hover:bg-[#F8F9FB] transition-all flex items-center gap-2"
                        >
                          <FileSpreadsheet size={14} />
                          Download Backup
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══ Footer ═══ */}
          <div className="px-8 py-5 border-t border-[#EEEEEE] shrink-0 flex items-center gap-4">
            {step === 'upload' && (
              <>
                <button onClick={handleClose} className="flex-1 h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] text-[#181725] rounded-[12px] text-[14px] font-bold hover:bg-[#EEEEEE] transition-all">
                  Cancel
                </button>
                <button
                  onClick={handlePreview}
                  disabled={parsing || !file}
                  className="flex-1 h-[48px] bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#299E60]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {parsing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Preview Changes
                </button>
              </>
            )}

            {step === 'review' && (
              <>
                <button onClick={() => setStep('upload')} className="flex-1 h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] text-[#181725] rounded-[12px] text-[14px] font-bold hover:bg-[#EEEEEE] transition-all">
                  Back
                </button>
                <button
                  onClick={handleCommit}
                  disabled={committing || !preview || preview.items.length === 0 || preview.items.every(i => skipRows.has(i.row))}
                  className="flex-1 h-[48px] bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#299E60]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {committing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Confirm & Import {preview && preview.items.length - skipRows.size > 0 && `(${preview.items.length - skipRows.size})`}
                </button>
              </>
            )}

            {step === 'result' && (
              <button
                onClick={handleClose}
                className="w-full h-[48px] bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-all"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Helper Components ──

function SummaryCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className="rounded-[12px] p-4 text-center" style={{ backgroundColor: bg }}>
      <p className="text-[24px] font-[900] leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: `${color}99` }}>{label}</p>
    </div>
  );
}

function FieldRow({ label, value, changed }: { label: string; value: string; changed?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#7C7C7C] font-medium">{label}</span>
      <span className={cn('font-bold', changed ? 'text-[#299E60] bg-[#EEF8F1] px-2 py-0.5 rounded-[4px]' : 'text-[#181725]')}>
        {value}
      </span>
    </div>
  );
}
