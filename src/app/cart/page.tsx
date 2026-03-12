'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, ChevronRight, ChevronDown, Plus, Minus, X, Percent, FileText, AlertTriangle, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

// --- DEMO DATA ---
const DEMO_SHIPMENTS = [
    {
        id: 's1',
        vendor: 'G Mart Store',
        items: [
            { id: 'd1', name: 'Kissan - Tomato Ketchup', size: '2 kg', pcs: 1, price: 188, image: '/images/product/product-img1.png' },
            { id: 'd2', name: 'Fortune - Sunflower Refined Oil, 5 L', size: '5 Litre', pcs: 1, price: 550, image: '/images/category/milk.png' },
        ]
    }
];

export default function CartPage() {
    const [screen, setScreen] = useState<'cart' | 'payment' | 'success'>('cart');
    const { cart, removeFromCart, updateQuantity, totalItems, subtotal, clearCart } = useCart();
    const router = useRouter();

    // Grouping shipments logic (Simplified for flat cart)
    const shipments = useMemo(() => {
        if (cart.length === 0) return DEMO_SHIPMENTS;

        // Group items by vendor
        const grouped: Record<string, any[]> = {};
        cart.forEach(item => {
            const vName = item.product.vendorName || 'General Store';
            if (!grouped[vName]) grouped[vName] = [];
            grouped[vName].push({
                id: String(item.productId),
                name: item.product.name,
                size: item.product.packSize || '1 pc',
                pcs: item.quantity,
                price: item.product.price,
                image: item.product.images[0] || '/images/recom-product/product-img10.png',
            });
        });

        return Object.entries(grouped).map(([vendor, items], idx) => ({
            id: `shipment-${idx}`,
            vendor,
            items
        }));
    }, [cart]);

    const getShipmentTotal = (items: any[]) => items.reduce((sum, item) => sum + item.price * item.pcs, 0);
    const getShipmentItemCount = (items: any[]) => items.reduce((sum, item) => sum + item.pcs, 0);

    const itemTotal = subtotal;
    const deliveryFee = 35;
    const handlingFee = 5;
    const totalPay = itemTotal + deliveryFee + handlingFee;

    // --- SUCCESS SCREEN ---
    if (screen === 'success') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 text-center">
                <div className="w-[100px] h-[100px] bg-[#53B175]/10 rounded-full flex items-center justify-center mb-8">
                    <Check size={50} className="text-[#53B175]" strokeWidth={3} />
                </div>
                <h1 className="text-[28px] font-bold text-[#181725] leading-tight mb-4">
                    Your Order has been <br /> accepted
                </h1>
                <p className="text-[16px] text-[#7C7C7C] font-medium mb-12">
                    Your items has been placcd and is on <br /> its way to being processed.
                </p>
                <div className="w-full space-y-4">
                    <button
                        onClick={() => router.push('/orders')}
                        className="w-full bg-[#53B175] text-white py-[20px] rounded-[18px] font-bold text-[18px] shadow-lg shadow-[#53B175]/20"
                    >
                        Track Order
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full text-[#181725] font-bold text-[18px] py-4"
                    >
                        Back to home
                    </button>
                </div>
            </div>
        );
    }

    // --- PAYMENT SCREEN ---
    if (screen === 'payment') {
        return (
            <div className="min-h-screen bg-[#F2F3F2] flex flex-col pb-24">
                <header className="flex items-center px-4 h-14 bg-[#F2F3F2] sticky top-[12px] z-50">
                    <button onClick={() => setScreen('cart')} className="p-2 -ml-2">
                        <ArrowLeft size={22} className="text-[#181725]" />
                    </button>
                    <h1 className="text-[20px] font-bold text-[#181725] absolute left-1/2 -translate-x-1/2">Payment</h1>
                </header>

                <div className="flex-1 px-4 pt-4 space-y-4">
                    <div className="bg-white rounded-[16px] border border-[#CFCECE] p-4">
                        <h3 className="text-[17px] font-bold text-[#181725] mb-4">Select Payment Method</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-3 border rounded-xl border-[#53B175] bg-[#53B175]/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border font-bold text-blue-600">UPI</div>
                                    <span className="font-bold text-[#181725]">Pay via UPI</span>
                                </div>
                                <div className="w-5 h-5 rounded-full border-2 border-[#53B175] flex items-center justify-center capitalize cursor-pointer">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#53B175]" />
                                </div>
                            </label>
                            <label className="flex items-center justify-between p-3 border rounded-xl border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border font-bold text-green-600">COD</div>
                                    <span className="font-bold text-[#181725]">Cash on Delivery</span>
                                </div>
                                <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                            </label>
                        </div>
                    </div>

                    <div className="bg-white rounded-[16px] border border-[#CFCECE] p-5 space-y-4">
                        <div className="flex justify-between font-bold">
                            <span className="text-gray-500">Order Total</span>
                            <span className="text-[#181725]">₹ {totalPay.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent z-50">
                    <button
                        onClick={() => setScreen('success')}
                        className="w-full bg-[#53B175] text-white py-[18px] rounded-[16px] font-bold text-[18px] transition-all active:scale-[0.98] shadow-lg shadow-[#53B175]/20"
                    >
                        Confirm Payment
                    </button>
                </div>
            </div>
        );
    }

    // --- EMPTY STATE ---
    if (cart.length === 0 && shipments.length === 0) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
                <img src="/images/empty-cart.png" alt="Empty Cart" className="w-[180px] mb-8 opacity-20" />
                <h2 className="text-[20px] font-bold text-[#181725] mb-2">Oops! Your cart is empty</h2>
                <p className="text-[#7C7C7C] text-center mb-8">Look like you haven't added anything to your cart yet</p>
                <button onClick={() => router.push('/')} className="bg-[#53B175] text-white px-12 py-4 rounded-xl font-bold">
                    Start Shopping
                </button>
            </div>
        );
    }

    // --- CART SCREEN ---
    return (
        <div className="min-h-screen bg-[#F2F3F2] flex flex-col pb-24">
            {/* Header */}
            <header className="flex items-center justify-between px-4 h-14 bg-[#F2F3F2] sticky top-[12px] z-50">
                <button onClick={() => router.back()} className="p-2 -ml-2">
                    <ArrowLeft size={22} className="text-[#181725]" />
                </button>
                <h1 className="text-[20px] font-bold text-[#181725] absolute left-1/2 -translate-x-1/2">Cart</h1>
                <div className="flex items-center gap-1">
                    {cart.length > 0 && (
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to clear your cart?')) {
                                    clearCart();
                                }
                            }}
                            className="text-[12px] font-bold text-red-500 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            Clear
                        </button>
                    )}
                    <button className="p-2 -mr-2">
                        <Search size={22} className="text-[#181725]" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 px-4 space-y-3 pt-2">
                {/* === SHIPMENT CARDS === */}
                {shipments.map((shipment) => (
                    <Link
                        key={shipment.id}
                        href={shipment.id === 's1' ? '#' : `/cart/shipment/${shipment.id}`}
                        className="block bg-white rounded-[16px] border border-[#CFCECE] overflow-hidden"
                    >
                        <div className="w-full p-4 flex items-center gap-3 active:bg-gray-50/50 transition-colors">
                            <div className="w-[7px] h-[7px] rounded-full bg-[#53B175] shrink-0" />

                            <div className="flex items-center -space-x-6 mr-auto pl-2">
                                {shipment.items.slice(0, 3).map((item: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="w-[52px] h-[52px] rounded-full bg-white flex items-center justify-center shrink-0 border border-gray-100 shadow-sm"
                                        style={{ zIndex: shipment.items.length - idx }}
                                    >
                                        <img src={item.image} alt="" className="max-w-[70%] max-h-[70%] object-contain" />
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[14px] font-bold text-[#181725] whitespace-nowrap">{getShipmentItemCount(shipment.items)} items</span>
                                <div className="flex items-center gap-1.5 text-[#53B175] text-[12px] font-bold">
                                    <span>Details</span>
                                    <ChevronRight size={14} strokeWidth={3} />
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3.5 bg-[#F9F9F9] flex items-center justify-between border-t border-[#F2F3F2]">
                            <div className="flex items-center gap-2">
                                <span className="text-[14px] font-bold text-[#181725]">{shipment.vendor}</span>
                            </div>
                            <span className="text-[14px] font-black text-[#181725]">₹ {getShipmentTotal(shipment.items).toFixed(0)}</span>
                        </div>
                    </Link>
                ))}

                {/* === BILL SUMMARY === */}
                <div className="bg-white rounded-[16px] border border-[#CFCECE] overflow-hidden mt-1">
                    <div className="p-4 flex items-center gap-3 border-b border-[#F0F0F0]">
                        <div className="w-[34px] h-[34px] rounded-[8px] border border-[#E2E2E2] flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-[#181725]" />
                        </div>
                        <span className="text-[15px] font-bold text-[#181725]">Bill Summary</span>
                    </div>

                    <div className="px-5 pt-5 pb-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[14px] text-[#4C4F4D] font-medium">Item Total</span>
                            <span className="text-[14px] font-bold text-[#181725]">₹ {itemTotal.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[14px] text-[#4C4F4D] font-medium">Delivery Fee</span>
                            <span className="text-[14px] font-bold text-[#181725]">₹ {deliveryFee}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[14px] text-[#4C4F4D] font-medium">Handling Fee</span>
                            <span className="text-[14px] font-bold text-[#181725]">₹ {handlingFee}</span>
                        </div>
                    </div>

                    <div className="px-5 pb-5 pt-2">
                        <div className="border-t border-dashed border-[#D0D0D0] pt-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[16px] font-bold text-[#181725]">To Pay</span>
                                <div className="flex flex-col items-end">
                                    <span className="text-[20px] font-extrabold text-[#181725]">₹ {totalPay.toFixed(2)}</span>
                                    <span className="text-[11px] text-[#53B175] font-bold">Savings: ₹ 131</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[16px] border border-[#CFCECE] px-4 py-3 flex items-center gap-3">
                    <AlertTriangle size={24} className="text-[#555555] shrink-0" fill="#555555" stroke="white" strokeWidth={2.5} />
                    <p className="text-[12px] text-[#181725] font-bold leading-snug">
                        Safety is our top priority. We ensure standard quality & hygiene benchmarks.
                    </p>
                </div>
            </div>

            {/* Fixed Checkout Bar */}
            <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent z-50">
                <button
                    onClick={() => setScreen('payment')}
                    className="w-full bg-[#53B175] text-white py-[18px] rounded-[16px] font-bold text-[18px] transition-all active:scale-[0.98] shadow-lg shadow-[#53B175]/20"
                >
                    Proceed to Pay
                </button>
            </div>
        </div>
    );
}
