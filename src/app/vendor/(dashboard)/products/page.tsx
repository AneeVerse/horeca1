'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, Plus, Loader2, Package, Pencil, X,
    ChevronRight, ChevronLeft, Info, ImageIcon, Settings, DollarSign, Trash2,
    BarChart3, BoxIcon, Tag, Upload, Percent, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ImageUpload, MultiImageUpload } from '@/components/ui/ImageUpload';
import { CategoryMultiPickerById } from '@/components/features/brand/CategoryMultiPickerById';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VendorProduct {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    originalPrice?: number;
    packSize: string | null;
    unit: string | null;
    imageUrl: string | null;
    isActive: boolean;
    isFeatured: boolean;
    description: string | null;
    creditEligible: boolean;
    categoryName: string;
    categorySlug: string;
    in_stock: boolean;
    qty_available: number;
    sku?: string | null;
    hsn?: string | null;
    brand?: string | null;
    barcode?: string | null;
    taxPercent?: number | null;
    minOrderQty?: number | null;
    tags?: string[] | null;
    images?: string[] | null;
    category?: { id?: string; name: string; slug: string } | null;
    inventory?: { qtyAvailable: number; qtyReserved: number } | null;
    priceSlabs?: { minQty: number; maxQty?: number | null; price: number }[];
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvalNote?: string | null;
    vegNonVeg?: 'veg' | 'nonveg' | 'egg' | null;
    storageType?: string | null;
}

interface Category {
    id: string;
    name: string;
    slug: string;
    parentId?: string | null; // null = top-level Category; set = Sub-Category (rendered with leading "— ")
    children?: Category[];    // nested sub-categories returned by /api/v1/categories
}

interface BrandOption {
    id: string;
    name: string;
}

interface PriceSlabRow {
    minQty: string;
    maxQty: string;
    price: string;
}

interface ProductForm {
    name: string;
    slug: string;
    // Multi-category — vendor picks 1..N category IDs. First entry becomes the
    // primary on the server (mirrored into Product.categoryId). Empty is allowed.
    categoryIds: string[];
    basePrice: string;
    originalPrice: string;
    packSize: string;
    unit: string;
    sku: string;
    hsn: string;
    brand: string;
    barcode: string;
    description: string;
    imageUrl: string;
    images: string[];
    tags: string[];
    aliasNames: string[];
    vegNonVeg: '' | 'veg' | 'nonveg' | 'egg';
    storageType: string;
    shelfLifeDays: string;
    countryOfOrigin: string;
    taxPercent: string;
    minOrderQty: string;
    creditEligible: boolean;
    isFeatured: boolean;
    fssaiRef: string;
    substituteIds: string[];
    priceSlabs: PriceSlabRow[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const UNIT_OPTIONS = ['kg', 'g', 'ml', 'L', 'piece', 'pack', 'box', 'dozen', 'case', 'bag', 'bottle', 'can', 'carton', 'tray'];
const PAGE_SIZE = 20;

const EMPTY_FORM: ProductForm = {
    name: '',
    slug: '',
    categoryIds: [],
    basePrice: '',
    originalPrice: '',
    packSize: '',
    unit: '',
    sku: '',
    hsn: '',
    brand: '',
    barcode: '',
    description: '',
    imageUrl: '',
    images: [],
    tags: [],
    aliasNames: [],
    vegNonVeg: '',
    storageType: '',
    shelfLifeDays: '',
    countryOfOrigin: '',
    taxPercent: '0',
    minOrderQty: '1',
    creditEligible: false,
    isFeatured: false,
    fssaiRef: '',
    substituteIds: [],
    priceSlabs: [],
};

const TAX_OPTIONS = ['0', '5', '12', '18', '28'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Gross = taxable * (1 + tax/100)
function calcGrossRate(taxableRate: string, taxPercent: string): string {
    const t = parseFloat(taxableRate);
    const tp = parseFloat(taxPercent);
    if (isNaN(t) || isNaN(tp) || tp < 0) return '';
    return (t * (1 + tp / 100)).toFixed(2);
}

// Taxable = gross / (1 + tax/100)
function calcTaxableFromGross(grossRate: string, taxPercent: string): string {
    const g = parseFloat(grossRate);
    const tp = parseFloat(taxPercent);
    if (isNaN(g) || isNaN(tp) || tp < 0) return '';
    if (tp === 0) return g.toFixed(2);
    return (g / (1 + tp / 100)).toFixed(2);
}

function calcTaxAmount(taxableRate: string, taxPercent: string): string {
    const t = parseFloat(taxableRate);
    const tp = parseFloat(taxPercent);
    if (isNaN(t) || isNaN(tp) || tp <= 0) return '0.00';
    return (t * tp / 100).toFixed(2);
}

function calcSavingsPercent(base: string, original: string): number | null {
    const b = parseFloat(base);
    const o = parseFloat(original);
    if (isNaN(b) || isNaN(o) || o <= b) return null;
    return Math.round(((o - b) / o) * 100);
}

/* ------------------------------------------------------------------ */
/*  Pagination helper                                                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Reusable small components                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Tag Input                                                          */
/* ------------------------------------------------------------------ */

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
    products: VendorProduct[];
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
                <div className="border border-[#EEEEEE] rounded-[10px] overflow-hidden">
                    {candidates.map(p => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => add(p.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F5F5F5] text-left transition-colors border-b border-[#F5F5F5] last:border-0"
                        >
                            <Package size={14} className="text-[#AEAEAE] shrink-0" />
                            <span className="text-[13px] text-[#181725] truncate">{p.name}</span>
                            {p.packSize && <span className="text-[11px] text-[#AEAEAE] ml-auto shrink-0">{p.packSize}</span>}
                        </button>
                    ))}
                </div>
            )}
            {query.length > 0 && candidates.length === 0 && (
                <p className="text-[12px] text-[#AEAEAE] py-2">No matching products found</p>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

interface ProductSuggestion {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    originalPrice?: number | null;
    packSize?: string | null;
    unit?: string | null;
    sku?: string | null;
    hsn?: string | null;
    brand?: string | null;
    barcode?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    images?: string[] | null;
    tags?: string[] | null;
    taxPercent?: number | null;
    minOrderQty?: number | null;
    creditEligible?: boolean;
    category?: { id: string; name: string; slug: string } | null;
    vendor?: { businessName: string } | null;
}

interface BrandSuggestion {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    packSize?: string | null;
    unit?: string | null;
    sku?: string | null;
    brand: { id: string; name: string; slug: string; logoUrl?: string | null };
    category?: { id: string; name: string; slug: string } | null;
}

export default function VendorProductsPage() {
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<BrandOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'featured'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
    const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [loadingProduct, setLoadingProduct] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Product suggestion state
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [brandSuggestions, setBrandSuggestions] = useState<BrandSuggestion[]>([]);
    const [ownMatches, setOwnMatches] = useState<{ id: string; name: string; approvalStatus: string; isActive: boolean }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [basedOnProductId, setBasedOnProductId] = useState<string | null>(null);
    const [basedOnBrandMasterProductId, setBasedOnBrandMasterProductId] = useState<string | null>(null);
    const [basedOnBrandName, setBasedOnBrandName] = useState<string | null>(null);
    const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState<VendorProduct | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Bulk price update
    const [showBulkPrice, setShowBulkPrice] = useState(false);
    const [bulkUpdateType, setBulkUpdateType] = useState<'price' | 'status'>('price');
    const [bulkPriceCategoryId, setBulkPriceCategoryId] = useState<string | null>(null);
    const [bulkPriceType, setBulkPriceType] = useState<'percent' | 'fixed'>('percent');
    const [bulkPriceValue, setBulkPriceValue] = useState('');
    const [bulkPriceApplySlabs, setBulkPriceApplySlabs] = useState(true);
    const [bulkPriceSaving, setBulkPriceSaving] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<boolean>(true);

    // Bulk import
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [importRows, setImportRows] = useState<Array<{ name: string; sku: string; basePrice: number; packSize?: string; unit?: string; error?: string }>>([]);
    const [importSaving, setImportSaving] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);

    /* ---- Data fetching ---- */

    const fetchProducts = useCallback(async (showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            const res = await fetch('/api/v1/vendor/products?limit=200');
            const json = await res.json();
            if (json.success) setProducts(json.data.products);
        } catch (err) {
            console.error('Failed to load products:', err);
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
        fetch('/api/v1/categories')
            .then(r => r.json())
            .then(json => {
                if (!json.success) return;
                // /api/v1/categories only returns top-level rows but nests each parent's
                // children inline. Flatten into one ordered list so the dropdown can show
                // sub-categories (Cheese, Milk under Dairy etc) — otherwise the vendor
                // can never tag a product with a sub-category.
                type CatRow = Category & { children?: Category[] };
                const flat: Category[] = [];
                for (const parent of (json.data as CatRow[])) {
                    flat.push(parent);
                    if (Array.isArray(parent.children)) {
                        for (const child of parent.children) flat.push(child);
                    }
                }
                setCategories(flat);
            })
            .catch(console.error);
        fetch('/api/v1/brands?limit=100')
            .then(r => r.json())
            .then(json => { if (json.success) setBrands((json.data?.brands ?? json.data ?? []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }))); })
            .catch(console.error);
    }, [fetchProducts]);

    // Reset to page 1 when search or filter changes
    useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            statusFilter === 'all' ? true :
            statusFilter === 'active' ? p.isActive :
            statusFilter === 'inactive' ? !p.isActive :
            statusFilter === 'featured' ? p.isFeatured :
            true;
        return matchesSearch && matchesFilter;
    });
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedProducts = filteredProducts.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);
    const pageRange = getPageRange(safeCurrentPage, totalPages);

    /* ---- Product suggestions (autocomplete) ---- */

    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSuggestions([]);
            setBrandSuggestions([]);
            setOwnMatches([]);
            setShowSuggestions(false);
            return;
        }
        setLoadingSuggestions(true);
        try {
            const res = await fetch(`/api/v1/vendor/products/suggestions?q=${encodeURIComponent(query)}`);
            const json = await res.json();
            if (json.success) {
                const s = json.data.suggestions || [];
                const bs = json.data.brandSuggestions || [];
                const own = json.data.ownMatches || [];
                setSuggestions(s);
                setBrandSuggestions(bs);
                setOwnMatches(own);
                if (s.length > 0 || bs.length > 0 || own.length > 0) {
                    setShowSuggestions(true);
                } else {
                    setShowSuggestions(false);
                }
            } else {
                setSuggestions([]);
                setBrandSuggestions([]);
                setOwnMatches([]);
                setShowSuggestions(false);
            }
        } catch {
            setSuggestions([]);
            setBrandSuggestions([]);
            setOwnMatches([]);
        } finally {
            setLoadingSuggestions(false);
        }
    }, []);

    const handleNameChange = (name: string) => {
        setForm(prev => ({ ...prev, name, slug: slugify(name) }));
        setBasedOnProductId(null); // Reset if they type again
        setBasedOnBrandMasterProductId(null);
        setBasedOnBrandName(null);

        // Debounce suggestion fetch (only when adding new product)
        if (!editingProduct) {
            if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
            suggestionTimeoutRef.current = setTimeout(() => fetchSuggestions(name), 350);
        }
    };

    const fillFromSuggestion = (s: ProductSuggestion) => {
        setBasedOnProductId(s.id);
        setShowSuggestions(false);
        setSuggestions([]);
        // Suggestion gives us category by slug — resolve to ID for the multi-select.
        const matched = s.category?.slug ? categories.find(c => c.slug === s.category!.slug) : null;
        const seedCategoryIds = matched ? [matched.id] : [];
        setForm(prev => ({
            ...prev,
            name: s.name,
            slug: slugify(s.name),
            categoryIds: seedCategoryIds.length > 0 ? seedCategoryIds : prev.categoryIds,
            basePrice: s.basePrice != null ? String(s.basePrice) : prev.basePrice,
            originalPrice: s.originalPrice != null ? String(s.originalPrice) : '',
            packSize: s.packSize || '',
            unit: s.unit || '',
            sku: s.sku || prev.sku,
            hsn: s.hsn || prev.hsn,
            brand: s.brand || '',
            barcode: s.barcode || prev.barcode,
            description: s.description || '',
            imageUrl: s.imageUrl || '',
            images: Array.isArray(s.images) ? s.images : [],
            tags: Array.isArray(s.tags) ? s.tags : [],
            taxPercent: s.taxPercent != null ? String(s.taxPercent) : '0',
            minOrderQty: s.minOrderQty != null ? String(s.minOrderQty) : '1',
            creditEligible: !!s.creditEligible,
        }));
    };

    const fillFromBrandSuggestion = (b: BrandSuggestion) => {
        setShowSuggestions(false);
        setSuggestions([]);
        setBrandSuggestions([]);
        setBasedOnBrandMasterProductId(b.id);
        setBasedOnBrandName(b.brand.name);
        const matched = b.category?.slug ? categories.find(c => c.slug === b.category!.slug) : null;
        const seedCategoryIds = matched ? [matched.id] : [];
        setForm(prev => ({
            ...prev,
            name: b.name,
            slug: slugify(b.name),
            categoryIds: seedCategoryIds.length > 0 ? seedCategoryIds : prev.categoryIds,
            packSize: b.packSize || prev.packSize,
            unit: b.unit || prev.unit,
            sku: b.sku || prev.sku,
            brand: b.brand.name,
            description: b.description || prev.description,
            imageUrl: b.imageUrl || prev.imageUrl,
        }));
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* ---- Panel open / close ---- */

    const openAddPanel = () => {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setBasedOnProductId(null);
        setBasedOnBrandMasterProductId(null);
        setBasedOnBrandName(null);
        setSuggestions([]);
        setBrandSuggestions([]);
        setShowSuggestions(false);
        setIsPanelOpen(true);
    };

    const openEditPanel = async (product: VendorProduct) => {
        setEditingProduct(product);
        setFormError('');
        setIsPanelOpen(true);
        setLoadingProduct(true);

        // Fetch full product details (including priceSlabs) from API
        try {
            const res = await fetch(`/api/v1/vendor/products/${product.id}`);
            const json = await res.json();
            const p = json.success ? json.data : product;

            // Pre-fill multi-category: prefer the categoryLinks join rows (full set,
            // primary-first), fall back to the legacy single Product.categoryId for
            // older rows that haven't been migrated to the join table yet.
            const linkIds: string[] = Array.isArray(p.categoryLinks)
                ? (p.categoryLinks as Array<{ categoryId: string }>).map(l => l.categoryId)
                : [];
            const fallbackId: string | null = p.category?.id ?? null;
            const editCategoryIds = linkIds.length > 0
                ? linkIds
                : (fallbackId ? [fallbackId] : []);

            setForm({
                name: p.name || '',
                slug: p.slug || '',
                categoryIds: editCategoryIds,
                basePrice: p.basePrice != null ? String(p.basePrice) : '',
                originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
                packSize: p.packSize || '',
                unit: p.unit || '',
                sku: p.sku || '',
                hsn: p.hsn || '',
                fssaiRef: p.fssaiRef || '',
                brand: p.brand || '',
                barcode: p.barcode || '',
                description: p.description || '',
                imageUrl: p.imageUrl || '',
                images: Array.isArray(p.images) ? p.images : [],
                tags: Array.isArray(p.tags) ? p.tags : [],
                aliasNames: Array.isArray(p.aliasNames) ? p.aliasNames : [],
                substituteIds: Array.isArray((p as { substituteIds?: string[] }).substituteIds) ? (p as { substituteIds?: string[] }).substituteIds! : [],
                vegNonVeg: (p.vegNonVeg as '' | 'veg' | 'nonveg' | 'egg') || '',
                storageType: p.storageType || '',
                shelfLifeDays: p.shelfLifeDays != null ? String(p.shelfLifeDays) : '',
                countryOfOrigin: p.countryOfOrigin || '',
                taxPercent: p.taxPercent != null ? String(p.taxPercent) : '0',
                minOrderQty: p.minOrderQty != null ? String(p.minOrderQty) : '1',
                creditEligible: !!p.creditEligible,
                isFeatured: !!p.isFeatured,
                priceSlabs: Array.isArray(p.priceSlabs)
                    ? p.priceSlabs.map((s: { minQty: number; maxQty?: number | null; price: number }) => ({
                        minQty: String(s.minQty),
                        maxQty: s.maxQty != null ? String(s.maxQty) : '',
                        price: String(s.price),
                    }))
                    : [],
            });
        } catch {
            // Fallback: populate from the product list data. We don't have full
            // categoryLinks here — best-effort resolve from the list's slug.
            const fallbackMatch = product.category?.slug
                ? categories.find(c => c.slug === product.category!.slug)
                : null;
            setForm({
                name: product.name,
                slug: product.slug,
                categoryIds: fallbackMatch ? [fallbackMatch.id] : [],
                basePrice: String(product.basePrice),
                originalPrice: '',
                packSize: product.packSize || '',
                unit: product.unit || '',
                sku: '',
                hsn: '',
                fssaiRef: '',
                brand: '',
                barcode: '',
                description: product.description || '',
                imageUrl: product.imageUrl || '',
                images: [],
                tags: [],
                aliasNames: [],
                vegNonVeg: '',
                storageType: '',
                shelfLifeDays: '',
                countryOfOrigin: '',
                taxPercent: '0',
                minOrderQty: '1',
                creditEligible: product.creditEligible,
                isFeatured: product.isFeatured,
                substituteIds: [],
                priceSlabs: [],
            });
        } finally {
            setLoadingProduct(false);
        }
    };

    const closePanel = () => {
        setIsPanelOpen(false);
        setEditingProduct(null);
    };

    /* ---- Form field helpers ---- */

    const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    /* ---- Price slabs ---- */

    const addPriceSlab = () => {
        setForm(prev => ({
            ...prev,
            priceSlabs: [...prev.priceSlabs, { minQty: '', maxQty: '', price: '' }],
        }));
    };

    const updatePriceSlab = (index: number, field: keyof PriceSlabRow, value: string) => {
        setForm(prev => {
            const slabs = [...prev.priceSlabs];
            slabs[index] = { ...slabs[index], [field]: value };
            return { ...prev, priceSlabs: slabs };
        });
    };

    const removePriceSlab = (index: number) => {
        setForm(prev => ({
            ...prev,
            priceSlabs: prev.priceSlabs.filter((_, i) => i !== index),
        }));
    };

    /* ---- Additional images ---- */

    const addImage = () => {
        setForm(prev => ({ ...prev, images: [...prev.images, ''] }));
    };

    const updateImage = (index: number, value: string) => {
        setForm(prev => {
            const images = [...prev.images];
            images[index] = value;
            return { ...prev, images };
        });
    };

    const removeImage = (index: number) => {
        setForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }));
    };

    /* ---- Submit ---- */

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.basePrice) {
            setFormError('Product Name and Base Price are required.');
            panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSaving(true);
        setFormError('');
        try {
            const body: Record<string, unknown> = {
                name: form.name,
                slug: form.slug || slugify(form.name),
                basePrice: parseFloat(form.basePrice),
                packSize: form.packSize || undefined,
                unit: form.unit || undefined,
                description: form.description || undefined,
                imageUrl: form.imageUrl || undefined,
                creditEligible: form.creditEligible,
                isFeatured: form.isFeatured,
                sku: form.sku || undefined,
                hsn: form.hsn || undefined,
                fssaiRef: form.fssaiRef || undefined,
                brand: form.brand || undefined,
                barcode: form.barcode || undefined,
                taxPercent: form.taxPercent ? parseFloat(form.taxPercent) : 0,
                minOrderQty: form.minOrderQty ? parseInt(form.minOrderQty, 10) : 1,
                tags: form.tags.length > 0 ? form.tags : undefined,
                aliasNames: form.aliasNames.length > 0 ? form.aliasNames : undefined,
                substituteIds: form.substituteIds.length > 0 ? form.substituteIds : undefined,
                shelfLifeDays: form.shelfLifeDays ? parseInt(form.shelfLifeDays, 10) : undefined,
                countryOfOrigin: form.countryOfOrigin || undefined,
                vegNonVeg: form.vegNonVeg || undefined,
                storageType: form.storageType || undefined,
                images: form.images.filter(Boolean).length > 0 ? form.images.filter(Boolean) : undefined,
            };

            if (form.originalPrice) {
                body.originalPrice = parseFloat(form.originalPrice);
            }

            // Categories — the multi-picker already stores UUIDs, send the array
            // directly. The backend mirrors the first entry into Product.categoryId
            // for back-compat with single-category queries. Sending an empty array
            // clears the category set; omit the field to leave it untouched.
            if (form.categoryIds.length > 0) {
                body.categoryIds = form.categoryIds;
                body.categoryId = form.categoryIds[0];
            } else if (editingProduct) {
                // Existing product, user removed all categories — explicitly clear.
                body.categoryIds = [];
            }

            // Price slabs: sort by minQty, filter out incomplete rows
            const slabs = form.priceSlabs
                .filter(s => s.minQty && s.price)
                .map(s => ({
                    minQty: parseInt(s.minQty, 10),
                    maxQty: s.maxQty ? parseInt(s.maxQty, 10) : undefined,
                    price: parseFloat(s.price),
                }))
                .sort((a, b) => a.minQty - b.minQty);

            if (slabs.length > 0) {
                body.priceSlabs = slabs;
            }

            // If based on an existing approved product, include for auto-approval
            if (basedOnProductId && !editingProduct) {
                body.basedOnProductId = basedOnProductId;
            }

            // If based on a brand canonical product, include so the backend
            // auto-approves AND creates a verified BrandProductMapping.
            if (basedOnBrandMasterProductId && !editingProduct) {
                body.basedOnBrandMasterProductId = basedOnBrandMasterProductId;
            }

            // Don't send locked fields for approved products
            if (editingProduct?.approvalStatus === 'approved') {
                delete body.name;
                delete body.slug;
                delete body.brand;
                delete body.imageUrl;
                delete body.images;
            }

            let res: Response;
            if (editingProduct) {
                res = await fetch(`/api/v1/vendor/products/${editingProduct.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            } else {
                res = await fetch('/api/v1/vendor/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            }

            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to save product');

            closePanel();

            // Optimistically update local state immediately so the product
            // is visible right away (before the background refetch completes).
            const p = json.data;
            const cat = categories.find(c => c.id === p.categoryId);
            if (editingProduct) {
                // Merge updated fields into the existing entry
                setProducts(prev => prev.map(existing => existing.id === p.id ? {
                    ...existing,
                    basePrice: Number(p.basePrice),
                    originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
                    packSize: p.packSize ?? null,
                    unit: p.unit ?? null,
                    imageUrl: p.imageUrl ?? null,
                    isActive: p.isActive ?? existing.isActive,
                    description: p.description ?? null,
                    creditEligible: p.creditEligible ?? existing.creditEligible,
                    isFeatured: p.isFeatured ?? existing.isFeatured,
                    categoryName: cat?.name ?? existing.categoryName,
                    categorySlug: cat?.slug ?? existing.categorySlug,
                    sku: p.sku ?? null,
                    hsn: p.hsn ?? null,
                    brand: p.brand ?? null,
                    barcode: p.barcode ?? null,
                    taxPercent: p.taxPercent != null ? Number(p.taxPercent) : null,
                    minOrderQty: p.minOrderQty ?? existing.minOrderQty,
                    tags: p.tags ?? null,
                    approvalStatus: p.approvalStatus ?? existing.approvalStatus,
                    approvalNote: p.approvalNote ?? null,
                } : existing));
            } else {
                // Prepend new product so it appears at the top immediately
                const optimistic: VendorProduct = {
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    basePrice: Number(p.basePrice),
                    originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
                    packSize: p.packSize ?? null,
                    unit: p.unit ?? null,
                    imageUrl: p.imageUrl ?? null,
                    isActive: p.isActive ?? true,
                    isFeatured: p.isFeatured ?? false,
                    description: p.description ?? null,
                    creditEligible: p.creditEligible ?? false,
                    categoryName: cat?.name ?? '',
                    categorySlug: cat?.slug ?? '',
                    in_stock: false,
                    qty_available: 0,
                    sku: p.sku ?? null,
                    hsn: p.hsn ?? null,
                    brand: p.brand ?? null,
                    barcode: p.barcode ?? null,
                    taxPercent: p.taxPercent != null ? Number(p.taxPercent) : null,
                    minOrderQty: p.minOrderQty ?? 1,
                    tags: p.tags ?? null,
                    images: p.images ?? null,
                    approvalStatus: p.approvalStatus ?? 'pending',
                    approvalNote: p.approvalNote ?? null,
                };
                setProducts(prev => [optimistic, ...prev]);
            }

            // Background refetch to sync with server (no loading spinner)
            fetchProducts(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Save failed';
            setFormError(msg);
            panelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    /* ---- Toggle active ---- */

    const toggleActive = async (product: VendorProduct) => {
        try {
            const res = await fetch(`/api/v1/vendor/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !product.isActive }),
            });
            const json = await res.json();
            if (json.success) {
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: !p.isActive } : p));
            }
        } catch (err) {
            console.error('Toggle failed:', err);
        }
    };

    /* ---- Toggle featured ---- */

    const toggleFeatured = async (product: VendorProduct) => {
        // Optimistic update
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFeatured: !p.isFeatured } : p));
        try {
            const res = await fetch(`/api/v1/vendor/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFeatured: !product.isFeatured }),
            });
            const json = await res.json();
            if (!json.success) {
                // Revert on error
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFeatured: product.isFeatured } : p));
                toast.error('Failed to update featured status');
            }
        } catch {
            // Revert on error
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFeatured: product.isFeatured } : p));
            toast.error('Failed to update featured status');
        }
    };

    /* ---- Delete product ---- */

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/v1/vendor/products/${deleteTarget.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
            }
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    /* ---- Bulk status update ---- */

    const handleBulkStatusUpdate = async () => {
        const filtered = bulkPriceCategoryId
            ? products.filter(p => p.category?.id === bulkPriceCategoryId)
            : products;
        if (filtered.length === 0) { toast.error('No products match the selected filter'); return; }
        setBulkPriceSaving(true);
        try {
            await Promise.all(
                filtered.map(p =>
                    fetch(`/api/v1/vendor/products/${p.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isActive: bulkStatus }),
                    })
                )
            );
            toast.success(`Set ${filtered.length} product${filtered.length !== 1 ? 's' : ''} to ${bulkStatus ? 'Active' : 'Inactive'}`);
            setShowBulkPrice(false);
            fetchProducts(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed');
        } finally {
            setBulkPriceSaving(false);
        }
    };

    /* ---- Bulk price update ---- */

    const handleBulkPriceUpdate = async () => {
        const val = parseFloat(bulkPriceValue);
        if (isNaN(val) || val === 0) { toast.error('Enter a non-zero adjustment value'); return; }
        setBulkPriceSaving(true);
        try {
            const res = await fetch('/api/v1/vendor/products/bulk-price', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryId: bulkPriceCategoryId,
                    adjustmentType: bulkPriceType,
                    adjustmentValue: val,
                    applyToSlabs: bulkPriceApplySlabs,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            toast.success(`Updated prices for ${json.updated} product${json.updated !== 1 ? 's' : ''}`);
            setShowBulkPrice(false);
            setBulkPriceValue('');
            fetchProducts(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed');
        } finally {
            setBulkPriceSaving(false);
        }
    };

    /* ---- Bulk CSV import ---- */

    const parseImportCsv = (text: string) => {
        const lines = text.trim().split('\n').filter(Boolean);
        const rows = lines.map(line => {
            const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
            const [name, sku, rawPrice, packSize, unit] = parts;
            const basePrice = parseFloat(rawPrice ?? '');
            const error = !name ? 'Missing name' : !sku ? 'Missing SKU' : isNaN(basePrice) ? 'Invalid price' : undefined;
            return { name: name ?? '', sku: sku ?? '', basePrice: isNaN(basePrice) ? 0 : basePrice, packSize, unit, error };
        }).filter(r => r.sku.toLowerCase() !== 'sku' && r.name.toLowerCase() !== 'name'); // skip header
        setImportRows(rows);
    };

    const handleImportFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = e => parseImportCsv(e.target?.result as string);
        reader.readAsText(file);
    };

    const handleBulkImport = async () => {
        const validRows = importRows.filter(r => !r.error);
        if (validRows.length === 0) { toast.error('No valid rows to import'); return; }
        setImportSaving(true);
        try {
            const res = await fetch('/api/v1/vendor/products/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: validRows }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            toast.success(`Imported: ${json.created} created, ${json.updated} updated`);
            setShowBulkImport(false);
            setImportRows([]);
            fetchProducts(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setImportSaving(false);
        }
    };

    /* ---- Derived values ---- */

    const grossRate = calcGrossRate(form.basePrice, form.taxPercent);
    const taxAmount = calcTaxAmount(form.basePrice, form.taxPercent);
    const savings = calcSavingsPercent(grossRate, form.originalPrice);

    /* ------------------------------------------------------------------ */
    /*  Render                                                             */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Products</h1>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70">Manage your product catalog</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-full md:w-[220px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={15} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-[40px] w-full bg-white border border-[#EEEEEE] rounded-[10px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowBulkImport(true)}
                        className="h-[40px] px-3.5 border border-[#EEEEEE] bg-white rounded-[10px] text-[12px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all flex items-center gap-1.5 shrink-0"
                    >
                        <Upload size={13} />
                        Import CSV
                    </button>
                    <button
                        onClick={() => setShowBulkPrice(true)}
                        className="h-[40px] px-3.5 border border-[#EEEEEE] bg-white rounded-[10px] text-[12px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all flex items-center gap-1.5 shrink-0"
                    >
                        <Percent size={13} />
                        Bulk Price
                    </button>
                    <button
                        onClick={openAddPanel}
                        className="h-[40px] px-4 bg-[#299E60] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#238a54] transition-all shadow-sm flex items-center gap-2 shrink-0"
                    >
                        <Plus size={16} />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
                {(['all', 'active', 'inactive', 'featured'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setStatusFilter(tab)}
                        className={cn(
                            'h-[34px] px-4 rounded-[8px] text-[12px] font-bold transition-all flex items-center gap-1.5',
                            statusFilter === tab
                                ? 'bg-[#299E60] text-white shadow-sm'
                                : 'bg-white border border-[#EEEEEE] text-[#7C7C7C] hover:bg-[#F5F5F5]'
                        )}
                    >
                        {tab === 'featured' && <Star size={12} className={statusFilter === 'featured' ? 'fill-white' : 'fill-[#AEAEAE] text-[#AEAEAE]'} />}
                        {tab === 'all' ? 'All' : tab === 'active' ? 'Active' : tab === 'inactive' ? 'Inactive' : 'Featured'}
                        <span className={cn(
                            'ml-0.5 text-[10px] font-[900] px-1.5 py-0.5 rounded-[4px]',
                            statusFilter === tab ? 'bg-white/20 text-white' : 'bg-[#F5F5F5] text-[#AEAEAE]'
                        )}>
                            {tab === 'all' ? products.length :
                             tab === 'active' ? products.filter(p => p.isActive).length :
                             tab === 'inactive' ? products.filter(p => !p.isActive).length :
                             products.filter(p => p.isFeatured).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#299E60]" size={32} />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-20 text-center">
                        <Package size={40} className="text-[#E5E7EB] mx-auto mb-3" />
                        <p className="text-[14px] font-bold text-[#AEAEAE]">
                            {searchQuery ? `No products matching "${searchQuery}"` : 'No products yet. Add your first product!'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                    <th className="px-6 py-4 text-left text-[12px] font-bold text-[#AEAEAE] uppercase">Product</th>
                                    <th className="px-6 py-4 text-left text-[12px] font-bold text-[#AEAEAE] uppercase">Category</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Price</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Stock</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Approval</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {paginatedProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-[#FAFAFA] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-[44px] h-[44px] rounded-[10px] bg-[#F1F4F9] overflow-hidden shrink-0 flex items-center justify-center">
                                                    {product.imageUrl ? (
                                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package size={18} className="text-[#AEAEAE]" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-bold text-[#181725]">{product.name}</p>
                                                    {product.packSize && <p className="text-[12px] text-[#7C7C7C]">{product.packSize}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C] font-medium">{product.categoryName || '\u2014'}</td>
                                        <td className="px-6 py-4 text-center text-[14px] font-bold text-[#181725]">{'\u20B9'}{Number(product.basePrice).toLocaleString('en-IN')}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                'text-[12px] font-bold px-2.5 py-1 rounded-[6px]',
                                                product.qty_available > 0
                                                    ? 'bg-[#EEF8F1] text-[#299E60]'
                                                    : 'bg-[#F8F9FB] text-[#AEAEAE]'
                                            )}>
                                                {product.qty_available > 0 ? product.qty_available : '0'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                'text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase',
                                                product.approvalStatus === 'approved' ? 'bg-[#EEF8F1] text-[#299E60]' :
                                                product.approvalStatus === 'rejected' ? 'bg-[#FFF0F0] text-[#E74C3C]' :
                                                'bg-[#FFF7E6] text-[#F59E0B]'
                                            )}
                                            title={product.approvalStatus === 'rejected' && product.approvalNote ? `Reason: ${product.approvalNote}` : undefined}
                                            >
                                                {product.approvalStatus === 'approved' ? 'Approved' :
                                                 product.approvalStatus === 'rejected' ? 'Rejected' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                'text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase',
                                                product.isActive ? 'bg-[#EEF8F1] text-[#299E60]' : 'bg-[#FFF0F0] text-[#E74C3C]'
                                            )}>
                                                {product.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => toggleFeatured(product)}
                                                    className={cn(
                                                        'p-2 rounded-[8px] transition-colors',
                                                        product.isFeatured
                                                            ? 'text-yellow-500 hover:bg-yellow-50'
                                                            : 'text-[#AEAEAE] hover:bg-[#F5F5F5]'
                                                    )}
                                                    title={product.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                                                >
                                                    <Star
                                                        size={16}
                                                        className={product.isFeatured ? 'fill-yellow-400 text-yellow-500' : ''}
                                                    />
                                                </button>
                                                <button
                                                    onClick={() => openEditPanel(product)}
                                                    className="p-2 hover:bg-[#EEF8F1] rounded-[8px] transition-colors text-[#299E60]"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => toggleActive(product)}
                                                    className="relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200"
                                                    style={{ backgroundColor: product.isActive ? '#299E60' : '#D1D5DB' }}
                                                    title={product.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    <span
                                                        className="inline-block h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform duration-200"
                                                        style={{ transform: product.isActive ? 'translateX(20px)' : 'translateX(3px)' }}
                                                    />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(product)}
                                                    className="p-2 hover:bg-[#FFF0F0] rounded-[8px] transition-colors text-[#AEAEAE] hover:text-[#E74C3C]"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination bar — only when there are results */}
                {!loading && filteredProducts.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[#F5F5F5]">
                        {/* Count */}
                        <p className="text-[13px] text-[#7C7C7C] font-medium">
                            Showing{' '}
                            <span className="text-[#181725] font-bold">
                                {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, filteredProducts.length)}
                            </span>
                            {' '}of{' '}
                            <span className="text-[#181725] font-bold">{filteredProducts.length}</span>
                            {' '}products
                        </p>

                        {/* Page numbers */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                {/* Prev */}
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={safeCurrentPage === 1}
                                    className="w-[34px] h-[34px] flex items-center justify-center rounded-[8px] border border-[#EEEEEE] text-[#7C7C7C] hover:bg-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {pageRange.map((item, idx) =>
                                    item === 'gap' ? (
                                        <span key={`gap-${idx}`} className="w-[34px] h-[34px] flex items-center justify-center text-[#AEAEAE] text-[13px]">…</span>
                                    ) : (
                                        <button
                                            key={item}
                                            onClick={() => setCurrentPage(item)}
                                            className={cn(
                                                'w-[34px] h-[34px] flex items-center justify-center rounded-[8px] text-[13px] font-bold transition-colors',
                                                item === safeCurrentPage
                                                    ? 'bg-[#299E60] text-white'
                                                    : 'border border-[#EEEEEE] text-[#7C7C7C] hover:bg-[#F5F5F5]'
                                            )}
                                        >
                                            {item}
                                        </button>
                                    )
                                )}

                                {/* Next */}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safeCurrentPage === totalPages}
                                    className="w-[34px] h-[34px] flex items-center justify-center rounded-[8px] border border-[#EEEEEE] text-[#7C7C7C] hover:bg-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/*  Slide-over Panel                                             */}
            {/* ============================================================ */}
            {isPanelOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[10001] bg-black/40 transition-opacity"
                        onClick={closePanel}
                    />

                    {/* Panel */}
                    <div
                        ref={panelRef}
                        className="fixed top-0 right-0 z-[10002] h-full w-full max-w-[680px] bg-[#F8F9FA] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
                    >
                        {/* Panel Header */}
                        <div className="sticky top-0 z-10 bg-white border-b border-[#EEEEEE] px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={closePanel}
                                    className="p-2 -ml-2 hover:bg-gray-100 rounded-[8px] transition-colors"
                                >
                                    <X size={20} className="text-[#7C7C7C]" />
                                </button>
                                <div>
                                    <h2 className="text-[20px] font-bold text-[#181725]">
                                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                                    </h2>
                                    {editingProduct && (
                                        <p className="text-[12px] text-[#AEAEAE] font-medium mt-0.5">
                                            ID: {editingProduct.id}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleSubmit as unknown as React.MouseEventHandler}
                                disabled={saving || loadingProduct}
                                className="h-[40px] px-5 bg-[#299E60] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#238a54] transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                                {saving ? 'Saving...' : editingProduct ? 'Update' : 'Save'}
                            </button>
                        </div>

                        {/* Panel Body */}
                        {loadingProduct ? (
                            <div className="flex items-center justify-center py-32">
                                <Loader2 className="animate-spin text-[#299E60]" size={32} />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">

                                {/* Error */}
                                {formError && (
                                    <div className="bg-[#FFF0F0] text-[#E74C3C] text-[13px] font-medium p-3.5 rounded-[10px] flex items-center gap-2">
                                        <Info size={16} className="shrink-0" />
                                        {formError}
                                    </div>
                                )}

                                {/* Locked fields notice for based-on products */}
                                {basedOnProductId && (
                                    <div className="bg-[#FFF8E1] text-[#8B6914] text-[13px] font-medium p-3.5 rounded-[10px] flex items-center gap-2">
                                        <Info size={16} className="shrink-0" />
                                        Name, Brand, and Images are pre-filled from the approved product and cannot be changed.
                                    </div>
                                )}

                                {/* ======== Section 1: Basic Information ======== */}
                                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                    <SectionHeader icon={<Info size={16} />} title="Basic Information" />

                                    <div className="space-y-4">
                                        {/* Product Name with Autocomplete */}
                                        <div className="relative" ref={suggestionsRef}>
                                            <FieldLabel required>Product Name</FieldLabel>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={form.name}
                                                    onChange={(e) => handleNameChange(e.target.value)}
                                                    onFocus={() => { if ((suggestions.length > 0 || brandSuggestions.length > 0) && !editingProduct) setShowSuggestions(true); }}
                                                    className={cn(inputCls, basedOnProductId && 'bg-[#F5F5F5] text-[#999] cursor-not-allowed')}
                                                    placeholder="e.g., Premium Basmati Rice"
                                                    disabled={!!basedOnProductId}
                                                />
                                                {loadingSuggestions && (
                                                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#AEAEAE]" />
                                                )}
                                            </div>

                                            {/* Suggestions dropdown */}
                                            {showSuggestions && (suggestions.length > 0 || brandSuggestions.length > 0 || ownMatches.length > 0) && !editingProduct && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-[#EEEEEE] rounded-[12px] shadow-lg max-h-[320px] overflow-y-auto">
                                                    {/* Duplicate warning — vendor already has this product */}
                                                    {ownMatches.length > 0 && (
                                                        <div className="px-4 py-3 bg-[#FFF8F0] border-b border-[#FFE0B2]">
                                                            <p className="text-[12px] font-bold text-[#E67E22] mb-1">
                                                                You already have similar products:
                                                            </p>
                                                            {ownMatches.map(m => (
                                                                <div key={m.id} className="flex items-center gap-2 text-[12px] text-[#B45309]">
                                                                    <span className="font-medium">{m.name}</span>
                                                                    <span className={cn(
                                                                        'px-1.5 py-0.5 rounded text-[10px] font-bold',
                                                                        m.approvalStatus === 'approved' ? 'bg-[#EEF8F1] text-[#299E60]' :
                                                                        m.approvalStatus === 'pending' ? 'bg-[#FFF8E1] text-[#F59E0B]' :
                                                                        'bg-[#FFF0F0] text-[#E74C3C]'
                                                                    )}>
                                                                        {m.approvalStatus}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            <p className="text-[11px] text-[#B45309] mt-1">
                                                                Creating a duplicate will be blocked. Edit the existing product instead.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Brand catalog suggestions */}
                                                    {brandSuggestions.length > 0 && (
                                                        <>
                                                            <div className="px-4 py-2 border-b border-[#F5F5F5] bg-[#F8F9FF]">
                                                                <p className="text-[11px] font-bold text-[#4F46E5] uppercase tracking-wide">
                                                                    From Brand Catalog — auto-fill & link to brand
                                                                </p>
                                                            </div>
                                                            {brandSuggestions.map(b => (
                                                                <button
                                                                    key={`brand-${b.id}`}
                                                                    type="button"
                                                                    onClick={() => fillFromBrandSuggestion(b)}
                                                                    className="w-full text-left px-4 py-3 hover:bg-[#F8FBF9] transition-colors border-b border-[#F5F5F5] last:border-0 flex items-center gap-3"
                                                                >
                                                                    {b.imageUrl ? (
                                                                        // eslint-disable-next-line @next/next/no-img-element
                                                                        <img src={b.imageUrl} alt="" className="w-[36px] h-[36px] rounded-[8px] object-cover shrink-0 border border-[#EEEEEE]" />
                                                                    ) : (
                                                                        <div className="w-[36px] h-[36px] rounded-[8px] bg-[#F5F5F5] flex items-center justify-center shrink-0">
                                                                            <Package size={16} className="text-[#AEAEAE]" />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[13px] font-bold text-[#181725] truncate">{b.name}</p>
                                                                        <p className="text-[11px] text-[#AEAEAE] font-medium truncate">
                                                                            <span className="text-[#4F46E5] font-bold">{b.brand.name}</span>
                                                                            {b.packSize ? ` · ${b.packSize}${b.unit ? ` ${b.unit}` : ''}` : ''}
                                                                            {b.category?.name ? ` · ${b.category.name}` : ''}
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-[#4F46E5] bg-[#EEF0FF] px-2 py-1 rounded-[6px] shrink-0">
                                                                        BRAND
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}

                                                    {/* Catalog suggestions */}
                                                    {suggestions.length > 0 && (
                                                        <>
                                                            <div className="px-4 py-2 border-b border-[#F5F5F5]">
                                                                <p className="text-[11px] font-bold text-[#299E60] uppercase tracking-wide">
                                                                    Existing Products — Select to auto-fill & auto-approve
                                                                </p>
                                                            </div>
                                                            {suggestions.map(s => (
                                                                <button
                                                                    key={s.id}
                                                                    type="button"
                                                                    onClick={() => fillFromSuggestion(s)}
                                                                    className="w-full text-left px-4 py-3 hover:bg-[#F8FBF9] transition-colors border-b border-[#F5F5F5] last:border-0 flex items-center gap-3"
                                                                >
                                                                    {s.imageUrl ? (
                                                                        <img src={s.imageUrl} alt="" className="w-[36px] h-[36px] rounded-[8px] object-cover shrink-0 border border-[#EEEEEE]" />
                                                                    ) : (
                                                                        <div className="w-[36px] h-[36px] rounded-[8px] bg-[#F5F5F5] flex items-center justify-center shrink-0">
                                                                            <Package size={16} className="text-[#AEAEAE]" />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[13px] font-bold text-[#181725] truncate">{s.name}</p>
                                                                        <p className="text-[11px] text-[#AEAEAE] font-medium">
                                                                            {s.category?.name || 'Uncategorized'}
                                                                            {s.vendor?.businessName ? ` · ${s.vendor.businessName}` : ''}
                                                                            {s.brand ? ` · ${s.brand}` : ''}
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-[12px] font-bold text-[#299E60] shrink-0">
                                                                        ₹{Number(s.basePrice).toLocaleString('en-IN')}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {/* Based-on badge */}
                                            {basedOnProductId && (
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEF8F1] text-[#299E60] text-[11px] font-bold rounded-[6px]">
                                                        <ChevronRight size={12} />
                                                        Based on existing product — will auto-approve
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setBasedOnProductId(null)}
                                                        className="text-[#AEAEAE] hover:text-[#E74C3C] transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Brand-linked badge */}
                                            {basedOnBrandMasterProductId && (
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEF0FF] text-[#4F46E5] text-[11px] font-bold rounded-[6px]">
                                                        <ChevronRight size={12} />
                                                        Linked to {basedOnBrandName ?? 'brand'} catalog — auto-approves & shows in their Distributor Map
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setBasedOnBrandMasterProductId(null);
                                                            setBasedOnBrandName(null);
                                                        }}
                                                        className="text-[#AEAEAE] hover:text-[#E74C3C] transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}

                                            {form.slug && !basedOnProductId && (
                                                <p className="text-[11px] text-[#AEAEAE] mt-1 font-medium">
                                                    Slug: {form.slug}
                                                </p>
                                            )}
                                        </div>

                                        {/* SKU, HSN, Brand, Barcode — 2-column grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <FieldLabel>SKU</FieldLabel>
                                                <input
                                                    type="text"
                                                    value={form.sku}
                                                    onChange={(e) => updateField('sku', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="e.g., RIC-BAS-001"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>HSN Code</FieldLabel>
                                                <input
                                                    type="text"
                                                    value={form.hsn}
                                                    onChange={(e) => updateField('hsn', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="e.g., 1006"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>FSSAI Reference</FieldLabel>
                                                <input
                                                    type="text"
                                                    maxLength={50}
                                                    placeholder="e.g. 10016011000015"
                                                    value={form.fssaiRef}
                                                    onChange={e => setForm(f => ({ ...f, fssaiRef: e.target.value }))}
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Brand</FieldLabel>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        list="brand-options"
                                                        value={form.brand}
                                                        onChange={(e) => updateField('brand', e.target.value)}
                                                        className={cn(inputCls, basedOnProductId && 'bg-[#F5F5F5] text-[#999] cursor-not-allowed')}
                                                        placeholder="Select or type brand name"
                                                        disabled={!!basedOnProductId}
                                                    />
                                                    <datalist id="brand-options">
                                                        {brands.map(b => (
                                                            <option key={b.id} value={b.name} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                            </div>
                                            <div>
                                                <FieldLabel>Barcode</FieldLabel>
                                                <input
                                                    type="text"
                                                    value={form.barcode}
                                                    onChange={(e) => updateField('barcode', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="e.g., 8901234567890"
                                                />
                                            </div>
                                        </div>

                                        {/* Categories — multi-select. First pick becomes the primary
                                            and is mirrored into Product.categoryId on the server so
                                            existing single-category filters keep working. */}
                                        <CategoryMultiPickerById
                                            value={form.categoryIds}
                                            onChange={(ids) => updateField('categoryIds', ids)}
                                            max={5}
                                            endpoint="/api/v1/vendor/categories/suggest"
                                            label="Categories"
                                            helper="Pick up to 5 — first one becomes the primary. Customers can find your product under any of these."
                                        />

                                        {/* Description */}
                                        <div>
                                            <FieldLabel>Description</FieldLabel>
                                            <textarea
                                                value={form.description}
                                                onChange={(e) => updateField('description', e.target.value)}
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
                                        {/* Row 1: Taxable Rate, Tax %, Gross Rate */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <FieldLabel required>Taxable Rate (Amt)</FieldLabel>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={form.basePrice}
                                                    onChange={(e) => updateField('basePrice', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel required>Tax %</FieldLabel>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    value={form.taxPercent}
                                                    onChange={(e) => updateField('taxPercent', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel required>Gross Rate (Customer Price)</FieldLabel>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={grossRate || form.originalPrice}
                                                    onChange={(e) => {
                                                        const newGross = e.target.value;
                                                        updateField('originalPrice', newGross);
                                                        // Auto-calculate taxable from gross
                                                        const taxable = calcTaxableFromGross(newGross, form.taxPercent);
                                                        if (taxable) updateField('basePrice', taxable);
                                                    }}
                                                    className={inputCls}
                                                    placeholder="0.00"
                                                />
                                                {form.basePrice && parseFloat(form.taxPercent) > 0 && (
                                                    <p className="text-[11px] text-[#7C7C7C] mt-1 font-medium">
                                                        Taxable: {'\u20B9'}{parseFloat(form.basePrice).toFixed(2)} | GST {form.taxPercent}%: {'\u20B9'}{taxAmount}
                                                    </p>
                                                )}
                                                {savings !== null && (
                                                    <p className="text-[11px] text-[#299E60] mt-1 font-bold">
                                                        {savings}% savings from MRP
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ======== Section 3: Bulk Pricing Tiers ======== */}
                                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                    <div className="flex items-start justify-between mb-5">
                                        <div>
                                            <SectionHeader icon={<Tag size={16} />} title="Bulk Pricing Tiers" />
                                            <p className="text-[12px] text-[#AEAEAE] font-medium -mt-3 ml-[42px]">
                                                Configure quantity-based pricing tiers
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addPriceSlab}
                                            className="h-[40px] px-5 bg-[#1a365d] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#1a365d]/90 transition-colors flex items-center gap-2 shrink-0"
                                        >
                                            <Plus size={14} />
                                            Add Bulk Tier
                                        </button>
                                    </div>

                                    {/* Bulk tiers */}
                                    <div className="space-y-4">
                                        {form.priceSlabs.map((slab, index) => (
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
                                                        onClick={() => removePriceSlab(index)}
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
                                                                onChange={(e) => updatePriceSlab(index, 'minQty', e.target.value)}
                                                                className={inputCls}
                                                                placeholder="e.g., 10"
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
                                                                    onChange={(e) => updatePriceSlab(index, 'price', e.target.value)}
                                                                    className={cn(inputCls, 'pl-8')}
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <FieldLabel>Price per Unit</FieldLabel>
                                                            <div className={cn(inputCls, 'flex items-center bg-[#FAFAFA] text-[#7C7C7C]')}>
                                                                <span className="text-[#AEAEAE] mr-1">{'\u20B9'}</span>
                                                                {slab.price ? calcGrossRate(slab.price, form.taxPercent) : '0'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {form.priceSlabs.length === 0 && (
                                            <div className="text-center py-8 text-[#AEAEAE]">
                                                <BarChart3 size={32} className="mx-auto mb-2 text-[#E5E7EB]" />
                                                <p className="text-[13px] font-medium">No bulk tiers yet. Click &quot;Add Bulk Tier&quot; to add quantity-based pricing.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* End of Bulk Pricing Tiers */}

                                {/* ======== Section 4: Inventory & Packaging ======== */}
                                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                    <SectionHeader icon={<BoxIcon size={16} />} title="Inventory & Packaging" />

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <FieldLabel>Pack Size</FieldLabel>
                                                <input
                                                    type="text"
                                                    value={form.packSize}
                                                    onChange={(e) => updateField('packSize', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="e.g., 1 kg, 500 ml"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Unit</FieldLabel>
                                                <div className="relative">
                                                    <select
                                                        value={form.unit}
                                                        onChange={(e) => updateField('unit', e.target.value)}
                                                        className={selectCls}
                                                    >
                                                        <option value="">Select unit</option>
                                                        {UNIT_OPTIONS.map(u => (
                                                            <option key={u} value={u}>{u}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#AEAEAE] pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <FieldLabel>Min Order Quantity</FieldLabel>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={form.minOrderQty}
                                                    onChange={(e) => updateField('minOrderQty', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ======== Section 5: Media ======== */}
                                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                    <SectionHeader icon={<ImageIcon size={16} />} title="Media" />

                                    <div className="space-y-5">
                                        {/* Primary Image */}
                                        <ImageUpload
                                            value={form.imageUrl}
                                            onChange={(url) => updateField('imageUrl', url)}
                                            folder="products"
                                            label="Primary Image"
                                            size="lg"
                                            disabled={!!basedOnProductId}
                                        />

                                        {/* Additional Images */}
                                        <MultiImageUpload
                                            values={form.images.filter(Boolean)}
                                            onChange={(urls) => updateField('images', urls)}
                                            folder="products"
                                            label="Additional Images"
                                            max={8}
                                            disabled={!!basedOnProductId}
                                        />
                                    </div>
                                </div>

                                {/* ======== Section 6: Tags & Settings ======== */}
                                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                    <SectionHeader icon={<Settings size={16} />} title="Tags & Settings" />

                                    <div className="space-y-4">
                                        {/* Tags */}
                                        <div>
                                            <FieldLabel>Tags</FieldLabel>
                                            <TagInput
                                                tags={form.tags}
                                                onChange={(tags) => updateField('tags', tags)}
                                            />
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
                                                            form.vegNonVeg === v
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
                                                value={form.storageType}
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

                                        {/* Alias Names */}
                                        <div>
                                            <FieldLabel>Alias / Search Names</FieldLabel>
                                            <TagInput
                                                tags={form.aliasNames}
                                                onChange={(names) => updateField('aliasNames', names)}
                                            />
                                            <p className="text-[11px] text-[#AEAEAE] font-medium mt-1">Alternate names buyers may search by (e.g. local language variants)</p>
                                        </div>

                                        {/* Shelf Life & Country */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <FieldLabel>Shelf Life (days)</FieldLabel>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={form.shelfLifeDays}
                                                    onChange={(e) => updateField('shelfLifeDays', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="e.g. 180"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Country of Origin</FieldLabel>
                                                <input
                                                    type="text"
                                                    value={form.countryOfOrigin}
                                                    onChange={(e) => updateField('countryOfOrigin', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="e.g. India"
                                                    maxLength={100}
                                                />
                                            </div>
                                        </div>

                                        {/* Credit Eligible */}
                                        <label className="flex items-center gap-3 cursor-pointer py-1">
                                            <input
                                                type="checkbox"
                                                checked={form.creditEligible}
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
                                            <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateField('isFeatured', e.target.checked)} className="w-5 h-5 accent-[#F59E0B] shrink-0" />
                                            <div>
                                                <span className="text-[14px] font-bold text-[#181725]">Featured Product</span>
                                                <p className="text-[11px] text-[#AEAEAE] font-medium">Highlighted in your store&apos;s featured section and search results</p>
                                            </div>
                                        </label>

                                        {/* Substitute Products */}
                                        <div>
                                            <FieldLabel>Substitute Products</FieldLabel>
                                            <SubstituteProductPicker
                                                selectedIds={form.substituteIds}
                                                currentProductId={editingProduct?.id}
                                                products={products}
                                                onChange={(ids) => updateField('substituteIds', ids)}
                                            />
                                            <p className="text-[11px] text-[#AEAEAE] font-medium mt-1">Products shown to buyers when this item is out of stock</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ======== Bottom Actions ======== */}
                                <div className="flex items-center gap-3 pt-2 pb-8">
                                    <button
                                        type="button"
                                        onClick={closePanel}
                                        className="flex-1 h-[48px] border border-[#EEEEEE] bg-white rounded-[12px] text-[14px] font-bold text-[#7C7C7C] hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 h-[48px] bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving && <Loader2 size={16} className="animate-spin" />}
                                        {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !deleting && setDeleteTarget(null)} />
                    <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[16px] shadow-xl max-w-[420px] w-full p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-[40px] h-[40px] rounded-full bg-[#FFF0F0] flex items-center justify-center shrink-0">
                                    <Trash2 size={20} className="text-[#E74C3C]" />
                                </div>
                                <h3 className="text-[18px] font-bold text-[#181725]">Delete Product</h3>
                            </div>
                            <p className="text-[14px] text-[#7C7C7C] mb-6">
                                Are you sure you want to delete <strong className="text-[#181725]">{deleteTarget.name}</strong>? This will remove the product from your catalog.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                    className="flex-1 h-[44px] border border-[#EEEEEE] rounded-[10px] text-[14px] font-bold text-[#181725] hover:bg-[#F8F9FB] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 h-[44px] bg-[#E74C3C] text-white rounded-[10px] text-[14px] font-bold hover:bg-[#d44234] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting && <Loader2 size={16} className="animate-spin" />}
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Bulk Update Modal ──────────────────────────────── */}
            {showBulkPrice && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !bulkPriceSaving && setShowBulkPrice(false)} />
                    <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[16px] shadow-xl max-w-[460px] w-full">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5F5F5]">
                                <div>
                                    <p className="text-[16px] font-bold text-[#181725]">Bulk Update</p>
                                    <p className="text-[12px] text-[#AEAEAE]">Apply changes to all products (or by category)</p>
                                </div>
                                <button onClick={() => setShowBulkPrice(false)} className="p-1.5 rounded-[8px] hover:bg-[#F5F5F5]"><X size={16} className="text-[#7C7C7C]" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Update type toggle */}
                                <div className="flex gap-2 mb-4">
                                    {(['price', 'status'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setBulkUpdateType(t)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium ${bulkUpdateType === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                                        >
                                            {t === 'price' ? 'Update Price' : 'Update Status'}
                                        </button>
                                    ))}
                                </div>
                                {/* Category filter */}
                                <div>
                                    <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Apply to category</label>
                                    <select
                                        value={bulkPriceCategoryId ?? ''}
                                        onChange={e => setBulkPriceCategoryId(e.target.value || null)}
                                        className="mt-1.5 w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/50"
                                    >
                                        <option value="">All products</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {bulkUpdateType === 'price' ? (
                                    <>
                                        {/* Type */}
                                        <div>
                                            <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Adjustment type</label>
                                            <div className="mt-1.5 flex gap-2">
                                                {(['percent', 'fixed'] as const).map(t => (
                                                    <button key={t} onClick={() => setBulkPriceType(t)}
                                                        className={cn('flex-1 h-[36px] rounded-[8px] text-[12px] font-bold border transition-all',
                                                            bulkPriceType === t ? 'bg-[#181725] text-white border-[#181725]' : 'bg-white text-[#7C7C7C] border-[#EEEEEE] hover:bg-[#F5F5F5]'
                                                        )}>
                                                        {t === 'percent' ? '% Percent' : '₹ Fixed amount'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Value */}
                                        <div>
                                            <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">
                                                Value {bulkPriceType === 'percent' ? '(negative to reduce, e.g. -5 for -5%)' : '(₹ delta, can be negative)'}
                                            </label>
                                            <input
                                                type="number"
                                                value={bulkPriceValue}
                                                onChange={e => setBulkPriceValue(e.target.value)}
                                                placeholder={bulkPriceType === 'percent' ? 'e.g. 5 or -10' : 'e.g. 10 or -5'}
                                                className="mt-1.5 w-full h-[40px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] font-bold outline-none focus:border-[#299E60]/50"
                                            />
                                        </div>
                                        {/* Slabs toggle */}
                                        <label className="flex items-center gap-2.5 cursor-pointer">
                                            <input type="checkbox" checked={bulkPriceApplySlabs} onChange={e => setBulkPriceApplySlabs(e.target.checked)}
                                                className="w-4 h-4 accent-[#299E60] rounded" />
                                            <span className="text-[13px] font-medium text-[#181725]">Also adjust bulk price slabs</span>
                                        </label>
                                        <div className="flex gap-3 pt-1">
                                            <button onClick={() => setShowBulkPrice(false)}
                                                className="flex-1 h-[42px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all">
                                                Cancel
                                            </button>
                                            <button onClick={handleBulkPriceUpdate} disabled={bulkPriceSaving || !bulkPriceValue}
                                                className="flex-1 h-[42px] rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                                {bulkPriceSaving ? <Loader2 size={14} className="animate-spin" /> : <Percent size={14} />}
                                                Update Prices
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Status selector */}
                                        <div>
                                            <label className="text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wide">Set all matching products to:</label>
                                            <div className="mt-2 flex flex-col gap-2">
                                                <label className="flex items-center gap-2.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="bulkStatus"
                                                        checked={bulkStatus === true}
                                                        onChange={() => setBulkStatus(true)}
                                                        className="w-4 h-4 accent-[#299E60]"
                                                    />
                                                    <span className="text-[13px] font-medium text-[#181725]">Active</span>
                                                </label>
                                                <label className="flex items-center gap-2.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="bulkStatus"
                                                        checked={bulkStatus === false}
                                                        onChange={() => setBulkStatus(false)}
                                                        className="w-4 h-4 accent-[#299E60]"
                                                    />
                                                    <span className="text-[13px] font-medium text-[#181725]">Inactive</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-1">
                                            <button onClick={() => setShowBulkPrice(false)}
                                                className="flex-1 h-[42px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all">
                                                Cancel
                                            </button>
                                            <button onClick={handleBulkStatusUpdate} disabled={bulkPriceSaving}
                                                className="flex-1 h-[42px] rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                                {bulkPriceSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                                                Apply Status
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Bulk CSV Import Modal ────────────────────────────────── */}
            {showBulkImport && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !importSaving && setShowBulkImport(false)} />
                    <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[16px] shadow-xl max-w-[560px] w-full">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5F5F5]">
                                <div>
                                    <p className="text-[16px] font-bold text-[#181725]">Import Products (CSV)</p>
                                    <p className="text-[12px] text-[#AEAEAE]">Format: <span className="font-mono">name, sku, basePrice, packSize, unit</span></p>
                                </div>
                                <button onClick={() => { setShowBulkImport(false); setImportRows([]); }}
                                    className="p-1.5 rounded-[8px] hover:bg-[#F5F5F5]"><X size={16} className="text-[#7C7C7C]" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Drop zone */}
                                <div
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
                                    onClick={() => importFileRef.current?.click()}
                                    className="border-2 border-dashed border-[#EEEEEE] rounded-[12px] p-8 text-center cursor-pointer hover:border-[#299E60]/50 hover:bg-[#EEF8F1]/30 transition-all"
                                >
                                    <Upload size={24} className="text-[#AEAEAE] mx-auto mb-2" />
                                    <p className="text-[13px] font-bold text-[#181725]">Drop CSV here or click to browse</p>
                                    <p className="text-[11px] text-[#AEAEAE] mt-1">Existing SKUs will be updated; new SKUs will be created as pending</p>
                                    <input ref={importFileRef} type="file" accept=".csv,text/csv" className="hidden"
                                        onChange={e => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
                                </div>

                                {/* Preview */}
                                {importRows.length > 0 && (
                                    <div className="rounded-[10px] border border-[#EEEEEE] overflow-hidden">
                                        <div className="px-4 py-2.5 bg-[#FAFAFA] border-b border-[#EEEEEE] flex items-center justify-between">
                                            <span className="text-[12px] font-bold text-[#181725]">{importRows.length} rows parsed</span>
                                            {importRows.filter(r => r.error).length > 0 && (
                                                <span className="text-[11px] font-bold text-[#E74C3C]">
                                                    {importRows.filter(r => r.error).length} errors — will be skipped
                                                </span>
                                            )}
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto divide-y divide-[#F5F5F5]">
                                            {importRows.slice(0, 50).map((row, i) => (
                                                <div key={i} className={cn('flex items-center justify-between px-4 py-2', row.error && 'bg-red-50/60')}>
                                                    <div>
                                                        <span className={cn('text-[12px] font-bold', row.error ? 'text-[#E74C3C]' : 'text-[#181725]')}>{row.name || '—'}</span>
                                                        <span className="text-[11px] text-[#AEAEAE] ml-2 font-mono">{row.sku}</span>
                                                    </div>
                                                    {row.error
                                                        ? <span className="text-[11px] text-[#E74C3C] font-bold">{row.error}</span>
                                                        : <span className="text-[12px] font-bold text-[#299E60]">₹{row.basePrice}</span>
                                                    }
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => { setShowBulkImport(false); setImportRows([]); }}
                                        className="flex-1 h-[42px] rounded-[10px] border border-[#EEEEEE] text-[13px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={handleBulkImport} disabled={importSaving || importRows.filter(r => !r.error).length === 0}
                                        className="flex-1 h-[42px] rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                        {importSaving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        Import {importRows.filter(r => !r.error).length > 0 ? `${importRows.filter(r => !r.error).length} rows` : ''}
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
