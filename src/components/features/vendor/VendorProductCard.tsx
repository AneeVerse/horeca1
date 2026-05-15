'use client';

import React, { useState } from 'react';
import { CreditCard, Share2, ShoppingCart, Plus, Minus, Navigation, X, Loader2, Package, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { cn, formatPackSize } from '@/lib/utils';
import type { VendorProduct } from '@/types';
import { useCart } from '@/context/CartContext';

interface VendorProductCardProps {
    product: VendorProduct;
}

export const VendorProductCard = React.memo(function VendorProductCard({ product }: VendorProductCardProps) {
    const { addToCart, groups, updateQuantity, removeFromCart } = useCart();
    const { status: sessionStatus } = useSession();

    // ── OOS Alternate Vendors state ──
    const [showAlternates, setShowAlternates] = useState(false);
    const [alternateVendors, setAlternateVendors] = useState<Array<{
        id: string;
        name: string;
        vendor: { id: string; businessName: string; logoUrl?: string | null };
        inventory?: { qtyAvailable: number };
        imageUrl?: string | null;
        images?: string[];
        packSize?: string | null;
        unit?: string | null;
        basePrice?: number;
    }>>([]);
    const [alternatesLoading, setAlternatesLoading] = useState(false);

    // ── Bulk Slab Stepper state ──
    const [openStepperIdx, setOpenStepperIdx] = useState<number | null>(null);
    const [stepperQty, setStepperQty] = useState(0);

    const fetchAlternates = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowAlternates(true);
        setAlternatesLoading(true);
        try {
            const res = await fetch(`/api/v1/products/${product.id}/alternates`);
            const json = await res.json();
            const alternates = json?.data?.alternates || [];
            setAlternateVendors(alternates.map((a: Record<string, unknown>) => ({
                id: a.id as string,
                name: a.name as string,
                vendor: a.vendor as { id: string; businessName: string; logoUrl?: string | null },
                inventory: a.inventory as { qtyAvailable: number } | undefined,
                imageUrl: (a.imageUrl as string | null | undefined) ?? null,
                images: a.images as string[] | undefined,
                packSize: (a.packSize as string | null | undefined) ?? null,
                unit: (a.unit as string | null | undefined) ?? null,
                basePrice: a.basePrice != null ? Number(a.basePrice) : undefined,
            })));
        } catch {
            setAlternateVendors([]);
        } finally {
            setAlternatesLoading(false);
        }
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

    const handleDecrement = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const minQty = product.minOrderQuantity || 1;
        if (currentQty <= minQty) {
            removeFromCart(product.id);
        } else {
            updateQuantity(product.id, currentQty - 1);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        removeFromCart(product.id);
    };

    const handleQtyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const raw = e.target.value.replace(/[^0-9]/g, '');
        if (raw === '') return;
        const parsed = parseInt(raw, 10);
        if (parsed === 0) {
            removeFromCart(product.id);
        } else {
            updateQuantity(product.id, parsed);
        }
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

    return (<>
        <Link
            href={isOutOfStock ? '#' : `/product/${product.id}?v=${encodeURIComponent(product.vendorName || '')}&n=${encodeURIComponent(product.name)}&p=${product.price}&i=${encodeURIComponent(product.images[0])}&c=${encodeURIComponent(product.category)}&u=${encodeURIComponent(product.packSize || '')}`}
            className={cn(
                "bg-white rounded-[22px] border border-gray-100 overflow-hidden transition-all duration-500 group p-4 md:p-5 relative flex flex-col gap-3 h-full",
                isOutOfStock ? "opacity-75 cursor-default" : "hover:shadow-[0_18px_45px_-12px_rgba(83,177,117,0.18)] hover:-translate-y-1 hover:border-[#53B175]/30"
            )}
            onClick={(e) => {
                if (isOutOfStock) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
        >
            {/* Share Button Only */}
            <div className="absolute top-4 right-4 z-10">
                <button
                    className="p-2 rounded-full backdrop-blur-md bg-white/80 border border-white/60 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:bg-[#53B175]/10 hover:text-[#53B175] transition-all"
                    onClick={handleShare}
                >
                    <Share2 size={14} className="text-gray-500" strokeWidth={2} />
                </button>
            </div>

            {/* ── IMAGE SECTION ── */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-[#F7FBF8] via-white to-[#F0F7F2] flex items-center justify-center">
                <div className="relative w-[85%] h-[85%]">
                    <Image
                        src={product.images[0] || '/images/recom-product/product-img10.png'}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 33vw, 320px"
                        className={cn(
                            "object-contain transition-transform duration-500 ease-out p-1 group-hover:scale-[1.04]",
                            isOutOfStock ? "grayscale" : ""
                        )}
                    />
                </div>
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                    {isOutOfStock ? (
                        <span className="bg-gray-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Out
                        </span>
                    ) : (
                        <>
                            {product.isDeal && (
                                <span className="bg-gradient-to-r from-[#FF4D4D] to-[#FF6B6B] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md shadow-red-500/20 tracking-wide">
                                    Deal
                                </span>
                            )}
                            {product.frequentlyOrdered && (
                                <span className="bg-gradient-to-r from-[#FBC02D] to-[#FFD54F] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md shadow-yellow-500/20 tracking-wide">
                                    Top
                                </span>
                            )}
                        </>
                    )}
                </div>
                {product.creditBadge && !isOutOfStock && (
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-md text-[#7B1FA2] px-2.5 py-1 rounded-full border border-purple-100 shadow-sm">
                        <CreditCard size={11} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Credit</span>
                    </div>
                )}
            </div>

            {/* ── CONTENT SECTION ── */}
            <div className="flex flex-col gap-1.5">
                <h3 className={cn(
                    "text-[15px] font-bold leading-[1.35] line-clamp-2 h-[2.7em]",
                    isOutOfStock ? "text-gray-400" : "text-[#181725]"
                )}>
                    {product.displayName ?? product.name}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                    {product.brandSlug && product.brandName && (
                        <Link
                            href={`/brand/${product.brandSlug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-semibold text-[#53B175] hover:underline shrink-0"
                        >
                            by {product.brandName}
                        </Link>
                    )}
                    <p className="text-[12px] text-gray-500 font-medium truncate">
                        {product.packSize}
                    </p>
                    {(product.minOrderQuantity || 1) > 1 && (
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                            Min {product.minOrderQuantity}
                        </span>
                    )}
                </div>
            </div>

            {/* ── BULK TIERS ── */}
            {bulkTiers.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-0.5">
                    {bulkTiers.map((tier, i) => {
                        const isOpen = !isOutOfStock && openStepperIdx === i;
                        return (
                            <div key={i} className={cn(
                                "rounded-xl border px-2.5 py-1.5 flex items-center gap-1.5 transition-colors h-[40px]",
                                isOutOfStock ? "bg-gray-50 border-gray-100" : "bg-[#EFF8F2] border-[#D8ECDF] hover:border-[#53B175]/40"
                            )}>
                                {isOpen ? (
                                    <span className={cn(
                                        "text-[12px] font-bold tracking-tight whitespace-nowrap shrink-0",
                                        isOutOfStock ? "text-gray-300" : "text-[#1B5E20]"
                                    )}>
                                        ₹{tier.price}
                                    </span>
                                ) : (
                                    <span className={cn(
                                        "text-[13px] font-bold tracking-tight whitespace-nowrap flex-1 min-w-0",
                                        isOutOfStock ? "text-gray-300" : "text-[#1B5E20]"
                                    )}>
                                        ₹{tier.price} <span className="opacity-70 text-[11px] font-medium">({tier.minQty}+ pcs)</span>
                                    </span>
                                )}
                                {!isOutOfStock && !isOpen && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setOpenStepperIdx(i);
                                            setStepperQty(tier.minQty);
                                        }}
                                        className="text-[#53B175] text-[11px] font-bold hover:text-[#2c7a2c] transition-colors shrink-0"
                                    >
                                        + Add
                                    </button>
                                )}
                                {isOpen && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (stepperQty <= tier.minQty) return;
                                                setStepperQty(stepperQty - 1);
                                            }}
                                            disabled={stepperQty <= tier.minQty}
                                            className={cn(
                                                "w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0",
                                                stepperQty <= tier.minQty
                                                    ? "text-gray-300 cursor-not-allowed"
                                                    : "text-red-400 hover:bg-red-50 bg-white"
                                            )}
                                        >
                                            <Minus size={12} strokeWidth={2.5} />
                                        </button>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={stepperQty}
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); (e.target as HTMLInputElement).select(); }}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                                setStepperQty(raw === '' ? 0 : parseInt(raw, 10));
                                            }}
                                            onBlur={() => {
                                                if (stepperQty < tier.minQty) setStepperQty(tier.minQty);
                                            }}
                                            onKeyDown={(e) => {
                                                e.stopPropagation();
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const finalQty = stepperQty < tier.minQty ? tier.minQty : stepperQty;
                                                    setStepperQty(finalQty);
                                                    handleAdd(e as unknown as React.MouseEvent, finalQty);
                                                    setOpenStepperIdx(null);
                                                }
                                            }}
                                            className="flex-1 min-w-0 w-full h-6 px-1 rounded-md bg-white border border-[#D8ECDF] text-[12px] font-bold text-[#181725] text-center tabular-nums focus:outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/20 transition-all"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setStepperQty(Math.max(stepperQty, tier.minQty) + 1);
                                            }}
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-[#53B175] hover:bg-green-50 bg-white transition-colors shrink-0"
                                        >
                                            <Plus size={12} strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const finalQty = stepperQty < tier.minQty ? tier.minQty : stepperQty;
                                                handleAdd(e, finalQty);
                                                setOpenStepperIdx(null);
                                            }}
                                            className="px-2 h-6 rounded-md bg-[#53B175] text-white text-[10px] font-bold hover:bg-[#489d67] transition-colors shrink-0"
                                        >
                                            Add
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── FOOTER: PRICE + CTA ── */}
            <div className="mt-auto pt-3 flex flex-col gap-3">
                <div className="flex items-baseline gap-1.5">
                    <span className={cn(
                        "text-[22px] md:text-[24px] font-extrabold tracking-tight leading-none",
                        isOutOfStock ? "text-gray-300" : "text-[#181725]"
                    )}>
                        ₹{product.price}
                    </span>
                    <span className="text-[12px] font-medium text-gray-500">/ unit</span>
                </div>

                {isOutOfStock ? (
                    <button
                        onClick={fetchAlternates}
                        className="w-full rounded-2xl font-bold flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-[0.98] border bg-white text-[#53B175] border-[#53B175] hover:bg-[#f7fbf8] cursor-pointer text-[11px] py-2.5 px-2"
                    >
                        Find at another vendor <Navigation size={12} strokeWidth={2.5} className="shrink-0" />
                    </button>
                ) : currentQty === 0 ? (
                    <button
                        onClick={(e) => handleAdd(e, 1)}
                        className="w-full rounded-2xl font-bold flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-[0.98] border bg-gradient-to-r from-[#53B175] to-[#4AA56B] text-white border-[#53B175] shadow-[0_8px_22px_-6px_rgba(83,177,117,0.45)] hover:shadow-[0_12px_28px_-6px_rgba(83,177,117,0.55)] text-[13px] py-3"
                    >
                        <ShoppingCart size={15} strokeWidth={2.5} className="shrink-0" /> ADD TO CART
                    </button>
                ) : (
                    <div className="w-full flex items-stretch gap-2 h-[44px]">
                        {/* Main stepper pill */}
                        <div className="flex-1 rounded-2xl bg-[#53B175] flex items-stretch overflow-hidden shadow-[0_8px_22px_-6px_rgba(83,177,117,0.35)]">
                            <button
                                onClick={handleDecrement}
                                aria-label={currentQty === 1 ? 'Remove from cart' : 'Decrease quantity'}
                                className="w-12 flex items-center justify-center text-white hover:bg-[#489d67] active:scale-95 transition-all shrink-0"
                            >
                                {currentQty === 1 ? (
                                    <Trash2 size={16} strokeWidth={2.5} />
                                ) : (
                                    <Minus size={18} strokeWidth={3} />
                                )}
                            </button>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={currentQty}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); (e.target as HTMLInputElement).select(); }}
                                onChange={handleQtyInput}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="flex-1 min-w-0 bg-white text-center text-[15px] font-extrabold text-[#181725] tabular-nums focus:outline-none focus:bg-[#f7fbf8] transition-colors my-[3px]"
                            />
                            <button
                                onClick={(e) => handleAdd(e, 1)}
                                aria-label="Increase quantity"
                                className="w-12 flex items-center justify-center text-white hover:bg-[#489d67] active:scale-95 transition-all shrink-0"
                            >
                                <Plus size={18} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Separate remove button — matches DMart reference */}
                        <button
                            onClick={handleRemove}
                            aria-label="Remove from cart"
                            className="w-11 rounded-2xl border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 active:scale-95 transition-all shrink-0 flex items-center justify-center"
                        >
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </div>
        </Link>

        {/* ── OOS ALTERNATE VENDORS MODAL ── */}
        {showAlternates && (
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                onClick={() => setShowAlternates(false)}
            >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                <div
                    className="relative bg-white rounded-[28px] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.15)] w-full max-w-md p-6 z-10 max-h-[80vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[18px] font-black text-[#181725]">Alternate Vendors</h3>
                        <button onClick={() => setShowAlternates(false)}
                            className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                    <p className="text-[13px] font-bold text-gray-500 mb-4">
                        &ldquo;{product.name}&rdquo; is available from these vendors:
                    </p>
                    {alternatesLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={24} className="animate-spin text-[#53B175]" strokeWidth={3} />
                        </div>
                    ) : alternateVendors.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 font-bold text-[14px]">
                            No alternate vendors found at this time.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {alternateVendors.map((alt) => {
                                // Resolve image with fallbacks: explicit images[] → imageUrl singular → vendor logo → none
                                const altImg = alt.images?.[0] || alt.imageUrl || alt.vendor.logoUrl || null;
                                return (
                                    <a key={alt.id} href={`/vendor/${alt.vendor.id}`}
                                        className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-[#53B175]/30 hover:bg-[#f7fbf8] transition-all group"
                                        onClick={(e) => e.stopPropagation()}>
                                        <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden relative">
                                            {altImg ? (
                                                <Image src={altImg} alt={alt.name} fill sizes="56px" className="object-cover" />
                                            ) : (
                                                <Package size={20} className="text-gray-300" strokeWidth={2} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-black text-[#181725] truncate">{alt.name}</p>
                                            <p className="text-[12px] font-bold text-[#53B175] truncate">
                                                {alt.vendor.businessName}
                                            </p>
                                            <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap mt-0.5">
                                                {(alt.packSize || alt.unit) && (
                                                    <span className="text-[11px] font-semibold text-gray-500">{formatPackSize(alt.packSize, alt.unit)}</span>
                                                )}
                                                {alt.basePrice != null && (
                                                    <span className="text-[11px] font-bold text-[#181725]">₹{alt.basePrice}</span>
                                                )}
                                                {alt.inventory && (
                                                    <span className={cn(
                                                        'text-[10px] font-bold',
                                                        alt.inventory.qtyAvailable > 0 ? 'text-green-600' : 'text-red-500'
                                                    )}>
                                                        {alt.inventory.qtyAvailable > 0 ? `${alt.inventory.qtyAvailable} in stock` : 'Out of stock'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Navigation size={16} className="text-gray-300 group-hover:text-[#53B175] shrink-0 transition-colors -rotate-45" strokeWidth={2.5} />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                    <button onClick={() => setShowAlternates(false)}
                        className="mt-5 w-full py-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 font-black text-[13px] uppercase tracking-wider hover:bg-gray-100 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        )}
    </>
    );
});
