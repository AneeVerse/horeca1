'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InitialPincodeOverlayProps {
    onComplete: (pincode?: string) => void;
}

// Track if shown in current session (resets on refresh)
let hasBeenShownInSession = false;

export function InitialPincodeOverlay({ onComplete }: InitialPincodeOverlayProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [pincode, setPincode] = useState('');
    const [error, setError] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Check if pincode already exists in localStorage
        const savedPincode = typeof window !== 'undefined' ? localStorage.getItem('user_pincode') : null;
        
        if (savedPincode) {
            onComplete(savedPincode);
            setIsVisible(false);
            hasBeenShownInSession = true;
            return;
        }

        if (!hasBeenShownInSession) {
            setIsVisible(true);
            hasBeenShownInSession = true;
        }
    }, [onComplete]);

    if (!isMounted || !isVisible) return null;

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (pincode === '400708') {
            // localStorage.setItem('pincode_checked', 'true');
            localStorage.setItem('user_pincode', pincode);
            setIsVisible(false);
            onComplete(pincode);
        } else {
            setError('pin code is not servicable');
        }
    };

    const handleSkip = () => {
        // localStorage.setItem('pincode_checked', 'true');
        setIsVisible(false);
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            {/* Content Card */}
            <div className="relative w-full max-w-[500px] min-w-[260px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 md:p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-xl md:text-2xl font-bold text-[#181725] mb-2">Choose delivery location</h2>
                        <p className="text-sm text-gray-500">Enter your pincode to check serviceability</p>
                    </div>

                    {/* Search/Input Section */}
                    <form onSubmit={handleSubmit} className="mb-8 space-y-4">
                        <div className={cn(
                            "flex items-center gap-3 px-4 py-3 border-2 rounded-xl transition-all duration-300 shadow-sm",
                            error ? "border-red-400 bg-red-50/30" : "border-[#53B175] bg-white"
                        )}>
                            <Search size={22} className={cn("shrink-0", error ? "text-red-400" : "text-[#53B175]")} />
                            <input
                                type="text"
                                value={pincode}
                                onChange={(e) => {
                                    setPincode(e.target.value.replace(/\D/g, ''));
                                    setError('');
                                }}
                                placeholder="Search for area, street name or pincode.."
                                className="flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-gray-400"
                                maxLength={6}
                                autoFocus
                            />
                        </div>
                        
                        {error && (
                            <p className="text-sm font-semibold text-red-500 text-center animate-in fade-in slide-in-from-top-1">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-100 transition-all active:scale-[0.98]"
                        >
                            Confirm Pincode
                        </button>
                    </form>

                    {/* Map Icon Placeholder (matches screenshot) */}
                    <div className="flex flex-col items-center justify-center py-6 border-y border-gray-50 mb-8">
                        <div className="relative">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
                                <MapPin size={48} className="text-gray-200" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-4 border-white rounded-full" />
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-4px]">
                                <MapPin size={32} className="text-[#FF4B4B] fill-[#FF4B4B]" />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Options */}
                    <div className="space-y-4">
                        <button
                            onClick={handleSkip}
                            className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider"
                        >
                            Go without pincode
                        </button>

                        {/* Banner Placeholder (matches screenshot) */}
                        <div className="bg-[#F2F3F2] rounded-xl p-3 flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2 shadow-sm shrink-0">
                                <img src="/images/mobile-nav/cart.svg" alt="App" className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-[12px] font-bold text-[#181725] leading-tight mb-0.5">Your Shopping & Savings' Partner</h4>
                                <p className="text-[10px] text-gray-500 font-medium">One-stop shop for your family needs.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media (max-width: 280px) {
                    .max-w-\[500px\] {
                        max-width: 260px !important;
                    }
                    h2 {
                        font-size: 16px !important;
                    }
                }
            `}</style>
        </div>
    );
}
