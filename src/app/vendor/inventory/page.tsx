'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Package, AlertTriangle, Search, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryItem {
    id: string;
    productId: string;
    qtyAvailable: number;
    qtyReserved: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    product: {
        id: string;
        name: string;
        imageUrl: string | null;
        isActive: boolean;
        basePrice: number;
    };
}

export default function VendorInventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQty, setEditQty] = useState('');
    const [editThreshold, setEditThreshold] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchInventory = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/vendor/inventory');
            const json = await res.json();
            if (json.success) setItems(json.data);
        } catch (err) {
            console.error('Failed to load inventory:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    const startEdit = (item: InventoryItem) => {
        setEditingId(item.id);
        setEditQty(String(item.qtyAvailable));
        setEditThreshold(String(item.lowStockThreshold));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditQty('');
        setEditThreshold('');
    };

    const saveEdit = async (item: InventoryItem) => {
        try {
            setSaving(true);
            const res = await fetch('/api/v1/vendor/inventory', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: item.productId,
                    qtyAvailable: parseInt(editQty, 10),
                    lowStockThreshold: parseInt(editThreshold, 10),
                }),
            });
            const json = await res.json();
            if (json.success) {
                setItems(prev => prev.map(i => {
                    if (i.id !== item.id) return i;
                    const newQty = parseInt(editQty, 10);
                    const newThreshold = parseInt(editThreshold, 10);
                    return {
                        ...i,
                        qtyAvailable: newQty,
                        lowStockThreshold: newThreshold,
                        isLowStock: newQty - i.qtyReserved <= newThreshold,
                    };
                }));
                cancelEdit();
            } else {
                alert(json.error?.message || 'Update failed');
            }
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const filteredItems = items.filter(i =>
        i.product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const lowStockCount = items.filter(i => i.isLowStock).length;

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Inventory</h1>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70">
                        Manage stock levels for your products
                        {lowStockCount > 0 && (
                            <span className="ml-2 text-[#E74C3C] font-bold">({lowStockCount} low stock)</span>
                        )}
                    </p>
                </div>
                <div className="relative w-full max-w-[240px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-[44px] w-full bg-white border border-[#EEEEEE] rounded-[12px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#299E60]" size={32} />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-20 text-center">
                        <Package size={40} className="text-[#E5E7EB] mx-auto mb-3" />
                        <p className="text-[14px] font-bold text-[#AEAEAE]">No inventory items</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                    <th className="px-6 py-4 text-left text-[12px] font-bold text-[#AEAEAE] uppercase">Product</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Available</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Reserved</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Net Stock</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Threshold</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F5F5]">
                                {filteredItems.map((item) => {
                                    const net = item.qtyAvailable - item.qtyReserved;
                                    const isEditing = editingId === item.id;

                                    return (
                                        <tr key={item.id} className={cn('hover:bg-[#FAFAFA] transition-colors', item.isLowStock && 'bg-red-50/50')}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-[40px] h-[40px] rounded-[8px] bg-[#F1F4F9] overflow-hidden shrink-0 flex items-center justify-center">
                                                        {item.product.imageUrl ? (
                                                            <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package size={16} className="text-[#AEAEAE]" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-bold text-[#181725]">{item.product.name}</p>
                                                        <p className="text-[12px] text-[#7C7C7C]">₹{Number(item.product.basePrice).toLocaleString('en-IN')}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editQty}
                                                        onChange={(e) => setEditQty(e.target.value)}
                                                        className="w-20 h-[36px] border border-[#299E60]/40 rounded-[8px] text-center text-[14px] font-bold outline-none"
                                                    />
                                                ) : (
                                                    <span className="text-[14px] font-bold text-[#181725]">{item.qtyAvailable}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center text-[14px] text-[#7C7C7C] font-medium">{item.qtyReserved}</td>
                                            <td className="px-6 py-4 text-center text-[14px] font-bold text-[#181725]">{net}</td>
                                            <td className="px-6 py-4 text-center">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editThreshold}
                                                        onChange={(e) => setEditThreshold(e.target.value)}
                                                        className="w-20 h-[36px] border border-[#299E60]/40 rounded-[8px] text-center text-[14px] font-bold outline-none"
                                                    />
                                                ) : (
                                                    <span className="text-[14px] text-[#7C7C7C]">{item.lowStockThreshold}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {item.isLowStock ? (
                                                    <span className="inline-flex items-center gap-1 bg-[#FFF0F0] text-[#E74C3C] text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase">
                                                        <AlertTriangle size={12} />
                                                        Low
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center bg-[#EEF8F1] text-[#299E60] text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase">
                                                        OK
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => saveEdit(item)}
                                                            disabled={saving}
                                                            className="p-2 bg-[#299E60] text-white rounded-[8px] hover:bg-[#238a54] transition-colors"
                                                        >
                                                            <Save size={14} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="p-2 bg-gray-100 text-[#7C7C7C] rounded-[8px] hover:bg-gray-200 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="text-[12px] font-bold text-[#299E60] hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
