'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, ChevronRight, ChevronDown, ChevronUp, Plus, Minus, X, Percent, FileText, AlertTriangle, Check, Home, ShoppingCart, Truck, CreditCard, Trash2, Store, Zap, FileCheck, Banknote, BadgePercent, Wallet, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { dal } from '@/lib/dal';
import { cn } from '@/lib/utils';

export default function CartPage() {
    const [screen, setScreen] = useState<'cart' | 'payment' | 'success'>('cart');
    const { cart, groups, removeFromCart, updateQuantity, totalItems, subtotal, clearCart } = useCart();
    const router = useRouter();
    const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});
    const [paymentMethod, setPaymentMethod] = useState('razorpay');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);

    // Initialize all vendors as expanded by default
    const toggleVendor = (vendorId: string) => {
        setExpandedVendors(prev => ({ ...prev, [vendorId]: prev[vendorId] === false ? true : !((prev[vendorId] ?? true)) }));
    };
    const isVendorExpanded = (vendorId: string) => expandedVendors[vendorId] !== false;

    const shipments = useMemo(() => {
        if (cart.length === 0) return [];
        const grouped: Record<string, { vendor: string, vendorId: string, items: any[] }> = {};
        cart.forEach(item => {
            const vId = item.product.vendorId || 'general';
            const vName = item.product.vendorName || 'General Store';
            if (!grouped[vId]) {
                grouped[vId] = { vendor: vName, vendorId: vId, items: [] };
            }
            grouped[vId].items.push({
                id: String(item.productId),
                name: item.product.name,
                size: item.product.packSize || '1 pc',
                pcs: item.quantity,
                price: item.product.price,
                image: item.product.images[0] || '/images/recom-product/product-img10.png',
            });
        });
        return Object.values(grouped).map(group => ({
            id: group.vendorId,
            vendor: group.vendor,
            items: group.items
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
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 text-center animate-in fade-in duration-500">
                <div className="w-[120px] h-[120px] md:w-[150px] md:h-[150px] bg-[#53B175]/10 rounded-full flex items-center justify-center mb-8 md:mb-10 relative">
                    <div className="absolute inset-0 bg-[#53B175]/5 rounded-full animate-ping duration-[2000ms]" />
                    <Check size={60} className="text-[#53B175] relative z-10 md:!w-20 md:!h-20" strokeWidth={3} />
                </div>
                <h1 className="text-[28px] md:text-[40px] font-black text-[#181725] leading-tight mb-4 tracking-tight">
                    Your Order has been <br className="hidden md:block" /> accepted!
                </h1>
                <p className="text-[16px] md:text-[18px] text-[#7C7C7C] font-medium mb-12 max-w-[450px]">
                    Thank you for your purchase. Your order is being processed and will be delivered shortly.
                </p>
                <div className="w-full max-w-[400px] flex flex-col gap-4">
                    <button
                        onClick={() => router.push('/orders')}
                        className="w-full bg-[#53B175] text-white py-[18px] md:py-[22px] rounded-[18px] font-black text-[18px] shadow-xl shadow-green-100/80 hover:bg-[#48a068] transition-all hover:-translate-y-0.5"
                    >
                        Track Your Order
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full text-[#181725] font-black text-[18px] py-4 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        Back to Shopping
                    </button>
                </div>
            </div>
        );
    }

    // --- PAYMENT SCREEN ---
    const PAYMENT_METHODS = [
        {
            id: 'razorpay',
            label: 'Razorpay',
            sub: 'Cards, UPI, Netbanking & Wallets',
            badge: <Zap size={18} strokeWidth={2.5} />,
            badgeBg: 'bg-[#3395FF]',
            badgeText: 'text-white',
            tag: 'RECOMMENDED',
        },
        {
            id: 'cheque',
            label: 'Pay by Cheque',
            sub: 'Business cheque, processed in 2–3 days',
            badge: <FileCheck size={18} strokeWidth={2.5} />,
            badgeBg: 'bg-amber-50',
            badgeText: 'text-amber-600',
        },
        {
            id: 'cod',
            label: 'Cash on Delivery',
            sub: 'Pay in cash when order arrives',
            badge: <Banknote size={18} strokeWidth={2.5} />,
            badgeBg: 'bg-green-50',
            badgeText: 'text-green-600',
        },
        {
            id: 'disco',
            label: 'Credit (DISCO)',
            sub: 'Buy now, pay later — up to 30 days',
            badge: <BadgePercent size={18} strokeWidth={2.5} />,
            badgeBg: 'bg-purple-50',
            badgeText: 'text-purple-600',
            tag: 'B2B CREDIT',
        },
        {
            id: 'wallet',
            label: 'H1 Wallet',
            sub: 'Available balance: ₹0.00',
            badge: <Wallet size={18} strokeWidth={2.5} />,
            badgeBg: 'bg-orange-50',
            badgeText: 'text-orange-500',
        },
    ] as const;

    const confirmOrder = async () => {
        setIsPlacingOrder(true);
        setOrderError(null);
        try {
            const vendorOrders = groups.map(group => ({
                vendorId: group.vendorId,
                items: group.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
            }));
            await dal.orders.create(vendorOrders, paymentMethod);
            clearCart();
            setScreen('success');
        } catch (err: any) {
            setOrderError(err?.message || 'Order failed. Please try again.');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    if (screen === 'payment') {
        const selected = PAYMENT_METHODS.find(m => m.id === paymentMethod) ?? PAYMENT_METHODS[0];
        return (
            <div className="min-h-screen bg-[#F2F3F2] flex flex-col pb-28 lg:pb-16">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-50">
                    <button onClick={() => setScreen('cart')} className="p-2 -ml-2">
                        <ArrowLeft size={22} className="text-[#181725]" />
                    </button>
                    <h1 className="text-[18px] font-bold text-[#181725] absolute left-1/2 -translate-x-1/2">Select Payment</h1>
                </header>

                {/* Desktop Header */}
                <div className="hidden md:block bg-[#F7F8FA] border-b border-gray-100">
                    <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-5">
                        <div className="flex items-center gap-2 text-[13px] text-text-muted mb-3">
                            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1"><Home size={14} /><span>Home</span></Link>
                            <ChevronRight size={12} />
                            <button onClick={() => setScreen('cart')} className="hover:text-primary transition-colors">Cart</button>
                            <ChevronRight size={12} />
                            <span className="text-text font-semibold">Payment</span>
                        </div>
                        <h1 className="text-[28px] font-black text-text tracking-tight flex items-center gap-3">
                            <CreditCard size={28} className="text-primary" />
                            Checkout
                        </h1>
                    </div>
                </div>

                <div className="flex-1 px-4 pt-4 md:max-w-[var(--container-max)] md:mx-auto md:px-[var(--container-padding)] md:pt-8 md:w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">

                        {/* Left — Payment Methods */}
                        <div className="bg-white rounded-2xl border border-[#E2E2E2] overflow-hidden shadow-sm">
                            <div className="px-5 md:px-7 py-5 border-b border-[#F0F0F0] bg-[#FAFAFA]">
                                <h3 className="text-[17px] md:text-[19px] font-bold text-[#181725]">Select Payment Method</h3>
                                <p className="text-[13px] text-gray-400 font-medium mt-0.5">Choose how you'd like to pay</p>
                            </div>
                            <div className="divide-y divide-[#F5F5F5]">
                                {PAYMENT_METHODS.map((method) => {
                                    const isSelected = paymentMethod === method.id;
                                    return (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id)}
                                            className={`w-full px-5 md:px-7 py-4 md:py-5 flex items-center gap-4 text-left transition-all ${isSelected ? 'bg-[#53B175]/5' : 'hover:bg-gray-50/60'}`}
                                        >
                                            {/* Icon badge */}
                                            <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${method.badgeBg} ${method.badgeText} border border-black/5`}>
                                                {method.badge}
                                            </div>

                                            {/* Label */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[15px] md:text-[16px] font-bold ${isSelected ? 'text-[#181725]' : 'text-[#181725]'}`}>
                                                        {method.label}
                                                    </span>
                                                    {'tag' in method && method.tag && (
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${method.id === 'razorpay' ? 'bg-[#3395FF]/10 text-[#3395FF]' : 'bg-purple-100 text-purple-600'}`}>
                                                            {method.tag}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[12px] md:text-[13px] text-gray-400 font-medium">{method.sub}</span>
                                            </div>

                                            {/* Radio */}
                                            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'border-[#53B175]' : 'border-gray-300'}`}>
                                                {isSelected && <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#53B175]" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right — Bill Summary (desktop) */}
                        <div className="hidden lg:block sticky top-[80px] space-y-4">
                            {/* Selected method chip */}
                            <div className="bg-white rounded-2xl border border-[#E2E2E2] px-6 py-4 flex items-center gap-3 shadow-sm">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selected.badgeBg} ${selected.badgeText} border border-black/5`}>
                                    {selected.badge}
                                </div>
                                <div>
                                    <p className="text-[13px] text-gray-400 font-medium">Paying via</p>
                                    <p className="text-[15px] font-bold text-[#181725]">{selected.label}</p>
                                </div>
                            </div>

                            {/* Summary card */}
                            <div className="bg-white rounded-2xl border border-[#E2E2E2] overflow-hidden shadow-sm">
                                <div className="px-7 py-5 flex items-center gap-3 border-b border-[#F0F0F0]">
                                    <div className="w-[38px] h-[38px] rounded-xl border border-[#E2E2E2] flex items-center justify-center shrink-0 bg-gray-50">
                                        <FileText size={18} className="text-[#181725]" />
                                    </div>
                                    <span className="text-[17px] font-bold text-[#181725]">Final Summary</span>
                                </div>
                                <div className="px-7 py-6 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[15px] text-[#4C4F4D] font-medium">Subtotal</span>
                                        <span className="text-[15px] font-bold text-[#181725]">₹{itemTotal.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[15px] text-[#4C4F4D] font-medium">Delivery</span>
                                        <span className="text-[15px] font-bold text-[#181725]">₹{deliveryFee}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[15px] text-[#4C4F4D] font-medium">Handling Fee</span>
                                        <span className="text-[15px] font-bold text-[#181725]">₹{handlingFee}</span>
                                    </div>
                                </div>
                                <div className="px-7 pb-6">
                                    <div className="border-t border-dashed border-[#D0D0D0] pt-5">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-[18px] font-bold text-[#181725]">Amount to Pay</span>
                                            <span className="text-[26px] font-black text-primary">₹{totalPay.toFixed(2)}</span>
                                        </div>
                                        <p className="text-[12px] text-primary font-bold">Includes all taxes and fees</p>
                                    </div>
                                </div>
                            </div>

                            {orderError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] font-semibold text-red-600">
                                    {orderError}
                                </div>
                            )}
                            <button
                                onClick={confirmOrder}
                                disabled={isPlacingOrder}
                                className="w-full bg-[#53B175] text-white py-5 rounded-2xl font-bold text-[18px] transition-all hover:bg-[#48a068] active:scale-[0.98] shadow-lg shadow-[#53B175]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isPlacingOrder ? <><Loader2 size={20} className="animate-spin" /> Placing Order...</> : 'Confirm Order'}
                            </button>
                        </div>

                        {/* Mobile + Tablet Summary */}
                        <div className="lg:hidden bg-white rounded-2xl border border-[#E2E2E2] overflow-hidden shadow-sm">
                            {/* Selected method row */}
                            <div className="px-5 py-4 flex items-center gap-3 bg-[#53B175]/5 border-b border-[#E8E8E8]">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selected.badgeBg} ${selected.badgeText} border border-black/5`}>
                                    {selected.badge}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[12px] text-gray-400 font-medium">Paying via</p>
                                    <p className="text-[14px] font-bold text-[#181725]">{selected.label}</p>
                                </div>
                            </div>
                            {/* Amounts */}
                            <div className="px-5 py-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-[14px] text-gray-500 font-medium">Subtotal</span>
                                    <span className="text-[14px] font-bold text-[#181725]">₹{itemTotal.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[14px] text-gray-500 font-medium">Delivery Fee</span>
                                    <span className="text-[14px] font-bold text-[#181725]">₹{deliveryFee}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[14px] text-gray-500 font-medium">Handling Fee</span>
                                    <span className="text-[14px] font-bold text-[#181725]">₹{handlingFee}</span>
                                </div>
                                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-baseline">
                                    <span className="text-[16px] font-bold text-[#181725]">Total</span>
                                    <span className="text-[22px] font-black text-primary">₹{totalPay.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fixed bottom bar — mobile + tablet */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent z-50 space-y-2">
                    {orderError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-[12px] font-semibold text-red-600 text-center">
                            {orderError}
                        </div>
                    )}
                    <button
                        onClick={confirmOrder}
                        disabled={isPlacingOrder}
                        className="w-full bg-[#53B175] text-white py-[18px] rounded-[16px] font-bold text-[17px] transition-all active:scale-[0.98] shadow-lg shadow-[#53B175]/20 hover:bg-[#48a068] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isPlacingOrder ? <><Loader2 size={20} className="animate-spin" /> Placing Order...</> : `Confirm & Pay ₹${totalPay.toFixed(2)}`}
                    </button>
                </div>
            </div>
        );
    }

    // --- EMPTY STATE ---
    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
                <img src="/images/empty-cart.png" alt="Empty Cart" className="w-[180px] mb-8 opacity-20" />
                <h2 className="text-[20px] font-bold text-[#181725] mb-2">No items in cart</h2>
                <p className="text-[#7C7C7C] text-center mb-8">Your cart is currently empty. Start adding some products!</p>
                <button onClick={() => router.push('/')} className="bg-[#53B175] text-white px-12 py-4 rounded-xl font-bold hover:bg-[#48a068] transition-colors">
                    Start Shopping
                </button>
            </div>
        );
    }

    // --- CART SCREEN ---
    return (
        <div className="min-h-screen bg-[#F2F3F2] flex flex-col pb-24 md:pb-16">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-4 h-14 bg-[#F2F3F2] sticky top-[12px] z-50">
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

            {/* Desktop Header */}
            <div className="hidden md:block bg-[#F7F8FA] border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-6">
                    <div className="flex items-center gap-2 text-[13px] text-text-muted mb-3">
                        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1"><Home size={14} /><span>Home</span></Link>
                        <ChevronRight size={12} />
                        <span className="text-text font-semibold">Cart</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-[32px] font-black text-text tracking-tight">
                            {totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
                        </h1>
                        {cart.length > 0 && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to clear your cart?')) {
                                        clearCart();
                                    }
                                }}
                                className="flex items-center gap-2 text-[14px] font-bold text-red-500 px-4 py-2 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                            >
                                <Trash2 size={16} />
                                Clear Cart
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 space-y-3 pt-2 md:max-w-[var(--container-max)] md:mx-auto md:px-[var(--container-padding)] md:pt-8 md:w-full">
                <div className="md:grid md:grid-cols-1 lg:grid-cols-[1fr_400px] lg:gap-10 md:items-start">

                    {/* ===== LEFT COLUMN ===== */}
                    <div className="space-y-3 md:space-y-6">

                        {/* === MOBILE + TABLET: Shipment Cards === */}
                        <div className="lg:hidden space-y-3">
                            {shipments.map((shipment) => (
                                <Link
                                    key={shipment.id}
                                    href={shipment.id === 's1' ? '#' : `/cart/shipment/${shipment.id}`}
                                    className="block bg-white rounded-[16px] border border-[#CFCECE] overflow-hidden hover:shadow-md transition-shadow"
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
                        </div>

                        {/* === DESKTOP: Full Item List grouped by vendor === */}
                        <div className="hidden lg:block space-y-5">
                            {shipments.map((shipment) => (
                                <div key={shipment.id} className="bg-white rounded-2xl border border-[#E2E2E2] overflow-hidden shadow-sm">
                                    {/* Vendor Group Header */}
                                    <div className="px-7 py-5 flex items-center justify-between bg-[#FAFAFA]">
                                        <Link
                                            href={`/cart/shipment/${shipment.id}`}
                                            className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                <Store size={18} className="text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-[17px] font-bold text-[#181725]">{shipment.vendor}</h3>
                                                <p className="text-[13px] text-gray-400 font-medium">{getShipmentItemCount(shipment.items)} items · ₹{getShipmentTotal(shipment.items).toFixed(0)}</p>
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <Link
                                                href={`/cart/shipment/${shipment.id}`}
                                                className="flex items-center gap-1 text-[13px] font-bold text-primary hover:text-primary/80 transition-colors"
                                            >
                                                Details
                                                <ChevronRight size={14} strokeWidth={3} />
                                            </Link>
                                            <button
                                                onClick={() => toggleVendor(shipment.id)}
                                                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                                            >
                                                {isVendorExpanded(shipment.id) ? (
                                                    <ChevronUp size={20} className="text-gray-500" strokeWidth={2.5} />
                                                ) : (
                                                    <ChevronDown size={20} className="text-gray-500" strokeWidth={2.5} />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* MOV Warning */}
                                    {(() => {
                                        const g = groups.find(gr => gr.vendorId === shipment.id);
                                        if (!g || g.meetsMinOrder || g.minOrderValue === 0) return null;
                                        const remaining = g.minOrderValue - g.subtotal;
                                        return (
                                            <div className="flex items-center gap-3 px-7 py-3 bg-amber-50 border-t border-amber-100">
                                                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                                                <p className="text-[13px] font-bold text-amber-700">
                                                    Add ₹{remaining.toFixed(0)} more to meet {shipment.vendor}&apos;s minimum order of ₹{g.minOrderValue}
                                                </p>
                                                <Link href={`/vendor/${shipment.id}`} className="ml-auto text-[12px] font-black text-amber-600 whitespace-nowrap hover:underline">
                                                    Add Items →
                                                </Link>
                                            </div>
                                        );
                                    })()}

                                    {/* Items List - Collapsible */}
                                    {isVendorExpanded(shipment.id) && (
                                        <div className="divide-y divide-[#F5F5F5] border-t border-[#F0F0F0]">
                                            {shipment.items.map((item: any) => (
                                                <div key={item.id} className="px-7 py-5 flex items-center gap-5 hover:bg-gray-50/40 transition-colors group">
                                                    {/* Product Image */}
                                                    <div className="w-[72px] h-[72px] rounded-2xl bg-[#F7F8F7] flex items-center justify-center shrink-0 border border-gray-100 p-2 group-hover:border-primary/10 transition-colors">
                                                        <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                                                    </div>

                                                    {/* Product Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[15px] font-bold text-[#181725] leading-snug line-clamp-1">{item.name}</h4>
                                                        <p className="text-[13px] text-gray-400 font-medium mt-0.5">{item.size}</p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <div className="w-[6px] h-[6px] rounded-full bg-primary" />
                                                            <span className="text-[12px] text-gray-400 font-medium">₹{item.price}/pc</span>
                                                        </div>
                                                    </div>

                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden shrink-0">
                                                        <button
                                                            onClick={() => {
                                                                if (item.pcs <= 1) removeFromCart(item.id);
                                                                else updateQuantity(item.id, item.pcs - 1);
                                                            }}
                                                            className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Minus size={16} strokeWidth={2.5} />
                                                        </button>
                                                        <div className="w-10 h-10 flex items-center justify-center border-x border-gray-200">
                                                            <span className="text-[15px] font-bold text-[#181725]">{item.pcs}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.pcs + 1)}
                                                            className="w-10 h-10 flex items-center justify-center text-primary hover:bg-green-50 transition-colors"
                                                        >
                                                            <Plus size={16} strokeWidth={2.5} />
                                                        </button>
                                                    </div>

                                                    {/* Price */}
                                                    <div className="text-right shrink-0 w-[80px]">
                                                        <span className="text-[16px] font-black text-[#181725]">₹{(item.price * item.pcs).toFixed(0)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Safety Notice - Mobile only */}
                        <div className="md:hidden bg-white rounded-[16px] border border-[#CFCECE] px-4 py-3 flex items-center gap-3">
                            <AlertTriangle size={24} className="text-[#555555] shrink-0" fill="#555555" stroke="white" strokeWidth={2.5} />
                            <p className="text-[12px] text-[#181725] font-bold leading-snug">
                                Safety is our top priority. We ensure standard quality & hygiene benchmarks.
                            </p>
                        </div>
                    </div>

                    {/* ===== RIGHT COLUMN - Bill Summary (desktop sidebar) ===== */}
                    <div className="hidden lg:block sticky top-[80px] space-y-5">
                        <div className="bg-white rounded-2xl border border-[#E2E2E2] overflow-hidden shadow-sm">
                            {/* Header */}
                            <div className="px-7 py-5 flex items-center gap-3 border-b border-[#F0F0F0]">
                                <div className="w-[38px] h-[38px] rounded-xl border border-[#E2E2E2] flex items-center justify-center shrink-0 bg-gray-50">
                                    <FileText size={18} className="text-[#181725]" />
                                </div>
                                <span className="text-[17px] font-bold text-[#181725]">Bill Summary</span>
                            </div>

                            {/* Line Items */}
                            <div className="px-7 py-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[15px] text-[#4C4F4D] font-medium">Item Total</span>
                                    <span className="text-[15px] font-bold text-[#181725]">₹{itemTotal.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[15px] text-[#4C4F4D] font-medium">GST + Cess</span>
                                    <span className="text-[15px] font-bold text-[#181725]">₹0</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[15px] text-[#4C4F4D] font-medium">Delivery charge</span>
                                        <Truck size={14} className="text-primary" />
                                    </div>
                                    <span className="text-[15px] font-bold text-[#181725]">₹{deliveryFee}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[15px] text-[#4C4F4D] font-medium">Handling Fee</span>
                                    <span className="text-[15px] font-bold text-[#181725]">₹{handlingFee}</span>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="px-7 pb-6">
                                <div className="border-t border-dashed border-[#D0D0D0] pt-5">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[18px] font-bold text-[#181725]">Total</span>
                                        <span className="text-[24px] font-black text-[#181725]">₹{totalPay.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Checkout Button */}
                        <button
                            onClick={() => setScreen('payment')}
                            className="w-full bg-[#53B175] text-white py-5 rounded-2xl font-bold text-[18px] transition-all hover:bg-[#48a068] active:scale-[0.98] shadow-lg shadow-[#53B175]/20 flex items-center justify-center gap-3"
                        >
                            Checkout
                            <ChevronRight size={20} strokeWidth={3} />
                        </button>

                        {/* Safety Notice */}
                        <div className="bg-white rounded-2xl border border-[#E2E2E2] px-6 py-4 flex items-center gap-4">
                            <AlertTriangle size={24} className="text-[#555555] shrink-0" fill="#555555" stroke="white" strokeWidth={2.5} />
                            <p className="text-[13px] text-[#181725] font-bold leading-snug">
                                Safety is our top priority. We ensure standard quality & hygiene benchmarks.
                            </p>
                        </div>
                    </div>
                </div>

                {/* === Mobile + Tablet BILL SUMMARY === */}
                <div className="lg:hidden bg-white rounded-[16px] border border-[#CFCECE] overflow-hidden mt-1">
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
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Checkout Bar - Mobile + Tablet */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent z-50">
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

