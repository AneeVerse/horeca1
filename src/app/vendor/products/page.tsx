'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, Plus, Loader2, Package, Pencil, ToggleLeft, ToggleRight, X,
    ChevronRight, Info, ImageIcon, Settings, DollarSign, Trash2,
    BarChart3, BoxIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface PriceSlabRow {
    minQty: string;
    maxQty: string;
    price: string;
}

interface ProductForm {
    name: string;
    slug: string;
    categoryId: string;
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
    taxPercent: string;
    minOrderQty: string;
    creditEligible: boolean;
    priceSlabs: PriceSlabRow[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const UNIT_OPTIONS = ['kg', 'g', 'ml', 'L', 'piece', 'pack', 'box', 'dozen', 'case', 'bag', 'bottle', 'can', 'carton', 'tray'];

const EMPTY_FORM: ProductForm = {
    name: '',
    slug: '',
    categoryId: '',
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
    taxPercent: '0',
    minOrderQty: '1',
    creditEligible: false,
    priceSlabs: [],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function calcTaxableRate(basePrice: string, taxPercent: string): string {
    const bp = parseFloat(basePrice);
    const tp = parseFloat(taxPercent);
    if (isNaN(bp) || isNaN(tp) || tp < 0) return '';
    if (tp === 0) return bp.toFixed(2);
    return (bp / (1 + tp / 100)).toFixed(2);
}

function calcSavingsPercent(base: string, original: string): number | null {
    const b = parseFloat(base);
    const o = parseFloat(original);
    if (isNaN(b) || isNaN(o) || o <= b) return null;
    return Math.round(((o - b) / o) * 100);
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
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function VendorProductsPage() {
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
    const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [loadingProduct, setLoadingProduct] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    /* ---- Data fetching ---- */

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/vendor/products?limit=100');
            const json = await res.json();
            if (json.success) setProducts(json.data.products);
        } catch (err) {
            console.error('Failed to load products:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
        fetch('/api/v1/categories')
            .then(r => r.json())
            .then(json => { if (json.success) setCategories(json.data); })
            .catch(console.error);
    }, [fetchProducts]);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    /* ---- Panel open / close ---- */

    const openAddPanel = () => {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setFormError('');
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

            setForm({
                name: p.name || '',
                slug: p.slug || '',
                categoryId: p.category?.id || p.category?.slug || '',
                basePrice: p.basePrice != null ? String(p.basePrice) : '',
                originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
                packSize: p.packSize || '',
                unit: p.unit || '',
                sku: p.sku || '',
                hsn: p.hsn || '',
                brand: p.brand || '',
                barcode: p.barcode || '',
                description: p.description || '',
                imageUrl: p.imageUrl || '',
                images: Array.isArray(p.images) ? p.images : [],
                tags: Array.isArray(p.tags) ? p.tags : [],
                taxPercent: p.taxPercent != null ? String(p.taxPercent) : '0',
                minOrderQty: p.minOrderQty != null ? String(p.minOrderQty) : '1',
                creditEligible: !!p.creditEligible,
                priceSlabs: Array.isArray(p.priceSlabs)
                    ? p.priceSlabs.map((s: { minQty: number; maxQty?: number | null; price: number }) => ({
                        minQty: String(s.minQty),
                        maxQty: s.maxQty != null ? String(s.maxQty) : '',
                        price: String(s.price),
                    }))
                    : [],
            });
        } catch {
            // Fallback: populate from the product list data
            setForm({
                name: product.name,
                slug: product.slug,
                categoryId: product.category?.slug || '',
                basePrice: String(product.basePrice),
                originalPrice: '',
                packSize: product.packSize || '',
                unit: product.unit || '',
                sku: '',
                hsn: '',
                brand: '',
                barcode: '',
                description: product.description || '',
                imageUrl: product.imageUrl || '',
                images: [],
                tags: [],
                taxPercent: '0',
                minOrderQty: '1',
                creditEligible: product.creditEligible,
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
                sku: form.sku || undefined,
                hsn: form.hsn || undefined,
                brand: form.brand || undefined,
                barcode: form.barcode || undefined,
                taxPercent: form.taxPercent ? parseFloat(form.taxPercent) : 0,
                minOrderQty: form.minOrderQty ? parseInt(form.minOrderQty, 10) : 1,
                tags: form.tags.length > 0 ? form.tags : undefined,
                images: form.images.filter(Boolean).length > 0 ? form.images.filter(Boolean) : undefined,
            };

            if (form.originalPrice) {
                body.originalPrice = parseFloat(form.originalPrice);
            }

            // Category: find by slug or id
            if (form.categoryId) {
                const cat = categories.find(c => c.slug === form.categoryId || c.id === form.categoryId);
                if (cat) body.categoryId = cat.id;
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
            fetchProducts();
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

    /* ---- Derived values ---- */

    const taxableRate = calcTaxableRate(form.basePrice, form.taxPercent);
    const savings = calcSavingsPercent(form.basePrice, form.originalPrice);

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
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-[240px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-[44px] w-full bg-white border border-[#EEEEEE] rounded-[12px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={openAddPanel}
                        className="h-[44px] px-5 bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-all shadow-sm flex items-center gap-2 shrink-0"
                    >
                        <Plus size={18} />
                        Add Product
                    </button>
                </div>
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
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filteredProducts.map((product) => (
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
                                                product.qty_available > 0 ? 'bg-[#EEF8F1] text-[#299E60]' : 'bg-[#FFF0F0] text-[#E74C3C]'
                                            )}>
                                                {product.qty_available > 0 ? product.qty_available : 'Out of stock'}
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
                                                    onClick={() => openEditPanel(product)}
                                                    className="p-2 hover:bg-[#EEF8F1] rounded-[8px] transition-colors text-[#299E60]"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => toggleActive(product)}
                                                    className={cn(
                                                        'p-2 rounded-[8px] transition-colors',
                                                        product.isActive ? 'hover:bg-[#FFF0F0] text-[#E74C3C]' : 'hover:bg-[#EEF8F1] text-[#299E60]'
                                                    )}
                                                    title={product.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    {product.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
                        onClick={closePanel}
                    />

                    {/* Panel */}
                    <div
                        ref={panelRef}
                        className="fixed top-0 right-0 z-50 h-full w-full max-w-[680px] bg-[#F8F9FA] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
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

                                {/* ======== Section 1: Basic Information ======== */}
                                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                    <SectionHeader icon={<Info size={16} />} title="Basic Information" />

                                    <div className="space-y-4">
                                        {/* Product Name */}
                                        <div>
                                            <FieldLabel required>Product Name</FieldLabel>
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={(e) => {
                                                    const name = e.target.value;
                                                    setForm(prev => ({
                                                        ...prev,
                                                        name,
                                                        slug: slugify(name),
                                                    }));
                                                }}
                                                className={inputCls}
                                                placeholder="e.g., Premium Basmati Rice"
                                            />
                                            {form.slug && (
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
                                                <FieldLabel>Brand</FieldLabel>
                                                <input
                                                    type="text"
                                                    value={form.brand}
                                                    onChange={(e) => updateField('brand', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="e.g., India Gate"
                                                />
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

                                        {/* Category */}
                                        <div>
                                            <FieldLabel>Category</FieldLabel>
                                            <div className="relative">
                                                <select
                                                    value={form.categoryId}
                                                    onChange={(e) => updateField('categoryId', e.target.value)}
                                                    className={selectCls}
                                                >
                                                    <option value="">Select category</option>
                                                    {categories.map(c => (
                                                        <option key={c.id} value={c.slug}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#AEAEAE] pointer-events-none" />
                                            </div>
                                        </div>

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

                                {/* ======== Section 2: Pricing ======== */}
                                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                    <SectionHeader icon={<DollarSign size={16} />} title="Pricing" />

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Base Price */}
                                            <div>
                                                <FieldLabel required>Base Price ({'\u20B9'})</FieldLabel>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={form.basePrice}
                                                    onChange={(e) => updateField('basePrice', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="0.00"
                                                />
                                                {taxableRate && parseFloat(form.taxPercent) > 0 && (
                                                    <p className="text-[11px] text-[#7C7C7C] mt-1 font-medium">
                                                        Taxable rate: {'\u20B9'}{taxableRate}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Original Price / MRP */}
                                            <div>
                                                <FieldLabel>Original Price / MRP ({'\u20B9'})</FieldLabel>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={form.originalPrice}
                                                    onChange={(e) => updateField('originalPrice', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="0.00"
                                                />
                                                {savings !== null && (
                                                    <p className="text-[11px] text-[#299E60] mt-1 font-bold">
                                                        {savings}% savings from MRP
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tax */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <FieldLabel>Tax / GST Percent (%)</FieldLabel>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={form.taxPercent}
                                                    onChange={(e) => updateField('taxPercent', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Taxable Rate ({'\u20B9'})</FieldLabel>
                                                <div className={cn(inputCls, 'flex items-center bg-[#FAFAFA] text-[#7C7C7C] cursor-not-allowed')}>
                                                    {taxableRate ? `\u20B9${taxableRate}` : '\u2014'}
                                                </div>
                                                <p className="text-[11px] text-[#AEAEAE] mt-1 font-medium">
                                                    Auto-calculated: Base Price / (1 + Tax%)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ======== Section 3: Bulk Pricing Tiers ======== */}
                                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                                    <SectionHeader icon={<BarChart3 size={16} />} title="Bulk Pricing Tiers" />

                                    <div className="space-y-3">
                                        {form.priceSlabs.length > 0 && (
                                            <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 mb-1">
                                                <p className="text-[11px] font-bold text-[#AEAEAE] uppercase">Min Qty</p>
                                                <p className="text-[11px] font-bold text-[#AEAEAE] uppercase">Max Qty</p>
                                                <p className="text-[11px] font-bold text-[#AEAEAE] uppercase">Price / Unit</p>
                                                <div />
                                            </div>
                                        )}

                                        {form.priceSlabs.map((slab, index) => (
                                            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 items-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={slab.minQty}
                                                    onChange={(e) => updatePriceSlab(index, 'minQty', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="Min"
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={slab.maxQty}
                                                    onChange={(e) => updatePriceSlab(index, 'maxQty', e.target.value)}
                                                    className={inputCls}
                                                    placeholder="No limit"
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={slab.price}
                                                    onChange={(e) => updatePriceSlab(index, 'price', e.target.value)}
                                                    className={inputCls}
                                                    placeholder={'\u20B90.00'}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePriceSlab(index)}
                                                    className="p-2 hover:bg-[#FFF0F0] rounded-[8px] transition-colors text-[#E74C3C]"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={addPriceSlab}
                                            className="h-[40px] px-4 border border-dashed border-[#299E60]/40 text-[#299E60] rounded-[10px] text-[13px] font-bold hover:bg-[#EEF8F1] transition-colors flex items-center gap-2"
                                        >
                                            <Plus size={14} />
                                            Add Tier
                                        </button>

                                        <div className="flex items-start gap-2 bg-[#F8F9FA] rounded-[8px] px-3 py-2.5 mt-2">
                                            <Info size={14} className="text-[#AEAEAE] shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-[#7C7C7C] font-medium leading-relaxed">
                                                Highest matching tier applies based on order quantity. Leave Max Qty empty for the last tier to mean &quot;and above&quot;.
                                            </p>
                                        </div>
                                    </div>
                                </div>

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

                                    <div className="space-y-4">
                                        {/* Primary Image */}
                                        <div>
                                            <FieldLabel>Primary Image URL</FieldLabel>
                                            <input
                                                type="text"
                                                value={form.imageUrl}
                                                onChange={(e) => updateField('imageUrl', e.target.value)}
                                                className={inputCls}
                                                placeholder="https://..."
                                            />
                                            {form.imageUrl && (
                                                <div className="mt-2 w-[80px] h-[80px] rounded-[10px] bg-[#F1F4F9] overflow-hidden border border-[#EEEEEE]">
                                                    <img
                                                        src={form.imageUrl}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Additional Images */}
                                        <div>
                                            <FieldLabel>Additional Images</FieldLabel>
                                            <div className="space-y-2">
                                                {form.images.map((url, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={url}
                                                            onChange={(e) => updateImage(index, e.target.value)}
                                                            className={cn(inputCls, 'flex-1')}
                                                            placeholder="https://..."
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(index)}
                                                            className="p-2 hover:bg-[#FFF0F0] rounded-[8px] transition-colors text-[#E74C3C] shrink-0"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={addImage}
                                                    className="h-[40px] px-4 border border-dashed border-[#299E60]/40 text-[#299E60] rounded-[10px] text-[13px] font-bold hover:bg-[#EEF8F1] transition-colors flex items-center gap-2"
                                                >
                                                    <Plus size={14} />
                                                    Add Image
                                                </button>
                                            </div>
                                        </div>
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
        </div>
    );
}
