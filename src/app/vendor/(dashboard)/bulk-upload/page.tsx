'use client';

/**
 * Vendor Bulk Upload — /vendor/bulk-upload
 * ----------------------------------------
 * CSV upload tool for bulk product creation.
 *
 * Flow:
 *  1. Download template CSV
 *  2. Drag-and-drop / browse CSV file
 *  3. Parse + validate rows, preview with error highlighting
 *  4. Upload valid rows sequentially via POST /api/v1/vendor/products
 *  5. Show result summary + downloadable error report
 */

import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import {
    Upload,
    Download,
    FileText,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    RotateCcw,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TEMPLATE_HEADERS = ['name', 'basePrice', 'unit', 'packSize', 'sku', 'taxPercent', 'description'];
const TEMPLATE_EXAMPLE_ROW = ['Fresh Tomatoes', '120', 'kg', '10kg bag', 'SKU-001', '5', 'Farm-fresh red tomatoes'];

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface RawRow {
    /** 1-based row number in the CSV (excluding header) */
    rowIndex: number;
    name: string;
    basePrice: string;
    unit: string;
    packSize: string;
    sku: string;
    taxPercent: string;
    description: string;
}

type ValidationError = string;

interface ParsedRow {
    rowIndex: number;
    raw: RawRow;
    errors: ValidationError[];
    // Validated / coerced values (only set when errors.length === 0)
    name?: string;
    basePrice?: number;
    unit?: string;
    packSize?: string;
    sku?: string;
    taxPercent?: number;
    description?: string;
}

type UploadStatus = 'idle' | 'parsing' | 'previewing' | 'uploading' | 'done';

interface UploadResult {
    rowIndex: number;
    name: string;
    success: boolean;
    error?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function parseCSV(raw: string): string[][] {
    const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    return lines.map((line) => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        cells.push(current.trim());
        return cells;
    });
}

function validateRows(dataRows: string[][]): ParsedRow[] {
    return dataRows
        .filter((row) => row.some((cell) => cell !== ''))
        .map((row, idx): ParsedRow => {
            const [name = '', basePrice = '', unit = '', packSize = '', sku = '', taxPercent = '', description = ''] = row;
            const raw: RawRow = { rowIndex: idx + 2, name, basePrice, unit, packSize, sku, taxPercent, description };
            const errors: ValidationError[] = [];

            // name — required
            if (!name.trim()) {
                errors.push('Name is required');
            }

            // basePrice — required, positive number
            const parsedPrice = parseFloat(basePrice);
            if (!basePrice.trim()) {
                errors.push('Base price is required');
            } else if (isNaN(parsedPrice) || parsedPrice <= 0) {
                errors.push(`Base price must be a positive number (got "${basePrice}")`);
            }

            // taxPercent — optional, 0-28
            let parsedTax: number | undefined;
            if (taxPercent.trim()) {
                parsedTax = parseFloat(taxPercent);
                if (isNaN(parsedTax) || parsedTax < 0 || parsedTax > 28) {
                    errors.push(`Tax percent must be a number between 0 and 28 (got "${taxPercent}")`);
                    parsedTax = undefined;
                }
            }

            if (errors.length > 0) {
                return { rowIndex: idx + 2, raw, errors };
            }

            return {
                rowIndex: idx + 2,
                raw,
                errors: [],
                name: name.trim(),
                basePrice: parsedPrice,
                unit: unit.trim() || undefined,
                packSize: packSize.trim() || undefined,
                sku: sku.trim() || undefined,
                taxPercent: parsedTax ?? 0,
                description: description.trim() || undefined,
            };
        });
}

function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
    const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function BulkUploadPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [status, setStatus] = useState<UploadStatus>('idle');
    const [isDragOver, setIsDragOver] = useState(false);
    const [fileName, setFileName] = useState<string>('');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showErrorRows, setShowErrorRows] = useState(true);

    const validRows = parsedRows.filter((r) => r.errors.length === 0);
    const invalidRows = parsedRows.filter((r) => r.errors.length > 0);

    /* ---- Template download ---- */
    const handleDownloadTemplate = () => {
        downloadCSV('horeca1-product-template.csv', TEMPLATE_HEADERS, [TEMPLATE_EXAMPLE_ROW]);
    };

    /* ---- File processing ---- */
    const processFile = useCallback((file: File) => {
        if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
            toast.error('Please upload a .csv file');
            return;
        }
        setFileName(file.name);
        setStatus('parsing');
        setParsedRows([]);
        setUploadResults([]);
        setUploadProgress(0);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const allRows = parseCSV(text);
            if (allRows.length < 2) {
                toast.error('CSV must have a header row and at least one data row');
                setStatus('idle');
                return;
            }
            // Skip header row (index 0)
            const dataRows = allRows.slice(1);
            const rows = validateRows(dataRows);
            setParsedRows(rows);
            setStatus('previewing');
        };
        reader.onerror = () => {
            toast.error('Failed to read file');
            setStatus('idle');
        };
        reader.readAsText(file, 'utf-8');
    }, []);

    /* ---- Drag & drop ---- */
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => setIsDragOver(false);

    const handleBrowse = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        // Reset input so re-selecting same file triggers onChange
        e.target.value = '';
    };

    /* ---- Upload ---- */
    const handleUpload = async () => {
        if (validRows.length === 0) return;
        setStatus('uploading');
        setUploadProgress(0);
        const results: UploadResult[] = [];

        for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            const name = row.name!;
            const payload = {
                name,
                slug: slugify(name),
                basePrice: row.basePrice!,
                unit: row.unit,
                packSize: row.packSize,
                sku: row.sku,
                taxPercent: row.taxPercent ?? 0,
                description: row.description,
            };

            try {
                const res = await fetch('/api/v1/vendor/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const json = (await res.json()) as { success: boolean; message?: string; error?: string };
                if (res.ok && json.success) {
                    results.push({ rowIndex: row.rowIndex, name, success: true });
                } else {
                    results.push({
                        rowIndex: row.rowIndex,
                        name,
                        success: false,
                        error: json.message ?? json.error ?? `HTTP ${res.status}`,
                    });
                }
            } catch (err) {
                results.push({
                    rowIndex: row.rowIndex,
                    name,
                    success: false,
                    error: err instanceof Error ? err.message : 'Network error',
                });
            }

            setUploadProgress(i + 1);
        }

        setUploadResults(results);
        setStatus('done');
    };

    /* ---- Error report download ---- */
    const handleDownloadErrorReport = () => {
        const failed = uploadResults.filter((r) => !r.success);
        if (failed.length === 0) return;
        const rows = failed.map((r) => [String(r.rowIndex), r.name, r.error ?? 'Unknown error']);
        downloadCSV('horeca1-upload-errors.csv', ['CSV Row', 'Product Name', 'Error'], rows);
    };

    /* ---- Reset ---- */
    const handleReset = () => {
        setStatus('idle');
        setFileName('');
        setParsedRows([]);
        setUploadResults([]);
        setUploadProgress(0);
    };

    /* ---------------------------------------------------------------- */
    /*  Derived upload summary                                           */
    /* ---------------------------------------------------------------- */
    const successCount = uploadResults.filter((r) => r.success).length;
    const failCount = uploadResults.filter((r) => !r.success).length;

    /* ---------------------------------------------------------------- */
    /*  Render                                                           */
    /* ---------------------------------------------------------------- */
    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[clamp(1.25rem,2vw+0.5rem,1.75rem)] font-bold text-[#181725]">
                        Bulk Product Upload
                    </h1>
                    <p className="text-[13px] text-[#7C7C7C] mt-1">
                        Upload multiple products at once using a CSV file.
                    </p>
                </div>
                <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-[#EEEEEE] bg-white text-[13px] font-bold text-[#181725] hover:bg-[#F8F9FB] transition-colors"
                >
                    <Download size={15} />
                    Download Template
                </button>
            </div>

            {/* Upload zone — only shown when idle or done */}
            {(status === 'idle' || status === 'done') && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        'bg-white rounded-[14px] border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 py-14 px-8',
                        isDragOver
                            ? 'border-[#299E60] bg-[#F0FAF4]'
                            : 'border-[#EEEEEE] hover:border-[#299E60]/50 hover:bg-[#FAFFFE]'
                    )}
                >
                    <div className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
                        isDragOver ? 'bg-[#E8F7EF]' : 'bg-[#F5F5F5]'
                    )}>
                        <Upload size={26} className={isDragOver ? 'text-[#299E60]' : 'text-[#AEAEAE]'} />
                    </div>
                    <div className="text-center">
                        <p className="text-[14px] font-bold text-[#181725]">
                            {isDragOver ? 'Drop your CSV here' : 'Drag & drop your CSV file'}
                        </p>
                        <p className="text-[12px] text-[#7C7C7C] mt-1">
                            or{' '}
                            <span className="text-[#299E60] font-semibold underline underline-offset-2">
                                browse
                            </span>{' '}
                            to select a file
                        </p>
                        <p className="text-[11px] text-[#AEAEAE] mt-2">
                            Accepts .csv · Required columns: name, basePrice
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleBrowse}
                    />
                </div>
            )}

            {/* Parsing spinner */}
            {status === 'parsing' && (
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm flex items-center justify-center py-16 gap-3">
                    <Loader2 size={22} className="animate-spin text-[#299E60]" />
                    <span className="text-[14px] font-medium text-[#181725]">Parsing {fileName}…</span>
                </div>
            )}

            {/* Preview section */}
            {(status === 'previewing' || status === 'uploading') && parsedRows.length > 0 && (
                <div className="space-y-4">
                    {/* Summary bar */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-[#7C7C7C]" />
                            <span className="text-[13px] font-semibold text-[#181725]">{fileName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F7EF] rounded-[8px]">
                            <CheckCircle2 size={14} className="text-[#299E60]" />
                            <span className="text-[12px] font-bold text-[#299E60]">{validRows.length} valid</span>
                        </div>
                        {invalidRows.length > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FEF0EF] rounded-[8px]">
                                <XCircle size={14} className="text-[#E74C3C]" />
                                <span className="text-[12px] font-bold text-[#E74C3C]">{invalidRows.length} errors</span>
                            </div>
                        )}
                        <div className="ml-auto flex items-center gap-3">
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-[#EEEEEE] text-[12px] font-bold text-[#7C7C7C] hover:bg-[#F8F9FB] transition-colors"
                            >
                                <RotateCcw size={13} />
                                Change file
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={validRows.length === 0 || status === 'uploading'}
                                className={cn(
                                    'flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-bold text-white transition-colors',
                                    validRows.length === 0 || status === 'uploading'
                                        ? 'bg-[#AEAEAE] cursor-not-allowed'
                                        : 'bg-[#299E60] hover:bg-[#238a54]'
                                )}
                            >
                                {status === 'uploading' ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        Uploading {uploadProgress} / {validRows.length}…
                                    </>
                                ) : (
                                    <>
                                        <Upload size={15} />
                                        Upload {validRows.length} Product{validRows.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Upload progress bar */}
                    {status === 'uploading' && (
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[13px] font-semibold text-[#181725]">Uploading products…</span>
                                <span className="text-[12px] text-[#7C7C7C] font-medium">
                                    {uploadProgress} of {validRows.length}
                                </span>
                            </div>
                            <div className="w-full h-2.5 bg-[#EEEEEE] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#299E60] rounded-full transition-all duration-300"
                                    style={{ width: `${validRows.length > 0 ? (uploadProgress / validRows.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error rows */}
                    {invalidRows.length > 0 && (
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                            <button
                                onClick={() => setShowErrorRows((v) => !v)}
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAFA] transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-[#E74C3C]" />
                                    <span className="text-[13px] font-bold text-[#181725]">
                                        {invalidRows.length} row{invalidRows.length !== 1 ? 's' : ''} with errors — will be skipped
                                    </span>
                                </div>
                                {showErrorRows ? <ChevronUp size={16} className="text-[#7C7C7C]" /> : <ChevronDown size={16} className="text-[#7C7C7C]" />}
                            </button>
                            {showErrorRows && (
                                <div className="border-t border-[#EEEEEE] divide-y divide-[#EEEEEE]">
                                    {invalidRows.map((row) => (
                                        <div key={row.rowIndex} className="px-5 py-3 flex flex-wrap items-start gap-x-4 gap-y-1 bg-[#FFF8F8]">
                                            <span className="text-[11px] font-bold text-[#AEAEAE] w-14 shrink-0 pt-0.5">
                                                Row {row.rowIndex}
                                            </span>
                                            <span className="text-[13px] font-semibold text-[#181725] min-w-[120px]">
                                                {row.raw.name || <em className="text-[#AEAEAE] font-normal">empty name</em>}
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {row.errors.map((err, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[#FEE7E5] text-[11px] font-semibold text-[#E74C3C]"
                                                    >
                                                        <XCircle size={10} />
                                                        {err}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Valid rows preview table */}
                    {validRows.length > 0 && (
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-[#EEEEEE]">
                                <span className="text-[13px] font-bold text-[#181725]">
                                    Preview — {validRows.length} product{validRows.length !== 1 ? 's' : ''} ready to upload
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[12px]">
                                    <thead>
                                        <tr className="bg-[#F8F9FB] border-b border-[#EEEEEE]">
                                            <th className="text-left px-4 py-3 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">#</th>
                                            <th className="text-left px-4 py-3 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">Name</th>
                                            <th className="text-right px-4 py-3 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">Price (₹)</th>
                                            <th className="text-left px-4 py-3 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">Unit</th>
                                            <th className="text-left px-4 py-3 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">Pack Size</th>
                                            <th className="text-left px-4 py-3 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">SKU</th>
                                            <th className="text-right px-4 py-3 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">Tax %</th>
                                            <th className="text-left px-4 py-3 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#EEEEEE]">
                                        {validRows.map((row) => (
                                            <tr key={row.rowIndex} className="hover:bg-[#FAFAFA] transition-colors">
                                                <td className="px-4 py-3 text-[#AEAEAE] font-medium">{row.rowIndex}</td>
                                                <td className="px-4 py-3 font-semibold text-[#181725] max-w-[180px] truncate">{row.name}</td>
                                                <td className="px-4 py-3 text-right font-bold text-[#181725]">
                                                    {row.basePrice?.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-4 py-3 text-[#7C7C7C]">{row.unit || <span className="text-[#AEAEAE]">—</span>}</td>
                                                <td className="px-4 py-3 text-[#7C7C7C]">{row.packSize || <span className="text-[#AEAEAE]">—</span>}</td>
                                                <td className="px-4 py-3 text-[#7C7C7C]">{row.sku || <span className="text-[#AEAEAE]">—</span>}</td>
                                                <td className="px-4 py-3 text-right text-[#7C7C7C]">{row.taxPercent ?? 0}%</td>
                                                <td className="px-4 py-3 text-[#7C7C7C] max-w-[200px] truncate">
                                                    {row.description || <span className="text-[#AEAEAE]">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Done — results summary */}
            {status === 'done' && uploadResults.length > 0 && (
                <div className="space-y-4">
                    {/* Result cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#E8F7EF] flex items-center justify-center shrink-0">
                                <CheckCircle2 size={24} className="text-[#299E60]" />
                            </div>
                            <div>
                                <p className="text-[28px] font-extrabold text-[#181725] leading-none">{successCount}</p>
                                <p className="text-[13px] text-[#7C7C7C] mt-0.5">
                                    Product{successCount !== 1 ? 's' : ''} uploaded successfully
                                </p>
                            </div>
                        </div>
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6 flex items-center gap-4">
                            <div className={cn(
                                'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                                failCount > 0 ? 'bg-[#FEF0EF]' : 'bg-[#F5F5F5]'
                            )}>
                                <XCircle size={24} className={failCount > 0 ? 'text-[#E74C3C]' : 'text-[#AEAEAE]'} />
                            </div>
                            <div>
                                <p className="text-[28px] font-extrabold text-[#181725] leading-none">{failCount}</p>
                                <p className="text-[13px] text-[#7C7C7C] mt-0.5">
                                    Failed{failCount > 0 ? ' — download report below' : ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action row */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] border border-[#EEEEEE] bg-white text-[13px] font-bold text-[#181725] hover:bg-[#F8F9FB] transition-colors"
                        >
                            <RotateCcw size={14} />
                            Upload Another File
                        </button>
                        {failCount > 0 && (
                            <button
                                onClick={handleDownloadErrorReport}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#FEF0EF] text-[13px] font-bold text-[#E74C3C] hover:bg-[#FDDBD9] transition-colors"
                            >
                                <Download size={14} />
                                Download Error Report ({failCount} row{failCount !== 1 ? 's' : ''})
                            </button>
                        )}
                        <a
                            href="/vendor/products"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#299E60] text-[13px] font-bold text-white hover:bg-[#238a54] transition-colors"
                        >
                            View Products
                        </a>
                    </div>

                    {/* Detailed result table */}
                    {failCount > 0 && (
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-[#EEEEEE]">
                                <span className="text-[13px] font-bold text-[#181725]">Failed rows</span>
                            </div>
                            <div className="divide-y divide-[#EEEEEE]">
                                {uploadResults
                                    .filter((r) => !r.success)
                                    .map((r) => (
                                        <div key={r.rowIndex} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 bg-[#FFF8F8]">
                                            <span className="text-[11px] font-bold text-[#AEAEAE] w-14 shrink-0">
                                                Row {r.rowIndex}
                                            </span>
                                            <span className="text-[13px] font-semibold text-[#181725] min-w-[120px]">
                                                {r.name}
                                            </span>
                                            <span className="text-[12px] text-[#E74C3C] font-medium">{r.error}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Instructions card — always visible at bottom */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                <h3 className="text-[13px] font-bold text-[#181725] mb-3">CSV Format Guide</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="border-b border-[#EEEEEE]">
                                <th className="text-left pb-2 pr-6 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">Column</th>
                                <th className="text-left pb-2 pr-6 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">Required</th>
                                <th className="text-left pb-2 font-bold text-[#7C7C7C] uppercase tracking-wide text-[10px]">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {[
                                { col: 'name', req: true, note: 'Product display name (must be unique in your catalog)' },
                                { col: 'basePrice', req: true, note: 'Selling price — positive number (e.g. 120 or 120.50)' },
                                { col: 'unit', req: false, note: 'Unit of measure — kg, litre, piece, box, etc.' },
                                { col: 'packSize', req: false, note: 'Pack description — "10kg bag", "24-pack", etc.' },
                                { col: 'sku', req: false, note: 'Your internal SKU code' },
                                { col: 'taxPercent', req: false, note: 'GST rate: 0, 5, 12, 18, or 28 (defaults to 0)' },
                                { col: 'description', req: false, note: 'Short product description' },
                            ].map(({ col, req, note }) => (
                                <tr key={col}>
                                    <td className="py-2.5 pr-6 font-mono font-semibold text-[#181725]">{col}</td>
                                    <td className="py-2.5 pr-6">
                                        {req ? (
                                            <span className="px-2 py-0.5 rounded-[5px] bg-[#E8F7EF] text-[#299E60] font-bold text-[10px]">
                                                Required
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-[5px] bg-[#F5F5F5] text-[#AEAEAE] font-semibold text-[10px]">
                                                Optional
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2.5 text-[#7C7C7C]">{note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
