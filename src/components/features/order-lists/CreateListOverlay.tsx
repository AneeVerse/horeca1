'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight, Plus, Minus, Check, AlertCircle, ChevronDown, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_VENDORS, MOCK_VENDOR_PRODUCTS } from '@/lib/mockData';
import { toast } from 'sonner';
import type { Vendor, OrderList } from '@/types';

interface CreateListOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (list: { name: string; items: { productId: string; quantity: number; vendorId: string }[] }) => void;
    initialData?: OrderList | null;
}

export function CreateListOverlay({ isOpen, onClose, onSave, initialData }: CreateListOverlayProps) {
    const [step, setStep] = useState<'name' | 'items'>('name');
    const [listName, setListName] = useState('');
    const [activeVendor, setActiveVendor] = useState<Vendor>(MOCK_VENDORS[0]);
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    // Maps productId -> vendorId so we know which vendor each item belongs to
    const [itemVendorMap, setItemVendorMap] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showVendorPicker, setShowVendorPicker] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setListName(initialData.name);
                const qtys = Object.fromEntries(initialData.items.map(i => [i.productId, i.defaultQty]));
                setSelectedItems(qtys);
                // Build vendor map from existing items (VendorProduct has vendorId)
                const vmap: Record<string, string> = {};
                initialData.items.forEach(item => {
                    if (item.product?.vendorId) {
                        vmap[item.productId] = item.product.vendorId;
                    }
                });
                setItemVendorMap(vmap);
                // Start on first vendor from items
                const firstVendorId = initialData.items[0]?.product?.vendorId;
                const firstVendor = firstVendorId ? MOCK_VENDORS.find(v => v.id === firstVendorId) : null;
                setActiveVendor(firstVendor || MOCK_VENDORS[0]);
                setStep('items');
            } else {
                setStep('name');
                setListName('');
                setActiveVendor(MOCK_VENDORS[0]);
                setSelectedItems({});
                setItemVendorMap({});
            }
            setSearchQuery('');
            setShowVendorPicker(false);
        }
    }, [isOpen, initialData]);

    // Products for active vendor filtered by search
    const vendorProducts = useMemo(() => {
        const products = MOCK_VENDOR_PRODUCTS[activeVendor.id] || [];
        if (!searchQuery) return products;
        return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [activeVendor, searchQuery]);

    // Count items added per vendor
    const itemsPerVendor = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.entries(selectedItems).forEach(([productId, qty]) => {
            if (qty > 0) {
                const vendorId = itemVendorMap[productId];
                if (vendorId) counts[vendorId] = (counts[vendorId] || 0) + 1;
            }
        });
        return counts;
    }, [selectedItems, itemVendorMap]);

    const totalItemCount = useMemo(
        () => Object.values(selectedItems).filter(q => q > 0).length,
        [selectedItems]
    );

    const vendorCount = Object.keys(itemsPerVendor).length;

    const handleAddItem = (productId: string) => {
        setSelectedItems(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
        setItemVendorMap(prev => ({ ...prev, [productId]: activeVendor.id }));
    };

    const handleRemoveItem = (productId: string) => {
        setSelectedItems(prev => {
            const next = { ...prev };
            if (next[productId] > 1) {
                next[productId] -= 1;
            } else {
                delete next[productId];
                // Remove from vendor map too
                setItemVendorMap(vm => {
                    const vmNext = { ...vm };
                    delete vmNext[productId];
                    return vmNext;
                });
            }
            return next;
        });
    };

    const handleSave = () => {
        if (!listName.trim()) {
            toast.error('Please enter a list name');
            setStep('name');
            return;
        }

        const items = Object.entries(selectedItems)
            .filter(([, qty]) => qty > 0)
            .map(([productId, quantity]) => ({
                productId,
                quantity,
                vendorId: itemVendorMap[productId] || activeVendor.id,
            }));

        if (items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        onSave({ name: listName, items });

        // Reset
        setStep('name');
        setListName('');
        setActiveVendor(MOCK_VENDORS[0]);
        setSelectedItems({});
        setItemVendorMap({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-500 ease-out">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-[20px] font-black text-[#181725]">
                            {initialData ? 'Edit Order List' : (step === 'name' ? 'Name your list' : 'Add Items')}
                        </h2>
                        <button onClick={onClose} className="p-2 -mr-2 bg-gray-50 rounded-full">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>
                    {/* Progress Bar — 2 steps */}
                    <div className="flex gap-1 h-1 mt-4">
                        <div className="flex-1 rounded-full bg-[#53B175]" />
                        <div className={cn("flex-1 rounded-full transition-colors", (initialData || step === 'items') ? "bg-[#53B175]" : "bg-gray-100")} />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ── STEP 1: Name ── */}
                    {step === 'name' && (
                        <div className="space-y-4">
                            <p className="text-[14px] text-gray-500 font-medium leading-relaxed">
                                Give your order list a name like "Weekly Dairy" or "Monthly Staples" to find it easily later.
                            </p>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">List Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="e.g. My Custom List"
                                    value={listName}
                                    onChange={(e) => setListName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && listName.trim() && setStep('items')}
                                    className="w-full bg-[#F7F8FA] border border-gray-100 rounded-[20px] px-6 py-4 text-[16px] font-bold text-[#181725] focus:bg-white focus:border-[#53B175] focus:ring-4 focus:ring-[#53B175]/10 outline-none transition-all placeholder:text-gray-300"
                                />
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: Items (multi-vendor) ── */}
                    {step === 'items' && (
                        <div className="flex flex-col space-y-4">

                            {/* Vendor Selector Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowVendorPicker(v => !v)}
                                    className="w-full flex items-center justify-between bg-[#53B175]/10 p-3.5 rounded-2xl border border-[#53B175]/20 transition-all active:scale-[0.99]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg border border-gray-100 p-1 bg-white overflow-hidden shrink-0">
                                            <img src={activeVendor.logo} alt="" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[13px] font-bold text-[#53B175]">{activeVendor.name}</div>
                                            <div className="text-[10px] text-[#53B175]/70 font-medium">
                                                {itemsPerVendor[activeVendor.id]
                                                    ? `${itemsPerVendor[activeVendor.id]} item${itemsPerVendor[activeVendor.id] !== 1 ? 's' : ''} added · `
                                                    : ''}
                                                tap to switch vendor
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronDown size={16} className={cn("text-[#53B175] transition-transform duration-200", showVendorPicker && "rotate-180")} />
                                </button>

                                {/* Vendor Picker Dropdown */}
                                {showVendorPicker && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl z-20 overflow-hidden">
                                        <div className="p-2 max-h-[220px] overflow-y-auto">
                                            {MOCK_VENDORS.map(vendor => (
                                                <button
                                                    key={vendor.id}
                                                    onClick={() => {
                                                        setActiveVendor(vendor);
                                                        setSearchQuery('');
                                                        setShowVendorPicker(false);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                                                        activeVendor.id === vendor.id ? "bg-[#53B175]/10" : "hover:bg-gray-50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg border border-gray-100 p-1 bg-white overflow-hidden shrink-0">
                                                            <img src={vendor.logo} alt="" className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="text-left">
                                                            <span className="text-[13px] font-bold text-[#181725]">{vendor.name}</span>
                                                            <p className="text-[10px] text-gray-400 font-medium">{vendor.categories[0]}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {itemsPerVendor[vendor.id] > 0 && (
                                                            <span className="bg-[#53B175] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                                {itemsPerVendor[vendor.id]}
                                                            </span>
                                                        )}
                                                        {activeVendor.id === vendor.id && <Check size={15} className="text-[#53B175]" />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Summary pill — how many items from how many vendors */}
                            {totalItemCount > 0 && (
                                <div className="flex items-center gap-2 bg-[#181725]/5 px-4 py-2.5 rounded-xl">
                                    <Store size={14} className="text-[#181725]/60 shrink-0" />
                                    <span className="text-[12px] font-bold text-[#181725]">
                                        {totalItemCount} item{totalItemCount !== 1 ? 's' : ''} added
                                    </span>
                                    <span className="text-gray-400 text-[11px]">
                                        from {vendorCount} vendor{vendorCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={`Search in ${activeVendor.name}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#F7F8FA] border border-transparent rounded-full pl-12 pr-4 py-3 text-[14px] font-medium text-[#181725] focus:bg-white focus:border-[#53B175]/20 outline-none transition-all"
                                />
                            </div>

                            {/* Product list for active vendor */}
                            <div className="space-y-3">
                                {vendorProducts.length > 0 ? (
                                    vendorProducts.map(product => {
                                        const qty = selectedItems[product.id] || 0;
                                        return (
                                            <div key={product.id} className="flex items-center justify-between p-3 bg-[#FCFDFF] border border-gray-50 rounded-2xl">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 p-1 flex items-center justify-center shrink-0">
                                                        <img src={product.images[0]} alt="" className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-[13px] font-bold text-[#181725] truncate">{product.name}</h4>
                                                        <p className="text-[11px] text-gray-400 font-bold">₹{product.price} / {product.packSize}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    {qty > 0 ? (
                                                        <div className="flex items-center gap-3 bg-white border border-[#53B175]/20 px-2 py-1.5 rounded-full shadow-sm">
                                                            <button onClick={() => handleRemoveItem(product.id)} className="text-[#53B175] active:scale-75 transition-transform">
                                                                <Minus size={14} strokeWidth={3} />
                                                            </button>
                                                            <span className="text-[13px] font-extrabold text-[#181725] w-4 text-center">{qty}</span>
                                                            <button onClick={() => handleAddItem(product.id)} className="text-[#53B175] active:scale-75 transition-transform">
                                                                <Plus size={14} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAddItem(product.id)}
                                                            className="bg-white border-2 border-dashed border-gray-100 p-2 rounded-full text-gray-300 hover:text-[#53B175] hover:border-[#53B175] transition-all active:scale-90"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10">
                                        <AlertCircle size={32} className="mx-auto text-gray-200 mb-2" />
                                        <p className="text-[13px] text-gray-400 font-medium">No products found for this search</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-50 bg-gray-50/30 shrink-0">
                    {step === 'name' && (
                        <button
                            disabled={!listName.trim()}
                            onClick={() => setStep('items')}
                            className="w-full bg-[#181725] text-white py-[18px] rounded-[22px] font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                        >
                            Add Items
                            <ChevronRight size={18} />
                        </button>
                    )}
                    {step === 'items' && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setStep('name'); setSearchQuery(''); setShowVendorPicker(false); }}
                                className="flex-1 bg-white border border-gray-200 text-[#181725] py-[18px] rounded-[22px] font-bold text-[16px] transition-all active:scale-95"
                            >
                                Back
                            </button>
                            <button
                                disabled={totalItemCount === 0}
                                onClick={handleSave}
                                className="flex-[2] bg-[#53B175] text-white py-[18px] rounded-[22px] font-bold text-[16px] flex items-center justify-center shadow-lg shadow-green-100 disabled:opacity-50 transition-all active:scale-95"
                            >
                                <Plus size={20} className="mr-2" />
                                {initialData ? 'Update Order List' : 'Create Order List'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
