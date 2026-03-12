'use client';

import React from 'react';
import { Plus, CreditCard, Share2, ShoppingCart } from 'lucide-react';
import type { VendorProduct } from '@/types';
import { useCart } from '@/context/CartContext';

interface VendorProductCardProps {
    product: VendorProduct;
}

export function VendorProductCard({ product }: VendorProductCardProps) {
    const { addToCart, groups, updateQuantity } = useCart();

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

    const bulk1 = product.bulkPrices?.[0] ?? null;
    const bulk2 = product.bulkPrices?.[1] ?? null;

    /*  
     *  CSS Grid with 8 explicit rows:
     *  Row 1 – Image        (auto, aspect-ratio keeps them equal)
     *  Row 2 – Title         (40px)
     *  Row 3 – Pack size     (18px)
     *  Row 4 – Bulk tier 1   (26px) ← separate container
     *  Row 5 – Bulk tier 2   (26px) ← separate container
     *  Row 6 – Price          (28px)
     *  Row 7 – Button         (38px)
     */

    return (
        <div
            className="bg-white rounded-[16px] md:rounded-[24px] border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-500 group p-3 min-[340px]:p-4 relative"
            style={{
                display: 'grid',
                gridTemplateRows: 'auto 42px 18px 28px 28px 30px 42px',
                gap: '8px',
            }}
        >
            {/* Top Share Icon */}
            <div className="absolute top-2 right-2 z-10">
                <button className="p-1 rounded-full hover:bg-gray-50 transition-colors">
                    <Share2 size={14} className="text-gray-400" strokeWidth={1.5} />
                </button>
            </div>

            {/* ── ROW 1: IMAGE ── */}
            <div className="relative aspect-square overflow-hidden">
                <img
                    src={product.images[0] || '/images/recom-product/product-img10.png'}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out p-1"
                />
                <div className="absolute top-0 left-0 flex flex-col gap-0.5">
                    {product.isDeal && (
                        <span className="bg-[#FF4D4D] text-white text-[8px] min-[340px]:text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            DEAL
                        </span>
                    )}
                    {product.frequentlyOrdered && (
                        <span className="bg-[#FBC02D] text-white text-[8px] min-[340px]:text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            POPULAR
                        </span>
                    )}
                </div>
                {product.creditBadge && (
                    <div className="absolute bottom-0 left-0 flex items-center gap-0.5 bg-[#F3E5F5] text-[#7B1FA2] px-1.5 py-0.5 rounded-full">
                        <CreditCard size={8} />
                        <span className="text-[7px] min-[340px]:text-[9px] font-bold uppercase tracking-wider">Credit</span>
                    </div>
                )}
            </div>

            {/* ── ROW 2: TITLE ── */}
            <div className="overflow-hidden">
                <h3 className="text-[12px] min-[340px]:text-[14px] md:text-[17px] font-bold text-[#181725] leading-tight line-clamp-2">
                    {product.name}
                </h3>
            </div>

            {/* ── ROW 3: PACK SIZE ── */}
            <div className="overflow-hidden flex items-start">
                <p className="text-[10px] min-[340px]:text-[12px] md:text-[14px] text-gray-400 font-medium truncate w-full">
                    {product.packSize}
                </p>
            </div>

            {/* ── ROW 4: BULK TIER 1 ── */}
            <div className="overflow-hidden flex items-center">
                {bulk1 ? (
                    <div className="bg-[#F1F9F4] rounded-[8px] border border-[#E1F2E8] px-1.5 min-[340px]:px-2 py-0.5 flex items-center justify-between gap-0.5 w-full h-full">
                        <span className="text-[8px] min-[340px]:text-[10px] md:text-[12px] font-bold text-[#299E60] leading-none whitespace-nowrap">
                            ₹{bulk1.price} ({bulk1.minQty}+)
                        </span>
                        <button 
                            onClick={() => handleAdd(bulk1.minQty)}
                            className="bg-white border border-[#299E60]/20 text-[#299E60] font-bold text-[7px] min-[340px]:text-[9px] md:text-[11px] px-1 min-[340px]:px-1.5 py-0.5 rounded-full hover:bg-gray-50 hover:border-[#299E60] transition-all flex items-center gap-0.5 shrink-0 whitespace-nowrap"
                        >
                            + ADD
                        </button>
                    </div>
                ) : (
                    <div className="w-full h-full" />
                )}
            </div>

            {/* ── ROW 5: BULK TIER 2 ── */}
            <div className="overflow-hidden flex items-center">
                {bulk2 ? (
                    <div className="bg-[#F1F9F4] rounded-[8px] border border-[#E1F2E8] px-1.5 min-[340px]:px-2 py-0.5 flex items-center justify-between gap-0.5 w-full h-full">
                        <span className="text-[8px] min-[340px]:text-[10px] md:text-[12px] font-bold text-[#299E60] leading-none whitespace-nowrap">
                            ₹{bulk2.price} ({bulk2.minQty}+)
                        </span>
                        <button 
                            onClick={() => handleAdd(bulk2.minQty)}
                            className="bg-white border border-[#299E60]/20 text-[#299E60] font-bold text-[7px] min-[340px]:text-[9px] md:text-[11px] px-1 min-[340px]:px-1.5 py-0.5 rounded-full hover:bg-gray-50 hover:border-[#299E60] transition-all flex items-center gap-0.5 shrink-0 whitespace-nowrap"
                        >
                            + ADD
                        </button>
                    </div>
                ) : (
                    <div className="w-full h-full" />
                )}
            </div>

            {/* ── ROW 6: PRICE ── */}
            <div className="overflow-hidden flex items-center">
                <div className="flex items-baseline gap-0.5">
                    <span className="text-[15px] min-[340px]:text-[18px] md:text-[22px] font-black text-[#181725]">
                        ₹ {product.price}
                    </span>
                    <span className="text-[9px] min-[340px]:text-[11px] md:text-[14px] font-bold text-gray-400">/pc</span>
                </div>
            </div>

            {/* ── ROW 7: ADD TO CART ── */}
            <div className="overflow-hidden flex items-end">
                <button
                    onClick={() => handleAdd(1)}
                    className="w-full bg-[#F1F9F4] hover:bg-[#E1F2E8] text-[#299E60] h-full rounded-[10px] min-[340px]:rounded-[14px] md:rounded-[18px] font-extrabold text-[11px] min-[340px]:text-[13px] md:text-[15px] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-[#E1F2E8]"
                >
                    Add To Cart
                    <ShoppingCart size={14} className="shrink-0" />
                </button>
            </div>
        </div>
    );
}
