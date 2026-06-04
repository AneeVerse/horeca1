'use client';

/**
 * VendorProductImportModal — Vendor-scoped Product Bulk Importer
 * -------------------------------------------------------------
 * Premium dialog with drag-drop upload, server-side preview validation,
 * inline cell editing, and transactional undo capability.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Upload, Download, Loader2, ChevronLeft, ChevronRight,
  CheckCircle, AlertTriangle, FileSpreadsheet, ArrowRight, RotateCcw, Eye, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type EditRow = Partial<{
  name: string;
  sku: string;
  category: string;
  basePrice: number;
  taxPercent: number;
  stock: number;
}>;

interface PreviewSlab { minQty: number; price: number; grossRate: number; promoPrice?: number | null }

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
  bulkSlabs?: PreviewSlab[];
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
  onComplete: () => void;
}

export default function VendorProductImportModal({ open, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>('upload');

  // Upload step
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Review step
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [skipRows, setSkipRows] = useState<Set<number>>(new Set());
  const [reviewIdx, setReviewIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [edits, setEdits] = useState<Record<number, EditRow>>({});

  // Categories
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    if (!open || categories.length > 0) return;
    fetch('/api/v1/categories')
      .then((r) => r.json())
      .then((j) => {
        if (!j.success || !Array.isArray(j.data)) return;
        type Cat = { id: string; name: string; children?: Cat[] };
        const flat: Array<{ id: string; name: string }> = [];
        for (const c of j.data as Cat[]) {
          flat.push({ id: c.id, name: c.name });
          for (const child of c.children ?? []) flat.push({ id: child.id, name: child.name });
        }
        setCategories(flat);
      })
      .catch(() => {});
  }, [open, categories.length]);

  // Commit step
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [backupData, setBackupData] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);

  // Reset
  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParsing(false);
    setPreview(null);
    setSkipRows(new Set());
    setReviewIdx(0);
    setViewMode('list');
    setEdits({});
    setCommitting(false);
    setResult(null);
    setBackupData(null);
    setUndoing(false);
    setUndone(false);
  }, []);

  const setEdit = useCallback(<K extends keyof EditRow>(row: number, key: K, value: EditRow[K] | undefined) => {
    setEdits((prev) => {
      const next = { ...prev };
      const rowEdits: EditRow = { ...(next[row] ?? {}) };
      if (value === undefined) {
        delete rowEdits[key];
      } else {
        rowEdits[key] = value;
      }
      if (Object.keys(rowEdits).length === 0) {
        delete next[row];
      } else {
        next[row] = rowEdits;
      }
      return next;
    });
  }, []);

  const handleClose = () => {
    if (!committing && !parsing) {
      reset();
      onClose();
    }
  };

  const acceptFile = (f: File | null) => {
    if (!f) return;
    const ok = /\.(xlsx|csv)$/i.test(f.name);
    if (!ok) {
      toast.error('Please upload a .xlsx or .csv file');
      return;
    }
    setFile(f);
  };

  // Step 1: Preview
  const handlePreview = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', 'preview');

      const res = await fetch('/api/v1/vendor/products/import', { method: 'POST', body: fd });
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

  // Step 2: Commit
  const handleCommit = async () => {
    if (!file || !preview) return;
    setCommitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', 'commit');
      if (skipRows.size > 0) {
        fd.append('skipRows', JSON.stringify([...skipRows]));
      }
      if (Object.keys(edits).length > 0) {
        fd.append('edits', JSON.stringify(edits));
      }

      const res = await fetch('/api/v1/vendor/products/import', { method: 'POST', body: fd });
      const json = await res.json();

      if (json.success && json.data) {
        setResult({
          created: json.data.created,
          updated: json.data.updated,
          errors: json.data.errors || [],
          backupId: json.data.backupId,
        });
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

  // Undo (restore backup)
  const handleUndo = async () => {
    if (!backupData) return;
    setUndoing(true);
    try {
      const backup = JSON.parse(backupData);
      for (const p of backup) {
        await fetch(`/api/v1/vendor/products/${p.id}`, {
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
      // best effort
    } finally {
      setUndoing(false);
    }
  };

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

  const downloadTemplate = () => {
    window.open('/api/v1/vendor/products/import?template=true', '_blank');
  };

  const toggleSkip = (row: number) => {
    setSkipRows(prev => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row); else next.add(row);
      return next;
    });
  };

  const activeItems = preview?.items.filter(i => !skipRows.has(i.row)) ?? [];
  const currentItem = activeItems[reviewIdx];

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60] animate-in fade-in duration-200" onClick={handleClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div className="bg-white rounded-[20px] border border-[#EEEEEE] shadow-2xl w-full max-w-[1280px] max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-[#EEEEEE] shrink-0">
            <div className="flex items-center gap-4">
              {step === 'review' && (
                <button onClick={() => setStep('upload')} className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center hover:bg-[#F8F9FB] text-[#7C7C7C] transition-all">
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
                </div>
              </div>
            </div>
            <button onClick={handleClose} className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center hover:bg-[#F8F9FB] text-[#7C7C7C] hover:text-[#181725] transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-[#F8F9FB]">
            
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <div className="max-w-[620px] mx-auto space-y-6 py-6">
                <div className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm p-6 space-y-4">
                  <h3 className="text-[16px] font-bold text-[#181725]">1. Download template</h3>
                  <p className="text-[13px] text-[#7C7C7C] font-medium leading-relaxed">
                    Download the Excel template to prepare your catalog sheet. Fill in fields like Product Name, SKU, Category, and base prices.
                  </p>
                  <button onClick={downloadTemplate} className="h-[44px] px-6 bg-white border border-[#EEEEEE] hover:bg-[#F8F9FB] rounded-[10px] text-[13px] font-bold text-[#181725] flex items-center gap-2 transition-all">
                    <Download size={15} /> Download template.xlsx
                  </button>
                </div>

                <div className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm p-6 space-y-4">
                  <h3 className="text-[16px] font-bold text-[#181725]">2. Upload file</h3>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={e => { e.preventDefault(); setIsDragOver(false); acceptFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-[12px] p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px]',
                      isDragOver ? 'border-[#299E60] bg-[#EEF8F1]/40' : 'border-[#EEEEEE] hover:border-[#299E60]/50 hover:bg-[#EEF8F1]/10',
                    )}
                  >
                    <Upload size={32} className="text-[#AEAEAE] mb-3" />
                    {file ? (
                      <div>
                        <p className="text-[14px] font-bold text-[#181725]">{file.name}</p>
                        <p className="text-[12px] text-[#AEAEAE] mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[14px] font-bold text-[#181725]">Drop Excel/CSV here or click to browse</p>
                        <p className="text-[11px] text-[#AEAEAE] mt-1">Accepts .xlsx or .csv files</p>
                      </div>
                    )}
                    <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.csv" onChange={e => e.target.files?.[0] && acceptFile(e.target.files[0])} />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={handleClose} className="h-[44px] px-6 text-[13px] font-bold text-[#7C7C7C] hover:text-[#181725] transition-colors">Cancel</button>
                  <button onClick={handlePreview} disabled={!file || parsing} className="h-[44px] px-8 bg-[#299E60] hover:bg-[#238a54] disabled:bg-[#DCDCDC] text-white rounded-[12px] text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:cursor-not-allowed">
                    {parsing ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                    {parsing ? 'Parsing file...' : 'Next'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 'review' && preview && (
              <div className="flex flex-col h-full min-h-0 space-y-4">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-4 bg-white border border-[#EEEEEE] rounded-[14px] shadow-sm">
                  <div className="flex items-center gap-6">
                    <p className="text-[13px] text-[#7C7C7C] font-semibold">Total: <strong className="text-[#181725]">{preview.totalRows}</strong></p>
                    <p className="text-[13px] text-emerald-600 font-semibold">Create: <strong>{preview.creates}</strong></p>
                    <p className="text-[13px] text-blue-600 font-semibold">Update: <strong>{preview.updates}</strong></p>
                    {skipRows.size > 0 && <p className="text-[13px] text-amber-600 font-semibold">Skip: <strong>{skipRows.size}</strong></p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewMode(v => v === 'list' ? 'detail' : 'list')} className="h-[36px] px-4 rounded-[8px] bg-[#F8F9FB] border border-[#EEEEEE] text-[12px] font-bold hover:bg-[#EEEEEE] transition-all flex items-center gap-1.5 text-[#181725]">
                      <Eye size={13} /> {viewMode === 'list' ? 'Switch to detail review' : 'Switch to spreadsheet list'}
                    </button>
                  </div>
                </div>

                {/* Errors strip */}
                {preview.errors.length > 0 && (
                  <div className="p-4 bg-[#FFF0F0] border border-[#E74C3C]/20 rounded-[14px] text-[13px] font-semibold text-[#E74C3C] space-y-1">
                    <p className="flex items-center gap-2"><AlertTriangle size={15} /> Formatting errors found. Skip rules will apply:</p>
                    <ul className="list-disc pl-5 font-normal text-[#181725] text-[12.5px] max-h-[100px] overflow-y-auto space-y-0.5">
                      {preview.errors.map((err, i) => (
                        <li key={i}>Row {err.row}: {err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                  <div className="flex-1 bg-white rounded-[16px] border border-[#EEEEEE] overflow-hidden flex flex-col min-h-0 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                          <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE] text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">
                            <th className="px-6 py-4 w-[60px]">Row</th>
                            <th className="px-6 py-4 w-[100px]">Action</th>
                            <th className="px-6 py-4 w-[280px]">Product Name</th>
                            <th className="px-6 py-4 w-[160px]">SKU</th>
                            <th className="px-6 py-4 w-[160px]">Category</th>
                            <th className="px-6 py-4 w-[120px]">Base Price</th>
                            <th className="px-6 py-4 w-[100px]">Tax %</th>
                            <th className="px-6 py-4 w-[120px]">Stock</th>
                            <th className="px-6 py-4 w-[80px]">Slabs</th>
                            <th className="px-6 py-4 w-[90px] text-right">Skip</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE] text-[13px] font-medium text-[#181725]">
                          {preview.items.map((item) => {
                            const skipped = skipRows.has(item.row);
                            const rowEdit = edits[item.row] ?? {};
                            const hasLocalEdits = Object.keys(rowEdit).length > 0;

                            const nameVal = rowEdit.name !== undefined ? rowEdit.name : item.name;
                            const skuVal = rowEdit.sku !== undefined ? rowEdit.sku : (item.sku ?? '');
                            const catVal = rowEdit.category !== undefined ? rowEdit.category : (item.category ?? '');
                            const priceVal = rowEdit.basePrice !== undefined ? rowEdit.basePrice : item.basePrice;
                            const taxVal = rowEdit.taxPercent !== undefined ? rowEdit.taxPercent : item.taxPercent;
                            const stockVal = rowEdit.stock !== undefined ? rowEdit.stock : (item.stock ?? 0);

                            return (
                              <tr key={item.row} className={cn(
                                skipped && 'opacity-40 bg-[#FAFAFA]',
                                item.action === 'create' && !skipped && 'bg-emerald-50/20 hover:bg-emerald-50/40',
                                item.action === 'update' && !skipped && 'bg-blue-50/20 hover:bg-blue-50/40',
                                hasLocalEdits && !skipped && 'bg-amber-50/30',
                              )}>
                                <td className="px-6 py-4 font-bold text-[#AEAEAE]">{item.row}</td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider',
                                    item.action === 'create' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800',
                                  )}>
                                    {item.action === 'create' ? 'Create' : 'Update'}
                                  </span>
                                </td>
                                {/* Inline edits mapping cells */}
                                <td className="px-6 py-4 truncate">
                                  <input type="text" value={nameVal} onChange={e => setEdit(item.row, 'name', e.target.value)} className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#299E60] focus:bg-white px-1 py-0.5 rounded outline-none w-full" />
                                </td>
                                <td className="px-6 py-4 truncate">
                                  <input type="text" value={skuVal} onChange={e => setEdit(item.row, 'sku', e.target.value)} className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#299E60] focus:bg-white px-1 py-0.5 rounded outline-none w-full" />
                                </td>
                                <td className="px-6 py-4 truncate">
                                  <select value={catVal} onChange={e => setEdit(item.row, 'category', e.target.value || undefined)} className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#299E60] focus:bg-white px-1 py-0.5 rounded outline-none w-full appearance-none">
                                    <option value="">— Select Category —</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <input type="number" step="0.01" value={priceVal} onChange={e => setEdit(item.row, 'basePrice', parseFloat(e.target.value) || 0)} className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#299E60] focus:bg-white px-1 py-0.5 rounded outline-none w-[70px]" />
                                </td>
                                <td className="px-6 py-4">
                                  <input type="number" value={taxVal} onChange={e => setEdit(item.row, 'taxPercent', parseInt(e.target.value) || 0)} className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#299E60] focus:bg-white px-1 py-0.5 rounded outline-none w-[45px]" />
                                </td>
                                <td className="px-6 py-4">
                                  <input type="number" value={stockVal} onChange={e => setEdit(item.row, 'stock', parseInt(e.target.value) || 0)} className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#299E60] focus:bg-white px-1 py-0.5 rounded outline-none w-[55px]" />
                                </td>
                                <td className="px-6 py-4">
                                  {item.bulkSlabCount > 0 ? (
                                    <span className="text-[12px] bg-gray-100 px-2 py-0.5 rounded font-bold">{item.bulkSlabCount}</span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button onClick={() => toggleSkip(item.row)} className={cn(
                                    'w-[28px] h-[28px] rounded-lg flex items-center justify-center transition-colors',
                                    skipped ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-[#7C7C7C] hover:bg-amber-50 hover:text-amber-600',
                                  )}>
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Detail View */}
                {viewMode === 'detail' && currentItem && (
                  <div className="flex-1 bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm p-8 flex flex-col md:flex-row gap-8 min-h-0 overflow-y-auto">
                    {/* Left: Metadata Form */}
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center justify-between border-b border-[#F5F5F5] pb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] font-extrabold bg-[#F8F9FB] border border-[#EEEEEE] text-[#7C7C7C] w-[34px] h-[34px] rounded-full flex items-center justify-center">
                            {reviewIdx + 1} / {activeItems.length}
                          </span>
                          <h4 className="text-[18px] font-black text-[#181725]">{currentItem.name}</h4>
                        </div>
                        <span className={cn(
                          'px-2.5 py-1 rounded text-[11px] font-extrabold uppercase tracking-wide',
                          currentItem.action === 'create' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800',
                        )}>
                          {currentItem.action === 'create' ? 'Create new item' : 'Update existing'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FieldGroup label="Product Name">
                          <input type="text" value={edits[currentItem.row]?.name !== undefined ? edits[currentItem.row]!.name : currentItem.name} onChange={e => setEdit(currentItem.row, 'name', e.target.value)} className={inputCls} />
                        </FieldGroup>
                        <FieldGroup label="SKU">
                          <input type="text" value={edits[currentItem.row]?.sku !== undefined ? edits[currentItem.row]!.sku : (currentItem.sku ?? '')} onChange={e => setEdit(currentItem.row, 'sku', e.target.value)} className={inputCls} />
                        </FieldGroup>
                        <FieldGroup label="Category">
                          <select value={edits[currentItem.row]?.category !== undefined ? edits[currentItem.row]!.category : (currentItem.category ?? '')} onChange={e => setEdit(currentItem.row, 'category', e.target.value || undefined)} className={selectCls}>
                            <option value="">— Select category —</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </FieldGroup>
                        <div className="grid grid-cols-2 gap-3">
                          <FieldGroup label="Base Price">
                            <input type="number" step="0.01" value={edits[currentItem.row]?.basePrice !== undefined ? edits[currentItem.row]!.basePrice : currentItem.basePrice} onChange={e => setEdit(currentItem.row, 'basePrice', parseFloat(e.target.value) || 0)} className={inputCls} />
                          </FieldGroup>
                          <FieldGroup label="GST %">
                            <input type="number" value={edits[currentItem.row]?.taxPercent !== undefined ? edits[currentItem.row]!.taxPercent : currentItem.taxPercent} onChange={e => setEdit(currentItem.row, 'taxPercent', parseInt(e.target.value) || 0)} className={inputCls} />
                          </FieldGroup>
                        </div>
                      </div>

                      {/* Navigation controls */}
                      <div className="flex items-center gap-3 border-t border-[#F5F5F5] pt-6">
                        <button disabled={reviewIdx === 0} onClick={() => setReviewIdx(r => r - 1)} className="h-[40px] px-4 bg-[#F8F9FB] border border-[#EEEEEE] hover:bg-[#EEEEEE] disabled:opacity-40 rounded-[8px] text-[12px] font-bold text-[#181725] flex items-center gap-1.5">
                          <ChevronLeft size={14} /> Prev
                        </button>
                        <button disabled={reviewIdx === activeItems.length - 1} onClick={() => setReviewIdx(r => r + 1)} className="h-[40px] px-4 bg-[#F8F9FB] border border-[#EEEEEE] hover:bg-[#EEEEEE] disabled:opacity-40 rounded-[8px] text-[12px] font-bold text-[#181725] flex items-center gap-1.5 ml-auto">
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Right: Slabs preview and original diff */}
                    <div className="w-full md:w-[320px] bg-[#F8F9FB] rounded-[16px] border border-[#EEEEEE] p-6 space-y-6">
                      {/* Slabs list */}
                      <div>
                        <h5 className="text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-3">Pricing slabs</h5>
                        {currentItem.bulkSlabs && currentItem.bulkSlabs.length > 0 ? (
                          <div className="space-y-2">
                            {currentItem.bulkSlabs.map((slab, index) => (
                              <div key={index} className="bg-white border border-[#EEEEEE] rounded-[10px] p-3 flex justify-between items-center text-[12.5px]">
                                <span className="font-bold text-[#7C7C7C]">Qty &ge; {slab.minQty}</span>
                                <span className="font-black text-[#181725]">&euro; {slab.price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[12px] text-[#AEAEAE] italic">No bulk pricing slabs defined.</p>
                        )}
                      </div>

                      {/* Original diff comparison */}
                      {currentItem.existing && (
                        <div>
                          <h5 className="text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-3">Catalog comparison</h5>
                          <div className="bg-blue-50/40 border border-blue-100 rounded-[10px] p-4 text-[12.5px] space-y-2.5">
                            <p className="font-bold text-blue-800">Original Values:</p>
                            <div className="grid grid-cols-2 gap-2 text-[#7C7C7C]">
                              <span>Base price:</span>
                              <span className="font-bold text-[#181725]">&euro; {currentItem.existing.basePrice}</span>
                              <span>Tax Rate:</span>
                              <span className="font-bold text-[#181725]">{currentItem.existing.taxPercent}%</span>
                              <span>Stock:</span>
                              <span className="font-bold text-[#181725]">{currentItem.existing.stock}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button onClick={() => setStep('upload')} className="h-[44px] px-6 text-[13px] font-bold text-[#7C7C7C] hover:text-[#181725] transition-colors">Back</button>
                  <button onClick={handleCommit} disabled={committing || activeItems.length === 0} className="h-[44px] px-8 bg-[#299E60] hover:bg-[#238a54] disabled:bg-[#DCDCDC] text-white rounded-[12px] text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:cursor-not-allowed">
                    {committing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                    {committing ? 'Committing catalog...' : `Commit ${activeItems.length} products`}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Result */}
            {step === 'result' && result && (
              <div className="max-w-[560px] mx-auto py-8 text-center space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-[64px] h-[64px] rounded-full bg-[#EBFDF2] flex items-center justify-center text-[#299E60] border border-[#299E60]/10 shadow-sm">
                    <Check size={32} strokeWidth={3} />
                  </div>
                  <h3 className="text-[22px] font-black text-[#181725]">Catalog Import Complete</h3>
                  <p className="text-[13px] text-[#7C7C7C] font-semibold">
                    Successfully processed products and synchronized pricing tables.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-white border border-[#EEEEEE] rounded-[16px] p-6 shadow-sm">
                  <div className="text-center border-r border-[#EEEEEE]">
                    <p className="text-[32px] font-black text-[#299E60]">{result.created}</p>
                    <p className="text-[12px] font-bold text-[#AEAEAE] uppercase tracking-wider mt-1">Created new</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[32px] font-black text-[#3B82F6]">{result.updated}</p>
                    <p className="text-[12px] font-bold text-[#AEAEAE] uppercase tracking-wider mt-1">Updated existing</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="bg-[#FFF0F0] border border-[#E74C3C]/20 rounded-[16px] p-5 text-left text-[13px] font-semibold text-[#E74C3C] space-y-2">
                    <p className="flex items-center gap-2"><AlertTriangle size={16} /> Fails during processing:</p>
                    <ul className="list-disc pl-5 font-normal text-[#181725] text-[12.5px] max-h-[140px] overflow-y-auto space-y-1">
                      {result.errors.map((err, i) => (
                        <li key={i}>Row {err.row}: {err.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Undo / Logs block */}
                {backupData && !undone && (
                  <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[13px] font-bold text-[#181725]">Undo this import?</p>
                        <p className="text-[11.5px] text-[#AEAEAE] font-medium mt-0.5">Restore the pre-import state for all updated items.</p>
                      </div>
                      <button onClick={handleUndo} disabled={undoing} className="h-[36px] px-4 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-800 rounded-[8px] text-[12px] font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-amber-700/5">
                        {undoing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        Undo Import
                      </button>
                    </div>
                  </div>
                )}

                {undone && (
                  <div className="p-4 bg-amber-50 border border-amber-200/40 text-amber-800 text-[13px] font-semibold rounded-[12px] shadow-sm flex items-center gap-2 justify-center">
                    <RotateCcw size={15} /> All pre-import product data has been successfully restored.
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 border-t border-[#EEEEEE] pt-6">
                  {backupData && (
                    <button onClick={downloadBackup} className="h-[44px] px-6 border border-[#EEEEEE] hover:bg-[#F8F9FB] rounded-[12px] text-[13px] font-bold text-[#181725] flex items-center gap-2 transition-all">
                      <Download size={14} /> Download backup.json
                    </button>
                  )}
                  <button onClick={handleClose} className="h-[44px] px-8 bg-[#181725] hover:bg-black text-white rounded-[12px] text-[13px] font-bold transition-all shadow-sm">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const selectCls = 'w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] font-medium outline-none focus:border-[#299E60]/40 focus:ring-2 focus:ring-[#299E60]/10 bg-[#FAFAFA] focus:bg-white transition-all';
const inputCls = selectCls;

function FieldGroup({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}
