'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Search,
    Loader2,
    Plus,
    Upload,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    X,
    Package,
    CheckCircle,
    Clock,
    XCircle,
    AlertTriangle,
    FileSpreadsheet,
    FileDown,
    ImageIcon,
    Info,
    DollarSign,
    Tag,
    BoxIcon,
    Settings as SettingsIcon,
    BarChart3,
    Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ImageUpload, MultiImageUpload } from '@/components/ui/ImageUpload';
import ProductImportModal from '@/components/features/admin/ProductImportModal';
import AdminBulkEngine from '@/components/features/admin/AdminBulkEngine';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { CategoryMultiPickerById } from '@/components/features/brand/CategoryMultiPickerById';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    originalPrice: number | null;
    imageUrl: string | null;
    sku: string | null;
    hsn: string | null;
    brand: string | null;
    taxPercent: number;
    minOrderQty: number;
    creditEligible: boolean;
    description: string | null;
    isActive: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    approvalNote: string | null;
    createdAt: string;
    vendor: { id: string; businessName: string } | null;
    category: { id: string; name: string } | null;
    categoryLinks?: { categoryId: string; isPrimary: boolean; category: { id: string; name: string } }[];
    inventory: { qtyAvailable: number } | null;
    vendorCount?: number;
    isMasterRow?: boolean;
    vendors?: string[];
    vendorStock?: { vendor: string; qty: number }[];
    totalStock?: number;
    // Fields aligned with the vendor product form (admin API already returns these).
    packSize?: string | null;
    unit?: string | null;
    tags?: string[] | null;
    images?: string[] | null;
    barcode?: string | null;
}

interface Vendor {
    id: string;
    businessName: string;
}

interface Category {
    id: string;
    name: string;
    parentId?: string | null; // null = top-level, set = sub-category (rendered with leading "— ")
}

interface BrandOption {
    id: string;
    name: string;
}

interface SlabRow {
    minQty: string;
    maxQty: string;
    price: string;
}

interface ProductFormData {
    name: string;
    sku: string;
    hsn: string;
    barcode: string;
    brand: string;
    // Unified multi-category — first entry is the primary (mirrored into
    // Product.categoryId on the server). Matches the vendor product form so
    // both surfaces share CategoryMultiPickerById and behave identically.
    categoryIds: string[];
    description: string;
    basePrice: string;
    originalPrice: string;
    vendorId: string;
    taxPercent: string;
    unit: string;
    minOrderQty: string;
    creditEligible: boolean;
    imageUrl: string;
    priceSlabs: SlabRow[];
    // Aligned with the vendor product form. Backend API already accepts these.
    packSize: string;
    tags: string[];
    images: string[]; // additional images, NOT including imageUrl
    fssaiRef: string;
    aliasNames: string[];
    vegNonVeg: '' | 'veg' | 'nonveg' | 'egg';
    storageType: string;
    shelfLifeDays: string;
    countryOfOrigin: string;
    substituteIds: string[];
    isFeatured: boolean;
}

// Same enum-like constants used by vendor form. GST slabs are government-fixed,
// units are universal SI/business units — these are not "mock data".
const UNIT_OPTIONS = ['kg', 'g', 'ml', 'L', 'piece', 'pack', 'box', 'dozen', 'case', 'bag', 'bottle', 'can', 'carton', 'tray'];
const TAX_OPTIONS = ['0', '5', '12', '18', '28'];

function getPageRange(current: number, total: number): (number | 'gap')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'gap')[] = [1];
    if (current > 3) pages.push('gap');
    const lo = Math.max(2, current - 1);
    const hi = Math.min(total - 1, current + 1);
    for (let i = lo; i <= hi; i++) pages.push(i);
    if (current < total - 2) pages.push('gap');
    pages.push(total);
    return pages;
}

const EMPTY_FORM: ProductFormData = {
    name: '',
    sku: '',
    hsn: '',
    barcode: '',
    brand: '',
    categoryIds: [],
    description: '',
    basePrice: '',
    originalPrice: '',
    vendorId: '',
    taxPercent: '0',
    unit: 'piece',
    minOrderQty: '1',
    creditEligible: false,
    imageUrl: '',
    priceSlabs: [],
    packSize: '',
    tags: [],
    images: [],
    fssaiRef: '',
    aliasNames: [],
    vegNonVeg: '',
    storageType: '',
    shelfLifeDays: '',
    countryOfOrigin: '',
    substituteIds: [],
    isFeatured: false,
};

// ---------------------------------------------------------------------------
// Reusable small components (mirrors vendor product form for consistent UX)
// ---------------------------------------------------------------------------

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex items-center gap-2.5 mb-5 mt-1">
            <div className="w-[32px] h-[32px] rounded-[8px] bg-[#EEF8F1] flex items-center justify-center text-[#299E60]">
                {icon}
            </div>
            <h3 className="text-[16px] font-bold text-[#181725]">{title}</h3>
        </div>
    );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-[13px] font-bold text-[#181725] mb-1.5">
            {children}{required && <span className="text-[#E74C3C] ml-0.5">*</span>}
        </label>
    );
}

const inputCls = 'w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40 transition-colors bg-white';
const selectCls = 'w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40 transition-colors bg-white appearance-none';
const textareaCls = 'w-full border border-[#EEEEEE] rounded-[10px] px-4 py-3 text-[14px] outline-none focus:border-[#299E60]/40 transition-colors resize-none bg-white';
const cellInput = 'bg-transparent border border-transparent hover:border-[#D1D5DB] focus:border-[#299E60] focus:bg-white focus:ring-1 focus:ring-[#299E60]/20 px-1.5 py-1 rounded-[4px] outline-none w-full text-[12.5px] tabular-nums transition-colors';

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
    const [input, setInput] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
            e.preventDefault();
            const newTags = input
                .split(',')
                .map(t => t.trim())
                .filter(t => t && !tags.includes(t));
            if (newTags.length) onChange([...tags, ...newTags]);
            setInput('');
        }
    };

    const removeTag = (tag: string) => {
        onChange(tags.filter(t => t !== tag));
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF8F1] text-[#299E60] text-[12px] font-bold rounded-[8px]">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-[#E74C3C] transition-colors">
                            <X size={12} />
                        </button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputCls}
                placeholder="Type tags separated by commas, press Enter"
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Substitute Product Picker                                          */
/* ------------------------------------------------------------------ */

function SubstituteProductPicker({
    selectedIds,
    currentProductId,
    products,
    onChange,
}: {
    selectedIds: string[];
    currentProductId?: string;
    products: Product[];
    onChange: (ids: string[]) => void;
}) {
    const [query, setQuery] = useState('');

    const candidates = products.filter(p =>
        p.id !== currentProductId &&
        !selectedIds.includes(p.id) &&
        (query.length === 0 || p.name.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 6);

    const selected = products.filter(p => selectedIds.includes(p.id));

    const add = (id: string) => { onChange([...selectedIds, id]); setQuery(''); };
    const remove = (id: string) => onChange(selectedIds.filter(s => s !== id));

    return (
        <div className="space-y-2">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selected.map(p => (
                        <span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-[12px] font-bold rounded-[8px]">
                            {p.name}
                            <button type="button" onClick={() => remove(p.id)} className="hover:text-[#E74C3C]"><X size={12} /></button>
                        </span>
                    ))}
                </div>
            )}
            <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products to add as substitutes..."
                className={inputCls}
            />
            {query.length > 0 && candidates.length > 0 && (
                <div className="border border-[#EEEEEE] rounded-[10px] overflow-hidden bg-white">
                    {candidates.map(p => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => add(p.id)}
                            className="w-full text-left px-4 py-2 text-[13px] font-medium hover:bg-[#EEF8F1] transition-colors border-b border-[#EEEEEE] last:border-0"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const PAGE_LIMIT = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductsPage() {
    const perms = useAdminPermissions();
    const searchParams = useSearchParams();
    const editIdParam = searchParams.get('editId');
    const autoOpenedRef = useRef(false);
    // Data state
    const [products, setProducts] = useState<Product[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<BrandOption[]>([]);

    // Loading state
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loadingProduct, setLoadingProduct] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProductsCount, setTotalProductsCount] = useState(0);

    // Unsaved edits / Original reference
    const originalProductsRef = useRef<Product[]>([]);
    const [savingRows, setSavingRows] = useState<Record<string, Record<string, boolean>>>({});

    // Filters
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    // Vendor filter UI was dropped in the spreadsheet redesign; state kept for the query builder.
    const [filterVendor] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Panel / Modal state
    const [panelOpen, setPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'advanced'>('general');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Import modal
    const [importOpen, setImportOpen] = useState(false);
    const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);

    // Export dropdown
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Bulk Update Engine — row selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    const toggleSelectAll = (ids: string[], allSelected: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) ids.forEach(id => next.delete(id));
            else ids.forEach(id => next.add(id));
            return next;
        });
    };


    // -----------------------------------------------------------------------
    // Debounced search
    // -----------------------------------------------------------------------

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // -----------------------------------------------------------------------
    // Close export dropdown on outside click
    // -----------------------------------------------------------------------

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
                setExportOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // -----------------------------------------------------------------------
    // Fetch vendors & categories (once)
    // -----------------------------------------------------------------------

    useEffect(() => {
        fetch('/api/v1/admin/vendors')
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    const v = json.data?.vendors ?? json.data ?? [];
                    setVendors(Array.isArray(v) ? v : []);
                }
            })
            .catch(console.error);

        fetch('/api/v1/admin/categories')
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    const c = json.data?.categories ?? json.data ?? [];
                    setCategories(Array.isArray(c) ? c : []);
                }
            })
            .catch(console.error);

        fetch('/api/v1/brands?limit=100')
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    const b = json.data?.brands ?? json.data ?? [];
                    setBrands(Array.isArray(b) ? b.map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })) : []);
                }
            })
            .catch(console.error);
    }, []);

    // -----------------------------------------------------------------------
    // Fetch products
    // -----------------------------------------------------------------------

    const fetchProducts = useCallback(
        async (targetPage = 1) => {
            setLoading(true);

            try {
                const params = new URLSearchParams();
                params.set('limit', String(PAGE_LIMIT));
                params.set('page', String(targetPage));
                if (debouncedSearch) params.set('search', debouncedSearch);
                if (filterStatus) params.set('approvalStatus', filterStatus);
                if (filterCategory) params.set('categoryId', filterCategory);

                const res = await fetch(`/api/v1/admin/master-products?${params.toString()}`);
                const json = await res.json();

                if (json.success) {
                    const masters = json.data?.masterProducts ?? [];
                    const incoming: Product[] = masters.map((m: {
                        id: string;
                        name: string;
                        sku: string;
                        brand: string | null;
                        imageUrl: string | null;
                        approvalStatus: 'pending' | 'approved' | 'rejected';
                        isActive: boolean;
                        createdAt: string;
                        taxPercent: number | string;
                        uom: string | null;
                        category: { id: string; name: string } | null;
                        vendorCount: number;
                    }) => ({
                        id: m.id,
                        name: m.name,
                        slug: m.sku,
                        sku: m.sku,
                        brand: m.brand,
                        basePrice: 0,
                        originalPrice: null,
                        imageUrl: m.imageUrl,
                        hsn: null,
                        taxPercent: Number(m.taxPercent) || 0,
                        minOrderQty: 1,
                        creditEligible: false,
                        description: null,
                        isActive: m.isActive,
                        approvalStatus: m.approvalStatus,
                        approvalNote: null,
                        createdAt: m.createdAt,
                        vendor: null,
                        category: m.category,
                        inventory: null,
                        vendorCount: m.vendorCount,
                        unit: m.uom,
                        isMasterRow: true,
                    }));
                    setProducts(incoming);
                    originalProductsRef.current = JSON.parse(JSON.stringify(incoming));
                    
                    const pagination = json.data?.pagination;
                    if (pagination) {
                        setCurrentPage(pagination.page);
                        setTotalPages(pagination.totalPages);
                        setTotalProductsCount(pagination.total);
                    } else {
                        setCurrentPage(targetPage);
                        setTotalPages(1);
                        setTotalProductsCount(incoming.length);
                    }
                    if (json.data?.stats) setStats(json.data.stats);
                }
            } catch (err) {
                console.error('Failed to fetch products:', err);
            } finally {
                setLoading(false);
            }
        },
        [debouncedSearch, filterStatus, filterVendor, filterCategory],
    );

    // Refetch on filter change (reset to page 1)
    useEffect(() => {
        fetchProducts(1);
    }, [debouncedSearch, filterStatus, filterVendor, filterCategory, fetchProducts]);

    // -----------------------------------------------------------------------
    // Inline Cell Editing Handlers
    // -----------------------------------------------------------------------

    const handleCellChange = (productId: string, field: string, value: unknown) => {
        setProducts(prev => prev.map(p => {
            if (p.id !== productId) return p;
            if (field === 'category') {
                return { ...p, category: value } as Product;
            }
            return { ...p, [field]: value } as Product;
        }));
    };

    const handleInlineEdit = async (productId: string, field: string, value: unknown, originalValue: unknown) => {
        if (value === originalValue) return;

        if (field === 'name' && (!value || !String(value).trim())) {
            toast.error('Product name cannot be empty');
            handleCellChange(productId, 'name', originalValue);
            return;
        }
        if (field === 'basePrice' && (isNaN(Number(value)) || Number(value) <= 0)) {
            toast.error('Please enter a valid base price');
            handleCellChange(productId, 'basePrice', originalValue);
            return;
        }

        setSavingRows(prev => ({
            ...prev,
            [productId]: { ...(prev[productId] || {}), [field]: true }
        }));

        try {
            const row = products.find(p => p.id === productId);
            const isMaster = row?.isMasterRow;
            const baseUrl = isMaster
                ? `/api/v1/admin/master-products/${productId}`
                : `/api/v1/admin/products/${productId}`;
            let url = baseUrl;
            const method = 'PATCH';
            let bodyPayload: Record<string, unknown> = {};

            if (field === 'approvalStatus') {
                url = isMaster
                    ? `/api/v1/admin/master-products/${productId}/approval`
                    : `/api/v1/admin/products/${productId}/approval`;
                bodyPayload = {
                    action: value === 'approved' ? 'approve' : 'reject',
                    note: value === 'rejected' ? 'Rejected from list view' : undefined,
                };
            } else if (field === 'primaryCategoryId') {
                bodyPayload = isMaster
                    ? { categoryId: value }
                    : { primaryCategoryId: value, categoryIds: value ? [value] : [] };
            } else {
                bodyPayload = { [field]: value };
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
            });
            const json = await res.json();

            if (json.success) {
                toast.success('Product updated');
                const updatedProduct = json.data;
                setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updatedProduct } : p));
                originalProductsRef.current = originalProductsRef.current.map(p => 
                    p.id === productId ? { ...p, ...updatedProduct } : p
                );
            } else {
                toast.error(json.message || 'Failed to update product');
                if (field === 'primaryCategoryId') {
                    const origCat = originalProductsRef.current.find(p => p.id === productId)?.category;
                    handleCellChange(productId, 'category', origCat);
                } else {
                    handleCellChange(productId, field, originalValue);
                }
            }
        } catch (err) {
            console.error('Failed to update inline product:', err);
            toast.error('Network error. Failed to save product.');
            if (field === 'primaryCategoryId') {
                const origCat = originalProductsRef.current.find(p => p.id === productId)?.category;
                handleCellChange(productId, 'category', origCat);
            } else {
                handleCellChange(productId, field, originalValue);
            }
        } finally {
            setSavingRows(prev => {
                const next = { ...prev };
                if (next[productId]) {
                    delete next[productId][field];
                    if (Object.keys(next[productId]).length === 0) delete next[productId];
                }
                return next;
            });
        }
    };

    // -----------------------------------------------------------------------
    // Stats (from API — counts ALL products, not just loaded page)
    // -----------------------------------------------------------------------

    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

    const statCards = [
        { label: 'Total Products', value: stats.total, icon: Package, color: '#3B82F6', bgColor: '#EFF6FF' },
        { label: 'Approved', value: stats.approved, icon: CheckCircle, color: '#299E60', bgColor: '#EEF8F1' },
        { label: 'Pending', value: stats.pending, icon: Clock, color: '#F59E0B', bgColor: '#FFF7E6' },
        { label: 'Rejected', value: stats.rejected, icon: XCircle, color: '#E74C3C', bgColor: '#FFF0F0' },
    ];

    // -----------------------------------------------------------------------
    // CRUD: Toggle active
    // -----------------------------------------------------------------------

    const toggleActive = async (product: Product) => {
        setActionLoading(product.id);
        try {
            const url = product.isMasterRow
                ? `/api/v1/admin/master-products/${product.id}`
                : `/api/v1/admin/products/${product.id}`;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !product.isActive }),
            });
            const json = await res.json();
            if (json.success || res.ok) {
                setProducts(prev =>
                    prev.map(p => (p.id === product.id ? { ...p, isActive: !p.isActive } : p)),
                );
            }
        } catch (err) {
            console.error('Failed to toggle product:', err);
        } finally {
            setActionLoading(null);
        }
    };

    // -----------------------------------------------------------------------
    // CRUD: Delete
    // -----------------------------------------------------------------------

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const url = deleteTarget.isMasterRow
                ? `/api/v1/admin/master-products/${deleteTarget.id}`
                : `/api/v1/admin/products/${deleteTarget.id}`;
            const res = await fetch(url, { method: 'DELETE' });
            const json = await res.json();
            if (json.success || res.ok) {
                setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
                toast.success('Product deleted successfully');
            } else {
                throw new Error(json.error?.message || json.error || json.message || 'Delete failed');
            }
        } catch (err) {
            console.error('Failed to delete product:', err);
            toast.error(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const handleBulkDelete = async () => {
        setBulkDeleting(true);
        try {
            const idsArray = Array.from(selectedIds);
            const deletePromises = idsArray.map(async (id) => {
                const product = products.find(p => p.id === id);
                const url = product?.isMasterRow
                    ? `/api/v1/admin/master-products/${id}`
                    : `/api/v1/admin/products/${id}`;
                const res = await fetch(url, { method: 'DELETE' });
                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json.error?.message || json.error || json.message || 'Failed to delete');
                }
                return id;
            });

            const results = await Promise.allSettled(deletePromises);
            
            const succeededIds: string[] = [];
            const failedMessages: string[] = [];
            
            results.forEach((result, index) => {
                const id = idsArray[index];
                const product = products.find(p => p.id === id);
                const name = product?.name || id;
                if (result.status === 'fulfilled') {
                    succeededIds.push(id);
                } else {
                    const errorMsg = result.reason?.message || 'Unknown error';
                    failedMessages.push(`"${name}": ${errorMsg}`);
                }
            });

            if (succeededIds.length > 0) {
                setProducts(prev => prev.filter(p => !succeededIds.includes(p.id)));
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    succeededIds.forEach(id => next.delete(id));
                    return next;
                });
                toast.success(`Successfully deleted ${succeededIds.length} product(s)`);
            }

            if (failedMessages.length > 0) {
                toast.error(`Failed to delete ${failedMessages.length} product(s). ${failedMessages[0]}`);
                console.error('Bulk delete failures:', failedMessages);
            } else {
                setShowBulkDeleteModal(false);
            }
        } catch (err) {
            console.error('Bulk delete failed:', err);
            toast.error(err instanceof Error ? err.message : 'Bulk delete failed');
        } finally {
            setBulkDeleting(false);
        }
    };

    // -----------------------------------------------------------------------
    // Panel: open / close
    // -----------------------------------------------------------------------

    const openCreate = () => {
        setEditingProduct(null);
        setFormData(EMPTY_FORM);
        setFormErrors({});
        setActiveTab('general');
        setPanelOpen(true);
    };

    // Auto-open edit panel when ?editId=… is in the URL (e.g. from Approvals page)
    useEffect(() => {
        if (!editIdParam || autoOpenedRef.current || loading) return;
        const target = products.find(p => p.id === editIdParam);
        if (target) {
            autoOpenedRef.current = true;
            openEdit(target);
        }
    }, [editIdParam, loading, products]);

    const openEdit = async (product: Product) => {
        setEditingProduct(product);
        setPanelOpen(true);
        setLoadingProduct(true);
        setFormErrors({});
        setActiveTab('general');

        try {
            const isMaster = product.isMasterRow;
            const res = await fetch(
                isMaster ? `/api/v1/admin/master-products/${product.id}` : `/api/v1/admin/products/${product.id}`,
                { method: 'GET' },
            );
            const json = await res.json();
            const p = json.success ? json.data : product;

            if (isMaster) {
                setFormData({
                    ...EMPTY_FORM,
                    name: p.name || '',
                    sku: p.sku ?? '',
                    brand: p.brand ?? '',
                    categoryIds: p.category?.id ? [p.category.id] : [],
                    description: '',
                    imageUrl: p.imageUrl ?? '',
                    unit: p.uom ?? 'piece',
                    images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
                });
                return;
            }

            const primaryId = p.category?.id ?? '';
            const linkIds = Array.isArray(p.categoryLinks)
                ? (p.categoryLinks as Array<{ categoryId: string }>).map(l => l.categoryId)
                : [];
            const uniqueIds = primaryId
                ? [primaryId, ...linkIds.filter(id => id !== primaryId)]
                : linkIds;

            setFormData({
                name: p.name || '',
                sku: p.sku ?? '',
                hsn: p.hsn ?? '',
                barcode: p.barcode ?? '',
                brand: p.brand ?? '',
                categoryIds: uniqueIds,
                description: p.description ?? '',
                basePrice: p.basePrice != null ? String(p.basePrice) : '',
                originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
                vendorId: p.vendor?.id ?? '',
                taxPercent: p.taxPercent != null ? String(p.taxPercent) : '0',
                unit: p.unit ?? 'piece',
                minOrderQty: p.minOrderQty != null ? String(p.minOrderQty) : '1',
                creditEligible: !!p.creditEligible,
                imageUrl: p.imageUrl ?? '',
                packSize: p.packSize ?? '',
                tags: Array.isArray(p.tags) ? p.tags : [],
                images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
                fssaiRef: p.fssaiRef || '',
                aliasNames: Array.isArray(p.aliasNames) ? p.aliasNames : [],
                vegNonVeg: (p.vegNonVeg as '' | 'veg' | 'nonveg' | 'egg') || '',
                storageType: p.storageType || '',
                shelfLifeDays: p.shelfLifeDays != null ? String(p.shelfLifeDays) : '',
                countryOfOrigin: p.countryOfOrigin || '',
                substituteIds: Array.isArray(p.substituteIds) ? p.substituteIds : [],
                isFeatured: !!p.isFeatured,
                priceSlabs: Array.isArray(p.priceSlabs)
                    ? p.priceSlabs.map((s: { minQty: number; maxQty?: number | null; price: number }) => ({
                        minQty: String(s.minQty),
                        maxQty: s.maxQty != null ? String(s.maxQty) : '',
                        price: String(s.price),
                    }))
                    : [],
            });
        } catch (err) {
            console.error('Failed to fetch product details:', err);
            const primaryId = product.category?.id ?? '';
            const linkIds = (product.categoryLinks ?? []).map(l => l.categoryId);
            const uniqueIds = primaryId
                ? [primaryId, ...linkIds.filter(id => id !== primaryId)]
                : linkIds;
            setFormData({
                ...EMPTY_FORM,
                name: product.name,
                sku: product.sku ?? '',
                hsn: product.hsn ?? '',
                barcode: product.barcode ?? '',
                brand: product.brand ?? '',
                categoryIds: uniqueIds,
                description: product.description ?? '',
                basePrice: String(product.basePrice),
                originalPrice: product.originalPrice != null ? String(product.originalPrice) : '',
                vendorId: product.vendor?.id ?? '',
                taxPercent: String(product.taxPercent),
                unit: product.unit ?? 'piece',
                minOrderQty: String(product.minOrderQty),
                creditEligible: product.creditEligible,
                imageUrl: product.imageUrl ?? '',
                packSize: product.packSize ?? '',
                tags: Array.isArray(product.tags) ? product.tags : [],
                images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
            });
        } finally {
            setLoadingProduct(false);
        }
    };

    const closePanel = () => {
        setPanelOpen(false);
        setTimeout(() => {
            setEditingProduct(null);
            setFormData(EMPTY_FORM);
            setFormErrors({});
            setActiveTab('general');
        }, 300);
    };

    // -----------------------------------------------------------------------
    // Panel: Save
    // -----------------------------------------------------------------------

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) errors.name = 'Product name is required';
        if (!formData.sku.trim()) errors.sku = 'SKU is required';
        if (!formData.brand.trim()) errors.brand = 'Brand is required';
        if (formData.categoryIds.length === 0) errors.categoryIds = 'At least one category is required';
        const isVendorListing = !!formData.vendorId;
        if (isVendorListing && (!formData.basePrice || Number(formData.basePrice) <= 0)) {
            errors.basePrice = 'Valid base price is required when listing for a vendor';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const isMasterEdit = !!editingProduct?.isMasterRow;
            const isMasterCreate = !editingProduct && !formData.vendorId;

            if (isMasterEdit || isMasterCreate) {
                const masterPayload: Record<string, unknown> = {
                    name: formData.name.trim(),
                    brand: formData.brand.trim(),
                    categoryId: formData.categoryIds[0],
                };
                if (formData.imageUrl) masterPayload.imageUrl = formData.imageUrl;
                const additionalImages = formData.images.filter(Boolean);
                if (additionalImages.length > 0) masterPayload.images = additionalImages;
                if (formData.unit) masterPayload.uom = formData.unit;
                if (Number(formData.taxPercent)) masterPayload.taxPercent = Number(formData.taxPercent);

                const isEdit = !!editingProduct;
                const url = isEdit
                    ? `/api/v1/admin/master-products/${editingProduct!.id}`
                    : '/api/v1/admin/master-products';
                const method = isEdit ? 'PATCH' : 'POST';
                if (!isEdit) masterPayload.sku = formData.sku.trim();

                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(masterPayload),
                });
                const json = await res.json();
                if (json.success || res.ok) {
                    closePanel();
                    fetchProducts(currentPage);
                } else {
                    const msg = json.error?.message ?? json.message ?? 'Failed to save master product';
                    setFormErrors({ _server: msg });
                }
                return;
            }

            const payload: Record<string, unknown> = {
                name: formData.name.trim(),
                basePrice: Number(formData.basePrice),
                taxPercent: Number(formData.taxPercent) || 0,
                minOrderQty: Number(formData.minOrderQty) || 1,
                creditEligible: formData.creditEligible,
            };
            if (formData.vendorId) payload.vendorId = formData.vendorId;
            if (formData.imageUrl) payload.imageUrl = formData.imageUrl;
            if (formData.sku.trim()) payload.sku = formData.sku.trim();
            if (formData.hsn.trim()) payload.hsn = formData.hsn.trim();
            if (formData.barcode.trim()) payload.barcode = formData.barcode.trim();
            if (formData.brand.trim()) payload.brand = formData.brand.trim();
            if (formData.unit) payload.unit = formData.unit;
            const slabs = formData.priceSlabs
                .filter(s => s.minQty && s.price)
                .map(s => ({
                    minQty: Number(s.minQty),
                    maxQty: s.maxQty ? Number(s.maxQty) : undefined,
                    price: Number(s.price),
                }));
            if (slabs.length > 0) payload.priceSlabs = slabs;
            // Categories: the multi-picker already gives us UUIDs with the
            // primary at index 0. Send all three field shapes the admin API
            // accepts — the backend uses `primaryCategoryId` (or first of
            // categoryIds) as the canonical primary and writes the full set
            // to the ProductCategory join table.
            if (formData.categoryIds.length > 0) {
                payload.categoryId = formData.categoryIds[0];
                payload.primaryCategoryId = formData.categoryIds[0];
                payload.categoryIds = formData.categoryIds;
            } else if (editingProduct) {
                // User cleared all categories on an existing product — explicit empty.
                payload.categoryIds = [];
            }
            if (formData.description.trim()) payload.description = formData.description.trim();
            if (formData.originalPrice && Number(formData.originalPrice) > 0) {
                payload.originalPrice = Number(formData.originalPrice);
            }
            if (formData.packSize.trim()) payload.packSize = formData.packSize.trim();
            if (formData.tags.length > 0) payload.tags = formData.tags;
            const additionalImages = formData.images.filter(Boolean);
            if (additionalImages.length > 0) payload.images = additionalImages;

            if (formData.fssaiRef.trim()) payload.fssaiRef = formData.fssaiRef.trim();
            if (formData.aliasNames.length > 0) payload.aliasNames = formData.aliasNames;
            if (formData.vegNonVeg) payload.vegNonVeg = formData.vegNonVeg;
            if (formData.storageType) payload.storageType = formData.storageType;
            if (formData.shelfLifeDays) payload.shelfLifeDays = parseInt(formData.shelfLifeDays, 10);
            if (formData.countryOfOrigin.trim()) payload.countryOfOrigin = formData.countryOfOrigin.trim();
            if (formData.substituteIds.length > 0) payload.substituteIds = formData.substituteIds;
            payload.isFeatured = formData.isFeatured;

            const isEdit = !!editingProduct;
            const url = isEdit
                ? `/api/v1/admin/products/${editingProduct!.id}`
                : '/api/v1/admin/products';
            const method = isEdit ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (json.success || res.ok) {
                const saved: Product = json.data?.product ?? json.data;
                if (isEdit) {
                    setProducts(prev => prev.map(p => (p.id === saved.id ? saved : p)));
                } else {
                    setProducts(prev => [saved, ...prev]);
                }
                closePanel();
            } else {
                const msg = json.error?.message ?? json.message ?? 'Failed to save product';
                setFormErrors({ _server: msg });
            }
        } catch (err) {
            console.error('Failed to save product:', err);
            setFormErrors({ _server: 'Network error. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    // -----------------------------------------------------------------------
    // Import
    // -----------------------------------------------------------------------

    const openImport = () => setImportOpen(true);

    const handleImportComplete = () => {
        // Refresh products list after import (reset to page 1)
        fetchProducts(1);
    };

    // -----------------------------------------------------------------------
    // Export
    // -----------------------------------------------------------------------

    const handleExport = (format: 'csv' | 'xlsx') => {
        const params = new URLSearchParams();
        params.set('format', format);
        if (filterStatus) params.set('approvalStatus', filterStatus);
        if (filterVendor) params.set('vendorId', filterVendor);
        if (filterCategory) params.set('categoryId', filterCategory);
        if (debouncedSearch) params.set('search', debouncedSearch);

        window.open(`/api/v1/admin/products/export?${params.toString()}`, '_blank');
        setExportOpen(false);
    };

    // -----------------------------------------------------------------------
    // Template download (import) — now handled inside ProductImportModal
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    const updateField = (field: keyof ProductFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
            {/* ============================================================= */}
            {/* Header Row                                                      */}
            {/* ============================================================= */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-[900] text-[#181725] tracking-tight leading-none mb-1">
                        Product Management
                    </h1>
                    <p className="text-[#7C7C7C] font-medium text-[13px]">
                        Manage all products across every vendor
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Export Dropdown */}
                    <div className="relative" ref={exportRef}>
                        <button
                            onClick={() => setExportOpen(prev => !prev)}
                            className="h-[44px] px-5 bg-white border border-[#EEEEEE] rounded-[12px] text-[13px] font-bold text-[#181725] hover:bg-[#F8F9FB] transition-all flex items-center gap-2 shadow-sm"
                        >
                            <FileDown size={16} />
                            Export
                            <ChevronDown size={14} className={cn('transition-transform', exportOpen && 'rotate-180')} />
                        </button>
                        {exportOpen && (
                            <div className="absolute right-0 top-[52px] w-[180px] bg-white border border-[#EEEEEE] rounded-[12px] shadow-lg z-50 overflow-hidden">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="w-full flex items-center gap-3 px-5 py-3.5 text-[13px] font-semibold text-[#181725] hover:bg-[#F8F9FB] transition-colors"
                                >
                                    <FileSpreadsheet size={16} className="text-[#299E60]" />
                                    Export CSV
                                </button>
                                <button
                                    onClick={() => handleExport('xlsx')}
                                    className="w-full flex items-center gap-3 px-5 py-3.5 text-[13px] font-semibold text-[#181725] hover:bg-[#F8F9FB] transition-colors border-t border-[#EEEEEE]"
                                >
                                    <FileSpreadsheet size={16} className="text-[#3B82F6]" />
                                    Export Excel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Import Button */}
                    {perms.canWriteProducts && (
                        <button
                            onClick={openImport}
                            className="h-[44px] px-5 bg-white border border-[#EEEEEE] rounded-[12px] text-[13px] font-bold text-[#181725] hover:bg-[#F8F9FB] transition-all flex items-center gap-2 shadow-sm"
                        >
                            <Upload size={16} />
                            Import
                        </button>
                    )}

                    {/* Bulk Update Button */}
                    {perms.canWriteProducts && (
                        <button
                            onClick={() => setBulkUpdateOpen(true)}
                            className="h-[44px] px-5 bg-white border border-[#EEEEEE] rounded-[12px] text-[13px] font-bold text-[#181725] hover:bg-[#F8F9FB] transition-all flex items-center gap-2 shadow-sm"
                        >
                            <Wand2 size={16} className="text-[#299E60]" />
                            Bulk Update
                        </button>
                    )}

                    {/* Add Product Button */}
                    {perms.canWriteProducts && (
                        <button
                            onClick={openCreate}
                            className="h-[44px] px-6 bg-[#299E60] text-white rounded-[12px] text-[13px] font-bold hover:bg-[#238a54] transition-all flex items-center gap-2 shadow-sm shadow-[#299E60]/20"
                        >
                            <Plus size={16} strokeWidth={3} />
                            Add Product
                        </button>
                    )}
                </div>
            </div>

            {/* ============================================================= */}
            {/* Stats Cards                                                     */}
            {/* ============================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, idx) => (
                    <div
                        key={idx}
                        className="bg-white p-6 rounded-[14px] border border-[#EEEEEE] shadow-sm flex items-center gap-5"
                    >
                        <div
                            className="w-[56px] h-[56px] rounded-[14px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: card.bgColor, color: card.color }}
                        >
                            <card.icon size={26} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-[#AEAEAE] mb-1 uppercase tracking-wider">
                                {card.label}
                            </p>
                            <h3 className="text-[28px] font-[900] text-[#181725] leading-none">{card.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* ============================================================= */}
            {/* Filters Row                                                     */}
            {/* ============================================================= */}
            <div className="bg-white p-6 rounded-[14px] border border-[#EEEEEE] shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            className="w-full h-[44px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                        />
                    </div>

                    {/* Approval Status */}
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="h-[44px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[13px] font-medium text-[#181725] outline-none focus:border-[#299E60]/40 focus:bg-white transition-all min-w-[160px] cursor-pointer"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    {/* Category */}
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="h-[44px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[13px] font-medium text-[#181725] outline-none focus:border-[#299E60]/40 focus:bg-white transition-all min-w-[180px] cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.parentId ? `— ${c.name}` : c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ============================================================= */}
            {/* Products Table                                                  */}
            {/* ============================================================= */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="animate-spin text-[#299E60]" size={32} />
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <div className="w-16 h-16 bg-[#F8F9FB] rounded-full flex items-center justify-center text-[#AEAEAE]">
                            <Package size={32} />
                        </div>
                        <p className="text-[#AEAEAE] font-bold text-[14px]">
                            {debouncedSearch || filterStatus || filterVendor || filterCategory
                                ? 'No products match your filters'
                                : 'No products yet'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1440px]">
                            <thead>
                                {/* Product (left) + Actions (right) stay pinned while the
                                    middle columns scroll horizontally — power-admin view. */}
                                <tr className="bg-[#F8F9FB] text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    <th className="px-5 py-3 sticky left-0 bg-[#F8F9FB] z-20 min-w-[320px]">
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                checked={products.length > 0 && products.every(p => selectedIds.has(p.id))}
                                                onChange={() => toggleSelectAll(products.map(p => p.id), products.every(p => selectedIds.has(p.id)))}
                                                className="w-4 h-4 rounded border-gray-300 text-[#299E60] focus:ring-[#299E60] cursor-pointer"
                                                title="Select all on this page"
                                            />
                                            Product
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 min-w-[150px]">
                                        Brand
                                    </th>
                                    <th className="px-5 py-3 min-w-[180px]">
                                        Category
                                    </th>
                                    <th className="px-5 py-3 min-w-[110px]">
                                        Vendors
                                    </th>
                                    <th className="px-5 py-3 min-w-[100px] text-right">
                                        Base ₹
                                    </th>
                                    <th className="px-5 py-3 min-w-[85px] text-right">
                                        GST %
                                    </th>
                                    <th className="px-5 py-3 min-w-[105px] text-right text-[#299E60]">
                                        Gross ₹
                                    </th>
                                    <th className="px-5 py-3 min-w-[140px]">
                                        Unit
                                    </th>
                                    <th className="px-5 py-3 min-w-[120px]">
                                        Status
                                    </th>
                                    <th className="px-5 py-3 min-w-[150px]">
                                        Inventory
                                    </th>
                                    <th className="px-5 py-3 text-right sticky right-0 bg-[#F8F9FB] z-20 min-w-[120px]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EEEEEE]">
                                {products.map(product => {
                                    return (
                                        <tr key={product.id} className="hover:bg-[#F8F9FB]/60 transition-colors group text-[12.5px]">
                                            {/* Product — thumbnail + name + SKU, pinned left */}
                                            <td className="px-5 py-3 sticky left-0 bg-white group-hover:bg-[#F8F9FB] z-10 border-r border-[#EEEEEE]/40">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(product.id)}
                                                        onChange={() => toggleSelect(product.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-[#299E60] focus:ring-[#299E60] cursor-pointer shrink-0"
                                                    />
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className="w-[42px] h-[42px] rounded-[10px] object-cover border border-[#EEEEEE] shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-[42px] h-[42px] rounded-[10px] bg-[#F8F9FB] border border-[#EEEEEE] flex items-center justify-center text-[#AEAEAE] shrink-0">
                                                            <ImageIcon size={18} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <input
                                                            type="text"
                                                            value={product.name}
                                                            onChange={e => handleCellChange(product.id, 'name', e.target.value)}
                                                            onBlur={e => handleInlineEdit(product.id, 'name', e.target.value, originalProductsRef.current.find(p => p.id === product.id)?.name)}
                                                            className={cn(cellInput, "font-bold text-[#181725] text-[13.5px] -ml-1.5 px-1.5 py-0.5")}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={product.sku || ''}
                                                            placeholder="No SKU"
                                                            onChange={e => handleCellChange(product.id, 'sku', e.target.value)}
                                                            onBlur={e => handleInlineEdit(product.id, 'sku', e.target.value || null, originalProductsRef.current.find(p => p.id === product.id)?.sku || '')}
                                                            className={cn(cellInput, "text-[#AEAEAE] text-[11px] font-medium -ml-1.5 mt-0.5 px-1.5 py-0.5")}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Brand */}
                                            <td className="px-5 py-3 border-r border-[#EEEEEE]/40">
                                                <select
                                                    value={product.brand || ''}
                                                    onChange={e => {
                                                        const val = e.target.value || null;
                                                        handleCellChange(product.id, 'brand', val);
                                                        handleInlineEdit(product.id, 'brand', val, originalProductsRef.current.find(p => p.id === product.id)?.brand || null);
                                                    }}
                                                    className={cn(cellInput, "text-[#7C7C7C] font-medium appearance-none")}
                                                >
                                                    <option value="">— Select Brand —</option>
                                                    {brands.map(b => (
                                                        <option key={b.id} value={b.name}>{b.name}</option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Category */}
                                            <td className="px-5 py-3 border-r border-[#EEEEEE]/40">
                                                <select
                                                    value={product.category?.id ?? ''}
                                                    onChange={e => {
                                                        const val = e.target.value || null;
                                                        const matchedCat = categories.find(c => c.id === val);
                                                        handleCellChange(product.id, 'category', matchedCat ? { id: matchedCat.id, name: matchedCat.name } : null);
                                                        handleInlineEdit(product.id, 'primaryCategoryId', val, originalProductsRef.current.find(p => p.id === product.id)?.category?.id ?? null);
                                                    }}
                                                    className={cn(cellInput, "text-[#7C7C7C] font-medium appearance-none")}
                                                >
                                                    <option value="">— Select Category —</option>
                                                    {categories.map(c => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.parentId ? `— ${c.name}` : c.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Vendors */}
                                            <td className="px-5 py-3 border-r border-[#EEEEEE]/40">
                                                {(product.vendorCount ?? 0) > 0 ? (
                                                    <span className="font-semibold text-[#181725]" title={product.vendors?.join(', ')}>
                                                        {product.vendorCount} vendor{product.vendorCount !== 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-[#3B82F6] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                                                        Catalog
                                                    </span>
                                                )}
                                            </td>

                                            {/* Base price (taxable rate) */}
                                            <td className="px-5 py-3 text-right border-r border-[#EEEEEE]/40 bg-[#FAFAFA]/20">
                                                <div className="flex items-center justify-end gap-0.5 max-w-[90px] ml-auto">
                                                    <span className="font-bold text-[#181725]">₹</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={product.basePrice ?? ''}
                                                        onChange={e => handleCellChange(product.id, 'basePrice', parseFloat(e.target.value) || 0)}
                                                        onBlur={e => handleInlineEdit(product.id, 'basePrice', parseFloat(e.target.value) || 0, originalProductsRef.current.find(p => p.id === product.id)?.basePrice)}
                                                        className={cn(cellInput, "text-right font-bold text-[#181725] px-1 py-0.5")}
                                                    />
                                                </div>
                                            </td>

                                            {/* GST % */}
                                            <td className="px-5 py-3 text-right border-r border-[#EEEEEE]/40 bg-[#FAFAFA]/20">
                                                <select
                                                    value={String(product.taxPercent ?? 0)}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        handleCellChange(product.id, 'taxPercent', val);
                                                        handleInlineEdit(product.id, 'taxPercent', val, originalProductsRef.current.find(p => p.id === product.id)?.taxPercent || 0);
                                                    }}
                                                    className={cn(cellInput, "text-right font-medium text-[#7C7C7C] w-[65px] ml-auto appearance-none")}
                                                >
                                                    {TAX_OPTIONS.map(t => (
                                                        <option key={t} value={t}>{t}%</option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Gross Price */}
                                            <td className="px-5 py-3 text-right border-r border-[#EEEEEE]/40 bg-[#299E60]/[0.02]">
                                                <span className="font-extrabold text-[#299E60] tabular-nums">
                                                    ₹{(product.basePrice * (1 + (product.taxPercent || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>

                                            {/* Unit */}
                                            <td className="px-5 py-3 border-r border-[#EEEEEE]/40">
                                                <select
                                                    value={product.unit || ''}
                                                    onChange={e => {
                                                        const val = e.target.value || null;
                                                        handleCellChange(product.id, 'unit', val);
                                                        handleInlineEdit(product.id, 'unit', val, originalProductsRef.current.find(p => p.id === product.id)?.unit || null);
                                                    }}
                                                    className={cn(cellInput, "text-[#7C7C7C] font-medium appearance-none")}
                                                >
                                                    <option value="">— Select Unit —</option>
                                                    {UNIT_OPTIONS.map(u => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3 border-r border-[#EEEEEE]/40">
                                                <select
                                                    value={product.approvalStatus}
                                                    onChange={e => {
                                                        const val = e.target.value as 'approved' | 'rejected' | 'pending';
                                                        handleCellChange(product.id, 'approvalStatus', val);
                                                        handleInlineEdit(product.id, 'approvalStatus', val, originalProductsRef.current.find(p => p.id === product.id)?.approvalStatus);
                                                    }}
                                                    className={cn(
                                                        "text-[10px] font-extrabold px-2 py-1 rounded-[6px] uppercase tracking-wider border outline-none bg-transparent cursor-pointer",
                                                        product.approvalStatus === 'approved' ? 'text-[#299E60] bg-[#EEF8F1] border-transparent' :
                                                        product.approvalStatus === 'rejected' ? 'text-[#E74C3C] bg-[#FFF0F0] border-transparent' :
                                                        'text-[#F59E0B] bg-[#FFF7E6] border-transparent'
                                                    )}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="approved">Approved</option>
                                                    <option value="rejected">Rejected</option>
                                                </select>
                                            </td>

                                            {/* Inventory — aggregated across vendors */}
                                            <td className="px-5 py-3 whitespace-nowrap border-r border-[#EEEEEE]/40">
                                                {(product.vendorCount ?? 0) > 0 ? (
                                                    <div
                                                        className="cursor-default"
                                                        title={product.vendorStock?.map(vs => `${vs.vendor}: ${vs.qty}`).join('\n')}
                                                    >
                                                        <span className={cn(
                                                            'font-bold',
                                                            (product.totalStock ?? 0) > 0 ? 'text-[#181725]' : 'text-[#AEAEAE]',
                                                        )}>
                                                            {product.totalStock ?? 0}
                                                        </span>
                                                        <span className="text-[11px] text-[#AEAEAE] ml-1">
                                                            across {product.vendorCount}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] font-medium text-[#AEAEAE]">
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions — pinned right */}
                                            <td className="px-5 py-3 sticky right-0 bg-white group-hover:bg-[#F8F9FB] z-10 border-l border-[#EEEEEE]/40">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {savingRows[product.id] && Object.keys(savingRows[product.id]).length > 0 ? (
                                                        <div className="w-[36px] h-[36px] flex items-center justify-center text-[#299E60]">
                                                            <Loader2 className="animate-spin" size={16} />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {/* Edit */}
                                                            {perms.canWriteProducts && (
                                                                <button
                                                                    onClick={() => openEdit(product)}
                                                                    title="Edit product"
                                                                    className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[#7C7C7C] hover:bg-[#EEF8F1] hover:text-[#299E60] transition-all"
                                                                >
                                                                    <Pencil size={15} />
                                                                </button>
                                                            )}

                                                            {/* Toggle Active */}
                                                            {perms.canWriteProducts && (
                                                            <button
                                                                onClick={() => toggleActive(product)}
                                                                disabled={actionLoading === product.id}
                                                                title={product.isActive ? 'Deactivate' : 'Activate'}
                                                                className={cn(
                                                                    'w-[34px] h-[34px] rounded-[10px] flex items-center justify-center transition-all disabled:opacity-50',
                                                                    product.isActive
                                                                        ? 'text-[#299E60] hover:bg-[#EEF8F1]'
                                                                        : 'text-[#AEAEAE] hover:bg-[#F8F9FB]',
                                                                )}
                                                            >
                                                                {actionLoading === product.id ? (
                                                                    <Loader2 size={15} className="animate-spin" />
                                                                ) : (
                                                                    <div
                                                                        className="relative inline-flex h-[18px] w-[32px] shrink-0 items-center rounded-full transition-colors duration-200"
                                                                        style={{ backgroundColor: product.isActive ? '#299E60' : '#D1D5DB' }}
                                                                    >
                                                                        <span className="inline-block h-[12px] w-[12px] rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: product.isActive ? 'translateX(17px)' : 'translateX(3px)' }} />
                                                                    </div>
                                                                )}
                                                            </button>
                                                            )}

                                                            {/* Delete */}
                                                            {perms.canWriteProducts && (
                                                                <button
                                                                    onClick={() => setDeleteTarget(product)}
                                                                    title="Delete product"
                                                                    className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[#7C7C7C] hover:bg-[#FFF0F0] hover:text-[#E74C3C] transition-all"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Pagination */}
                    <div className="p-6 bg-[#FDFDFD] border-t border-[#EEEEEE] flex items-center justify-between flex-wrap gap-4">
                        <p className="text-[13px] text-[#7C7C7C] font-semibold">
                            Showing{' '}
                            <span className="text-[#181725] font-bold">
                                {totalProductsCount === 0 ? 0 : (currentPage - 1) * PAGE_LIMIT + 1}–{Math.min(currentPage * PAGE_LIMIT, totalProductsCount)}
                            </span>
                            {' '}of{' '}
                            <span className="text-[#181725] font-bold">{totalProductsCount}</span>
                            {' '}products
                        </p>
                        
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                {/* Prev Button */}
                                <button
                                    onClick={() => fetchProducts(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1 || loading}
                                    className="w-[34px] h-[34px] flex items-center justify-center rounded-[8px] border border-[#EEEEEE] text-[#7C7C7C] hover:bg-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {/* Page numbers */}
                                {getPageRange(currentPage, totalPages).map((item, idx) =>
                                    item === 'gap' ? (
                                        <span key={`gap-${idx}`} className="w-[34px] h-[34px] flex items-center justify-center text-[#AEAEAE] text-[13px]">…</span>
                                    ) : (
                                        <button
                                            key={item}
                                            onClick={() => fetchProducts(item)}
                                            disabled={loading}
                                            className={cn(
                                                'w-[34px] h-[34px] flex items-center justify-center rounded-[8px] text-[13px] font-bold transition-colors',
                                                item === currentPage
                                                    ? 'bg-[#299E60] text-white'
                                                    : 'border border-[#EEEEEE] text-[#7C7C7C] hover:bg-[#F5F5F5]'
                                            )}
                                        >
                                            {item}
                                        </button>
                                    )
                                )}

                                {/* Next Button */}
                                <button
                                    onClick={() => fetchProducts(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages || loading}
                                    className="w-[34px] h-[34px] flex items-center justify-center rounded-[8px] border border-[#EEEEEE] text-[#7C7C7C] hover:bg-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
            </div>

            {/* ============================================================= */}
            {/* Add/Edit Sliding Panel                                          */}
            {/* ============================================================= */}

            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300',
                    panelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
                )}
                onClick={closePanel}
            />

            {/* Panel */}
            <div
                className={cn(
                    'fixed top-0 right-0 h-full w-full max-w-[680px] bg-white z-[70] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col',
                    panelOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {/* Panel Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-[#EEEEEE] shrink-0">
                    <h2 className="text-[22px] font-[900] text-[#181725]">
                        {editingProduct ? 'Edit Product' : 'Add Product'}
                    </h2>
                    <button
                        onClick={closePanel}
                        className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center hover:bg-[#F8F9FB] text-[#7C7C7C] hover:text-[#181725] transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Bar */}
                <div className="flex bg-white border-b border-[#EEEEEE] px-8 py-0.5 gap-6 shrink-0 z-10 sticky top-0">
                    {(['general', 'pricing', 'advanced'] as const).map(tab => {
                        const isActive = activeTab === tab;
                        const labels = {
                            general: { label: 'General Info', icon: Info, color: 'text-[#299E60]', bg: 'bg-[#EEF8F1]' },
                            pricing: { label: 'Pricing & Stock', icon: DollarSign, color: 'text-[#3B82F6]', bg: 'bg-[#EFF6FF]' },
                            advanced: { label: 'Advanced Settings', icon: SettingsIcon, color: 'text-[#F59E0B]', bg: 'bg-[#FFF7E6]' },
                        };
                        const cfg = labels[tab];
                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex items-center gap-2 py-3.5 text-[13px] font-extrabold border-b-2 transition-all relative outline-none",
                                    isActive 
                                        ? "border-[#299E60] text-[#181725]" 
                                        : "border-transparent text-[#AEAEAE] hover:text-[#7C7C7C]"
                                )}
                            >
                                <div className={cn("w-6 h-6 rounded-[6px] flex items-center justify-center transition-colors", isActive ? cfg.bg + " " + cfg.color : "bg-gray-100 text-[#AEAEAE]")}>
                                    <cfg.icon size={13} strokeWidth={2.5} />
                                </div>
                                {cfg.label}
                            </button>
                        );
                    })}
                </div>

                {/* Panel Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#F8F9FB]">
                    {loadingProduct ? (
                        <div className="flex items-center justify-center py-32">
                            <Loader2 className="animate-spin text-[#299E60]" size={32} />
                        </div>
                    ) : (
                        <>
                            {formErrors._server && (
                                <div className="flex items-center gap-3 bg-[#FFF0F0] border border-[#E74C3C]/20 text-[#E74C3C] rounded-[12px] px-5 py-4 text-[13px] font-semibold">
                                    <AlertTriangle size={18} />
                                    {formErrors._server}
                                </div>
                            )}

                            {activeTab === 'general' && (
                                <>
                                    {/* ======== Section 1: Basic Information ======== */}
                                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                        <SectionHeader icon={<Info size={16} />} title="Basic Information" />
                                        <div className="space-y-4">
                                            {/* Product Name */}
                                            <div>
                                                <FieldLabel required>Product Name</FieldLabel>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={e => updateField('name', e.target.value)}
                                                    placeholder="Enter product name"
                                                    className={cn(
                                                        inputCls,
                                                        formErrors.name && 'border-[#E74C3C] focus:border-[#E74C3C]',
                                                    )}
                                                />
                                                {formErrors.name && (
                                                    <p className="text-[11px] text-[#E74C3C] font-semibold mt-1.5">{formErrors.name}</p>
                                                )}
                                            </div>

                                            {/* Brand, HSN, SKU, Barcode — 2-column grid */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <FieldLabel required>Brand</FieldLabel>
                                                    <select
                                                        value={formData.brand}
                                                        onChange={e => updateField('brand', e.target.value)}
                                                        className={cn(selectCls, 'cursor-pointer', formErrors.brand && 'border-[#E74C3C]')}
                                                    >
                                                        <option value="">Select brand</option>
                                                        {brands.map(b => (
                                                            <option key={b.id} value={b.name}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                    {formErrors.brand && (
                                                        <p className="text-[11px] text-[#E74C3C] font-semibold mt-1.5">{formErrors.brand}</p>
                                                    )}
                                                    {brands.length === 0 && (
                                                        <p className="text-[11px] text-[#AEAEAE] font-medium mt-1.5">
                                                            No brands yet — add one in <Link href="/admin/brands" className="text-[#299E60] font-bold hover:underline">Brands</Link>
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <FieldLabel>HSN Code</FieldLabel>
                                                    <input
                                                        type="text"
                                                        value={formData.hsn}
                                                        onChange={e => updateField('hsn', e.target.value)}
                                                        placeholder="e.g., 1006"
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <FieldLabel required>SKU</FieldLabel>
                                                    <input
                                                        type="text"
                                                        value={formData.sku}
                                                        onChange={e => updateField('sku', e.target.value.toUpperCase())}
                                                        placeholder="e.g., RIC-BAS-001"
                                                        readOnly={!!editingProduct?.isMasterRow}
                                                        className={cn(inputCls, editingProduct?.isMasterRow && 'bg-[#F8F9FB] cursor-not-allowed')}
                                                    />
                                                    {formErrors.sku && (
                                                        <p className="text-[11px] text-[#E74C3C] font-semibold mt-1.5">{formErrors.sku}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <FieldLabel>Barcode</FieldLabel>
                                                    <input
                                                        type="text"
                                                        value={formData.barcode}
                                                        onChange={e => updateField('barcode', e.target.value)}
                                                        placeholder="e.g., 8901234567890"
                                                        className={inputCls}
                                                    />
                                                </div>
                                            </div>

                                            {/* Categories — multi-select */}
                                            <CategoryMultiPickerById
                                                value={formData.categoryIds}
                                                onChange={(ids) => setFormData(prev => ({ ...prev, categoryIds: ids }))}
                                                max={5}
                                                disableSuggest
                                                label="Categories"
                                                helper="Pick up to 5 — first chip is the primary. Customers can find this product under any of these categories."
                                            />
                                            {formErrors.categoryIds && (
                                                <p className="text-[11px] text-[#E74C3C] font-semibold">{formErrors.categoryIds}</p>
                                            )}

                                            {/* Description */}
                                            <div>
                                                <FieldLabel>Description</FieldLabel>
                                                <textarea
                                                    value={formData.description}
                                                    onChange={e => updateField('description', e.target.value)}
                                                    rows={4}
                                                    className={textareaCls}
                                                    placeholder="Describe the product, its quality, origin, etc."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ======== Section 6: Media ======== */}
                                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                        <SectionHeader icon={<ImageIcon size={16} />} title="Media" />
                                        <div className="space-y-5">
                                            {/* Primary Image */}
                                            <ImageUpload
                                                value={formData.imageUrl}
                                                onChange={(url) => updateField('imageUrl', url)}
                                                folder="products"
                                                label="Primary Image"
                                                size="lg"
                                            />

                                            {/* Additional Images */}
                                            <MultiImageUpload
                                                values={formData.images.filter(Boolean)}
                                                onChange={(urls) => setFormData(prev => ({ ...prev, images: urls }))}
                                                folder="products"
                                                label="Additional Images"
                                                max={8}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'pricing' && (
                                <>
                                    {/* ======== Section 2: Pricing & Tax ======== */}
                                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                        <SectionHeader icon={<DollarSign size={16} />} title="Pricing & Tax" />
                                        <div className="space-y-4">
                                            <div className="overflow-hidden border border-[#EEEEEE] rounded-[12px] bg-[#FAFAFA]">
                                                <table className="w-full text-left border-collapse text-[13px]">
                                                    <thead>
                                                        <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                                            <th className="px-5 py-3 font-bold text-[#181725] w-1/3">Price Component</th>
                                                            <th className="px-5 py-3 font-bold text-[#181725] w-1/3">Amount / Input</th>
                                                            <th className="px-5 py-3 font-bold text-[#7C7C7C] w-1/3 text-[11px] uppercase tracking-wider">Breakdown</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#F5F5F5] bg-white">
                                                        {/* Row 1: Taxable Rate */}
                                                        <tr>
                                                            <td className="px-5 py-4 font-semibold text-[#181725]">
                                                                Taxable Rate (Amt) <span className="text-[#E74C3C]">*</span>
                                                                <p className="text-[11px] text-[#AEAEAE] font-normal mt-0.5 font-sans">Base price before tax (ex-GST)</p>
                                                            </td>
                                                            <td className="px-5 py-4">
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEAE] font-medium">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={formData.basePrice}
                                                                        onChange={e => updateField('basePrice', e.target.value)}
                                                                        placeholder="0.00"
                                                                        className={cn(
                                                                            inputCls,
                                                                            'pl-7',
                                                                            formErrors.basePrice && 'border-[#E74C3C] focus:border-[#E74C3C]',
                                                                        )}
                                                                    />
                                                                </div>
                                                                {formErrors.basePrice && (
                                                                    <p className="text-[11px] text-[#E74C3C] font-semibold mt-1.5">{formErrors.basePrice}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-4 text-[#7C7C7C] font-medium">
                                                                {formData.basePrice ? `₹${parseFloat(formData.basePrice).toFixed(2)} taxable base` : '—'}
                                                            </td>
                                                        </tr>
                                                        {/* Row 2: Tax % */}
                                                        <tr>
                                                            <td className="px-5 py-4 font-semibold text-[#181725]">
                                                                Tax % (GST) <span className="text-[#E74C3C]">*</span>
                                                                <p className="text-[11px] text-[#AEAEAE] font-normal mt-0.5">Applied goods & services tax percent</p>
                                                            </td>
                                                            <td className="px-5 py-4">
                                                                <select
                                                                    value={formData.taxPercent}
                                                                    onChange={e => updateField('taxPercent', e.target.value)}
                                                                    className={cn(selectCls, 'cursor-pointer')}
                                                                >
                                                                    {TAX_OPTIONS.map(t => (
                                                                        <option key={t} value={t}>{t}%</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="px-5 py-4 text-[#7C7C7C] font-medium">
                                                                {formData.basePrice && parseFloat(formData.taxPercent || '0') > 0
                                                                    ? `+ ₹${(parseFloat(formData.basePrice) * parseFloat(formData.taxPercent || '0') / 100).toFixed(2)} GST (${formData.taxPercent}%)`
                                                                    : 'No tax applied'}
                                                            </td>
                                                        </tr>
                                                        {/* Row 3: Gross Rate */}
                                                        <tr className="bg-[#FDFDFD]">
                                                            <td className="px-5 py-4 font-bold text-[#181725]">
                                                                Gross Rate (Customer Price) <span className="text-[#E74C3C]">*</span>
                                                                <p className="text-[11px] text-[#AEAEAE] font-normal mt-0.5">Final selling price (incl. GST)</p>
                                                            </td>
                                                            <td className="px-5 py-4">
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#299E60] font-bold">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={formData.basePrice && formData.taxPercent
                                                                            ? (parseFloat(formData.basePrice) * (1 + parseFloat(formData.taxPercent || '0') / 100)).toFixed(2)
                                                                            : formData.originalPrice || ''}
                                                                        onChange={e => {
                                                                            const gross = e.target.value;
                                                                            updateField('originalPrice', gross);
                                                                            const tp = parseFloat(formData.taxPercent || '0');
                                                                            const g = parseFloat(gross);
                                                                            if (!isNaN(g) && !isNaN(tp)) {
                                                                                updateField('basePrice', (g / (1 + tp / 100)).toFixed(2));
                                                                            }
                                                                        }}
                                                                        placeholder="0.00"
                                                                        className={cn(inputCls, 'pl-7 border-[#299E60]/30 focus:border-[#299E60] font-bold text-[#299E60] bg-[#EEF8F1]/10')}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4">
                                                                <div className="space-y-1">
                                                                    <p className="text-[#181725] font-bold text-[13px]">
                                                                        {formData.basePrice && formData.taxPercent
                                                                            ? `₹${(parseFloat(formData.basePrice) * (1 + parseFloat(formData.taxPercent || '0') / 100)).toFixed(2)} total`
                                                                            : formData.originalPrice
                                                                                ? `₹${parseFloat(formData.originalPrice).toFixed(2)} total`
                                                                                : '—'}
                                                                    </p>
                                                                    {formData.basePrice && parseFloat(formData.taxPercent || '0') > 0 && (
                                                                        <p className="text-[11px] text-[#7C7C7C] font-medium leading-none">
                                                                            ₹{parseFloat(formData.basePrice).toFixed(2)} base + ₹{(parseFloat(formData.basePrice) * parseFloat(formData.taxPercent || '0') / 100).toFixed(2)} GST
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ======== Section 5: Inventory & Packaging ======== */}
                                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                        <SectionHeader icon={<BoxIcon size={16} />} title="Inventory & Packaging" />
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <FieldLabel>Pack Size</FieldLabel>
                                                    <input
                                                        type="text"
                                                        value={formData.packSize}
                                                        onChange={e => updateField('packSize', e.target.value)}
                                                        className={inputCls}
                                                        placeholder="e.g., 1 kg, 500 ml"
                                                    />
                                                </div>
                                                <div>
                                                    <FieldLabel>Unit</FieldLabel>
                                                    <select
                                                        value={formData.unit}
                                                        onChange={e => updateField('unit', e.target.value)}
                                                        className={cn(selectCls, 'cursor-pointer')}
                                                    >
                                                        <option value="">Select unit</option>
                                                        {UNIT_OPTIONS.map(u => (
                                                            <option key={u} value={u}>{u}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <FieldLabel>Min Order Quantity</FieldLabel>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={formData.minOrderQty}
                                                        onChange={e => updateField('minOrderQty', e.target.value)}
                                                        className={inputCls}
                                                        placeholder="1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ======== Section 4: Vendor Assignment ======== */}
                                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                        <SectionHeader icon={<SettingsIcon size={16} />} title="Vendor Assignment" />
                                        <div>
                                            <FieldLabel>
                                                Vendor <span className="text-[11px] font-medium text-[#AEAEAE]">(optional — leave empty for catalog product)</span>
                                            </FieldLabel>
                                            <select
                                                value={formData.vendorId}
                                                onChange={e => updateField('vendorId', e.target.value)}
                                                className={cn(selectCls, 'cursor-pointer')}
                                            >
                                                <option value="">No vendor (Catalog product)</option>
                                                {vendors.map(v => (
                                                    <option key={v.id} value={v.id}>{v.businessName}</option>
                                                ))}
                                            </select>
                                            <p className="text-[11px] text-[#AEAEAE] font-medium mt-1.5">
                                                Catalog products are auto-approved and any vendor can adopt them.
                                            </p>
                                        </div>
                                    </div>

                                    {/* ======== Section 3: Bulk Pricing Tiers ======== */}
                                    {formData.vendorId && (
                                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                            <div className="flex items-start justify-between mb-5">
                                                <div>
                                                    <SectionHeader icon={<Tag size={16} />} title="Bulk Pricing Tiers" />
                                                    <p className="text-[12px] text-[#AEAEAE] font-medium -mt-3 ml-[42px]">
                                                        Up to 3 quantity-based discount tiers (taxable rate, ex-GST)
                                                    </p>
                                                </div>
                                                {formData.priceSlabs.length < 3 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            priceSlabs: [...prev.priceSlabs, { minQty: '', maxQty: '', price: '' }],
                                                        }))}
                                                        className="h-[40px] px-5 bg-[#1a365d] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1a365d]/90 transition-colors flex items-center gap-2 shrink-0"
                                                    >
                                                        <Plus size={14} />
                                                        Add Bulk Tier
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                {formData.priceSlabs.map((slab, index) => (
                                                    <div key={index} className="rounded-[14px] border border-[#EEEEEE] overflow-hidden">
                                                        <div className="flex items-center justify-between px-5 py-3 bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="w-[28px] h-[28px] rounded-full bg-[#299E60] text-white text-[12px] font-bold flex items-center justify-center">
                                                                    {index + 1}
                                                                </span>
                                                                <h4 className="text-[14px] font-bold text-[#181725]">Bulk Tier {index + 1}</h4>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData(prev => ({
                                                                    ...prev,
                                                                    priceSlabs: prev.priceSlabs.filter((_, idx) => idx !== index),
                                                                }))}
                                                                className="p-1.5 hover:bg-[#FFF0F0] rounded-[6px] transition-colors text-[#AEAEAE] hover:text-[#E74C3C]"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>

                                                        <div className="p-5">
                                                            <div className="grid grid-cols-3 gap-4">
                                                                <div>
                                                                    <FieldLabel>Min Quantity</FieldLabel>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={slab.minQty}
                                                                        onChange={e => setFormData(prev => ({
                                                                            ...prev,
                                                                            priceSlabs: prev.priceSlabs.map((s, idx) => idx === index ? { ...s, minQty: e.target.value } : s),
                                                                        }))}
                                                                        className={inputCls}
                                                                        placeholder="e.g., 10"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <FieldLabel>Max Quantity</FieldLabel>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={slab.maxQty}
                                                                        onChange={e => setFormData(prev => ({
                                                                            ...prev,
                                                                            priceSlabs: prev.priceSlabs.map((s, idx) => idx === index ? { ...s, maxQty: e.target.value } : s),
                                                                        }))}
                                                                        className={inputCls}
                                                                        placeholder="(optional)"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <FieldLabel required>Taxable Rate (per Unit)</FieldLabel>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEAE] text-[14px]">{'\u20B9'}</span>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={slab.price}
                                                                            onChange={e => setFormData(prev => ({
                                                                                ...prev,
                                                                                priceSlabs: prev.priceSlabs.map((s, idx) => idx === index ? { ...s, price: e.target.value } : s),
                                                                            }))}
                                                                            className={cn(inputCls, 'pl-8')}
                                                                            placeholder="0.00"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {formData.priceSlabs.length === 0 && (
                                                    <div className="text-center py-8 text-[#AEAEAE]">
                                                        <BarChart3 size={32} className="mx-auto mb-2 text-[#E5E7EB]" />
                                                        <p className="text-[13px] font-medium">No bulk tiers yet. Click &quot;Add Bulk Tier&quot; to add quantity-based pricing.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {activeTab === 'advanced' && (
                                <>
                                    {/* ======== Section 7: Tags & Settings ======== */}
                                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                        <SectionHeader icon={<SettingsIcon size={16} />} title="Tags & Settings" />
                                        <div className="space-y-4">
                                            {/* Tags */}
                                            <div>
                                                <FieldLabel>Tags</FieldLabel>
                                                <TagInput
                                                    tags={formData.tags}
                                                    onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                                                />
                                            </div>

                                            {/* Credit Eligible & Featured Product */}
                                            <div className="grid grid-cols-2 gap-4 bg-[#F8F9FB] p-4 rounded-[12px] border border-[#EEEEEE]">
                                                <label className="flex items-start gap-3 cursor-pointer py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.creditEligible}
                                                        onChange={(e) => updateField('creditEligible', e.target.checked)}
                                                        className="w-5 h-5 accent-[#299E60] shrink-0 mt-0.5"
                                                    />
                                                    <div>
                                                        <span className="text-[13.5px] font-bold text-[#181725]">Credit Eligible</span>
                                                        <p className="text-[11px] text-[#AEAEAE] font-medium leading-tight mt-0.5">Allow buyers to purchase on credit</p>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-3 cursor-pointer py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.isFeatured}
                                                        onChange={(e) => updateField('isFeatured', e.target.checked)}
                                                        className="w-5 h-5 accent-[#F59E0B] shrink-0 mt-0.5"
                                                    />
                                                    <div>
                                                        <span className="text-[13.5px] font-bold text-[#181725]">Featured Product</span>
                                                        <p className="text-[11px] text-[#AEAEAE] font-medium leading-tight mt-0.5">Highlight product in catalogs</p>
                                                    </div>
                                                </label>
                                            </div>

                                            {/* Veg / Non-Veg */}
                                            <div>
                                                <FieldLabel>Veg / Non-Veg</FieldLabel>
                                                <div className="flex gap-2">
                                                    {([['', 'Not Set'], ['veg', '🟢 Veg'], ['nonveg', '🔴 Non-Veg'], ['egg', '🟡 Egg']] as ['' | 'veg' | 'nonveg' | 'egg', string][]).map(([v, label]) => (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() => updateField('vegNonVeg', v)}
                                                            className={cn(
                                                                'flex-1 h-[40px] rounded-[10px] text-[12px] font-bold border transition-colors',
                                                                formData.vegNonVeg === v
                                                                    ? 'bg-[#299E60] text-white border-[#299E60]'
                                                                    : 'bg-white text-[#7C7C7C] border-[#EEEEEE] hover:border-[#299E60]/40'
                                                            )}
                                                        >
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Storage Type & FSSAI */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <FieldLabel>Storage Type</FieldLabel>
                                                    <select
                                                        value={formData.storageType}
                                                        onChange={(e) => updateField('storageType', e.target.value)}
                                                        className={selectCls}
                                                    >
                                                        <option value="">Not specified</option>
                                                        <option value="ambient">Ambient (Room Temp)</option>
                                                        <option value="refrigerated">Refrigerated (2–8°C)</option>
                                                        <option value="frozen">Frozen (−18°C)</option>
                                                        <option value="dry">Dry Storage</option>
                                                        <option value="cool">Cool / Dark (10–15°C)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <FieldLabel>FSSAI Reference</FieldLabel>
                                                    <input
                                                        type="text"
                                                        maxLength={50}
                                                        placeholder="e.g. 10016011000015"
                                                        value={formData.fssaiRef}
                                                        onChange={e => updateField('fssaiRef', e.target.value)}
                                                        className={inputCls}
                                                    />
                                                </div>
                                            </div>

                                            {/* Alias / Search Names */}
                                            <div>
                                                <FieldLabel>Alias / Search Names</FieldLabel>
                                                <TagInput
                                                    tags={formData.aliasNames}
                                                    onChange={(names) => setFormData(prev => ({ ...prev, aliasNames: names }))}
                                                />
                                                <p className="text-[11px] text-[#AEAEAE] font-medium mt-1">Alternate search keywords</p>
                                            </div>

                                            {/* Shelf Life & Country of Origin */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <FieldLabel>Shelf Life (days)</FieldLabel>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={formData.shelfLifeDays}
                                                        onChange={(e) => updateField('shelfLifeDays', e.target.value)}
                                                        className={inputCls}
                                                        placeholder="e.g. 180"
                                                    />
                                                </div>
                                                <div>
                                                    <FieldLabel>Country of Origin</FieldLabel>
                                                    <input
                                                        type="text"
                                                        value={formData.countryOfOrigin}
                                                        onChange={(e) => updateField('countryOfOrigin', e.target.value)}
                                                        className={inputCls}
                                                        placeholder="e.g. India"
                                                        maxLength={100}
                                                    />
                                                </div>
                                            </div>

                                            {/* Substitute Products */}
                                            <div>
                                                <FieldLabel>Substitute Products</FieldLabel>
                                                <SubstituteProductPicker
                                                    selectedIds={formData.substituteIds}
                                                    currentProductId={editingProduct?.id}
                                                    products={products}
                                                    onChange={(ids) => setFormData(prev => ({ ...prev, substituteIds: ids }))}
                                                />
                                                <p className="text-[11px] text-[#AEAEAE] font-medium mt-1">Shown when this item is out of stock</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Panel Footer */}
                <div className="px-8 py-6 border-t border-[#EEEEEE] shrink-0 flex items-center gap-4">
                    <button
                        onClick={closePanel}
                        className="flex-1 h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] text-[#181725] rounded-[12px] text-[14px] font-bold hover:bg-[#EEEEEE] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 h-[48px] bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#299E60]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {editingProduct ? 'Update Product' : 'Create Product'}
                    </button>
                </div>
            </div>

            {/* ============================================================= */}
            {/* Import Modal                                                    */}
            {/* ============================================================= */}
            <ProductImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                vendors={vendors}
                onComplete={handleImportComplete}
            />

            {/* ============================================================= */}
            {/* Bulk Update Engine                                              */}
            {/* ============================================================= */}
            <AdminBulkEngine
                open={bulkUpdateOpen}
                onClose={() => setBulkUpdateOpen(false)}
                products={products}
                selectedIds={Array.from(selectedIds)}
                categories={categories}
                brands={brands}
                vendors={vendors}
                onComplete={() => { handleImportComplete(); setSelectedIds(new Set()); }}
            />

            {/* Floating selection action bar */}
            {selectedIds.size > 0 && !bulkUpdateOpen && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-3 bg-[#181725] text-white rounded-[14px] shadow-2xl px-5 py-3 animate-in slide-in-from-bottom-4 duration-200">
                    <span className="text-[13px] font-bold">{selectedIds.size} selected</span>
                    <button
                        onClick={() => setBulkUpdateOpen(true)}
                        className="h-[36px] px-4 bg-[#299E60] hover:bg-[#238a54] rounded-[10px] text-[13px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                        <Wand2 size={14} /> Bulk edit
                    </button>
                    <button
                        onClick={() => setShowBulkDeleteModal(true)}
                        className="h-[36px] px-4 bg-[#E74C3C] hover:bg-[#cf4436] rounded-[10px] text-[13px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="h-[36px] px-3 text-[13px] font-bold text-[#AEAEAE] hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* ============================================================= */}
            {/* Delete Confirmation Modal                                       */}
            {/* ============================================================= */}
            {deleteTarget && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-[80] animate-in fade-in duration-200"
                        onClick={() => !deleting && setDeleteTarget(null)}
                    />
                    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                        <div
                            className="bg-white rounded-[20px] border border-[#EEEEEE] shadow-2xl w-full max-w-[440px] p-8 animate-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-[56px] h-[56px] bg-[#FFF0F0] rounded-[16px] flex items-center justify-center text-[#E74C3C]">
                                    <AlertTriangle size={28} />
                                </div>
                                <h3 className="text-[20px] font-[900] text-[#181725]">Delete Product</h3>
                                <p className="text-[14px] text-[#7C7C7C] font-medium leading-relaxed">
                                    Are you sure you want to delete <strong className="text-[#181725]">{deleteTarget.name}</strong>?
                                    This action cannot be undone.
                                </p>
                                <div className="flex items-center gap-4 w-full mt-2">
                                    <button
                                        onClick={() => setDeleteTarget(null)}
                                        disabled={deleting}
                                        className="flex-1 h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] text-[#181725] rounded-[12px] text-[14px] font-bold hover:bg-[#EEEEEE] transition-all disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="flex-1 h-[48px] bg-[#E74C3C] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#cf4436] transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#E74C3C]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {deleting && <Loader2 size={16} className="animate-spin" />}
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Bulk Delete Confirmation Modal */}
            {showBulkDeleteModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-[80] animate-in fade-in duration-200"
                        onClick={() => !bulkDeleting && setShowBulkDeleteModal(false)}
                    />
                    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                        <div
                            className="bg-white rounded-[20px] border border-[#EEEEEE] shadow-2xl w-full max-w-[440px] p-8 animate-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-[56px] h-[56px] bg-[#FFF0F0] rounded-[16px] flex items-center justify-center text-[#E74C3C]">
                                    <AlertTriangle size={28} />
                                </div>
                                <h3 className="text-[20px] font-[900] text-[#181725]">Delete {selectedIds.size} Products?</h3>
                                <p className="text-[14px] text-[#7C7C7C] font-medium leading-relaxed">
                                    Are you sure you want to delete the <strong className="text-[#181725]">{selectedIds.size}</strong> selected products?
                                    This action cannot be undone.
                                </p>
                                <div className="flex items-center gap-4 w-full mt-2">
                                    <button
                                        onClick={() => setShowBulkDeleteModal(false)}
                                        disabled={bulkDeleting}
                                        className="flex-1 h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] text-[#181725] rounded-[12px] text-[14px] font-bold hover:bg-[#EEEEEE] transition-all disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        disabled={bulkDeleting}
                                        className="flex-1 h-[48px] bg-[#E74C3C] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#cf4436] transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#E74C3C]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {bulkDeleting && <Loader2 size={16} className="animate-spin" />}
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
