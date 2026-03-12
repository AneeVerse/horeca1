'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Minus, ShoppingCart } from 'lucide-react';
import { MOCK_ORDER_LISTS } from '@/lib/mockData';
import { useCart } from '@/context/CartContext';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';

export default function OrderListDetailPage() {
    const params = useParams();
    const listId = params.id as string;
    const { addToCart } = useCart();

    const orderList = MOCK_ORDER_LISTS.find(l => l.id === listId);
    const [quantities, setQuantities] = useState<Record<string, number>>(() => {
        if (!orderList) return {};
        // All quantities start at 0 per spec
        return Object.fromEntries(orderList.items.map(item => [item.productId, 0]));
    });

    const updateQty = (productId: string, delta: number) => {
        setQuantities(prev => ({
            ...prev,
            [productId]: Math.max(0, (prev[productId] || 0) + delta),
        }));
    };

    const setQty = (productId: string, val: number) => {
        setQuantities(prev => ({ ...prev, [productId]: Math.max(0, val) }));
    };

    const activeItems = useMemo(() => {
        return Object.entries(quantities).filter(([, qty]) => qty > 0);
    }, [quantities]);

    const totalAmount = useMemo(() => {
        if (!orderList) return 0;
        return activeItems.reduce((sum, [pid, qty]) => {
            const item = orderList.items.find(i => i.productId === pid);
            return sum + (item ? item.product.price * qty : 0);
        }, 0);
    }, [activeItems, orderList]);

    const handleAddAllToCart = () => {
        if (!orderList) return;
        activeItems.forEach(([pid, qty]) => {
            const item = orderList.items.find(i => i.productId === pid);
            if (item) addToCart(item.product, qty);
        });
    };

    if (!orderList) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[20px] font-bold text-gray-800 mb-2">List not found</p>
                    <Link href="/order-lists" className="text-[14px] text-[#299e60] font-semibold">Back to lists</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-32">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                    <Link href="/order-lists" className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 mb-2">
                        <ChevronLeft size={16} />
                        Back to lists
                    </Link>
                    <h1 className="text-[18px] md:text-[22px] font-bold text-[#181725]">{orderList.name}</h1>
                    <p className="text-[12px] text-[#299e60] font-semibold mt-0.5">{orderList.vendorName}</p>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">{orderList.items.length} items in this list</p>
                </div>
            </div>

            {/* Items Table */}
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Column Headers */}
                    <div className="grid grid-cols-[1fr_80px_80px_90px] md:grid-cols-[1fr_100px_100px_120px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <span className="text-[11px] font-bold text-gray-500 uppercase">Item</span>
                        <span className="text-[11px] font-bold text-gray-500 uppercase text-center">Last Qty</span>
                        <span className="text-[11px] font-bold text-gray-500 uppercase text-center">Qty</span>
                        <span className="text-[11px] font-bold text-gray-500 uppercase text-right">Total</span>
                    </div>

                    {/* Items */}
                    {orderList.items.map((item) => {
                        const qty = quantities[item.productId] || 0;
                        const itemTotal = item.product.price * qty;

                        return (
                            <div key={item.productId} className="grid grid-cols-[1fr_80px_80px_90px] md:grid-cols-[1fr_100px_100px_120px] gap-2 px-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50/50 transition-colors">
                                {/* Product Info */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 p-1">
                                        <img src={item.product.images[0] || '/images/recom-product/product-img10.png'} alt={item.product.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[12px] md:text-[13px] font-bold text-[#181725] line-clamp-1">{item.product.name}</p>
                                        <p className="text-[10px] text-gray-400">{item.product.packSize} • ₹{item.product.price}</p>
                                    </div>
                                </div>

                                {/* Last Ordered Qty */}
                                <div className="text-center">
                                    <span className="text-[12px] text-gray-400 font-medium">
                                        {item.lastOrderedQty || '-'}
                                    </span>
                                </div>

                                {/* Quantity Selector */}
                                <div className="flex items-center justify-center">
                                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                        <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-50 transition-colors">
                                            <Minus size={12} className="text-gray-500" />
                                        </button>
                                        <input
                                            type="number"
                                            min="0"
                                            value={qty}
                                            onChange={(e) => setQty(item.productId, parseInt(e.target.value) || 0)}
                                            className="w-8 h-7 text-center text-[12px] font-bold text-[#181725] border-x border-gray-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-50 transition-colors">
                                            <Plus size={12} className="text-gray-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="text-right">
                                    <span className={`text-[13px] font-bold ${qty > 0 ? 'text-[#181725]' : 'text-gray-300'}`}>
                                        {qty > 0 ? `₹${itemTotal.toLocaleString('en-IN')}` : '—'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom CTA */}
            {activeItems.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[-4px_0_20px_rgba(0,0,0,0.08)]">
                    <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[14px] font-bold text-[#181725]">
                                    {activeItems.length} item{activeItems.length > 1 ? 's' : ''} selected
                                </p>
                                <p className="text-[12px] text-[#299e60] font-bold">
                                    ₹{totalAmount.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <button
                                onClick={handleAddAllToCart}
                                className="flex items-center gap-2 bg-[#299e60] text-white px-6 py-3 rounded-xl text-[13px] font-bold shadow-lg shadow-green-200/50 hover:bg-[#22844f] active:scale-[0.98] transition-all"
                            >
                                <ShoppingCart size={16} />
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <StickyCartBar />
        </div>
    );
}
