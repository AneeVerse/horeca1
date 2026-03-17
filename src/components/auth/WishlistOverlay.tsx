'use client';

import React from 'react';
import { ChevronLeft, ShoppingCart, Trash2, Heart, X, ArrowRight } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface WishlistOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WishlistOverlay({ isOpen, onClose }: WishlistOverlayProps) {
    const { wishlist, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();
    const router = useRouter();

    if (!isOpen) return null;

    const handleAddToCart = (product: any) => {
        addToCart(product, 1);
    };

    return (
        <div className="fixed inset-0 z-[14000] flex items-start justify-center animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="w-full h-full md:h-auto md:max-h-[90vh] md:w-[600px] md:mt-[5vh] md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 bg-[#F2F3F2] md:bg-white flex flex-col animate-in slide-in-from-right md:slide-in-from-bottom md:zoom-in-95 duration-300 relative z-10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center px-4 md:px-6 py-3 md:py-4 shrink-0 relative bg-white border-b border-gray-100">
                    <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 md:hidden z-10">
                        <ChevronLeft size={20} className="text-[#181725]" />
                    </button>
                    <h2 className="w-full text-center md:text-left text-[17px] md:text-[20px] font-[700] text-[#181725]">Your Wishlist</h2>
                    <button onClick={onClose} className="hidden md:flex p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 z-10">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 md:pt-6 pb-28 md:pb-8">
                    {wishlist.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Heart size={40} className="text-gray-200" />
                            </div>
                            <h3 className="text-[18px] font-bold text-[#181725] mb-1">Your wishlist is empty</h3>
                            <p className="text-[14px] text-gray-400 max-w-[240px] mx-auto">Start adding items you love to your wishlist!</p>
                            <button 
                                onClick={() => { onClose(); router.push('/'); }}
                                className="mt-6 bg-[#53B175] text-white px-8 py-3 rounded-xl font-bold active:scale-95 transition-all"
                            >
                                Browse Products
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 md:space-y-4">
                            {wishlist.map((item) => (
                                <div key={item.id} className="bg-white md:bg-gray-50/80 border border-gray-100 rounded-[12px] md:rounded-2xl p-3 md:p-4 shadow-sm group">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl flex items-center justify-center p-2 border border-gray-50 shrink-0">
                                            <img src={item.images[0]} alt={item.name} className="max-w-full max-h-full object-contain" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-[13px] md:text-[15px] font-[700] text-[#181725] leading-tight line-clamp-1">{item.name}</h4>
                                                    <p className="text-[11px] md:text-[12px] text-gray-400 font-medium mt-0.5">{item.packSize || '1 pc'}</p>
                                                </div>
                                                <button 
                                                    onClick={() => removeFromWishlist(item.id)}
                                                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between mt-1 md:mt-2">
                                                <span className="text-[14px] md:text-[17px] font-[800] text-[#181725]">₹{item.price}</span>
                                                <button
                                                    onClick={() => handleAddToCart(item)}
                                                    className="bg-[#53B175] text-white p-1.5 md:p-2 rounded-lg md:rounded-xl active:scale-90 transition-all hover:bg-[#48a068]"
                                                >
                                                    <ShoppingCart size={16} className="md:w-5 md:h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {wishlist.length > 0 && (
                    <div className="fixed md:static bottom-0 left-0 right-0 p-5 md:px-6 md:py-5 bg-white border-t border-gray-100">
                        <button
                            onClick={() => { onClose(); router.push('/wishlist'); }}
                            className="w-full border-2 border-[#53B175] text-[#53B175] hover:bg-[#53B175] hover:text-white font-bold py-3.5 md:py-4 rounded-xl md:rounded-2xl active:scale-[0.98] transition-all text-[14px] md:text-[15px] flex items-center justify-center gap-2"
                        >
                            View All on Page
                            <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
