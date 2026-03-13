'use client';

import React, { useState } from 'react';
import { ChevronLeft, MapPin, Plus, Home, Briefcase, MoreVertical, Pencil, Trash2 } from 'lucide-react';
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
        {
            id: '1',
            label: 'Home',
            type: 'home',
            address: 'S60, Fz. Chowk, Thane, New Mumbai, Maharashtra 400605',
            isDefault: true,
        },
        {
            id: '2',
            label: 'Work',
            type: 'work',
            address: 'C-003, Sanpada Station Complex, Navi Mumbai, Maharashtra 400705',
            isDefault: false,
        },
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
        <div className="fixed inset-0 z-[14000] bg-[#F2F3F2] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center px-4 py-3 shrink-0 relative bg-white border-b border-gray-50">
                <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 z-10">
                    <ChevronLeft size={20} className="text-[#181725]" />
                </button>
                <h2 className="w-full text-center text-[17px] font-[700] text-[#181725]">Saved Addresses</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
                {/* Address Cards */}
                <div className="space-y-3">
                    {addresses.map((addr) => {
                        const Icon = getIcon(addr.type);
                        return (
                            <div key={addr.id} className="bg-white border border-gray-100 rounded-[12px] p-4 shadow-sm relative">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center shrink-0 mt-0.5">
                                        <Icon size={18} className="text-[#53B175]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[14px] font-[700] text-[#181725]">{addr.label}</span>
                                            {addr.isDefault && (
                                                <span className="text-[9px] font-[700] text-[#53B175] bg-[#E8F5E9] px-2 py-0.5 rounded-full uppercase tracking-wide">Default</span>
                                            )}
                                        </div>
                                        <p className="text-[12px] text-[#7C7C7C] leading-relaxed">{addr.address}</p>
                                    </div>
                                    <button
                                        onClick={() => setMenuOpenId(menuOpenId === addr.id ? null : addr.id)}
                                        className="p-1 hover:bg-gray-50 rounded-full transition-colors shrink-0"
                                    >
                                        <MoreVertical size={16} className="text-gray-400" />
                                    </button>
                                </div>

                                {/* Dropdown Menu */}
                                {menuOpenId === addr.id && (
                                    <div className="absolute right-4 top-12 bg-white border border-gray-100 rounded-[10px] shadow-lg z-10 overflow-hidden min-w-[160px]">
                                        {!addr.isDefault && (
                                            <button
                                                onClick={() => handleSetDefault(addr.id)}
                                                className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50"
                                            >
                                                <MapPin size={14} className="text-[#53B175]" />
                                                <span className="text-[12px] font-[600] text-[#181725]">Set as Default</span>
                                            </button>
                                        )}
                                        <button className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50">
                                            <Pencil size={14} className="text-gray-400" />
                                            <span className="text-[12px] font-[600] text-[#181725]">Edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(addr.id)}
                                            className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={14} className="text-red-400" />
                                            <span className="text-[12px] font-[600] text-red-500">Delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Add New Address Form */}
                {isAdding && (
                    <div className="bg-white border border-gray-100 rounded-[12px] p-4 shadow-sm mt-4 space-y-3">
                        <h4 className="text-[13px] font-[700] text-[#181725] mb-1">New Address</h4>

                        {/* Type Buttons */}
                        <div className="flex gap-2">
                            {(['home', 'work', 'other'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setNewAddress(prev => ({ ...prev, type }))}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-[11px] font-[700] capitalize transition-all border",
                                        newAddress.type === type
                                            ? "bg-[#53B175] text-white border-[#53B175]"
                                            : "bg-white text-[#181725] border-gray-200"
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
                            className="w-full px-3.5 py-2.5 bg-[#F7F8FA] border border-gray-100 rounded-lg text-[13px] font-medium outline-none focus:border-[#53B175] transition-colors"
                        />
                        <textarea
                            placeholder="Full address"
                            value={newAddress.address}
                            onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                            rows={2}
                            className="w-full px-3.5 py-2.5 bg-[#F7F8FA] border border-gray-100 rounded-lg text-[13px] font-medium outline-none focus:border-[#53B175] transition-colors resize-none"
                        />
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => { setIsAdding(false); setNewAddress({ label: '', address: '', type: 'other' }); }}
                                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] font-[600] text-[#181725] active:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddAddress}
                                className="flex-1 py-2.5 bg-[#53B175] rounded-xl text-[13px] font-[700] text-white active:bg-[#48a068] transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Address Button */}
            <div className="fixed bottom-0 left-0 right-0 px-5 pt-3 pb-5 bg-white border-t border-gray-50">
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all text-[14px] flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    Add New Address
                </button>
            </div>
        </div>
    );
}
