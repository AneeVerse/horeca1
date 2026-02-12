'use client';

import React, { useState } from 'react';
import { ArrowLeft, Search, User, MapPin, Home, Briefcase, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationSelectionOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const SAVED_ADDRESSES = [
    {
        id: 'home',
        type: 'Home',
        address: '208 - Akshar Stadium, Behind Rose Valley, N...',
        icon: Home
    },
    {
        id: 'work',
        type: 'Work',
        address: '208 - Akshar Stadium, Behind Rose Valley, N...',
        icon: Briefcase
    },
    {
        id: 'other',
        type: 'Other',
        address: '208 - Akshar Stadium, Behind Rose Valley, N...',
        icon: MapPin
    }
];

export function LocationSelectionOverlay({ isOpen, onClose }: LocationSelectionOverlayProps) {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[11000] bg-white flex flex-col md:hidden animate-in fade-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white sticky top-0 z-10">
                <button onClick={onClose} className="p-1 -ml-1">
                    <ArrowLeft size={24} className="text-gray-700" />
                </button>
                <h2 className="text-xl font-bold text-gray-800">Select a location</h2>
                <button className="p-1 -mr-1">
                    <User size={24} className="text-gray-700" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-24">
                {/* Search Bar */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg w-full shadow-sm focus-within:border-primary/50 transition-colors">
                        <Search size={20} className="text-gray-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search"
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Use Current Location */}
                <button className="w-full flex items-center gap-4 p-4 bg-[#e9f9e9] border border-[#d1f2d1] rounded-lg mb-8 group active:scale-[0.98] transition-transform text-left">
                    <div className="w-10 h-10 shrink-0 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <MapPin size={20} className="text-[#33a852]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold text-[#33a852]">Use current location</h3>
                        <p className="text-[11px] text-[#33a852]/70 font-medium truncate mt-0.5">208 - Akshar Stadium, Behind Rose Valley, N...</p>
                    </div>
                </button>

                <div className="text-center mb-6">
                    <h3 className="text-sm font-extrabold text-black uppercase tracking-wider">Saved Addresses</h3>
                </div>

                {/* Saved Addresses List */}
                <div className="space-y-4 mb-12">
                    {SAVED_ADDRESSES.map((addr) => {
                        const Icon = addr.icon;
                        return (
                            <div key={addr.id} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-gray-200 transition-colors">
                                <div className="w-10 h-10 shrink-0 bg-gray-50 rounded-lg flex items-center justify-center">
                                    <Icon size={24} className="text-gray-500" />
                                </div>
                                <div className="flex-1 min-w-0 border-l border-gray-100 pl-4">
                                    <h4 className="text-[15px] font-bold text-gray-800">{addr.type}</h4>
                                    <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">{addr.address}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sticky Bottom Button */}
            <div className="p-4 bg-white border-t border-gray-50 sticky bottom-0">
                <button className="w-full bg-[#5cb85c] hover:bg-[#4cae4c] text-white font-bold py-4 rounded-lg shadow-lg active:scale-[0.98] transition-all text-lg">
                    Add new address
                </button>
            </div>
        </div>
    );
}
