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
import ProductBulkUpdateModal from '@/components/features/admin/ProductBulkUpdateModal';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { CategoryMultiPickerById } from '@/components/features/brand/CategoryMultiPickerById';

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
    const [loadingProduct, setLoadingProduct] = useState(false);

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
    const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);

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

    const openEdit = async (product: Product) => {
        setEditingProduct(product);
        setPanelOpen(true);
        setLoadingProduct(true);
        setFormErrors({});

        try {
            const res = await fetch(`/api/v1/admin/products/${product.id}`);
            const json = await res.json();
            const p = json.success ? json.data : product;

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

                            {/* SKU, HSN, Brand, Barcode — 2-column grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel>SKU</FieldLabel>
                                    <input
                                        type="text"
                                        value={formData.sku}
                                        onChange={e => updateField('sku', e.target.value)}
                                        placeholder="e.g., RIC-BAS-001"
                                        className={inputCls}
                                    />
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
                                    <FieldLabel>Brand</FieldLabel>
                                    <select
                                        value={formData.brand}
                                        onChange={e => updateField('brand', e.target.value)}
                                        className={cn(selectCls, 'cursor-pointer')}
                                    >
                                        <option value="">Select brand</option>
                                        {brands.map(b => (
                                            <option key={b.id} value={b.name}>{b.name}</option>
                                        ))}
                                    </select>
                                    {brands.length === 0 && (
                                        <p className="text-[11px] text-[#AEAEAE] font-medium mt-1.5">
                                            No brands yet — add one in <Link href="/admin/brands" className="text-[#299E60] font-bold hover:underline">Brands</Link>
                                        </p>
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

                            {/* Categories — multi-select. First chip is the primary (mirrored
                                into Product.categoryId on the server). disableSuggest hides
                                the "request new" CTA since admin can create categories
                                directly via the Categories page. */}
                            <CategoryMultiPickerById
                                value={formData.categoryIds}
                                onChange={(ids) => setFormData(prev => ({ ...prev, categoryIds: ids }))}
                                max={5}
                                disableSuggest
                                label="Categories"
                                helper="Pick up to 5 — first chip is the primary. Customers can find this product under any of these categories."
                            />

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

                    {/* ======== Section 2: Pricing & Tax ======== */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                        <SectionHeader icon={<DollarSign size={16} />} title="Pricing & Tax" />

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <FieldLabel required>Taxable Rate (Amt)</FieldLabel>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.basePrice}
                                        onChange={e => updateField('basePrice', e.target.value)}
                                        placeholder="0.00"
                                        className={cn(
                                            inputCls,
                                            formErrors.basePrice && 'border-[#E74C3C] focus:border-[#E74C3C]',
                                        )}
                                    />
                                    {formErrors.basePrice && (
                                        <p className="text-[11px] text-[#E74C3C] font-semibold mt-1.5">{formErrors.basePrice}</p>
                                    )}
                                </div>
                                <div>
                                    <FieldLabel required>Tax % (GST)</FieldLabel>
                                    <select
                                        value={formData.taxPercent}
                                        onChange={e => updateField('taxPercent', e.target.value)}
                                        className={cn(selectCls, 'cursor-pointer')}
                                    >
                                        {TAX_OPTIONS.map(t => (
                                            <option key={t} value={t}>{t}%</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <FieldLabel required>Gross Rate (Customer Price)</FieldLabel>
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
                                        className={inputCls}
                                    />
                                    {formData.basePrice && parseFloat(formData.taxPercent || '0') > 0 && (
                                        <p className="text-[11px] text-[#7C7C7C] font-medium mt-1.5">
                                            Taxable: {'\u20B9'}{parseFloat(formData.basePrice).toFixed(2)} | GST {formData.taxPercent}%: {'\u20B9'}{(parseFloat(formData.basePrice) * parseFloat(formData.taxPercent || '0') / 100).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ======== Section 3: Bulk Pricing Tiers (only when assigned to a vendor) ======== */}
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
                                        {/* Tier header */}
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

                                        {/* Tier body */}
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

                    {/* ======== Section 4: Vendor Assignment (admin-only) ======== */}
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

                            {/* Credit Eligible */}
                            <label className="flex items-center gap-3 cursor-pointer py-1">
                                <input
                                    type="checkbox"
                                    checked={formData.creditEligible}
                                    onChange={(e) => updateField('creditEligible', e.target.checked)}
                                    className="w-5 h-5 accent-[#299E60] shrink-0"
                                />
                                <div>
                                    <span className="text-[14px] font-bold text-[#181725]">Credit Eligible</span>
                                    <p className="text-[11px] text-[#AEAEAE] font-medium">Allow buyers to purchase this product on credit terms</p>
                                </div>
                            </label>

                            {/* Featured Product */}
                            <label className="flex items-center gap-3 cursor-pointer py-1">
                                <input
                                    type="checkbox"
                                    checked={formData.isFeatured}
                                    onChange={(e) => updateField('isFeatured', e.target.checked)}
                                    className="w-5 h-5 accent-[#F59E0B] shrink-0"
                                />
                                <div>
                                    <span className="text-[14px] font-bold text-[#181725]">Featured Product</span>
                                    <p className="text-[11px] text-[#AEAEAE] font-medium">Highlight this product in search results and vendor page</p>
                                </div>
                            </label>

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

                            {/* Storage Type */}
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

                            {/* FSSAI Reference */}
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

                            {/* Alias / Search Names */}
                            <div>
                                <FieldLabel>Alias / Search Names</FieldLabel>
                                <TagInput
                                    tags={formData.aliasNames}
                                    onChange={(names) => setFormData(prev => ({ ...prev, aliasNames: names }))}
                                />
                                <p className="text-[11px] text-[#AEAEAE] font-medium mt-1">Alternate names buyers may search by (e.g. local language variants)</p>
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
                                <p className="text-[11px] text-[#AEAEAE] font-medium mt-1">Products shown to buyers when this item is out of stock</p>
                            </div>
                        </div>
                    </div>
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
            {/* Bulk Update Modal                                               */}
            {/* ============================================================= */}
            <ProductBulkUpdateModal
                open={bulkUpdateOpen}
                onClose={() => setBulkUpdateOpen(false)}
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
