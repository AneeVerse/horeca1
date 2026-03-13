'use client';

import React from 'react';
import { ChevronLeft, Heart, ShoppingCart, Store } from 'lucide-react';

interface WishlistOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const wishlistItems = [
    {
        id: 1,
        name: 'Desi Fresh Tomato 1 kg',
        image: '/images/product/product-img3.png',
        price: 49,
        originalPrice: 65,
        inStock: false,
        soldBy: '12 vendors',
    },
    {
        id: 2,
        name: 'Ladies Finger 1 kg',
        image: '/images/product/brokali.png',
        price: 39,
        originalPrice: 55,
        inStock: false,
        soldBy: '6 vendors',
    },
    {
        id: 3,
        name: 'Orange Nagpur 1 kg',
        image: '/images/category/fruits.png',
        price: 89,
        originalPrice: 120,
        inStock: false,
        soldBy: '6 vendors',
    },
    {
        id: 4,
        name: 'Amul Butter: 100 gms',
        image: '/images/dairy/amul-butter.png',
        price: 56,
        originalPrice: 60,
        inStock: false,
        soldBy: '12 vendors',
    },
];

export function WishlistOverlay({ isOpen, onClose }: WishlistOverlayProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[13500] bg-white flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-50 rounded-full transition-colors"
                >
                    <ChevronLeft size={22} className="text-[#181725]" />
                </button>
                <h2 className="text-[17px] font-[800] text-[#181725]">Your Wishlist</h2>
                <button className="relative p-2">
                    <ShoppingCart size={22} className="text-[#181725]" />
                    <span className="absolute top-1.5 right-1.5 bg-[#53B175] text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border border-white">
                        0
                    </span>
                </button>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
                <div className="grid grid-cols-2 gap-4">
                    {wishlistItems.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full"
                        >
                            {/* Product Image Area */}
                            <div className="relative pt-3 px-3">
                                <button className="absolute top-3 right-3 z-10 transition-transform active:scale-90">
                                    <Heart size={18} className="text-red-500 fill-red-500" />
                                </button>

                                <div className="w-full aspect-[1.1/1] bg-white flex items-center justify-center p-2">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="p-3 flex flex-col flex-1">
                                <h3 className="text-[13px] font-bold text-[#181725] leading-tight mb-1.5 line-clamp-2 h-[34px]">
                                    {item.name}
                                </h3>
                                
                                <div className="flex items-center gap-1.5 mb-3">
                                    <div className="bg-[#53B175] rounded-[2px] p-0.5">
                                        <Store size={8} className="text-white" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        Sold by: {item.soldBy}
                                    </p>
                                </div>

                                {/* Price & Button */}
                                <div className="mt-auto space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[15px] font-[900] text-[#181725]">₹{item.price}</span>
                                        <span className="text-[11px] text-gray-400 line-through font-medium">₹{item.originalPrice}</span>
                                    </div>

                                    <button className="w-full py-2.5 rounded-xl text-[12px] font-bold bg-[#E8F5EE] text-[#53B175] transition-all hover:bg-[#D4EDDE] active:scale-[0.97]">
                                        Notify Me
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
