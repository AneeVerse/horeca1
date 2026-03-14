'use client';

import { ChevronLeft, Heart, ShoppingCart, Store, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { VendorProduct } from '@/types';

interface WishlistOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WishlistOverlay({ isOpen, onClose }: WishlistOverlayProps) {
    const { wishlist, toggleWishlist } = useWishlist();
    const { addToCart, groups, updateQuantity } = useCart();
    const totalInCart = groups.reduce((acc, g) => acc + g.items.length, 0);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[13500] bg-white flex flex-col animate-in slide-in-from-right duration-300 font-inter">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-white sticky top-0 z-10">
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-50 rounded-full transition-colors"
                >
                    <ChevronLeft size={22} className="text-[#181725]" />
                </button>
                <h2 className="text-[17px] font-[800] text-[#181725]">Your Wishlist</h2>
                <Link 
                    href="/cart"
                    onClick={onClose}
                    className="relative p-2"
                >
                    <ShoppingCart size={22} className="text-[#181725]" />
                    <span className="absolute top-1.5 right-1.5 bg-[#53B175] text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border border-white">
                        {totalInCart}
                    </span>
                </Link>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 bg-gray-50/30">
                {wishlist.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Heart size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-[18px] font-bold text-[#181725] mb-2">Empty Wishlist</h3>
                        <p className="text-[14px] text-gray-400">Items you heart will appear here. Start shopping to add favorites!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 min-[340px]:gap-4">
                        {wishlist.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white border border-gray-100 rounded-[20px] overflow-hidden shadow-sm flex flex-col h-full group"
                            >
                                {/* Product Image Area */}
                                <div className="relative pt-3 px-3">
                                    <button 
                                        onClick={() => toggleWishlist(item)}
                                        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 shadow-sm transition-transform active:scale-90"
                                    >
                                        <Heart size={16} className="text-red-500 fill-red-500" />
                                    </button>

                                    <div className="w-full aspect-square bg-white flex items-center justify-center p-2">
                                        <img
                                            src={item.images[0]}
                                            alt={item.name}
                                            className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                </div>

                                {/* Product Info */}
                                <div className="p-3 flex flex-col flex-1">
                                    <h3 className="text-[12px] min-[340px]:text-[13px] font-bold text-[#181725] leading-tight mb-2 line-clamp-2 h-[32px] min-[340px]:h-[34px]">
                                        {item.name}
                                    </h3>
                                    
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <div className="bg-[#53B175] rounded-[4px] p-0.5">
                                            <Store size={8} className="text-white" />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-medium truncate">
                                            {item.vendorName}
                                        </p>
                                    </div>

                                    {/* Price & Button */}
                                    <div className="mt-auto space-y-3">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-[15px] min-[340px]:text-[16px] font-[900] text-[#181725]">₹{item.price}</span>
                                            {item.originalPrice && (
                                                <span className="text-[10px] min-[340px]:text-[11px] text-gray-300 line-through font-medium">₹{item.originalPrice}</span>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => handleAddToCart(item)}
                                            className="w-full py-2 rounded-xl text-[12px] font-bold bg-[#F1F9F4] text-[#299E60] transition-all hover:bg-[#E1F2E8] active:scale-[0.97] border border-[#53B175]/10"
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
    );
}
