'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Loader2, Package, Pencil, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VendorProduct {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
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
    category?: { name: string; slug: string } | null;
    inventory?: { qtyAvailable: number; qtyReserved: number } | null;
}

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface ProductForm {
    name: string;
    slug: string;
    categoryId: string;
    basePrice: string;
    packSize: string;
    unit: string;
    description: string;
    imageUrl: string;
    creditEligible: boolean;
}

const EMPTY_FORM: ProductForm = {
    name: '', slug: '', categoryId: '', basePrice: '', packSize: '', unit: '', description: '', imageUrl: '', creditEligible: false,
};

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function VendorProductsPage() {
    const [products, setProducts] = useState<VendorProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
    const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

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

    const openAddModal = () => {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setIsModalOpen(true);
    };

    const openEditModal = (product: VendorProduct) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            slug: product.slug,
            categoryId: (product.category as { name: string; slug: string } & { id?: string })?.slug || '',
            basePrice: String(product.basePrice),
            packSize: product.packSize || '',
            unit: product.unit || '',
            description: product.description || '',
            imageUrl: product.imageUrl || '',
            creditEligible: product.creditEligible,
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.basePrice) {
            setFormError('Name and price are required');
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
            };

            // Only include categoryId for creation (find the category by slug)
            if (form.categoryId) {
                const cat = categories.find(c => c.slug === form.categoryId);
                if (cat) body.categoryId = cat.id;
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
            if (!json.success) throw new Error(json.error?.message || 'Failed to save');

            setIsModalOpen(false);
            fetchProducts();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

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

    return (
        <div className="space-y-6 pb-10">
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
                        onClick={openAddModal}
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
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C] font-medium">{product.categoryName || '—'}</td>
                                        <td className="px-6 py-4 text-center text-[14px] font-bold text-[#181725]">₹{Number(product.basePrice).toLocaleString('en-IN')}</td>
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
                                                    onClick={() => openEditModal(product)}
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

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-[16px] shadow-xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-[#EEEEEE]">
                            <h2 className="text-[20px] font-bold text-[#181725]">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="bg-[#FFF0F0] text-[#E74C3C] text-[13px] font-medium p-3 rounded-[10px]">{formError}</div>
                            )}

                            <div>
                                <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Product Name *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
                                    className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40"
                                    placeholder="e.g., Fresh Tomatoes"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Category</label>
                                    <select
                                        value={form.categoryId}
                                        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                        className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40"
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.slug}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Base Price (₹) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.basePrice}
                                        onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                                        className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Pack Size</label>
                                    <input
                                        type="text"
                                        value={form.packSize}
                                        onChange={(e) => setForm({ ...form, packSize: e.target.value })}
                                        className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40"
                                        placeholder="e.g., 1 kg, 500 ml"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Unit</label>
                                    <input
                                        type="text"
                                        value={form.unit}
                                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                        className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40"
                                        placeholder="e.g., kg, piece, litre"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Image URL</label>
                                <input
                                    type="text"
                                    value={form.imageUrl}
                                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                                    className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#299E60]/40"
                                    placeholder="https://..."
                                />
                            </div>

                            <div>
                                <label className="block text-[13px] font-bold text-[#181725] mb-1.5">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                    className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-3 text-[14px] outline-none focus:border-[#299E60]/40 resize-none"
                                    placeholder="Product description..."
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.creditEligible}
                                    onChange={(e) => setForm({ ...form, creditEligible: e.target.checked })}
                                    className="w-5 h-5 accent-[#299E60]"
                                />
                                <span className="text-[14px] font-medium text-[#181725]">Credit eligible</span>
                            </label>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 h-[48px] border border-[#EEEEEE] rounded-[12px] text-[14px] font-bold text-[#7C7C7C] hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 h-[48px] bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-all shadow-sm disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
