'use client';

import React, { useState } from 'react';
import { Plus, Minus, CreditCard, Bookmark, Share2, ShoppingCart } from 'lucide-react';
import type { VendorProduct } from '@/types';
import { useCart } from '@/context/CartContext';

interface VendorProductCardProps {
    product: VendorProduct;
}

export function VendorProductCard({ product }: VendorProductCardProps) {
    const { addToCart, groups, updateQuantity, removeFromCart } = useCart();

    // Find current qty in cart
    const vendorGroup = groups.find(g => g.vendorId === product.vendorId);
    const cartItem = vendorGroup?.items.find(i => i.productId === product.id);
    const currentQty = cartItem?.quantity || 0;

    const handleAdd = (qty: number = 1) => {
        if (currentQty > 0) {
            updateQuantity(product.id, currentQty + qty);
        } else {
            addToCart(product, qty);
        }
    };

    const handleIncrement = () => {
        updateQuantity(product.id, currentQty + 1);
    };

    const handleDecrement = () => {
        if (currentQty <= 1) {
            removeFromCart(product.id);
        } else {
            updateQuantity(product.id, currentQty - 1);
        }
    };

    return (
        <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-500 group flex flex-col p-4 relative">
            {/* Top Share Icon */}
            <div className="absolute top-4 right-4 z-10">
                <button className="p-2 rounded-full hover:bg-gray-50 transition-colors">
                    <Share2 size={20} className="text-gray-400" strokeWidth={1.5} />
                </button>
            </div>

            {/* Image Section */}
            <div className="relative aspect-square mb-4 px-2">
                <img
                    src={product.images[0] || '/images/recom-product/product-img10.png'}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 ease-out"
                />

                {/* Status Badges */}
                <div className="absolute top-0 left-0 flex flex-col gap-1.5">
                    {product.isDeal && (
                        <span className="bg-[#FF4D4D] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                            DEAL
                        </span>
                    )}
                    {product.frequentlyOrdered && (
                        <span className="bg-[#FBC02D] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                            POPULAR
                        </span>
                    )}
                </div>
                
                {/* Credit Badge */}
                {product.creditBadge && (
                    <div className="absolute bottom-0 left-0 flex items-center gap-1 bg-[#F3E5F5] text-[#7B1FA2] px-2 py-0.5 rounded-full">
                        <CreditCard size={10} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Credit</span>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="flex flex-col flex-1">
                <h3 className="text-[17px] font-bold text-[#181725] leading-snug line-clamp-2 min-h-[44px]">
                    {product.name}
                </h3>
                <p className="text-[14px] text-gray-400 font-medium mb-4">
                    {product.packSize}
                </p>

                {/* Bulk Pricing Tiered Box */}
                {product.bulkPrices.length > 0 && (
                    <div className="bg-[#F1F9F4] rounded-[16px] border border-[#E1F2E8] p-3 mb-4 space-y-2">
                        {product.bulkPrices.slice(0, 2).map((bp, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="text-[12px] font-bold text-[#299E60]">
                                    ₹{bp.price}/pc for {bp.minQty} pcs+
                                </span>
                                <button 
                                    onClick={() => handleAdd(bp.minQty)}
                                    className="bg-white border border-[#299E60]/20 text-[#299E60] font-bold text-[11px] px-3 py-1.5 rounded-full shadow-sm hover:bg-white hover:border-[#299E60] transition-all flex items-center gap-1"
                                >
                                    <Plus size={12} strokeWidth={3} /> ADD
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Price Breakdown */}
                <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-[20px] font-black text-[#181725]">
                            ₹ {product.price}
                        </span>
                        <span className="text-[14px] font-bold text-gray-400">/pc</span>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="mt-auto">
                    {currentQty === 0 ? (
                        <button
                            onClick={() => handleAdd(1)}
                            className="w-full bg-[#F1F9F4] hover:bg-[#E1F2E8] text-[#299E60] py-3.5 rounded-[18px] font-black text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-[#E1F2E8]"
                        >
                            Add To Cart <ShoppingCart size={20} />
                        </button>
                    ) : (
                        <div className="flex items-center justify-between bg-[#299E60] rounded-[18px] p-1 shadow-lg shadow-[#299E60]/20">
                            <button
                                onClick={handleDecrement}
                                className="w-12 h-11 flex items-center justify-center hover:bg-[#22844f] rounded-[16px] transition-colors"
                            >
                                <Minus size={18} className="text-white" strokeWidth={3} />
                            </button>
                            <span className="text-[17px] font-black text-white px-2">
                                {currentQty}
                            </span>
                            <button
                                onClick={handleIncrement}
                                className="w-12 h-11 flex items-center justify-center hover:bg-[#22844f] rounded-[16px] transition-colors"
                            >
                                <Plus size={18} className="text-white" strokeWidth={3} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

