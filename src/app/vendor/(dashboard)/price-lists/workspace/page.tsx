'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, Search, Loader2, Save, FunctionSquare, Check, X, Info,
  Lock, Unlock, Calendar, Clock, MessageSquare, Download, Upload,
  Users, ShieldAlert, FileText, Plus, AlertCircle, Trash2, History
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PriceListCol {
  id: string;
  name: string;
  discountPercent: number;
  assignments?: PriceListAssignment[];
}

interface PriceListItemData {
  price: number | null;
  isLocked: boolean;
  validFrom: string | null;
  validTo: string | null;
  note: string | null;
  scheduledPrice: number | null;
  scheduledFrom: string | null;
  scheduledTo: string | null;
  history: any[];
}

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  packSize: string | null;
  basePrice: number;
  taxPercent: number;
  cells: Record<string, PriceListItemData | null>;
}

interface PriceListAssignment {
  id: string;
  priceListId: string;
  type: 'customer' | 'outlet' | 'pincode' | 'area' | 'segment' | 'brand';
  userId?: string | null;
  businessAccountId?: string | null;
  outletId?: string | null;
  pincode?: string | null;
  area?: string | null;
  segment?: string | null;
}

interface CustomerTarget {
  userId: string;
  label: string;
  creditStatus: string | null;
  pincodes: string[];
  cities: string[];
  tags: string[];
}

interface OutletTarget {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  businessName: string;
}

const inr = (n: number | null | undefined) =>
  n == null || isNaN(Number(n)) ? '—' : '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const rawInr = (n: number | null | undefined) =>
  n == null || isNaN(Number(n)) ? '' : Number(n).toFixed(2);

// Fallback price shown (muted) when a cell has no explicit override.
function fallbackPrice(row: ProductRow, col: PriceListCol): number {
  if (col.discountPercent > 0) return Math.round(row.basePrice * (1 - col.discountPercent / 100) * 100) / 100;
  return row.basePrice;
}

// Effective value of a column for a row (dirty override if set, else fetched, else fallback).
function effective(row: ProductRow, col: PriceListCol, dirty: Record<string, Partial<PriceListItemData> | null>): number {
  const key = `${row.id}:${col.id}`;
  if (key in dirty) {
    const dVal = dirty[key];
    if (dVal === null) return fallbackPrice(row, col);
    if (dVal.price !== undefined && dVal.price !== null) return dVal.price;
  }
  const cell = row.cells[col.id];
  return cell && cell.price != null ? cell.price : fallbackPrice(row, col);
}

export default function PricelistWorkspacePage() {
  const [cols, setCols] = useState<PriceListCol[]>([]);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'matrix' | 'assignment'>('matrix');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // Targets for Assignment Matrix
  const [targets, setTargets] = useState<{
    customers: CustomerTarget[];
    outlets: OutletTarget[];
    pincodes: string[];
    cities: string[];
    states: string[];
    segments: string[];
    creditStatuses: string[];
  } | null>(null);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [targetFilterType, setTargetFilterType] = useState<string>('all');

  // Matrix edit state
  // Keyed `${rowId}:${listId}` -> updated fields. If value is null, represents deleting override cell.
  const [dirty, setDirty] = useState<Record<string, Partial<PriceListItemData> | null>>({});
  const [saving, setSaving] = useState(false);

  // Keyboard Navigation / Active Cell / Inline Edit
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [editVal, setEditVal] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  // Dialog states
  const [formulaCol, setFormulaCol] = useState<string | null>(null);
  const [formulaText, setFormulaText] = useState('');
  const [quickEditCell, setQuickEditCell] = useState<{ r: number; c: number } | null>(null);
  const [importingList, setImportingList] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ sku: string; name: string; currentPrice: number; newPrice: number }[] | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customer Profile Preview Quick View modal
  const [previewCustomer, setPreviewCustomer] = useState<CustomerTarget | null>(null);

  // Conflict Preview Popup Modal
  const [conflictModal, setConflictModal] = useState<{
    priceListId: string;
    targetType: 'customer' | 'pincode' | 'area' | 'segment';
    targetValue: string;
    affectedCount: number;
    conflicts: { customerName: string; existingPricelist: string }[];
    checked: boolean;
  } | null>(null);

  // Apply search debouncing
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load Main Products Matrix
  const loadWorkspace = useCallback(async (reset: boolean, cursor?: string | null) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const qs = new URLSearchParams();
      if (debounced) qs.set('search', debounced);
      if (cursor) qs.set('cursor', cursor);
      qs.set('limit', '50');

      const res = await fetch(`/api/v1/vendor/price-lists/workspace?${qs}`);
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || 'Failed to load workspace data');
        return;
      }
      
      setCols(json.data.priceLists);
      setRows(prev => reset ? json.data.products : [...prev, ...json.data.products]);
      setNextCursor(json.data.pagination.nextCursor);
    } catch {
      toast.error('Failed to load workspace');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debounced]);

  // Load Assignments Data (Targets and Pricelists assignments)
  const loadAssignmentsData = useCallback(async () => {
    setLoadingTargets(true);
    try {
      const [targetsRes, listsRes] = await Promise.all([
        fetch('/api/v1/vendor/pricing-targets'),
        fetch('/api/v1/vendor/price-lists')
      ]);
      const targetsJson = await targetsRes.json();
      const listsJson = await listsRes.json();
      
      if (targetsJson.success) setTargets(targetsJson.data);
      if (listsJson.success) setCols(listsJson.data);
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoadingTargets(false);
    }
  }, []);

  // Initial load and reload on search/filter update
  useEffect(() => {
    loadWorkspace(true);
  }, [loadWorkspace]);

  useEffect(() => {
    if (activeTab === 'assignment') {
      loadAssignmentsData();
    }
  }, [activeTab, loadAssignmentsData]);

  useEffect(() => {
    if (editing) {
      setTimeout(() => editRef.current?.select(), 0);
    }
  }, [editing]);

  // Count unsaved changes
  const dirtyCount = Object.keys(dirty).length;

  const setCellFields = (rowId: string, listId: string, fields: Partial<PriceListItemData> | null) => {
    const cellKey = `${rowId}:${listId}`;
    setDirty(prev => {
      if (fields === null) {
        return { ...prev, [cellKey]: null };
      }
      const existing = prev[cellKey];
      return {
        ...prev,
        [cellKey]: {
          ...(existing !== null ? existing : {}),
          ...fields,
        }
      };
    });
  };

  const commitEdit = (r: number, c: number) => {
    const row = rows[r];
    const col = cols[c];
    if (!row || !col) { setEditing(null); return; }

    const trimmed = editVal.trim();
    if (trimmed === '') {
      setCellFields(row.id, col.id, null);
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num >= 0) {
        setCellFields(row.id, col.id, { price: Math.round(num * 100) / 100 });
      }
    }
    setEditing(null);
  };

  const startEdit = (r: number, c: number) => {
    const row = rows[r];
    const col = cols[c];
    if (!row || !col) return;
    
    // Skip if cell is locked
    const cellData = row.cells[col.id];
    const currentDirty = dirty[`${row.id}:${col.id}`];
    
    // Check if currently locked
    const isLocked = currentDirty?.isLocked !== undefined 
      ? currentDirty.isLocked 
      : (cellData?.isLocked || false);

    if (isLocked) {
      toast.warning('This price is locked and cannot be edited until unlocked.');
      return;
    }

    const curPrice = currentDirty !== undefined
      ? (currentDirty === null ? null : currentDirty.price)
      : (cellData ? cellData.price : null);

    setEditVal(curPrice != null ? String(curPrice) : '');
    setEditing({ r, c });
    setActive({ r, c });
  };

  // Grid Keyboard Navigation
  const onGridKeyDown = (e: React.KeyboardEvent) => {
    if (!active || editing) return;
    const { r, c } = active;

    if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      setActive({ r, c: Math.min(cols.length - 1, c + 1) });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActive({ r, c: Math.max(0, c - 1) });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive({ r: Math.min(rows.length - 1, r + 1), c });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive({ r: Math.max(0, r - 1), c });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startEdit(r, c);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const row = rows[r];
      const col = cols[c];
      if (row && col) {
        // Only if not locked
        const isLocked = row.cells[col.id]?.isLocked || false;
        if (isLocked) {
          toast.warning('Price is locked.');
          return;
        }
        setCellFields(row.id, col.id, null);
      }
    } else if (/^[0-9.]$/.test(e.key)) {
      startEdit(r, c);
      setEditVal(e.key);
    }
  };

  // Column Formulas (skips locked cells)
  const applyFormula = () => {
    if (!formulaCol) return;
    const m = formulaText.trim().replace(/\s+/g, '').match(/^=([A-Za-z0-9_]+)([+\-*])(\d+(?:\.\d+)?)(%?)$/i);
    if (!m) {
      toast.error('Formula syntax error! Use e.g. =BASE-3%, =BASE+5, =BASE*1.05, =COD-2%');
      return;
    }
    const [, srcRaw, op, numStr, pct] = m;
    const num = parseFloat(numStr);
    const src = srcRaw.toUpperCase();
    const srcCol = src === 'BASE' ? null : cols.find(c => c.name.toUpperCase().replace(/\s+/g, '') === src.replace(/\s+/g, ''));
    
    if (src !== 'BASE' && !srcCol) {
      toast.error(`Unknown price list column name "${srcRaw}"`);
      return;
    }

    const targetCol = cols.find(c => c.id === formulaCol)!;
    const next: Record<string, Partial<PriceListItemData> | null> = { ...dirty };
    let updateCount = 0;
    let lockedCount = 0;

    for (const row of rows) {
      const cellData = row.cells[targetCol.id];
      const currentDirty = dirty[`${row.id}:${targetCol.id}`];
      
      const isLocked = currentDirty?.isLocked !== undefined 
        ? currentDirty.isLocked 
        : (cellData?.isLocked || false);

      if (isLocked) {
        lockedCount++;
        continue;
      }

      const baseVal = srcCol ? effective(row, srcCol, dirty) : row.basePrice;
      let out = baseVal;
      if (op === '+') out = pct ? baseVal * (1 + num / 100) : baseVal + num;
      else if (op === '-') out = pct ? baseVal * (1 - num / 100) : baseVal - num;
      else if (op === '*') out = baseVal * num;
      
      out = Math.round(out * 100) / 100;
      if (out > 0) {
        next[`${row.id}:${targetCol.id}`] = {
          ...(currentDirty !== null ? currentDirty : {}),
          price: out
        };
        updateCount++;
      }
    }

    setDirty(next);
    setFormulaCol(null);
    setFormulaText('');
    
    let msg = `Formula applied to ${updateCount} rows in "${targetCol.name}".`;
    if (lockedCount > 0) msg += ` Skipped ${lockedCount} locked items.`;
    toast.success(msg);
  };

  // Save changes to database
  const saveMatrix = async () => {
    const cells = Object.entries(dirty).map(([key, cellUpdates]) => {
      const [productId, priceListId] = key.split(':');
      if (cellUpdates === null) {
        return { productId, priceListId, customPrice: null };
      }
      return {
        productId,
        priceListId,
        customPrice: cellUpdates.price !== undefined ? cellUpdates.price : undefined,
        isLocked: cellUpdates.isLocked !== undefined ? cellUpdates.isLocked : undefined,
        validFrom: cellUpdates.validFrom,
        validTo: cellUpdates.validTo,
        note: cellUpdates.note,
        scheduledPrice: cellUpdates.scheduledPrice,
        scheduledFrom: cellUpdates.scheduledFrom,
        scheduledTo: cellUpdates.scheduledTo,
      };
    });

    if (cells.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/v1/vendor/price-lists/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || 'Failed to save changes');
        return;
      }
      
      // Update local state rows with saved database values
      setRows(prev => prev.map(row => {
        const nextCells = { ...row.cells };
        for (const [key, val] of Object.entries(dirty)) {
          const [pid, lid] = key.split(':');
          if (pid === row.id) {
            if (val === null) {
              nextCells[lid] = null;
            } else {
              const current = nextCells[lid] || {
                price: null,
                isLocked: false,
                validFrom: null,
                validTo: null,
                note: null,
                scheduledPrice: null,
                scheduledFrom: null,
                scheduledTo: null,
                history: []
              };
              nextCells[lid] = {
                ...current,
                ...val as PriceListItemData
              };
            }
          }
        }
        return { ...row, cells: nextCells };
      }));

      setDirty({});
      toast.success(`Pricing spreadsheet saved · ${json.data.upserted} items saved, ${json.data.cleared} reverted`);
    } catch {
      toast.error('Failed to save matrix updates');
    } finally {
      setSaving(false);
    }
  };

  // Download template CSV pre-populated with SKUs and Names
  const downloadTemplate = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'SKU,Product Name,Current Price,New Price\n';
    
    rows.forEach(r => {
      csvContent += `"${r.sku || ''}","${r.name.replace(/"/g, '""')}",${r.basePrice},\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Pricelist_Catalogue_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Catalogue template downloaded successfully');
  };

  // Parse CSV File Client Side
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      
      if (lines.length < 2) {
        toast.error('CSV template is empty or missing headers');
        return;
      }

      // Read headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const skuIdx = headers.indexOf('SKU');
      const nameIdx = headers.indexOf('Product Name');
      const newPriceIdx = headers.indexOf('New Price');

      if (skuIdx === -1 || newPriceIdx === -1) {
        toast.error('CSV headers must contain SKU and New Price');
        return;
      }

      const previews: typeof csvPreview = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Simple CSV cell splitter that handles quotes
        const line = lines[i];
        const cells: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let charIdx = 0; charIdx < line.length; charIdx++) {
          const char = line[charIdx];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        cells.push(cur.trim());

        const sku = cells[skuIdx]?.replace(/^"|"$/g, '') || '';
        const name = nameIdx !== -1 ? cells[nameIdx]?.replace(/^"|"$/g, '') : '';
        const newPriceRaw = cells[newPriceIdx]?.replace(/^"|"$/g, '');

        if (!sku) continue;

        const product = rows.find(r => r.sku === sku);
        if (!product) {
          errors.push(`Row ${i + 1}: SKU "${sku}" not found in catalogue`);
          continue;
        }

        if (newPriceRaw === '') continue; // Skip blanks

        const newPrice = parseFloat(newPriceRaw);
        if (isNaN(newPrice) || newPrice < 0) {
          errors.push(`Row ${i + 1}: Price "${newPriceRaw}" is invalid`);
          continue;
        }

        previews.push({
          sku,
          name: product.name,
          currentPrice: product.basePrice,
          newPrice: Math.round(newPrice * 100) / 100
        });
      }

      setCsvPreview(previews);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  };

  // Apply parsed CSV overrides to matrix dirty state
  const applyCSVImports = () => {
    if (!csvPreview || !importingList) return;
    
    const next = { ...dirty };
    let imported = 0;
    let locked = 0;

    csvPreview.forEach(item => {
      const product = rows.find(r => r.sku === item.sku);
      if (!product) return;

      const cellKey = `${product.id}:${importingList}`;
      const isLocked = product.cells[importingList]?.isLocked || false;

      if (isLocked) {
        locked++;
        return;
      }

      next[cellKey] = {
        ...(next[cellKey] !== null ? next[cellKey] : {}),
        price: item.newPrice
      };
      imported++;
    });

    setDirty(next);
    setCsvPreview(null);
    setImportingList(null);
    if (locked > 0) {
      toast.success(`Imported ${imported} prices. Skipped ${locked} locked items.`);
    } else {
      toast.success(`Imported ${imported} prices from spreadsheet.`);
    }
  };

  // Export current Matrix view as CSV
  const exportMatrixCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    // Headers
    const headers = ['Product Name', 'SKU', 'Base Price', ...cols.map(c => c.name)];
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

    rows.forEach(r => {
      const line = [
        r.name,
        r.sku || '',
        r.basePrice,
        ...cols.map(col => {
          const cell = r.cells[col.id];
          const dirtyVal = dirty[`${r.id}:${col.id}`];
          if (dirtyVal === null) return fallbackPrice(r, col);
          const price = dirtyVal?.price !== undefined ? dirtyVal.price : (cell ? cell.price : null);
          return price != null ? price : fallbackPrice(r, col);
        })
      ];
      csvContent += line.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Pricelist_Matrix_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Matrix exported as CSV');
  };

  // TAB 2: ASSIGNMENT MATRIX LOGIC
  
  // Format all target rows for display in assignment grid
  const getTargetRows = () => {
    if (!targets) return [];
    const rowsList: { id: string; name: string; type: 'customer' | 'pincode' | 'area' | 'segment'; value: string; displayType: string }[] = [];

    // Customers
    targets.customers.forEach(c => {
      rowsList.push({
        id: `customer:${c.userId}`,
        name: c.label,
        type: 'customer',
        value: c.userId,
        displayType: 'B2B Customer'
      });
    });

    // Pincodes
    targets.pincodes.forEach(p => {
      rowsList.push({
        id: `pincode:${p}`,
        name: `Pincode: ${p}`,
        type: 'pincode',
        value: p,
        displayType: 'Pincode Zone'
      });
    });

    // Cities
    targets.cities.forEach(city => {
      rowsList.push({
        id: `area:${city}`,
        name: `City: ${city}`,
        type: 'area',
        value: city,
        displayType: 'City Area'
      });
    });

    // Segments
    targets.segments.forEach(seg => {
      rowsList.push({
        id: `segment:${seg}`,
        name: `Segment: ${seg}`,
        type: 'segment',
        value: seg,
        displayType: 'Segment Group'
      });
    });

    // Credit statuses
    targets.creditStatuses.forEach(cs => {
      rowsList.push({
        id: `segment:credit:${cs}`,
        name: `Credit Status: ${cs.toUpperCase()}`,
        type: 'segment',
        value: `credit:${cs}`,
        displayType: 'Credit Status'
      });
    });

    // Filter by type and search query
    return rowsList.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(targetSearch.toLowerCase());
      if (targetFilterType === 'all') return matchesSearch;
      return r.type === targetFilterType && matchesSearch;
    });
  };

  // Check if a pricelist is assigned to a target row
  const isTargetAssigned = (target: any, priceList: PriceListCol) => {
    if (!priceList.assignments) return false;
    return priceList.assignments.some(a => {
      if (a.type !== target.type) return false;
      if (target.type === 'customer') return a.userId === target.value;
      if (target.type === 'pincode') return a.pincode === target.value;
      if (target.type === 'area') return a.area?.toLowerCase() === target.value.toLowerCase();
      if (target.type === 'segment') return a.segment?.toLowerCase() === target.value.toLowerCase();
      return false;
    });
  };

  // Toggle Target Checkbox & Trigger Conflict Checker
  const handleAssignmentToggle = async (target: any, col: PriceListCol) => {
    const isCurrentlyChecked = isTargetAssigned(target, col);

    if (isCurrentlyChecked) {
      // Uncheck is direct, no conflict to show. Unassign directly.
      await saveAssignments(col.id, target, 'unassign');
      return;
    }

    // Checking: Analyze Blast Radius & Conflict
    if (!targets) return;
    
    // Find all B2B customers affected by this assignment
    let affectedCustomers: CustomerTarget[] = [];
    if (target.type === 'customer') {
      const c = targets.customers.find(x => x.userId === target.value);
      if (c) affectedCustomers = [c];
    } else if (target.type === 'pincode') {
      affectedCustomers = targets.customers.filter(c => c.pincodes.includes(target.value));
    } else if (target.type === 'area') {
      affectedCustomers = targets.customers.filter(c => c.cities.some(city => city.toLowerCase() === target.value.toLowerCase()));
    } else if (target.type === 'segment') {
      affectedCustomers = targets.customers.filter(c => c.tags.some(t => t.toLowerCase() === target.value.toLowerCase()));
    }

    // Identify conflicts (customers in the affected list who already have an active pricelist assigned)
    const conflicts: { customerName: string; existingPricelist: string }[] = [];
    
    affectedCustomers.forEach(cust => {
      // Find all pricelists assigned to this customer directly or indirectly (except this column)
      cols.forEach(pl => {
        if (pl.id === col.id) return;
        const assigned = pl.assignments?.some(a => {
          if (a.type === 'customer' && a.userId === cust.userId) return true;
          if (a.type === 'pincode' && cust.pincodes.includes(a.pincode || '')) return true;
          if (a.type === 'area' && cust.cities.some(city => city.toLowerCase() === (a.area || '').toLowerCase())) return true;
          if (a.type === 'segment' && cust.tags.some(tag => tag.toLowerCase() === (a.segment || '').toLowerCase())) return true;
          return false;
        });

        if (assigned) {
          conflicts.push({
            customerName: cust.label,
            existingPricelist: pl.name
          });
        }
      });
    });

    if (conflicts.length > 0) {
      // Conflicts found! Show Conflict preview dialog
      setConflictModal({
        priceListId: col.id,
        targetType: target.type,
        targetValue: target.value,
        affectedCount: affectedCustomers.length,
        conflicts,
        checked: true
      });
    } else {
      // No conflict, assign directly
      await saveAssignments(col.id, target, 'assign');
    }
  };

  // Perform Assignment Action (replace conflicts, skip, or manual)
  const saveAssignments = async (
    priceListId: string, 
    target: any, 
    action: 'assign' | 'unassign' | 'replace' | 'skip'
  ) => {
    const list = cols.find(c => c.id === priceListId);
    if (!list) return;

    let nextAssignments = [...(list.assignments || [])];

    if (action === 'unassign') {
      nextAssignments = nextAssignments.filter(a => {
        if (a.type !== target.type) return true;
        if (target.type === 'customer') return a.userId !== target.value;
        if (target.type === 'pincode') return a.pincode !== target.value;
        if (target.type === 'area') return a.area?.toLowerCase() !== target.value.toLowerCase();
        if (target.type === 'segment') return a.segment?.toLowerCase() !== target.value.toLowerCase();
        return true;
      });
    } else if (action === 'assign') {
      const aShape: any = {
        type: target.type,
        userId: target.type === 'customer' ? target.value : null,
        pincode: target.type === 'pincode' ? target.value : null,
        area: target.type === 'area' ? target.value : null,
        segment: target.type === 'segment' ? target.value : null,
      };
      nextAssignments.push(aShape);
    } else if (action === 'replace') {
      // Assign the new target
      const aShape: any = {
        type: target.type,
        userId: target.type === 'customer' ? target.value : null,
        pincode: target.type === 'pincode' ? target.value : null,
        area: target.type === 'area' ? target.value : null,
        segment: target.type === 'segment' ? target.value : null,
      };
      nextAssignments.push(aShape);

      // Clean/remove direct conflicting assignments on other pricelists
      if (conflictModal) {
        // Go through other columns and remove any assignments matching conflicting customers
        const otherColsPromises = cols.map(async (c) => {
          if (c.id === priceListId) return;
          let changed = false;
          let filtered = [...(c.assignments || [])];

          conflictModal.conflicts.forEach(conf => {
            const customerObj = targets?.customers.find(cu => cu.label === conf.customerName);
            if (!customerObj) return;

            const beforeCount = filtered.length;
            filtered = filtered.filter(a => !(a.type === 'customer' && a.userId === customerObj.userId));
            if (filtered.length !== beforeCount) changed = true;
          });

          if (changed) {
            await fetch(`/api/v1/vendor/price-lists/${c.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assignments: filtered }),
            });
          }
        });
        await Promise.all(otherColsPromises);
      }
    } else if (action === 'skip') {
      // "Skip" means we apply the pincode/segment rule, but keep the customer direct pricelist.
      // Since direct customer pricing is higher priority in evaluations, we just keep their direct assignment as is
      // and add the pincode/group target safely.
      const aShape: any = {
        type: target.type,
        userId: target.type === 'customer' ? target.value : null,
        pincode: target.type === 'pincode' ? target.value : null,
        area: target.type === 'area' ? target.value : null,
        segment: target.type === 'segment' ? target.value : null,
      };
      nextAssignments.push(aShape);
    }

    try {
      const res = await fetch(`/api/v1/vendor/price-lists/${priceListId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: nextAssignments }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || 'Failed to update assignments');
        return;
      }
      
      toast.success('Pricelist target updated');
      setConflictModal(null);
      // Reload assignment targets matrices
      loadAssignmentsData();
    } catch {
      toast.error('Failed to update assignments');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/vendor/price-lists" className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-500 border border-gray-100 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-[24px] font-black text-[#181725] tracking-tight">Bulk Pricing Grid</h1>
            <p className="text-[12px] text-gray-400 font-medium mt-0.5">Advanced — set prices across all your lists at once. To edit a single list, open it from Price Lists.</p>
          </div>
        </div>

        {activeTab === 'matrix' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product / SKU"
                className="h-10 pl-9 pr-3 w-[250px] bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:bg-white focus:border-[#299E60] transition-all" />
            </div>

            <button onClick={exportMatrixCSV} className="h-10 px-4 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-colors">
              <Download size={14} /> Export CSV
            </button>

            <button onClick={saveMatrix} disabled={dirtyCount === 0 || saving}
              className="h-10 px-4 bg-[#299E60] hover:bg-[#238a53] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-[#299E60]/10">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
            </button>
          </div>
        )}
      </div>

      {/* WORKBOOK EXCEL TABS */}
      <div className="flex border-b border-gray-200 bg-gray-50 p-1.5 rounded-xl gap-2 w-max">
        <button onClick={() => setActiveTab('matrix')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-lg transition-all",
            activeTab === 'matrix' 
              ? "bg-white text-[#299E60] shadow-sm border border-gray-100" 
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}>
          <FileText size={15} /> Prices
        </button>
        <button onClick={() => setActiveTab('assignment')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-lg transition-all",
            activeTab === 'assignment' 
              ? "bg-white text-[#299E60] shadow-sm border border-gray-100" 
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}>
          <Users size={15} /> Who gets each list
        </button>
      </div>

      {/* TAB 1: PRICELIST MATRIX SHEET */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap text-[11px] text-gray-400 font-medium">
            <div className="flex items-center gap-2 bg-[#299E60]/5 text-[#299E60] px-3 py-2 rounded-lg border border-[#299E60]/10">
              <Info size={14} />
              <span>Click a cell and type to set a price. Arrows/Tab move around · Enter or double-click to edit · Backspace clears a price · then Save.</span>
            </div>
          </div>

          {cols.length === 0 && !loading ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
              <p className="text-[15px] font-bold text-[#181725] mb-1">No active price lists found</p>
              <p className="text-[13px] text-gray-400 mb-4">Create a price list first, then come here to override base catalog prices.</p>
              <Link href="/vendor/price-lists" className="inline-block px-5 py-2.5 bg-[#299E60] text-white rounded-xl text-[13px] font-bold">Manage Price Lists</Link>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-32"><Loader2 size={32} className="animate-spin text-[#299E60]" /></div>
          ) : (
            <div className="bg-white border border-[#EEEEEE] rounded-[16px] overflow-hidden shadow-sm">
              <div className="overflow-auto max-h-[600px]" onKeyDown={onGridKeyDown} tabIndex={0}>
                <table className="border-collapse text-[13px] w-full min-w-max">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-[#FAFAFA] text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider border-b border-gray-200">
                      <th className="px-4 py-3.5 text-left sticky left-0 bg-[#FAFAFA] z-30 min-w-[240px] border-r border-[#EEEEEE]">Product</th>
                      <th className="px-4 py-3.5 text-left sticky left-[240px] bg-[#FAFAFA] z-30 w-[140px] border-r border-[#EEEEEE]">SKU</th>
                      <th className="px-4 py-3.5 text-right sticky left-[380px] bg-[#FAFAFA] z-30 w-[120px] border-r-2 border-[#E2E2E2]">Base Price</th>
                      {cols.map(col => (
                        <th key={col.id} className="px-4 py-2.5 text-right w-[180px] border-b border-[#EEEEEE] whitespace-nowrap bg-[#FAFAFA]">
                          <div className="flex items-center justify-between gap-1 text-[12px] text-gray-800 font-bold">
                            <span className="truncate max-w-[90px]" title={col.name}>{col.name}</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setFormulaCol(col.id); setFormulaText('=BASE'); }} title="Column Formula"
                                className="text-gray-400 hover:text-[#299E60] transition-colors p-1 rounded hover:bg-gray-100">
                                <FunctionSquare size={14} />
                              </button>
                              <button onClick={() => setImportingList(col.id)} title="Import CSV data"
                                className="text-gray-400 hover:text-[#299E60] transition-colors p-1 rounded hover:bg-gray-100">
                                <Upload size={14} />
                              </button>
                            </div>
                          </div>
                          {col.discountPercent > 0 && <span className="block text-[10px] text-gray-400 font-normal lowercase">base -{col.discountPercent}%</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, r) => (
                      <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-left sticky left-0 bg-white z-10 border-b border-r border-[#F0F0F0] font-semibold text-[#181725] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="truncate max-w-[220px]" title={row.name}>{row.name}</div>
                          {(row.unit || row.packSize) && <div className="text-[10px] text-gray-400 font-normal">{[row.packSize, row.unit].filter(Boolean).join(' · ')}</div>}
                        </td>
                        <td className="px-4 py-3 text-left sticky left-[240px] bg-white z-10 border-b border-r border-[#F0F0F0] text-gray-500">{row.sku || '—'}</td>
                        <td className="px-4 py-3 text-right sticky left-[380px] bg-white z-10 border-b border-r-2 border-[#E2E2E2] font-bold text-[#181725]">{inr(row.basePrice)}</td>
                        
                        {cols.map((col, c) => {
                          const cellKey = `${row.id}:${col.id}`;
                          const isDirty = cellKey in dirty;
                          
                          // Resolve display values
                          const cellData = row.cells[col.id];
                          const dirtyData = dirty[cellKey];
                          
                          const override = dirtyData !== undefined
                            ? (dirtyData === null ? null : dirtyData.price)
                            : (cellData ? cellData.price : null);

                          const isLocked = dirtyData?.isLocked !== undefined
                            ? dirtyData.isLocked
                            : (cellData?.isLocked || false);

                          const validFrom = dirtyData?.validFrom !== undefined
                            ? dirtyData.validFrom
                            : (cellData?.validFrom || null);
                          const validTo = dirtyData?.validTo !== undefined
                            ? dirtyData.validTo
                            : (cellData?.validTo || null);
                          
                          const note = dirtyData?.note !== undefined
                            ? dirtyData.note
                            : (cellData?.note || null);

                          const scheduledPrice = dirtyData?.scheduledPrice !== undefined
                            ? dirtyData.scheduledPrice
                            : (cellData?.scheduledPrice || null);

                          const showVal = override != null ? rawInr(override) : '';
                          const fb = rawInr(fallbackPrice(row, col));
                          
                          const isActive = active?.r === r && active?.c === c;
                          const isEditing = editing?.r === r && editing?.c === c;
                          
                          const hasCustomValidity = validFrom || validTo;
                          const hasScheduledChange = scheduledPrice !== null;
                          const hasNote = note && note.trim().length > 0;

                          return (
                            <td key={col.id}
                              onClick={() => setActive({ r, c })}
                              onDoubleClick={() => startEdit(r, c)}
                              className={cn(
                                'px-3 py-2 text-right border-b border-[#F0F0F0] cursor-cell tabular-nums relative transition-all',
                                isActive && 'ring-2 ring-[#299E60] ring-inset bg-[#299E60]/5',
                                isDirty && (dirtyData === null ? 'bg-red-50/50 line-through' : 'bg-amber-50/70'),
                                isLocked && 'bg-gray-50/70'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1 w-full pl-2">
                                {/* Visual Indicators on Left of Price */}
                                <div className="flex items-center gap-0.5 text-gray-400 select-none scale-[0.85] origin-left">
                                  {isLocked && <Lock size={12} className="text-[#E63946]" title="Locked Price" />}
                                  {hasCustomValidity && <Calendar size={12} className="text-[#299E60]" title="Custom Validity Enabled" />}
                                  {hasScheduledChange && <Clock size={12} className="text-indigo-500" title="Scheduled Change Pending" />}
                                  {hasNote && <MessageSquare size={12} className="text-amber-500" title="Internal Notes Available" />}
                                </div>

                                {/* Price display */}
                                {isEditing ? (
                                  <input ref={editRef} value={editVal} autoFocus
                                    onChange={e => setEditVal(e.target.value.replace(/[^0-9.]/g, ''))}
                                    onBlur={() => commitEdit(r, c)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commitEdit(r, c);
                                        setActive({ r: Math.min(rows.length - 1, r + 1), c });
                                      } else if (e.key === 'Tab') {
                                        e.preventDefault();
                                        commitEdit(r, c);
                                        setActive({ r, c: Math.min(cols.length - 1, c + 1) });
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setEditing(null);
                                      }
                                    }}
                                    className="w-full text-right outline-none bg-white border border-[#299E60] rounded px-1 py-0.5 text-[13px]" />
                                ) : (
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <span className={cn(
                                      override != null ? 'text-[#181725] font-bold' : 'text-gray-300 font-medium'
                                    )}>
                                      {override != null ? showVal : fb}
                                    </span>
                                    {isActive && (
                                      <button onClick={(e) => { e.stopPropagation(); setQuickEditCell({ r, c }); }}
                                        className="p-1 rounded bg-white hover:bg-gray-100 text-gray-500 border border-gray-150 transition-colors">
                                        <Plus size={10} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {nextCursor && (
            <div className="flex justify-center mt-2">
              <button onClick={() => loadWorkspace(false, nextCursor)} disabled={loadingMore}
                className="px-5 py-2.5 bg-white border border-gray-250 rounded-xl text-[13px] font-bold text-gray-700 hover:border-[#299E60] hover:text-[#299E60] flex items-center gap-2 transition-all shadow-sm">
                {loadingMore ? <Loader2 size={14} className="animate-spin text-[#299E60]" /> : null}
                Load More Products
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRICELIST ASSIGNMENT MATRIX */}
      {activeTab === 'assignment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <select value={targetFilterType} onChange={e => setTargetFilterType(e.target.value)}
                className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#299E60]">
                <option value="all">All Targets</option>
                <option value="customer">B2B Customers</option>
                <option value="pincode">Pincodes</option>
                <option value="area">Cities/States</option>
                <option value="segment">Customer Segments</option>
              </select>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={targetSearch} onChange={e => setTargetSearch(e.target.value)} placeholder="Filter targets..."
                  className="h-10 pl-8 pr-3 w-[220px] bg-white border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#299E60]" />
              </div>
            </div>

            <div className="text-[12px] text-gray-500 font-medium">
              Tick a box to give that customer, area, or group this list&apos;s prices. A customer&apos;s own row always wins over a pincode or segment rule.
            </div>
          </div>

          {loadingTargets ? (
            <div className="flex items-center justify-center py-32"><Loader2 size={32} className="animate-spin text-[#299E60]" /></div>
          ) : (
            <div className="bg-white border border-[#EEEEEE] rounded-[16px] overflow-auto shadow-sm">
              <table className="border-collapse text-[13px] w-full min-w-max">
                <thead>
                  <tr className="bg-[#FAFAFA] text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider border-b border-gray-200">
                    <th className="px-5 py-3.5 text-left border-r border-[#EEEEEE]">Target Channel / Segment</th>
                    <th className="px-5 py-3.5 text-left w-[150px] border-r border-[#EEEEEE]">Type</th>
                    {cols.map(col => (
                      <th key={col.id} className="px-5 py-3.5 text-center w-[160px] border-b border-[#EEEEEE]">{col.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getTargetRows().map(target => (
                    <tr key={target.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-left font-semibold text-[#181725] border-b border-r border-[#F0F0F0]">
                        {target.type === 'customer' ? (
                          <button onClick={() => {
                            const cObj = targets?.customers.find(cu => cu.userId === target.value);
                            if (cObj) setPreviewCustomer(cObj);
                          }} className="text-[#299E60] hover:underline text-left">
                            {target.name}
                          </button>
                        ) : (
                          <span>{target.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-left border-b border-r border-[#F0F0F0]">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          target.type === 'customer' && "bg-blue-50 text-blue-600",
                          target.type === 'pincode' && "bg-purple-50 text-purple-600",
                          target.type === 'area' && "bg-orange-50 text-orange-600",
                          target.type === 'segment' && "bg-emerald-50 text-emerald-600"
                        )}>
                          {target.displayType}
                        </span>
                      </td>

                      {cols.map(col => {
                        const checked = isTargetAssigned(target, col);
                        return (
                          <td key={col.id} className="px-5 py-3.5 text-center border-b border-[#F0F0F0]">
                            <input type="checkbox" checked={checked}
                              onChange={() => handleAssignmentToggle(target, col)}
                              className="w-4 h-4 text-[#299E60] border-gray-300 rounded focus:ring-[#299E60] cursor-pointer" />
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {getTargetRows().length === 0 && (
                    <tr>
                      <td colSpan={cols.length + 2} className="px-5 py-10 text-center text-gray-400">
                        No targets match your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CELL QUICK EDIT OPTIONS DIALOG (MODAL) */}
      {quickEditCell && (() => {
        const row = rows[quickEditCell.r];
        const col = cols[quickEditCell.c];
        if (!row || !col) return null;
        
        const cellKey = `${row.id}:${col.id}`;
        const cellData = row.cells[col.id];
        const dirtyData = dirty[cellKey];

        const override = dirtyData !== undefined
          ? (dirtyData === null ? null : dirtyData.price)
          : (cellData ? cellData.price : null);

        const isLocked = dirtyData?.isLocked !== undefined
          ? dirtyData.isLocked
          : (cellData?.isLocked || false);

        const validFrom = dirtyData?.validFrom !== undefined
          ? (dirtyData?.validFrom ? dirtyData.validFrom.split('T')[0] : '')
          : (cellData?.validFrom ? cellData.validFrom.split('T')[0] : '');

        const validTo = dirtyData?.validTo !== undefined
          ? (dirtyData?.validTo ? dirtyData.validTo.split('T')[0] : '')
          : (cellData?.validTo ? cellData.validTo.split('T')[0] : '');

        const note = dirtyData?.note !== undefined
          ? dirtyData.note
          : (cellData?.note || '');

        const scheduledPrice = dirtyData?.scheduledPrice !== undefined
          ? dirtyData.scheduledPrice
          : (cellData?.scheduledPrice || '');

        const scheduledFrom = dirtyData?.scheduledFrom !== undefined
          ? (dirtyData?.scheduledFrom ? dirtyData.scheduledFrom.split('T')[0] : '')
          : (cellData?.scheduledFrom ? cellData.scheduledFrom.split('T')[0] : '');

        const scheduledTo = dirtyData?.scheduledTo !== undefined
          ? (dirtyData?.scheduledTo ? dirtyData.scheduledTo.split('T')[0] : '')
          : (cellData?.scheduledTo ? cellData.scheduledTo.split('T')[0] : '');

        const history = cellData?.history || [];

        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setQuickEditCell(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[540px] overflow-hidden" onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="bg-[#299E60] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[17px] font-black">{row.name}</h3>
                    <p className="text-[11px] text-white/80 mt-0.5">Pricelist: <span className="font-bold">{col.name}</span> · SKU: {row.sku || '—'}</p>
                  </div>
                  <button onClick={() => setQuickEditCell(null)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Contents */}
              <div className="p-6 space-y-5 max-h-[500px] overflow-auto text-[13px] text-gray-700">
                {/* 1. Edit Price */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Override Price (INR)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="any" min="0" placeholder={`Fallback: ${rawInr(fallbackPrice(row, col))}`}
                      value={override != null ? override : ''}
                      onChange={e => {
                        const val = e.target.value;
                        setCellFields(row.id, col.id, { price: val === '' ? null : parseFloat(val) });
                      }}
                      className="flex-1 h-10 px-3 border border-gray-200 rounded-xl outline-none focus:border-[#299E60]" />
                    
                    <button onClick={() => setCellFields(row.id, col.id, { price: null })}
                      className="h-10 px-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl flex items-center gap-1 transition-colors" title="Clear override, fall back to base price">
                      <Trash2 size={14} /> Clear
                    </button>
                  </div>
                </div>

                {/* 2. Lock price */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
                  <div>
                    <div className="font-bold text-[#181725] flex items-center gap-1.5">
                      {isLocked ? <Lock size={14} className="text-[#E63946]" /> : <Unlock size={14} className="text-gray-400" />}
                      Lock Price
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Locks this price against formula updates and bulk catalog templates overwrite.</p>
                  </div>
                  <input type="checkbox" checked={isLocked}
                    onChange={e => setCellFields(row.id, col.id, { isLocked: e.target.checked })}
                    className="w-4 h-4 text-[#299E60] border-gray-300 rounded focus:ring-[#299E60] cursor-pointer" />
                </div>

                {/* 3. Date validity */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Item Validity Window</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] text-gray-400 mb-1">Effective From</span>
                      <input type="date" value={validFrom}
                        onChange={e => setCellFields(row.id, col.id, { validFrom: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl outline-none focus:border-[#299E60]" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 mb-1">Effective To</span>
                      <input type="date" value={validTo}
                        onChange={e => setCellFields(row.id, col.id, { validTo: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="w-full h-10 px-3 border border-gray-200 rounded-xl outline-none focus:border-[#299E60]" />
                    </div>
                  </div>
                </div>

                {/* 4. Scheduled Price Changes */}
                <div className="p-4 border border-dashed border-indigo-150 rounded-xl bg-indigo-50/20 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                    <Clock size={14} /> Scheduled Future Revision
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[10px] text-gray-400 mb-1">Future Price</span>
                      <input type="number" step="any" placeholder="Price" value={scheduledPrice ?? ''}
                        onChange={e => setCellFields(row.id, col.id, { scheduledPrice: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-full h-9 px-2.5 border border-indigo-100 rounded-lg outline-none focus:border-indigo-500 bg-white" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 mb-1">Start Date</span>
                      <input type="date" value={scheduledFrom}
                        onChange={e => setCellFields(row.id, col.id, { scheduledFrom: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="w-full h-9 px-2.5 border border-indigo-100 rounded-lg outline-none focus:border-indigo-500 bg-white" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 mb-1">End Date</span>
                      <input type="date" value={scheduledTo}
                        onChange={e => setCellFields(row.id, col.id, { scheduledTo: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="w-full h-9 px-2.5 border border-indigo-100 rounded-lg outline-none focus:border-indigo-500 bg-white" />
                    </div>
                  </div>
                </div>

                {/* 5. Cell Note */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Internal Notes</label>
                  <textarea value={note ?? ''} placeholder="Add specific contract detail or reference note..."
                    onChange={e => setCellFields(row.id, col.id, { note: e.target.value })}
                    className="w-full h-16 p-3 border border-gray-200 rounded-xl outline-none focus:border-[#299E60] resize-none" />
                </div>

                {/* 6. Change log history */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <History size={12} /> Audit Log History
                  </label>
                  {history.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">No price change audits recorded.</p>
                  ) : (
                    <div className="border border-gray-150 rounded-xl bg-gray-50/50 max-h-[120px] overflow-auto divide-y divide-gray-150 text-[11px] font-medium text-gray-500">
                      {history.map((log: any, logIdx: number) => (
                        <div key={logIdx} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-gray-700">{log.action}</span>
                            <span className="text-gray-400 ml-1.5">by {log.user || 'Vendor'}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-700">
                              {log.oldPrice != null ? `₹${log.oldPrice} → ` : ''}₹{log.newPrice}
                            </div>
                            <div className="text-[9px] text-gray-400 mt-0.5">{new Date(log.date).toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => setQuickEditCell(null)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-150 text-gray-600 rounded-xl font-bold">
                  Close & Apply
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* CSV CATALOGUE IMPORT POPUP */}
      {importingList && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => { setImportingList(null); setCsvPreview(null); setCsvErrors([]); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[580px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#299E60] p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-[17px] font-black">Import Pricelist Spreadsheet</h3>
                <p className="text-[11px] text-white/80 mt-0.5">Upload a CSV file to override multiple prices in column: {cols.find(c => c.id === importingList)?.name}</p>
              </div>
              <button onClick={() => { setImportingList(null); setCsvPreview(null); setCsvErrors([]); }} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl text-[12px] text-gray-600">
                <div>
                  <p className="font-bold text-[#181725] mb-0.5">Need the pricing catalog sheet template?</p>
                  <p className="text-[11px] text-gray-400">Download a template containing current SKU catalog prices first.</p>
                </div>
                <button onClick={downloadTemplate} className="h-9 px-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#299E60] font-bold rounded-lg flex items-center gap-1.5 transition-colors">
                  <Download size={13} /> Download Template
                </button>
              </div>

              {!csvPreview ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#299E60] transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="font-bold text-[#181725] text-[13px] mb-1">Click to select CSV File</p>
                  <p className="text-[11px] text-gray-400">Select template file updated with new prices</p>
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[12px] font-bold text-gray-800">
                    <span>Preview Updates ({csvPreview.length} items mapped)</span>
                    <button onClick={() => { setCsvPreview(null); setCsvErrors([]); }} className="text-red-500 hover:underline">Clear Upload</button>
                  </div>

                  <div className="border border-gray-150 rounded-xl overflow-hidden max-h-[220px] overflow-auto divide-y divide-gray-100 text-[12px] font-medium text-gray-500">
                    {csvPreview.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between bg-amber-50/10">
                        <div>
                          <div className="font-bold text-gray-800">{item.name}</div>
                          <div className="text-[10px] text-gray-400">SKU: {item.sku}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-400 line-through">₹{item.currentPrice}</span>
                          <span className="font-bold text-[#299E60] ml-2">₹{item.newPrice}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {csvErrors.length > 0 && (
                    <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-[11px] text-red-600 space-y-1">
                      <div className="font-bold flex items-center gap-1"><AlertCircle size={13} /> CSV Mapping Warnings:</div>
                      <div className="max-h-[80px] overflow-auto divide-y divide-red-100/30">
                        {csvErrors.map((err, idx) => (
                          <div key={idx} className="py-1">{err}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => { setImportingList(null); setCsvPreview(null); setCsvErrors([]); }}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl font-bold">
                Cancel
              </button>
              <button onClick={applyCSVImports} disabled={!csvPreview}
                className="px-5 py-2 bg-[#299E60] hover:bg-[#238a53] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors">
                <Check size={14} /> Import Overrides
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE QUICK PREVIEW VIEW */}
      {previewCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setPreviewCustomer(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden text-[13px] text-gray-700" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-50 p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[16px] font-black text-[#181725] flex items-center gap-2"><Users size={18} className="text-[#299E60]" /> Customer Quick Profile</h3>
              <button onClick={() => setPreviewCustomer(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Company / Customer Name</div>
                <div className="text-[16px] font-extrabold text-[#181725]">{previewCustomer.label}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Credit Limit Status</div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    previewCustomer.creditStatus === 'active' && "bg-emerald-50 text-emerald-600 border border-emerald-100",
                    previewCustomer.creditStatus === 'suspended' && "bg-red-50 text-red-600 border border-red-100",
                    !previewCustomer.creditStatus && "bg-gray-50 text-gray-400 border border-gray-100"
                  )}>
                    {previewCustomer.creditStatus || 'No Credit Line'}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Pincodes</div>
                  <div className="font-semibold text-gray-700">{previewCustomer.pincodes.join(', ') || 'N/A'}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Segment tags</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {previewCustomer.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">{t}</span>
                  ))}
                  {previewCustomer.tags.length === 0 && <span className="text-gray-400 italic text-[11px]">No tags assigned</span>}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Pricelists Assignments</div>
                <div className="mt-2 space-y-2 max-h-[140px] overflow-auto">
                  {cols.filter(col => {
                    return col.assignments?.some(a => {
                      if (a.type === 'customer' && a.userId === previewCustomer.userId) return true;
                      if (a.type === 'pincode' && previewCustomer.pincodes.includes(a.pincode || '')) return true;
                      if (a.type === 'area' && previewCustomer.cities.some(city => city.toLowerCase() === (a.area || '').toLowerCase())) return true;
                      if (a.type === 'segment' && previewCustomer.tags.some(tag => tag.toLowerCase() === (a.segment || '').toLowerCase())) return true;
                      return false;
                    });
                  }).map(col => (
                    <div key={col.id} className="p-2 border border-gray-100 bg-emerald-50/20 text-[#299E60] font-bold rounded-lg flex items-center justify-between text-[11px]">
                      <span>✓ {col.name}</span>
                      <span className="text-[9px] text-gray-400 font-normal">Active Contract</span>
                    </div>
                  ))}
                  {cols.filter(col => {
                    return col.assignments?.some(a => {
                      if (a.type === 'customer' && a.userId === previewCustomer.userId) return true;
                      if (a.type === 'pincode' && previewCustomer.pincodes.includes(a.pincode || '')) return true;
                      if (a.type === 'area' && previewCustomer.cities.some(city => city.toLowerCase() === (a.area || '').toLowerCase())) return true;
                      if (a.type === 'segment' && previewCustomer.tags.some(tag => tag.toLowerCase() === (a.segment || '').toLowerCase())) return true;
                      return false;
                    });
                  }).length === 0 && (
                    <div className="p-2 border border-dashed border-gray-200 text-gray-400 rounded-lg text-center text-[11px] italic">
                      No customer specific assignments. Base pricing applies.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setPreviewCustomer(null)} className="px-5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFLICT PREVIEW POPUP DIALOG */}
      {conflictModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setConflictModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden text-[13px] text-gray-700 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="bg-amber-500 p-5 text-white">
              <div className="flex items-center gap-2">
                <ShieldAlert size={22} />
                <h3 className="text-[17px] font-black">Pricelist Assignment Conflict</h3>
              </div>
              <p className="text-[11px] text-white/95 mt-1">
                Assigning target will affect <span className="font-bold">{conflictModal.affectedCount} customers</span>.
                Overlap conflicts were found.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="font-bold text-[#181725] mb-2 flex items-center gap-1.5 text-[12px] uppercase text-gray-400 tracking-wider">
                  Conflicts Found ({conflictModal.conflicts.length})
                </p>
                <div className="border border-gray-150 rounded-xl overflow-hidden max-h-[160px] overflow-auto divide-y divide-gray-150 text-[12px] font-semibold text-gray-600 bg-gray-50/50">
                  {conflictModal.conflicts.map((conf, index) => (
                    <div key={index} className="p-2.5 flex items-center justify-between">
                      <span className="text-gray-800">{conf.customerName}</span>
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold border border-amber-100">
                        Has: {conf.existingPricelist}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment conflict options */}
              <div className="space-y-2">
                <p className="font-bold text-gray-400 text-[10px] uppercase tracking-wider">Select Conflict Resolution Option</p>
                
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                  <input type="radio" name="conflictOption" defaultChecked
                    onChange={() => setConflictModal(prev => prev ? { ...prev, checked: true } : null)}
                    className="mt-0.5 text-[#299E60] focus:ring-[#299E60]" />
                  <div>
                    <span className="block font-bold text-gray-800">Skip Conflicting Customers</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">Keep their existing pricelist rules. Affected customers without overrides will still get assigned.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                  <input type="radio" name="conflictOption"
                    onChange={() => setConflictModal(prev => prev ? { ...prev, checked: false } : null)}
                    className="mt-0.5 text-[#299E60] focus:ring-[#299E60]" />
                  <div>
                    <span className="block font-bold text-gray-800">Replace Existing Assignments</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">Remove conflicting direct custom configurations so that they fall back to this new target.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setConflictModal(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl font-bold">
                Cancel
              </button>
              <button onClick={() => {
                const action = conflictModal.checked ? 'skip' : 'replace';
                const targetObj = getTargetRows().find(t => t.type === conflictModal.targetType && t.value === conflictModal.targetValue);
                if (targetObj) {
                  saveAssignments(conflictModal.priceListId, targetObj, action);
                }
              }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-sm">
                <Check size={14} /> Resolve & Save
              </button>
            </div>

          </div>
        </div>
      )}

      {/* COLUMN FORMULA DIALOG POPUP */}
      {formulaCol && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setFormulaCol(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] p-6 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-black text-[#181725] flex items-center gap-2"><FunctionSquare size={17} className="text-[#299E60]" /> Apply Column Formula</h3>
              <button onClick={() => setFormulaCol(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-3">
              Sets a price for every product shown, in the <strong className="text-gray-800">{cols.find(c => c.id === formulaCol)?.name}</strong> column.
              Start from <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-500 font-mono text-[11px]">BASE</code> (the catalog price) or another list&apos;s name.
              Locked prices are skipped.
            </p>
            <input value={formulaText} onChange={e => setFormulaText(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') applyFormula(); }}
              placeholder="=BASE-3%"
              className="w-full px-3 py-2.5 border border-gray-250 rounded-xl text-[14px] font-mono outline-none focus:border-[#299E60] mb-3" />
            
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['=BASE-3%', '=BASE+5%', '=BASE*1.05', '=BASE-2'].map(ex => (
                <button key={ex} onClick={() => setFormulaText(ex)} className="text-[11px] font-mono bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">{ex}</button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setFormulaCol(null)} className="px-4 py-2 text-[13px] font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
              <button onClick={applyFormula} className="px-4 py-2 bg-[#299E60] hover:bg-[#238a53] text-white rounded-xl text-[13px] font-bold flex items-center gap-1.5 shadow-sm"><Check size={14} /> Apply Formula</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
