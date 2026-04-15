'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Pencil, Trash2, Loader2, X, Check, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface MasterProduct {
    id: string;
    name: string;
    packSize: string | null;
    unit: string | null;
    imageUrl: string | null;
    category: string | null;
    sku: string | null;
    isActive: boolean;
    createdAt: string;
    _count: { mappings: number };
}

interface ProductFormData {
    name: string;
    packSize: string;
    unit: string;
    category: string;
    imageUrl: string;
    sku: string;
    description: string;
}

const EMPTY_FORM: ProductFormData = { name: '', packSize: '', unit: '', category: '', imageUrl: '', sku: '', description: '' };

export default function BrandProductsPage() {
    const confirm = useConfirm();
    const [products, setProducts] = useState<MasterProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
    const [formError, setFormError] = useState<string | null>(null);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/brand/products');
            const json = await res.json();
            if (json.success) setProducts(json.data.products ?? json.data ?? []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setFormError(null); setShowForm(true); };
    const openEdit = (p: MasterProduct) => {
        setEditingId(p.id);
        setForm({ name: p.name, packSize: p.packSize ?? '', unit: p.unit ?? '', category: p.category ?? '', imageUrl: p.imageUrl ?? '', sku: p.sku ?? '', description: '' });
        setFormError(null);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) { setFormError('Product name is required'); return; }
        setActionLoading('form');
        setFormError(null);
        try {
            const payload = {
                name: form.name.trim(),
                ...(form.packSize && { packSize: form.packSize }),
                ...(form.unit && { unit: form.unit }),
                ...(form.imageUrl && { imageUrl: form.imageUrl }),
                ...(form.sku && { sku: form.sku }),
                ...(form.description && { description: form.description }),
            };
            const res = editingId
                ? await fetch(`/api/v1/brand/products/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                : await fetch('/api/v1/brand/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const json = await res.json();
            if (json.success) { setShowForm(false); fetchProducts(); }
            else setFormError(json.error?.message ?? 'Failed to save product');
        } catch { setFormError('Network error'); }
        finally { setActionLoading(null); }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: 'Delete product?',
            message: 'This will permanently remove the product. This action cannot be undone.',
            confirmText: 'Delete',
            tone: 'danger',
        });
        if (!ok) return;
        setActionLoading(id);
        try {
            await fetch(`/api/v1/brand/products/${id}`, { method: 'DELETE' });
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch { /* silent */ }
        finally { setActionLoading(null); }
    };

    const handleRunMapping = async (id: string) => {
        setActionLoading(`map-${id}`);
        try {
            await fetch('/api/v1/brand/coverage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandMasterProductId: id }),
            });
            fetchProducts();
        } catch { /* silent */ }
        finally { setActionLoading(null); }
    };

    return (
        <div className="max-w-[1100px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight">My Products</h1>
                    <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px]">Your canonical brand catalog</p>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#3d9e41] transition-colors"
                >
                    <Plus size={16} /> Add Product
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[20px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-[#53B175]" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Package size={40} className="text-[#EEEEEE] mb-3" />
                        <p className="text-[16px] font-bold text-[#AEAEAE]">No products yet</p>
                        <p className="text-[13px] text-[#AEAEAE] mt-1 mb-5">Add your first brand product to get started</p>
                        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold">
                            <Plus size={14} /> Add Product
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F8F9FB] border-b border-[#EEEEEE]">
                                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">Pack Size</th>
                                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">Distributors</th>
                                    <th className="px-6 py-3.5 text-[11px] font-bold text-[#7C7C7C] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {products.map(product => (
                                    <tr key={product.id} className="hover:bg-[#FAFAFA] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt="" className="w-9 h-9 rounded-[8px] object-cover border border-[#EEEEEE]" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-[8px] bg-[#F8F9FB] flex items-center justify-center text-[#AEAEAE]">
                                                        <Package size={16} />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[14px] font-bold text-[#181725]">{product.name}</p>
                                                    {product.sku && <p className="text-[11px] text-[#AEAEAE]">SKU: {product.sku}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{product.packSize ?? '—'}</td>
                                        <td className="px-6 py-4 text-[13px] text-[#7C7C7C]">{product.category ?? '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                'text-[12px] font-[900] px-2.5 py-1 rounded-[6px]',
                                                product._count.mappings > 0 ? 'bg-[#EEF8F1] text-[#53B175]' : 'bg-[#F8F9FB] text-[#AEAEAE]'
                                            )}>
                                                {product._count.mappings} matched
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleRunMapping(product.id)}
                                                    disabled={!!actionLoading}
                                                    title="Run auto-mapping"
                                                    className="h-[32px] w-[32px] flex items-center justify-center bg-[#EEF8F1] text-[#53B175] rounded-[8px] hover:bg-[#53B175] hover:text-white transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === `map-${product.id}` ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => openEdit(product)}
                                                    className="h-[32px] w-[32px] flex items-center justify-center bg-[#F0F4FF] text-[#3B82F6] rounded-[8px] hover:bg-[#3B82F6] hover:text-white transition-colors"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    disabled={!!actionLoading}
                                                    className="h-[32px] w-[32px] flex items-center justify-center bg-[#FEF2F2] text-[#E74C3C] rounded-[8px] hover:bg-[#E74C3C] hover:text-white transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === product.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-[20px] w-full max-w-[500px] shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-[#EEEEEE]">
                            <h3 className="text-[17px] font-[900] text-[#181725]">{editingId ? 'Edit Product' : 'Add Product'}</h3>
                            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {[
                                { key: 'name', label: 'Product Name *', placeholder: 'e.g. Tomato Ketchup 1kg' },
                                { key: 'packSize', label: 'Pack Size', placeholder: 'e.g. 1 kg, 500 ml' },
                                { key: 'unit', label: 'Unit', placeholder: 'e.g. kg, ml, pack' },
                                { key: 'category', label: 'Category', placeholder: 'e.g. Condiments, Spices' },
                                { key: 'sku', label: 'SKU (optional)', placeholder: 'Your internal product code' },
                                { key: 'imageUrl', label: 'Image URL (optional)', placeholder: 'https://...' },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1.5 uppercase tracking-wider">{field.label}</label>
                                    <input
                                        type="text"
                                        value={form[field.key as keyof ProductFormData]}
                                        onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        placeholder={field.placeholder}
                                        className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-2.5 text-[14px] font-medium outline-none focus:border-[#53B175]/50 focus:bg-white bg-[#FAFAFA]"
                                    />
                                </div>
                            ))}
                            {formError && (
                                <p className="text-[13px] text-[#E74C3C] font-bold">{formError}</p>
                            )}
                        </div>
                        <div className="px-6 pb-6 flex items-center justify-end gap-3">
                            <button onClick={() => setShowForm(false)}
                                className="h-[40px] px-5 bg-gray-100 rounded-[10px] text-[13px] font-bold text-[#7C7C7C] hover:bg-gray-200">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={actionLoading === 'form'}
                                className="h-[40px] px-5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-50 flex items-center gap-1.5 hover:bg-[#3d9e41] transition-colors"
                            >
                                {actionLoading === 'form' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {editingId ? 'Save Changes' : 'Add Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
