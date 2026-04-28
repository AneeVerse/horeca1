'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Search,
    Loader2,
    Plus,
    Upload,
    Download,
    ChevronDown,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/ui/ImageUpload';
import ProductImportModal from '@/components/features/admin/ProductImportModal';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

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
    vendors?: string[];
    vendorStock?: { vendor: string; qty: number }[];
    totalStock?: number;
}

interface Vendor {
    id: string;
    businessName: string;
}

interface Category {
    id: string;
    name: string;
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
    categoryId: string;
    additionalCategoryIds: string[];
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
}

// Same enum-like constants used by vendor form. GST slabs are government-fixed,
// units are universal SI/business units — these are not "mock data".
const UNIT_OPTIONS = ['kg', 'g', 'ml', 'L', 'piece', 'pack', 'box', 'dozen', 'case', 'bag', 'bottle', 'can', 'carton', 'tray'];
const TAX_OPTIONS = ['0', '5', '12', '18', '28'];

const EMPTY_FORM: ProductFormData = {
    name: '',
    sku: '',
    hsn: '',
    barcode: '',
    brand: '',
    categoryId: '',
    additionalCategoryIds: [],
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
};

const STATUS_CONFIG = {
    approved: { label: 'Approved', bg: 'bg-[#EEF8F1]', text: 'text-[#299E60]', dot: 'bg-[#299E60]' },
    pending: { label: 'Pending', bg: 'bg-[#FFF7E6]', text: 'text-[#F59E0B]', dot: 'bg-[#F59E0B]' },
    rejected: { label: 'Rejected', bg: 'bg-[#FFF0F0]', text: 'text-[#E74C3C]', dot: 'bg-[#E74C3C]' },
} as const;

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
    const [loadingMore, setLoadingMore] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Pagination
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);

    // Filters
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterVendor, setFilterVendor] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Panel / Modal state
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Import modal
    const [importOpen, setImportOpen] = useState(false);

    // Export dropdown
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState(false);


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
        async (append = false) => {
            if (append) setLoadingMore(true);
            else setLoading(true);

            try {
                const params = new URLSearchParams();
                params.set('limit', String(PAGE_LIMIT));
                if (debouncedSearch) params.set('search', debouncedSearch);
                if (filterStatus) params.set('approvalStatus', filterStatus);
                if (filterVendor) params.set('vendorId', filterVendor);
                if (filterCategory) params.set('categoryId', filterCategory);
                if (append && cursor) params.set('cursor', cursor);

                const res = await fetch(`/api/v1/admin/products?${params.toString()}`);
                const json = await res.json();

                if (json.success) {
                    const incoming: Product[] = json.data?.products ?? json.data ?? [];
                    setProducts(prev => append ? [...prev, ...incoming] : incoming);
                    setCursor(json.data?.nextCursor ?? null);
                    setHasMore(!!json.data?.nextCursor);
                    if (json.data?.stats) setStats(json.data.stats);
                }
            } catch (err) {
                console.error('Failed to fetch products:', err);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [debouncedSearch, filterStatus, filterVendor, filterCategory, cursor],
    );

    // Refetch on filter change (reset list)
    useEffect(() => {
        setCursor(null);
        setHasMore(false);
        // We need a fresh fetch without cursor — call directly
        const doFetch = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.set('limit', String(PAGE_LIMIT));
                if (debouncedSearch) params.set('search', debouncedSearch);
                if (filterStatus) params.set('approvalStatus', filterStatus);
                if (filterVendor) params.set('vendorId', filterVendor);
                if (filterCategory) params.set('categoryId', filterCategory);

                const res = await fetch(`/api/v1/admin/products?${params.toString()}`);
                const json = await res.json();

                if (json.success) {
                    const incoming: Product[] = json.data?.products ?? json.data ?? [];
                    setProducts(incoming);
                    setCursor(json.data?.nextCursor ?? null);
                    setHasMore(!!json.data?.nextCursor);
                    if (json.data?.stats) setStats(json.data.stats);
                }
            } catch (err) {
                console.error('Failed to fetch products:', err);
            } finally {
                setLoading(false);
            }
        };
        doFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, filterStatus, filterVendor, filterCategory]);

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
            const res = await fetch(`/api/v1/admin/products/${product.id}`, {
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
            const res = await fetch(`/api/v1/admin/products/${deleteTarget.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success || res.ok) {
                setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
            }
        } catch (err) {
            console.error('Failed to delete product:', err);
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    // -----------------------------------------------------------------------
    // Panel: open / close
    // -----------------------------------------------------------------------

    const openCreate = () => {
        setEditingProduct(null);
        setFormData(EMPTY_FORM);
        setFormErrors({});
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

    const openEdit = (product: Product) => {
        setEditingProduct(product);
        const primaryId = product.category?.id ?? '';
        const additionalIds = (product.categoryLinks ?? [])
            .filter(l => l.categoryId !== primaryId)
            .map(l => l.categoryId);
        setFormData({
            name: product.name,
            sku: product.sku ?? '',
            hsn: product.hsn ?? '',
            barcode: '',
            brand: product.brand ?? '',
            categoryId: primaryId,
            additionalCategoryIds: additionalIds,
            description: product.description ?? '',
            basePrice: String(product.basePrice),
            originalPrice: product.originalPrice != null ? String(product.originalPrice) : '',
            vendorId: product.vendor?.id ?? '',
            taxPercent: String(product.taxPercent),
            unit: 'piece',
            minOrderQty: String(product.minOrderQty),
            creditEligible: product.creditEligible,
            imageUrl: product.imageUrl ?? '',
            priceSlabs: [],
        });
        setFormErrors({});
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setTimeout(() => {
            setEditingProduct(null);
            setFormData(EMPTY_FORM);
            setFormErrors({});
        }, 300);
    };

    // -----------------------------------------------------------------------
    // Panel: Save
    // -----------------------------------------------------------------------

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) errors.name = 'Product name is required';
        if (!formData.basePrice || Number(formData.basePrice) <= 0) errors.basePrice = 'Valid base price is required';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
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
            if (formData.categoryId) {
                payload.categoryId = formData.categoryId;
                const joinIds = Array.from(new Set([formData.categoryId, ...formData.additionalCategoryIds]));
                payload.categoryIds = joinIds;
                payload.primaryCategoryId = formData.categoryId;
            }
            if (formData.description.trim()) payload.description = formData.description.trim();
            if (formData.originalPrice && Number(formData.originalPrice) > 0) {
                payload.originalPrice = Number(formData.originalPrice);
            }

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
        // Refresh products list after import
        setCursor(null);
        setHasMore(false);
        const params = new URLSearchParams();
        params.set('limit', String(PAGE_LIMIT));
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (filterStatus) params.set('approvalStatus', filterStatus);
        if (filterVendor) params.set('vendorId', filterVendor);
        if (filterCategory) params.set('categoryId', filterCategory);
        fetch(`/api/v1/admin/products?${params.toString()}`)
            .then(r => r.json())
            .then(json => {
                if (json.success) {
                    const incoming: Product[] = json.data?.products ?? json.data ?? [];
                    setProducts(incoming);
                    setCursor(json.data?.nextCursor ?? null);
                    setHasMore(!!json.data?.nextCursor);
                }
            })
            .catch(console.error);
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
                            <option key={c.id} value={c.id}>{c.name}</option>
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
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="bg-[#F8F9FB]">
                                        <th className="px-6 py-5 text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider w-[60px]">
                                            Image
                                        </th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                            Vendors
                                        </th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                            Inventory
                                        </th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EEEEEE]">
                                    {products.map(product => {
                                        const statusCfg = STATUS_CONFIG[product.approvalStatus];
                                        return (
                                            <tr key={product.id} className="hover:bg-[#F8F9FB]/60 transition-colors group">
                                                {/* Image */}
                                                <td className="px-6 py-4">
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className="w-[44px] h-[44px] rounded-[10px] object-cover border border-[#EEEEEE]"
                                                        />
                                                    ) : (
                                                        <div className="w-[44px] h-[44px] rounded-[10px] bg-[#F8F9FB] border border-[#EEEEEE] flex items-center justify-center text-[#AEAEAE]">
                                                            <ImageIcon size={18} />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Name */}
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-[14px] font-bold text-[#181725] line-clamp-1">
                                                            {product.name}
                                                        </p>
                                                        {product.sku && (
                                                            <p className="text-[11px] text-[#AEAEAE] font-medium mt-0.5">
                                                                SKU: {product.sku}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Vendors */}
                                                <td className="px-6 py-4">
                                                    {(product.vendorCount ?? 0) > 0 ? (
                                                        <span className="text-[13px] font-semibold text-[#181725]" title={product.vendors?.join(', ')}>
                                                            {product.vendorCount} vendor{product.vendorCount !== 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-bold text-[#3B82F6] bg-[#EFF6FF] px-2.5 py-1 rounded-[6px] uppercase tracking-wider">
                                                            Catalog
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Category */}
                                                <td className="px-6 py-4">
                                                    <span className="text-[13px] font-medium text-[#7C7C7C]">
                                                        {product.category?.name ?? '--'}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-1.5 text-[11px] font-[900] px-3 py-1.5 rounded-[8px] uppercase tracking-wider border',
                                                            statusCfg.bg,
                                                            statusCfg.text,
                                                        )}
                                                        style={{ borderColor: 'transparent' }}
                                                    >
                                                        <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                                                        {statusCfg.label}
                                                    </span>
                                                </td>

                                                {/* Inventory — aggregated across vendors */}
                                                <td className="px-6 py-4">
                                                    {(product.vendorCount ?? 0) > 0 ? (
                                                        <div
                                                            className="cursor-default"
                                                            title={product.vendorStock?.map(vs => `${vs.vendor}: ${vs.qty}`).join('\n')}
                                                        >
                                                            <span className={cn(
                                                                'text-[13px] font-bold',
                                                                (product.totalStock ?? 0) > 0 ? 'text-[#181725]' : 'text-[#AEAEAE]',
                                                            )}>
                                                                {product.totalStock ?? 0}
                                                            </span>
                                                            <span className="text-[11px] text-[#AEAEAE] ml-1">
                                                                across {product.vendorCount} vendor{product.vendorCount !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-medium text-[#AEAEAE]">
                                                            —
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Edit */}
                                                        {perms.canWriteProducts && (
                                                            <button
                                                                onClick={() => openEdit(product)}
                                                                title="Edit product"
                                                                className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-[#7C7C7C] hover:bg-[#EEF8F1] hover:text-[#299E60] transition-all"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                        )}

                                                        {/* Toggle Active */}
                                                        {perms.canWriteProducts && (
                                                        <button
                                                            onClick={() => toggleActive(product)}
                                                            disabled={actionLoading === product.id}
                                                            title={product.isActive ? 'Deactivate' : 'Activate'}
                                                            className={cn(
                                                                'w-[36px] h-[36px] rounded-[10px] flex items-center justify-center transition-all disabled:opacity-50',
                                                                product.isActive
                                                                    ? 'text-[#299E60] hover:bg-[#EEF8F1]'
                                                                    : 'text-[#AEAEAE] hover:bg-[#F8F9FB]',
                                                            )}
                                                        >
                                                            {actionLoading === product.id ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : (
                                                                <div
                                                                    className="relative inline-flex h-[20px] w-[36px] shrink-0 items-center rounded-full transition-colors duration-200"
                                                                    style={{ backgroundColor: product.isActive ? '#299E60' : '#D1D5DB' }}
                                                                >
                                                                    <span className="inline-block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: product.isActive ? 'translateX(18px)' : 'translateX(3px)' }} />
                                                                </div>
                                                            )}
                                                        </button>
                                                        )}

                                                        {/* Delete */}
                                                        {perms.canWriteProducts && (
                                                            <button
                                                                onClick={() => setDeleteTarget(product)}
                                                                title="Delete product"
                                                                className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-[#7C7C7C] hover:bg-[#FFF0F0] hover:text-[#E74C3C] transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer / Load More */}
                        <div className="p-6 bg-[#FDFDFD] border-t border-[#EEEEEE] flex items-center justify-between">
                            <p className="text-[13px] text-[#AEAEAE] font-bold uppercase tracking-wider">
                                Showing <span className="text-[#181725]">{products.length}</span> product{products.length !== 1 ? 's' : ''}
                            </p>
                            {hasMore && (
                                <button
                                    onClick={() => fetchProducts(true)}
                                    disabled={loadingMore}
                                    className="h-[40px] px-6 bg-[#299E60] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#238a54] transition-all flex items-center gap-2 shadow-sm disabled:opacity-60"
                                >
                                    {loadingMore ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    Load More
                                </button>
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

                {/* Panel Body */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
                    {formErrors._server && (
                        <div className="flex items-center gap-3 bg-[#FFF0F0] border border-[#E74C3C]/20 text-[#E74C3C] rounded-[12px] px-5 py-4 text-[13px] font-semibold">
                            <AlertTriangle size={18} />
                            {formErrors._server}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div>
                        <h3 className="text-[16px] font-[800] text-[#181725] mb-5">Basic Information</h3>
                        <div className="space-y-5">
                            {/* Product Name */}
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                    Product Name <span className="text-[#E74C3C]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => updateField('name', e.target.value)}
                                    placeholder="Enter product name"
                                    className={cn(
                                        'w-full h-[48px] bg-[#F8F9FB] border rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:bg-white focus:shadow-sm',
                                        formErrors.name ? 'border-[#E74C3C] focus:border-[#E74C3C]' : 'border-[#EEEEEE] focus:border-[#299E60]/40',
                                    )}
                                />
                                {formErrors.name && (
                                    <p className="text-[11px] text-[#E74C3C] font-semibold mt-1.5">{formErrors.name}</p>
                                )}
                            </div>

                            {/* SKU + HSN + Barcode + Unit */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">SKU</label>
                                    <input
                                        type="text"
                                        value={formData.sku}
                                        onChange={e => updateField('sku', e.target.value)}
                                        placeholder="e.g. SKU-001"
                                        className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">HSN Code</label>
                                    <input
                                        type="text"
                                        value={formData.hsn}
                                        onChange={e => updateField('hsn', e.target.value)}
                                        placeholder="e.g. 2106"
                                        className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">Barcode</label>
                                    <input
                                        type="text"
                                        value={formData.barcode}
                                        onChange={e => updateField('barcode', e.target.value)}
                                        placeholder="EAN / UPC"
                                        className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">Unit</label>
                                    <select
                                        value={formData.unit}
                                        onChange={e => updateField('unit', e.target.value)}
                                        className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all focus:border-[#299E60]/40 focus:bg-white cursor-pointer"
                                    >
                                        {UNIT_OPTIONS.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Brand + Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                        Brand
                                    </label>
                                    <input
                                        type="text"
                                        list="admin-brand-options"
                                        value={formData.brand}
                                        onChange={e => updateField('brand', e.target.value)}
                                        placeholder="Select or type brand"
                                        className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                    />
                                    <datalist id="admin-brand-options">
                                        {brands.map(b => (
                                            <option key={b.id} value={b.name} />
                                        ))}
                                    </datalist>
                                    {brands.length === 0 && (
                                        <p className="text-[11px] text-[#AEAEAE] font-medium mt-1.5">
                                            No brands yet — add one in <a href="/admin/brands" className="text-[#299E60] font-bold hover:underline">Brands</a>
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                        Primary Category
                                    </label>
                                    <select
                                        value={formData.categoryId}
                                        onChange={e => {
                                            const newPrimary = e.target.value;
                                            setFormData(prev => ({
                                                ...prev,
                                                categoryId: newPrimary,
                                                additionalCategoryIds: prev.additionalCategoryIds.filter(id => id !== newPrimary),
                                            }));
                                        }}
                                        className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all focus:border-[#299E60]/40 focus:bg-white cursor-pointer"
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Additional Categories (multi-select) */}
                            {formData.categoryId && categories.length > 1 && (
                                <div>
                                    <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                        Additional Categories
                                    </label>
                                    <div className="flex flex-wrap gap-2 bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] p-3">
                                        {categories.filter(c => c.id !== formData.categoryId).map(c => {
                                            const selected = formData.additionalCategoryIds.includes(c.id);
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        additionalCategoryIds: selected
                                                            ? prev.additionalCategoryIds.filter(id => id !== c.id)
                                                            : [...prev.additionalCategoryIds, c.id],
                                                    }))}
                                                    className={cn(
                                                        'px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all',
                                                        selected
                                                            ? 'bg-[#299E60] text-white border-[#299E60]'
                                                            : 'bg-white text-[#7C7C7C] border-[#EEEEEE] hover:border-[#299E60]/40',
                                                    )}
                                                >
                                                    {c.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => updateField('description', e.target.value)}
                                    placeholder="Product description..."
                                    rows={3}
                                    className="w-full bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] p-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Image */}
                    <div>
                        <h3 className="text-[16px] font-[800] text-[#181725] mb-5">Product Image</h3>
                        <ImageUpload
                            value={formData.imageUrl}
                            onChange={(url) => updateField('imageUrl', url)}
                            folder="products"
                            size="lg"
                        />
                    </div>

                    {/* Pricing & Tax */}
                    <div>
                        <h3 className="text-[16px] font-[800] text-[#181725] mb-5">Pricing & Tax</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                    Taxable Rate (Amt) <span className="text-[#E74C3C]">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.basePrice}
                                    onChange={e => updateField('basePrice', e.target.value)}
                                    placeholder="0.00"
                                    className={cn(
                                        'w-full h-[48px] bg-[#F8F9FB] border rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:bg-white focus:shadow-sm',
                                        formErrors.basePrice ? 'border-[#E74C3C] focus:border-[#E74C3C]' : 'border-[#EEEEEE] focus:border-[#299E60]/40',
                                    )}
                                />
                                {formErrors.basePrice && (
                                    <p className="text-[11px] text-[#E74C3C] font-semibold mt-1.5">{formErrors.basePrice}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                    Tax % (GST) <span className="text-[#E74C3C]">*</span>
                                </label>
                                <select
                                    value={formData.taxPercent}
                                    onChange={e => updateField('taxPercent', e.target.value)}
                                    className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all focus:border-[#299E60]/40 focus:bg-white cursor-pointer"
                                >
                                    {TAX_OPTIONS.map(t => (
                                        <option key={t} value={t}>{t}%</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                    Gross Rate (Customer Price) <span className="text-[#E74C3C]">*</span>
                                </label>
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
                                    className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                />
                                {formData.basePrice && parseFloat(formData.taxPercent || '0') > 0 && (
                                    <p className="text-[11px] text-[#7C7C7C] font-medium mt-1.5">
                                        Taxable: {'\u20B9'}{parseFloat(formData.basePrice).toFixed(2)} | GST {formData.taxPercent}%: {'\u20B9'}{(parseFloat(formData.basePrice) * parseFloat(formData.taxPercent || '0') / 100).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bulk Pricing Slabs (up to 3 tiers) \u2014 only useful when assigned to a vendor */}
                    {formData.vendorId && (
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-[16px] font-[800] text-[#181725]">Bulk Pricing Slabs</h3>
                                    <p className="text-[12px] text-[#7C7C7C] font-medium mt-0.5">Up to 3 quantity-based discount tiers (taxable rate, ex-GST)</p>
                                </div>
                                {formData.priceSlabs.length < 3 && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            priceSlabs: [...prev.priceSlabs, { minQty: '', maxQty: '', price: '' }],
                                        }))}
                                        className="px-3 py-2 text-[12px] font-bold text-[#299E60] bg-[#EEF8F1] hover:bg-[#dff2e7] rounded-[10px] transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Add tier
                                    </button>
                                )}
                            </div>
                            {formData.priceSlabs.length === 0 ? (
                                <p className="text-[13px] text-[#AEAEAE] font-medium bg-[#F8F9FB] border border-dashed border-[#EEEEEE] rounded-[12px] px-4 py-6 text-center">
                                    No bulk tiers yet. Click <strong className="text-[#299E60]">Add tier</strong> to offer discounts above the base price.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {formData.priceSlabs.map((slab, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-3 items-end">
                                            <div className="col-span-3">
                                                <label className="block text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-1.5">Min qty *</label>
                                                <input type="number" min="1" value={slab.minQty}
                                                    onChange={e => setFormData(prev => ({
                                                        ...prev,
                                                        priceSlabs: prev.priceSlabs.map((s, idx) => idx === i ? { ...s, minQty: e.target.value } : s),
                                                    }))}
                                                    placeholder="e.g. 10"
                                                    className="w-full h-[44px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] font-medium outline-none focus:border-[#299E60]/40 focus:bg-white" />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-1.5">Max qty</label>
                                                <input type="number" min="1" value={slab.maxQty}
                                                    onChange={e => setFormData(prev => ({
                                                        ...prev,
                                                        priceSlabs: prev.priceSlabs.map((s, idx) => idx === i ? { ...s, maxQty: e.target.value } : s),
                                                    }))}
                                                    placeholder="(optional)"
                                                    className="w-full h-[44px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] font-medium outline-none focus:border-[#299E60]/40 focus:bg-white" />
                                            </div>
                                            <div className="col-span-5">
                                                <label className="block text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-1.5">Price per unit (\u20B9) *</label>
                                                <input type="number" min="0" step="0.01" value={slab.price}
                                                    onChange={e => setFormData(prev => ({
                                                        ...prev,
                                                        priceSlabs: prev.priceSlabs.map((s, idx) => idx === i ? { ...s, price: e.target.value } : s),
                                                    }))}
                                                    placeholder="0.00"
                                                    className="w-full h-[44px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[10px] px-3 text-[14px] font-medium outline-none focus:border-[#299E60]/40 focus:bg-white" />
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button type="button"
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        priceSlabs: prev.priceSlabs.filter((_, idx) => idx !== i),
                                                    }))}
                                                    className="w-[44px] h-[44px] flex items-center justify-center rounded-[10px] bg-[#FFF0F0] text-[#E74C3C] hover:bg-[#FFE4E4] transition-colors">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Vendor Selection (Optional) */}
                    <div>
                        <h3 className="text-[16px] font-[800] text-[#181725] mb-5">Vendor Assignment</h3>
                        <div>
                            <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                Vendor <span className="text-[11px] font-medium text-[#AEAEAE] normal-case">(optional — leave empty for catalog product)</span>
                            </label>
                            <select
                                value={formData.vendorId}
                                onChange={e => updateField('vendorId', e.target.value)}
                                className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all focus:bg-white cursor-pointer focus:border-[#299E60]/40"
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

                    {/* Settings */}
                    <div>
                        <h3 className="text-[16px] font-[800] text-[#181725] mb-5">Settings</h3>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                                    Min Order Qty
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.minOrderQty}
                                    onChange={e => updateField('minOrderQty', e.target.value)}
                                    placeholder="1"
                                    className="w-full h-[48px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] px-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                />
                            </div>

                            {/* Credit Eligible */}
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div
                                    className={cn(
                                        'w-[44px] h-[24px] rounded-full relative transition-colors duration-200',
                                        formData.creditEligible ? 'bg-[#299E60]' : 'bg-[#DCDCDC]',
                                    )}
                                    onClick={() => updateField('creditEligible', !formData.creditEligible)}
                                >
                                    <div
                                        className={cn(
                                            'w-[20px] h-[20px] bg-white rounded-full shadow-sm absolute top-[2px] transition-all duration-200',
                                            formData.creditEligible ? 'left-[22px]' : 'left-[2px]',
                                        )}
                                    />
                                </div>
                                <span className="text-[14px] font-semibold text-[#181725]">Credit Eligible</span>
                            </label>
                        </div>
                    </div>
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
        </div>
    );
}
