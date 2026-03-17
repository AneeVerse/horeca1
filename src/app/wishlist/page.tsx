'use client';

import React from 'react';
import { ChevronLeft, Heart, Store, ShoppingCart, ChevronRight, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import type { VendorProduct } from '@/types';

export default function WishlistPage() {
    const router = useRouter();
    const { wishlist, toggleWishlist } = useWishlist();
    const { addToCart, groups, updateQuantity, totalItems } = useCart();

    const handleAddToCart = (item: VendorProduct) => {
        const vendorGroup = groups.find(g => g.vendorId === item.vendorId);
        const cartItem = vendorGroup?.items.find(i => i.productId === item.id);
        const currentQty = cartItem?.quantity || 0;

        if (currentQty > 0) {
            updateQuantity(item.id, currentQty + 1);
        } else {
            addToCart(item, 1);
        }

        toast.success(`${item.name} added to cart!`, {
            description: `Added from wishlist`,
            duration: 2000,
        });
    };

    return (
        <div className="bg-white min-h-screen flex flex-col font-inter">
            {/* Mobile Header */}
            <header className="md:hidden bg-white px-4 h-16 flex items-center justify-between sticky top-0 z-[100] border-b border-gray-100/50">
                <button 
                    onClick={() => router.back()} 
                    className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} className="text-[#181725]" strokeWidth={2} />
                </button>
                <h1 className="text-[18px] font-bold text-[#181725] absolute left-1/2 -translate-x-1/2">Your Wishlist</h1>
                <div className="w-10 h-10" /> {/* Spacer to keep title centered */}
            </header>

            {/* Desktop Header */}
            <div className="hidden md:block bg-[#F7F8FA] border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-5">
                    <div className="flex items-center gap-2 text-[13px] text-text-muted mb-3">
                        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
                            <Home size={14} />
                            <span>Home</span>
                        </Link>
                        <ChevronRight size={12} />
                        <span className="text-text font-semibold">Wishlist</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-[28px] font-black text-text tracking-tight">Your Wishlist</h1>
                        <span className="text-text-muted text-[14px] font-medium">
                            {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 bg-gray-50/20 md:bg-[#F7F8FA] md:px-0 md:pb-16">
                <div className="md:max-w-[var(--container-max)] md:mx-auto md:px-[var(--container-padding)]">
                    {wishlist.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[70vh] text-center px-8">
                            <div className="w-24 h-24 bg-gray-100/80 rounded-full flex items-center justify-center mb-6">
                                <Heart size={40} className="text-gray-300" strokeWidth={1.5} />
                            </div>
                            <h2 className="text-[20px] font-bold text-[#181725] mb-2">Your wishlist is empty</h2>
                            <p className="text-[14px] text-gray-400 font-medium max-w-[200px] mx-auto">
                                Start adding items to your wishlist to see them here!
                            </p>
                            <button 
                                onClick={() => router.push('/')}
                                className="mt-8 px-8 py-3 bg-[#53B175] text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-green-100"
                            >
                                Shop Now
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 min-[340px]:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5 pb-8">
                            {wishlist.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-white border border-gray-100 rounded-[24px] md:rounded-2xl overflow-hidden shadow-sm md:shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col h-full group hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                                >
                                    {/* Product Image Area */}
                                    <div className="relative pt-4 px-4">
                                        <button 
                                            onClick={() => toggleWishlist(item)}
                                            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 shadow-sm border border-gray-50 transition-all active:scale-90 hover:bg-red-50"
                                        >
                                            <Heart size={16} className="text-red-500 fill-red-500" />
                                        </button>

                                        <div className="w-full aspect-square bg-white flex items-center justify-center p-2">
                                            <img
                                                src={item.images[0]}
                                                alt={item.name}
                                                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-4 flex flex-col flex-1">
                                        <h3 className="text-[13px] min-[340px]:text-[14px] font-bold text-[#181725] leading-tight mb-2 line-clamp-2 h-[34px] min-[340px]:h-[36px]">
                                            {item.name}
                                        </h3>
                                        
                                        <div className="flex items-center gap-1.5 mb-4">
                                            <div className="bg-[#53B175] rounded-[4px] p-0.5">
                                                <Store size={8} className="text-white" />
                                            </div>
                                            <p className="text-[11px] text-gray-400 font-bold truncate">
                                                {item.vendorName}
                                            </p>
                                        </div>

                                        {/* Price & Button */}
                                        <div className="mt-auto space-y-3">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-[16px] min-[340px]:text-[18px] font-black text-[#181725]">₹{item.price}</span>
                                                {item.originalPrice && (
                                                    <span className="text-[11px] min-[340px]:text-[12px] text-gray-300 line-through font-bold">₹{item.originalPrice}</span>
                                                )}
                                            </div>

                                            <button 
                                                onClick={() => handleAddToCart(item)}
                                                className="w-full py-3 rounded-[16px] md:rounded-xl text-[13px] font-extrabold bg-[#F1F9F4] text-[#299E60] transition-all hover:bg-[#E1F2E8] active:scale-[0.97] border border-[#53B175]/10 md:hover:bg-primary md:hover:text-white md:hover:border-primary"
                                            >
                                                Add to Cart
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
