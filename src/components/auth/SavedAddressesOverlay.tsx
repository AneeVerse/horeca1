'use client';

import React, { useState } from 'react';
import { ChevronLeft, MapPin, Plus, Home, Briefcase, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Address {
    id: string;
    label: string;
    type: 'home' | 'work' | 'other';
    address: string;
    isDefault: boolean;
}

interface SavedAddressesOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SavedAddressesOverlay({ isOpen, onClose }: SavedAddressesOverlayProps) {
    const [addresses, setAddresses] = useState<Address[]>([
        { id: '1', label: 'Home', type: 'home', address: 'S60, Fz. Chowk, Thane, New Mumbai, Maharashtra 400605', isDefault: true },
        { id: '2', label: 'Work', type: 'work', address: 'C-003, Sanpada Station Complex, Navi Mumbai, Maharashtra 400705', isDefault: false },
    ]);
    const [isAdding, setIsAdding] = useState(false);
    const [newAddress, setNewAddress] = useState({ label: '', address: '', type: 'other' as Address['type'] });
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    if (!isOpen) return null;

    const getIcon = (type: Address['type']) => {
        switch (type) {
            case 'home': return Home;
            case 'work': return Briefcase;
            default: return MapPin;
        }
    };

    const handleSetDefault = (id: string) => {
        setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
        setMenuOpenId(null);
    };

    const handleDelete = (id: string) => {
        setAddresses(prev => prev.filter(a => a.id !== id));
        setMenuOpenId(null);
    };

    const handleAddAddress = () => {
        if (!newAddress.label || !newAddress.address) return;
        const id = Date.now().toString();
        setAddresses(prev => [...prev, { ...newAddress, id, isDefault: false }]);
        setNewAddress({ label: '', address: '', type: 'other' });
        setIsAdding(false);
    };

    return (
        <div className="fixed inset-0 z-[14000] flex items-start justify-center animate-in fade-in duration-200">
            <div className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="w-full h-full md:h-auto md:max-h-[90vh] md:w-[600px] md:mt-[5vh] md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 bg-[#F2F3F2] md:bg-white flex flex-col animate-in slide-in-from-right md:slide-in-from-bottom md:zoom-in-95 duration-300 relative z-10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center px-4 md:px-6 py-3 md:py-4 shrink-0 relative bg-white border-b border-gray-100">
                    <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 md:hidden z-10">
                        <ChevronLeft size={20} className="text-[#181725]" />
                    </button>
                    <h2 className="w-full text-center md:text-left text-[17px] md:text-[20px] font-[700] text-[#181725]">Saved Addresses</h2>
                    <button onClick={onClose} className="hidden md:flex p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 z-10">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 md:pt-5 pb-28 md:pb-6">
                    <div className="space-y-3 md:space-y-4">
                        {addresses.map((addr) => {
                            const Icon = getIcon(addr.type);
                            return (
                                <div key={addr.id} className="bg-white md:bg-gray-50/80 border border-gray-100 rounded-[12px] md:rounded-2xl p-4 md:p-5 shadow-sm relative hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center shrink-0 mt-0.5">
                                            <Icon size={18} className="text-[#53B175] md:w-5 md:h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[14px] md:text-[16px] font-[700] text-[#181725]">{addr.label}</span>
                                                {addr.isDefault && (
                                                    <span className="text-[9px] md:text-[10px] font-[700] text-[#53B175] bg-[#E8F5E9] px-2 py-0.5 rounded-full uppercase tracking-wide">Default</span>
                                                )}
                                            </div>
                                            <p className="text-[12px] md:text-[13px] text-[#7C7C7C] leading-relaxed">{addr.address}</p>
                                        </div>
                                        <button
                                            onClick={() => setMenuOpenId(menuOpenId === addr.id ? null : addr.id)}
                                            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                                        >
                                            <MoreVertical size={16} className="text-gray-400" />
                                        </button>
                                    </div>

                                    {menuOpenId === addr.id && (
                                        <div className="absolute right-4 top-14 bg-white border border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden min-w-[170px]">
                                            {!addr.isDefault && (
                                                <button
                                                    onClick={() => handleSetDefault(addr.id)}
                                                    className="w-full flex items-center gap-2.5 px-4 py-3 md:py-3.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50"
                                                >
                                                    <MapPin size={14} className="text-[#53B175]" />
                                                    <span className="text-[12px] md:text-[13px] font-[600] text-[#181725]">Set as Default</span>
                                                </button>
                                            )}
                                            <button className="w-full flex items-center gap-2.5 px-4 py-3 md:py-3.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50">
                                                <Pencil size={14} className="text-gray-400" />
                                                <span className="text-[12px] md:text-[13px] font-[600] text-[#181725]">Edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(addr.id)}
                                                className="w-full flex items-center gap-2.5 px-4 py-3 md:py-3.5 text-left hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={14} className="text-red-400" />
                                                <span className="text-[12px] md:text-[13px] font-[600] text-red-500">Delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {isAdding && (
                        <div className="bg-white md:bg-gray-50/80 border border-gray-100 rounded-[12px] md:rounded-2xl p-4 md:p-6 shadow-sm mt-4 space-y-3 md:space-y-4">
                            <h4 className="text-[13px] md:text-[15px] font-[700] text-[#181725] mb-1">New Address</h4>
                            <div className="flex gap-2">
                                {(['home', 'work', 'other'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setNewAddress(prev => ({ ...prev, type }))}
                                        className={cn(
                                            "px-4 py-2 md:px-5 md:py-2.5 rounded-full text-[11px] md:text-[12px] font-[700] capitalize transition-all border",
                                            newAddress.type === type
                                                ? "bg-[#53B175] text-white border-[#53B175]"
                                                : "bg-white text-[#181725] border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Label (e.g. Mom's house)"
                                value={newAddress.label}
                                onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                                className="w-full px-3.5 py-2.5 md:px-4 md:py-3 bg-[#F7F8FA] border border-gray-100 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-medium outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 transition-all"
                            />
                            <textarea
                                placeholder="Full address"
                                value={newAddress.address}
                                onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                                rows={2}
                                className="w-full px-3.5 py-2.5 md:px-4 md:py-3 bg-[#F7F8FA] border border-gray-100 rounded-lg md:rounded-xl text-[13px] md:text-[14px] font-medium outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 transition-all resize-none"
                            />
                            <div className="flex gap-2 md:gap-3 pt-1">
                                <button
                                    onClick={() => { setIsAdding(false); setNewAddress({ label: '', address: '', type: 'other' }); }}
                                    className="flex-1 py-2.5 md:py-3 border border-gray-200 rounded-xl md:rounded-2xl text-[13px] md:text-[14px] font-[600] text-[#181725] active:bg-gray-50 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddAddress}
                                    className="flex-1 py-2.5 md:py-3 bg-[#53B175] rounded-xl md:rounded-2xl text-[13px] md:text-[14px] font-[700] text-white active:bg-[#48a068] hover:bg-[#48a068] transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Address Button */}
                <div className="fixed md:static bottom-0 left-0 right-0 px-5 md:px-6 pt-3 pb-5 md:py-5 bg-white border-t border-gray-100">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl active:scale-[0.98] transition-all text-[14px] md:text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                    >
                        <Plus size={18} />
                        Add New Address
                    </button>
                </div>
            </div>
        </div>
    );
}
