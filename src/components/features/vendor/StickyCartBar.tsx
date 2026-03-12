'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export function StickyCartBar() {
    const { totalItems, totalAmount, vendorCount } = useCart();

    if (totalItems === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-4 md:left-auto md:right-4 md:max-w-[420px]">
            <div className="bg-[#299e60] md:rounded-2xl shadow-2xl shadow-green-900/30">
                <Link
                    href="/cart"
                    className="flex items-center justify-between px-5 py-3.5 md:py-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <ShoppingCart size={20} className="text-white" />
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-[#299e60] text-[9px] font-black rounded-full flex items-center justify-center">
                                {totalItems}
                            </span>
                        </div>
                        <div>
                            <p className="text-white text-[13px] font-bold">
                                {totalItems} item{totalItems > 1 ? 's' : ''} {vendorCount > 1 ? `• ${vendorCount} vendors` : ''}
                            </p>
                            <p className="text-green-100 text-[11px] font-medium">
                                ₹{totalAmount.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white text-[#299e60] px-4 py-2 rounded-xl text-[12px] font-bold shadow-md hover:shadow-lg transition-shadow">
                        VIEW CART →
                    </div>
                </Link>
            </div>
        </div>
    );
}
