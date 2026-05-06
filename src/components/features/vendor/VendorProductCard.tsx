'use client';

import React, { useState } from 'react';
import { CreditCard, Share2, ShoppingCart, Plus, Minus, Navigation, X, Loader2, Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import type { VendorProduct } from '@/types';
import { useCart } from '@/context/CartContext';

interface VendorProductCardProps {
    product: VendorProduct;
}

export const VendorProductCard = React.memo(function VendorProductCard({ product }: VendorProductCardProps) {
    const { addToCart, groups, updateQuantity } = useCart();
    const { status: sessionStatus } = useSession();

    // ── OOS Alternate Vendors state ──
    const [showAlternates, setShowAlternates] = useState(false);
    const [alternateVendors, setAlternateVendors] = useState<Array<{
        id: string;
        name: string;
        vendor: { id: string; businessName: string; logoUrl?: string | null };
        inventory?: { qtyAvailable: number };
        images?: string[];
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
                images: a.images as string[] | undefined,
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
            {/* Share Button Only */}
            <div className="absolute top-4 right-4 z-10">
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
                            {!isOutOfStock && openStepperIdx !== i && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenStepperIdx(i);
                                        setStepperQty(tier.minQty);
                                    }}
                                    className="text-[#53B175] text-[10px] font-black uppercase tracking-widest hover:text-[#2c7a2c] transition-colors"
                                >
                                    + Add
                                </button>
                            )}
                            {!isOutOfStock && openStepperIdx === i && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (stepperQty <= tier.minQty) return;
                                            setStepperQty(stepperQty - 1);
                                        }}
                                        disabled={stepperQty <= tier.minQty}
                                        className={cn(
                                            "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                                            stepperQty <= tier.minQty
                                                ? "text-gray-300 cursor-not-allowed"
                                                : "text-red-400 hover:bg-red-50"
                                        )}
                                    >
                                        <Minus size={12} strokeWidth={3} />
                                    </button>
                                    <span className="text-[12px] font-black text-[#181725] w-6 text-center tabular-nums">
                                        {stepperQty}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setStepperQty(stepperQty + 1);
                                        }}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[#53B175] hover:bg-green-50 transition-colors"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            handleAdd(e, stepperQty);
                                            setOpenStepperIdx(null);
                                        }}
                                        className="ml-1 px-2.5 py-1 rounded-lg bg-[#53B175] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#489d67] transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
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
                    onClick={(e) => {
                        if (isOutOfStock) {
                            fetchAlternates(e);
                        } else {
                            handleAdd(e, 1);
                        }
                    }}
                    className={cn(
                        "w-full py-4 md:py-3 rounded-2xl font-black text-[13px] md:text-[13px] flex items-center justify-center gap-2.5 transition-all duration-300 active:scale-95 border uppercase tracking-[0.05em]",
                        isOutOfStock
                            ? "bg-white text-[#53B175] border-[#53B175] hover:bg-[#f7fbf8] hover:shadow-[0_8px_25px_rgba(83,177,117,0.15)] cursor-pointer"
                            : "bg-[#53B175] text-white border-[#53B175] shadow-[0_8px_25px_rgba(83,177,117,0.2)] hover:bg-[#489d67] hover:shadow-[0_12px_30px_rgba(83,177,117,0.3)]"
                    )}
                >
                    {isOutOfStock ? (
                        <>Find at another vendor <Navigation size={15} strokeWidth={3} className="shrink-0 -rotate-45" /></>
                    ) : (
                        <>Quick Add<ShoppingCart size={15} strokeWidth={3} className="shrink-0" /></>
                    )}
                </button>
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
                            {alternateVendors.map((alt) => (
                                <a key={alt.id} href={`/vendor/${alt.vendor.id}`}
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-[#53B175]/30 hover:bg-[#f7fbf8] transition-all group"
                                    onClick={(e) => e.stopPropagation()}>
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                                        {alt.images?.[0] ? (
                                            <Image src={alt.images[0]} alt={alt.name} width={48} height={48} className="object-cover w-full h-full" />
                                        ) : (
                                            <Package size={20} className="text-gray-300" strokeWidth={2} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] font-black text-[#181725] truncate">{alt.name}</p>
                                        <p className="text-[12px] font-bold text-[#53B175]">
                                            {alt.vendor.businessName}
                                            {alt.inventory && <span className="text-gray-400 ml-1">· {alt.inventory.qtyAvailable} in stock</span>}
                                        </p>
                                    </div>
                                    <Navigation size={16} className="text-gray-300 group-hover:text-[#53B175] shrink-0 transition-colors -rotate-45" strokeWidth={2.5} />
                                </a>
                            ))}
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
