'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, Share2, ShoppingCart, Heart, ListPlus, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import type { VendorProduct } from '@/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

interface VendorProductCardProps {
    product: VendorProduct;
}

export const VendorProductCard = React.memo(function VendorProductCard({ product }: VendorProductCardProps) {
    const { addToCart, groups, updateQuantity } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { status: sessionStatus } = useSession();
    const isLiked = isInWishlist(product.id);

    // Save to Order List state
    const [showListPicker, setShowListPicker] = useState(false);
    const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
    const [listLoading, setListLoading] = useState(false);
    const [addedToList, setAddedToList] = useState<string | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showListPicker) return;
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowListPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showListPicker]);

    const openListPicker = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (sessionStatus !== 'authenticated') {
            toast.error('Please log in to save to an order list');
            return;
        }
        setShowListPicker(true);
        setListLoading(true);
        try {
            const res = await fetch('/api/v1/lists');
            const json = await res.json();
            setLists(json.data || []);
        } catch { setLists([]); }
        finally { setListLoading(false); }
    };

    const addToList = async (listId: string, listName: string) => {
        try {
            await fetch(`/api/v1/lists/${listId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: product.id, vendorId: product.vendorId, defaultQty: 1 }),
            });
            setAddedToList(listId);
            toast.success(`Added to "${listName}"`);
            setTimeout(() => { setShowListPicker(false); setAddedToList(null); }, 1200);
        } catch { toast.error('Failed to add to list'); }
    };

    const createAndAdd = async () => {
        try {
            const res = await fetch('/api/v1/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `${product.name} List`, vendorId: product.vendorId }),
            });
            const json = await res.json();
            if (json.data?.id) await addToList(json.data.id, json.data.name);
        } catch { toast.error('Failed to create list'); }
    };

    const vendorGroup = groups.find(g => g.vendorId === product.vendorId);
    const cartItem = vendorGroup?.items.find(i => i.productId === product.id);
    const currentQty = cartItem?.quantity || 0;

    const handleAdd = (e: React.MouseEvent, qty: number = 1) => {
        e.preventDefault();
        e.stopPropagation();

        const minQty = product.minOrderQuantity || 1;

        if (currentQty > 0) {
            updateQuantity(product.id, currentQty + qty);
        } else {
            // First add: respect minimum order quantity
            const firstAddQty = Math.max(qty, minQty);
            addToCart(product, firstAddQty);
            qty = firstAddQty;
        }

        toast.success(`${product.name} added to cart!`, {
            description: `Quantity: ${currentQty + qty} ${product.packSize || ''}`,
            duration: 2000,
        });
    };

    const bulkTiers = (product.bulkPrices ?? []).slice(0, 3);

    const isOutOfStock = product.stock === 0 || product.isActive === false;
    
    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const shareUrl = `${window.location.origin}/product/${product.id}?v=${encodeURIComponent(product.vendorName || '')}&n=${encodeURIComponent(product.name)}&p=${product.price}&i=${encodeURIComponent(product.images[0])}&c=${encodeURIComponent(product.category)}&u=${encodeURIComponent(product.packSize || '')}`;
        
        const shareData = {
            title: product.name,
            text: `Check out ${product.name} from ${product.vendorName} on Horeca1`,
            url: shareUrl,
        };

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied to clipboard!', {
                    description: 'You can now share it with others.',
                });
            }
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                toast.error('Failed to share link');
            }
        }
    };

    return (
        <Link
            href={isOutOfStock ? '#' : `/product/${product.id}?v=${encodeURIComponent(product.vendorName || '')}&n=${encodeURIComponent(product.name)}&p=${product.price}&i=${encodeURIComponent(product.images[0])}&c=${encodeURIComponent(product.category)}&u=${encodeURIComponent(product.packSize || '')}`}
            className={cn(
                "bg-white rounded-[24px] md:rounded-[20px] border border-gray-200 overflow-hidden transition-all duration-700 group p-4 min-[340px]:p-5 md:p-3.5 relative flex flex-col gap-3 md:gap-2 h-full",
                isOutOfStock ? "opacity-75 cursor-default" : "hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-2 hover:border-[#53B175]/20"
            )}
            onClick={(e) => {
                if (isOutOfStock) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
        >
            {/* Top Quick Actions - Glass Icons */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2.5 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
                <button
                    className="p-2 rounded-xl backdrop-blur-md bg-white/70 border border-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-[#FF4D4D]/10 hover:text-[#FF4D4D] transition-all"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product); }}
                >
                    <Heart size={15} className={cn("transition-colors", isLiked ? "text-red-500 fill-red-500" : "text-gray-400")} strokeWidth={2.5} />
                </button>
                {/* Save to Order List */}
                <div className="relative" ref={pickerRef}>
                    <button
                        className="p-2 rounded-xl backdrop-blur-md bg-white/70 border border-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-[#53B175]/10 hover:text-[#53B175] transition-all"
                        onClick={openListPicker}
                        title="Save to Order List"
                    >
                        <ListPlus size={15} className="text-gray-400" strokeWidth={2.5} />
                    </button>
                    {showListPicker && (
                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">Save to List</p>
                            {listLoading ? (
                                <p className="text-[12px] text-gray-400 px-3 py-2">Loading...</p>
                            ) : lists.length === 0 ? (
                                <p className="text-[12px] text-gray-400 px-3 py-2">No lists yet</p>
                            ) : (
                                lists.map(l => (
                                    <button key={l.id} onClick={() => addToList(l.id, l.name)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-left transition-colors">
                                        <span className="text-[13px] font-bold text-[#181725] truncate">{l.name}</span>
                                        {addedToList === l.id && <Check size={14} className="text-[#53B175] shrink-0" />}
                                    </button>
                                ))
                            )}
                            <button onClick={createAndAdd}
                                className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-gray-50 hover:bg-[#53B175]/5 transition-colors">
                                <Plus size={13} className="text-[#53B175]" strokeWidth={3} />
                                <span className="text-[13px] font-black text-[#53B175]">Create & Add</span>
                            </button>
                        </div>
                    )}
                </div>
                <button
                    className="p-2 rounded-xl backdrop-blur-md bg-white/70 border border-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:bg-[#53B175]/10 hover:text-[#53B175] transition-all"
                    onClick={handleShare}
                >
                    <Share2 size={15} className="text-gray-400" strokeWidth={2.5} />
                </button>
            </div>

            {/* ── IMAGE SECTION ── */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-50/50 flex items-center justify-center">
                <div className="relative w-[85%] h-[85%]">
                    <Image
                        src={product.images[0] || '/images/recom-product/product-img10.png'}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 280px"
                        className={cn(
                            "object-contain transition-transform duration-700 ease-out p-1",
                            isOutOfStock ? "grayscale" : ""
                        )}
                    />
                </div>
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                    {isOutOfStock ? (
                        <span className="bg-gray-800 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                            OUT
                        </span>
                    ) : (
                        <>
                            {product.isDeal && (
                                <span className="bg-[#FF4D4D] text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg shadow-red-500/10 tracking-wider">
                                    DEAL
                                </span>
                            )}
                            {product.frequentlyOrdered && (
                                <span className="bg-[#FBC02D] text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg shadow-yellow-500/10 tracking-wider">
                                    TOP
                                </span>
                            )}
                        </>
                    )}
                </div>
                {product.creditBadge && !isOutOfStock && (
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-[#F3E5F5]/80 backdrop-blur-md text-[#7B1FA2] px-2 py-1 rounded-lg border border-purple-100/50">
                        <CreditCard size={10} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-tight">Credit</span>
                    </div>
                )}
            </div>

            {/* ── CONTENT SECTION ── */}
            <div className="flex flex-col gap-1.5">
                <h3 className={cn(
                    "text-[14px] md:text-[14px] font-[900] leading-[1.3] line-clamp-2 h-[2.6em]",
                    isOutOfStock ? "text-gray-400" : "text-[#181725]"
                )}>
                    {product.name}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] md:text-[11px] text-gray-400 font-extrabold uppercase tracking-widest truncate">
                        {product.packSize}
                    </p>
                    {(product.minOrderQuantity || 1) > 1 && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
                            Min {product.minOrderQuantity}
                        </span>
                    )}
                </div>
            </div>

            {/* ── BULK TIERS ── */}
            {bulkTiers.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                    {bulkTiers.map((tier, i) => (
                        <div key={i} className={cn(
                            "rounded-xl border px-3 py-1.5 flex items-center justify-between gap-2 transition-colors",
                            isOutOfStock ? "bg-gray-50 border-gray-100" : "bg-[#F7FBF8] border-[#EAF5ED] hover:border-[#53B175]/30"
                        )}>
                            <span className={cn(
                                "text-[11px] font-black tracking-tight",
                                isOutOfStock ? "text-gray-300" : "text-[#1B5E20]"
                            )}>
                                ₹{tier.price} <span className="opacity-60 text-[9px]">({tier.minQty}+ pcs)</span>
                            </span>
                            {!isOutOfStock && (
                                <button
                                    onClick={(e) => handleAdd(e, tier.minQty)}
                                    className="text-[#53B175] text-[10px] font-black uppercase tracking-widest hover:text-[#2c7a2c] transition-colors"
                                >
                                    + Add
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── FOOTER: PRICE + CTA ── */}
            <div className="mt-auto pt-4 md:pt-3 flex flex-col gap-4 md:gap-2.5">
                <div className="flex items-baseline gap-1.5">
                    <span className={cn(
                        "text-[18px] md:text-[20px] font-[1000] tracking-tighter leading-none",
                        isOutOfStock ? "text-gray-300" : "text-[#181725]"
                    )}>
                        ₹ {product.price}
                    </span>
                    <span className="text-[11px] md:text-[12px] font-black text-gray-400 uppercase">/ unit</span>
                </div>

                <button
                    disabled={isOutOfStock}
                    onClick={(e) => handleAdd(e, 1)}
                    className={cn(
                        "w-full py-4 md:py-3 rounded-2xl font-black text-[13px] md:text-[13px] flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-95 border uppercase tracking-[0.05em]",
                        isOutOfStock
                            ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"
                            : "bg-[#53B175] text-white border-[#53B175] shadow-[0_8px_25px_rgba(83,177,117,0.2)] hover:bg-[#489d67] hover:shadow-[0_12px_30px_rgba(83,177,117,0.3)]"
                    )}
                >
                    {isOutOfStock ? 'Sold Out' : 'Quick Add'}
                    {!isOutOfStock && <ShoppingCart size={15} strokeWidth={3} className="shrink-0" />}
                </button>
            </div>
        </Link>
    );
});
