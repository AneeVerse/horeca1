'use client';

import React, { useState } from 'react';
import { ChevronLeft, CreditCard, Plus, Trash2, Smartphone, Building2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethod {
    id: string;
    type: 'upi' | 'card' | 'bank';
    label: string;
    detail: string;
    isDefault: boolean;
}

interface PaymentManagementOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PaymentManagementOverlay({ isOpen, onClose }: PaymentManagementOverlayProps) {
    const [methods, setMethods] = useState<PaymentMethod[]>([
        { id: '1', type: 'upi', label: 'Google Pay', detail: 'alex@okaxis', isDefault: true },
        { id: '2', type: 'card', label: 'HDFC Debit Card', detail: '•••• •••• •••• 4582', isDefault: false },
        { id: '3', type: 'bank', label: 'SBI Net Banking', detail: 'State Bank of India', isDefault: false },
    ]);
    const [isAdding, setIsAdding] = useState(false);
    const [newMethod, setNewMethod] = useState({ type: 'upi' as PaymentMethod['type'], label: '', detail: '' });

    if (!isOpen) return null;

    const getIcon = (type: PaymentMethod['type']) => {
        switch (type) {
            case 'upi': return Smartphone;
            case 'card': return CreditCard;
            case 'bank': return Building2;
        }
    };

    const getIconBg = (type: PaymentMethod['type']) => {
        switch (type) {
            case 'upi': return 'bg-purple-50 text-purple-500';
            case 'card': return 'bg-blue-50 text-blue-500';
            case 'bank': return 'bg-orange-50 text-orange-500';
        }
    };

    const handleSetDefault = (id: string) => {
        setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
    };

    const handleDelete = (id: string) => {
        setMethods(prev => prev.filter(m => m.id !== id));
    };

    const handleAdd = () => {
        if (!newMethod.label || !newMethod.detail) return;
        setMethods(prev => [...prev, { ...newMethod, id: Date.now().toString(), isDefault: false }]);
        setNewMethod({ type: 'upi', label: '', detail: '' });
        setIsAdding(false);
    };

    return (
        <div className="fixed inset-0 z-[14000] bg-[#F2F3F2] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center px-4 py-3 shrink-0 relative bg-white border-b border-gray-50">
                <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 z-10">
                    <ChevronLeft size={20} className="text-[#181725]" />
                </button>
                <h2 className="w-full text-center text-[17px] font-[700] text-[#181725]">Payment Management</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
                {/* Payment Methods */}
                <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">Saved Methods</h4>
                <div className="space-y-3 mb-6">
                    {methods.map((method) => {
                        const Icon = getIcon(method.type);
                        const iconStyle = getIconBg(method.type);
                        return (
                            <div key={method.id} className="bg-white border border-gray-100 rounded-[12px] p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", iconStyle)}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[14px] font-[700] text-[#181725]">{method.label}</span>
                                            {method.isDefault && (
                                                <CheckCircle2 size={14} className="text-[#53B175] fill-[#E8F5E9]" />
                                            )}
                                        </div>
                                        <p className="text-[12px] text-[#7C7C7C] font-[500]">{method.detail}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {!method.isDefault && (
                                            <button
                                                onClick={() => handleSetDefault(method.id)}
                                                className="text-[10px] font-[600] text-[#53B175] bg-[#E8F5E9] px-2.5 py-1 rounded-full active:scale-95 transition-all"
                                            >
                                                Set Default
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(method.id)}
                                            className="p-1.5 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <Trash2 size={14} className="text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add New Method Form */}
                {isAdding && (
                    <div className="bg-white border border-gray-100 rounded-[12px] p-4 shadow-sm space-y-3">
                        <h4 className="text-[13px] font-[700] text-[#181725]">Add Payment Method</h4>
                        <div className="flex gap-2">
                            {(['upi', 'card', 'bank'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setNewMethod(prev => ({ ...prev, type }))}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-[11px] font-[700] uppercase transition-all border",
                                        newMethod.type === type
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
                            placeholder={newMethod.type === 'upi' ? 'UPI App Name' : newMethod.type === 'card' ? 'Card Name' : 'Bank Name'}
                            value={newMethod.label}
                            onChange={(e) => setNewMethod(prev => ({ ...prev, label: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F7F8FA] border border-gray-100 rounded-lg text-[13px] font-medium outline-none focus:border-[#53B175] transition-colors"
                        />
                        <input
                            type="text"
                            placeholder={newMethod.type === 'upi' ? 'UPI ID (e.g. name@upi)' : newMethod.type === 'card' ? 'Card number (last 4 digits)' : 'Account details'}
                            value={newMethod.detail}
                            onChange={(e) => setNewMethod(prev => ({ ...prev, detail: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-[#F7F8FA] border border-gray-100 rounded-lg text-[13px] font-medium outline-none focus:border-[#53B175] transition-colors"
                        />
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] font-[600] text-[#181725]">Cancel</button>
                            <button onClick={handleAdd} className="flex-1 py-2.5 bg-[#53B175] rounded-xl text-[13px] font-[700] text-white active:bg-[#48a068]">Save</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Button */}
            <div className="fixed bottom-0 left-0 right-0 px-5 pt-3 pb-5 bg-white border-t border-gray-50">
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all text-[14px] flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    Add Payment Method
                </button>
            </div>
        </div>
    );
}
