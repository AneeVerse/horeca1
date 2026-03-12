'use client';

import React from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, ChevronLeft, Clock, AlertCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
    const { groups, totalAmount, totalItems, vendorCount, updateQuantity, removeFromCart, clearVendor } = useCart();

    if (groups.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="text-center">
                    <p className="text-[48px] mb-3">🛒</p>
                    <p className="text-[18px] font-bold text-gray-800 mb-2">Your cart is empty</p>
                    <p className="text-[13px] text-gray-400 mb-4">Add items from vendor stores to get started</p>
                    <Link href="/" className="bg-[#299e60] text-white px-6 py-2.5 rounded-xl text-[13px] font-bold shadow-md shadow-green-200/50 hover:bg-[#22844f] transition-all">
                        Browse Vendors
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-32">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                    <Link href="/" className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 mb-2">
                        <ChevronLeft size={16} />
                        Continue Shopping
                    </Link>
                    <h1 className="text-[20px] md:text-[24px] font-bold text-[#181725]">Your Cart</h1>
                    <p className="text-[12px] text-gray-400 font-medium mt-0.5">
                        {totalItems} item{totalItems > 1 ? 's' : ''} from {vendorCount} vendor{vendorCount > 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4 space-y-4">
                {/* Vendor-wise Cart Groups */}
                {groups.map((group) => (
                    <div key={group.vendorId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Vendor Header */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                            <Link href={`/vendor/${group.vendorId}`} className="flex items-center gap-3 flex-1 min-w-0">
                                {group.vendorLogo && (
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 border border-gray-100 shrink-0">
                                        <img src={group.vendorLogo} alt={group.vendorName} className="w-full h-full object-contain" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-[#181725]">{group.vendorName}</p>
                                    <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                        <Clock size={10} />
                                        Delivery: Tomorrow morning
                                    </p>
                                </div>
                            </Link>
                            <button
                                onClick={() => clearVendor(group.vendorId)}
                                className="text-[11px] text-red-400 font-semibold hover:text-red-600 transition-colors"
                            >
                                Clear
                            </button>
                        </div>

                        {/* Items */}
                        {group.items.map((item) => (
                            <div key={item.productId} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center p-1 shrink-0">
                                    <img src={item.product.images[0] || '/images/recom-product/product-img10.png'} alt={item.product.name} className="w-full h-full object-contain" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] md:text-[13px] font-bold text-[#181725] line-clamp-1">{item.product.name}</p>
                                    <p className="text-[10px] text-gray-400">{item.product.packSize}</p>
                                    <p className="text-[12px] font-bold text-[#181725] mt-0.5">₹{item.product.price}</p>
                                </div>

                                {/* Quantity */}
                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
                                    <button
                                        onClick={() => updateQuantity(group.vendorId, item.productId, item.quantity - 1)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                    >
                                        <Minus size={13} className="text-gray-500" />
                                    </button>
                                    <span className="w-8 h-8 flex items-center justify-center text-[12px] font-bold text-[#181725] border-x border-gray-200">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateQuantity(group.vendorId, item.productId, item.quantity + 1)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                    >
                                        <Plus size={13} className="text-gray-500" />
                                    </button>
                                </div>

                                {/* Item Total */}
                                <div className="text-right shrink-0">
                                    <p className="text-[12px] font-bold text-[#181725]">₹{(item.product.price * item.quantity).toLocaleString('en-IN')}</p>
                                </div>

                                {/* Remove */}
                                <button
                                    onClick={() => removeFromCart(group.vendorId, item.productId)}
                                    className="p-1 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}

                        {/* Vendor Subtotal + MOV warning */}
                        <div className="px-4 py-3 bg-gray-50/50">
                            {!group.meetsMinOrder && (
                                <div className="flex items-center gap-2 text-orange-600 bg-orange-50 rounded-lg px-3 py-2 mb-2">
                                    <AlertCircle size={14} />
                                    <span className="text-[11px] font-semibold">Minimum order value: ₹{group.minOrderValue}. Add more items.</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] font-semibold text-gray-500">Subtotal</span>
                                <span className="text-[14px] font-bold text-[#181725]">₹{group.subtotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Order Summary */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <h3 className="text-[14px] font-bold text-[#181725] mb-3">Order Summary</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[12px]">
                            <span className="text-gray-500">Total items</span>
                            <span className="font-semibold text-[#181725]">{totalItems}</span>
                        </div>
                        <div className="flex justify-between text-[12px]">
                            <span className="text-gray-500">Vendors</span>
                            <span className="font-semibold text-[#181725]">{vendorCount}</span>
                        </div>
                        <div className="flex justify-between text-[12px]">
                            <span className="text-gray-500">Delivery charges</span>
                            <span className="font-semibold text-[#299e60]">Free</span>
                        </div>
                        <div className="border-t border-gray-100 pt-2 mt-2">
                            <div className="flex justify-between">
                                <span className="text-[14px] font-bold text-[#181725]">Total</span>
                                <span className="text-[18px] font-bold text-[#299e60]">₹{totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Checkout Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[-4px_0_20px_rgba(0,0,0,0.08)]">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[12px] text-gray-400">Total</p>
                            <p className="text-[18px] font-bold text-[#181725]">₹{totalAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <Link
                            href="/checkout"
                            className="bg-[#299e60] text-white px-8 py-3 rounded-xl text-[14px] font-bold shadow-lg shadow-green-200/50 hover:bg-[#22844f] active:scale-[0.98] transition-all"
                        >
                            Checkout ({vendorCount} PO{vendorCount > 1 ? 's' : ''}) →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
