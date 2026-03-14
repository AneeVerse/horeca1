'use client';

import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight, Plus, Minus, Store, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_VENDORS, MOCK_VENDOR_PRODUCTS } from '@/lib/mockData';
import { toast } from 'sonner';
import type { Vendor, VendorProduct, OrderList } from '@/types';

interface CreateListOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (list: { name: string; vendorId: string; items: { productId: string; quantity: number }[] }) => void;
    initialData?: OrderList | null;
}

export function CreateListOverlay({ isOpen, onClose, onSave, initialData }: CreateListOverlayProps) {
    const [step, setStep] = useState<'name' | 'vendor' | 'items'>('name');
    const [listName, setListName] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setListName(initialData.name);
                const vendor = MOCK_VENDORS.find(v => v.id === initialData.vendorId);
                setSelectedVendor(vendor || null);
                setSelectedItems(Object.fromEntries(initialData.items.map(i => [i.productId, i.defaultQty])));
                setStep('items');
            } else {
                setStep('name');
                setListName('');
                setSelectedVendor(null);
                setSelectedItems({});
            }
        }
    }, [isOpen, initialData]);

    const filteredVendors = useMemo(() => {
        if (!searchQuery) return MOCK_VENDORS;
        return MOCK_VENDORS.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery]);

    const vendorProducts = useMemo(() => {
        if (!selectedVendor) return [];
        const products = MOCK_VENDOR_PRODUCTS[selectedVendor.id] || [];
        if (!searchQuery) return products;
        return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [selectedVendor, searchQuery]);

    const handleAddItem = (productId: string) => {
        setSelectedItems(prev => ({
            ...prev,
            [productId]: (prev[productId] || 0) + 1
        }));
    };

    const handleRemoveItem = (productId: string) => {
        setSelectedItems(prev => {
            const next = { ...prev };
            if (next[productId] > 1) {
                next[productId] -= 1;
            } else {
                delete next[productId];
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
        if (!selectedVendor) {
            toast.error('Please select a vendor');
            setStep('vendor');
            return;
        }
        const items = Object.entries(selectedItems).map(([productId, quantity]) => ({
            productId,
            quantity
        }));
        
        if (items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        onSave({
            name: listName,
            vendorId: selectedVendor.id,
            items
        });
        
        // Reset and close
        setStep('name');
        setListName('');
        setSelectedVendor(null);
        setSelectedItems({});
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
                            {initialData ? 'Edit Order List' : (step === 'name' ? 'Name your list' : step === 'vendor' ? 'Select Vendor' : 'Add Items')}
                        </h2>
                        <button onClick={onClose} className="p-2 -mr-2 bg-gray-50 rounded-full">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>
                    {/* Progress Bar */}
                    <div className="flex gap-1 h-1 mt-4">
                        <div className={cn("flex-1 rounded-full transition-colors", (initialData || step === 'name' || step === 'vendor' || step === 'items') ? "bg-[#53B175]" : "bg-gray-100")} />
                        <div className={cn("flex-1 rounded-full transition-colors", (initialData || step === 'vendor' || step === 'items') ? "bg-[#53B175]" : "bg-gray-100")} />
                        <div className={cn("flex-1 rounded-full transition-colors", (initialData || step === 'items') ? "bg-[#53B175]" : "bg-gray-100")} />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
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
                                    className="w-full bg-[#F7F8FA] border border-gray-100 rounded-[20px] px-6 py-4 text-[16px] font-bold text-[#181725] focus:bg-white focus:border-[#53B175] focus:ring-4 focus:ring-[#53B175]/10 outline-none transition-all placeholder:text-gray-300"
                                />
                            </div>
                        </div>
                    )}

                    {step === 'vendor' && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search vendor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#F7F8FA] border border-transparent rounded-full pl-12 pr-4 py-3 text-[14px] font-medium text-[#181725] focus:bg-white focus:border-[#53B175]/20 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                {filteredVendors.map(vendor => (
                                    <button
                                        key={vendor.id}
                                        onClick={() => {
                                            setSelectedVendor(vendor);
                                            setSearchQuery('');
                                            setStep('items');
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                                            selectedVendor?.id === vendor.id ? "border-[#53B175] bg-[#53B175]/5" : "border-gray-50 bg-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl border border-gray-100 p-1 bg-white overflow-hidden">
                                                <img src={vendor.logo} alt="" className="w-full h-full object-contain" />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-[15px] font-bold text-[#181725]">{vendor.name}</h4>
                                                <p className="text-[11px] text-gray-400 font-medium">{vendor.categories[0]}</p>
                                            </div>
                                        </div>
                                        {selectedVendor?.id === vendor.id && <Check size={20} className="text-[#53B175]" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'items' && (
                        <div className="flex flex-col h-full space-y-4">
                            <div className="flex items-center gap-3 bg-[#53B175]/10 p-4 rounded-2xl border border-[#53B175]/20">
                                <Store size={20} className="text-[#53B175]" />
                                <div className="text-[13px] font-bold text-[#53B175]">Adding items from <span className="underline">{selectedVendor?.name}</span></div>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search products in this store..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#F7F8FA] border border-transparent rounded-full pl-12 pr-4 py-3 text-[14px] font-medium text-[#181725] focus:bg-white focus:border-[#53B175]/20 outline-none transition-all"
                                />
                            </div>

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
                                                
                                                <div className="flex items-center gap-3">
                                                    {qty > 0 ? (
                                                        <div className="flex items-center gap-3 bg-white border border-[#53B175]/20 px-2 py-1.5 rounded-full shadow-sm">
                                                            <button onClick={() => handleRemoveItem(product.id)} className="text-[#53B175] active:scale-75 transition-transform"><Minus size={14} strokeWidth={3} /></button>
                                                            <span className="text-[13px] font-extrabold text-[#181725] w-4 text-center">{qty}</span>
                                                            <button onClick={() => handleAddItem(product.id)} className="text-[#53B175] active:scale-75 transition-transform"><Plus size={14} strokeWidth={3} /></button>
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
                            onClick={() => setStep('vendor')}
                            className="w-full bg-[#181725] text-white py-[18px] rounded-[22px] font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                        >
                            Select Vendor
                            <ChevronRight size={18} />
                        </button>
                    )}
                    {step === 'vendor' && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('name')}
                                className="flex-1 bg-white border border-gray-200 text-[#181725] py-[18px] rounded-[22px] font-bold text-[16px] transition-all active:scale-95"
                            >
                                Back
                            </button>
                            <button
                                disabled={!selectedVendor}
                                onClick={() => setStep('items')}
                                className="flex-[2] bg-[#181725] text-white py-[18px] rounded-[22px] font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                            >
                                Add Items
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                    {step === 'items' && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setStep('vendor');
                                    setSearchQuery('');
                                }}
                                className="flex-1 bg-white border border-gray-200 text-[#181725] py-[18px] rounded-[22px] font-bold text-[16px] transition-all active:scale-95"
                            >
                                Back
                            </button>
                            <button
                                disabled={Object.keys(selectedItems).length === 0}
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
