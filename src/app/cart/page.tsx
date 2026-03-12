'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, ChevronRight, ChevronDown, Plus, Minus, X, Percent, FileText, AlertTriangle, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

// ==================== DEMO DATA ====================
const DEMO_SHIPMENTS = [
    {
        id: 's1',
        vendor: 'G Mart Store',
        items: [
            { id: 'd1', name: 'Kissan - Tomato Ketchup', size: '2 kg', pcs: 1, price: 188, image: '/images/product/product-img1.png' },
            { id: 'd2', name: 'Fortune - Sunflower Refined Oil, 5 L', size: '5 Litre', pcs: 1, price: 550, image: '/images/category/milk.png' },
            { id: 'd3', name: 'Fresh Onion', size: '1 kg', pcs: 1, price: 45, image: '/images/category/vegitable.png' },
            { id: 'd4', name: 'Organic Banana', size: '500 gm', pcs: 3, price: 60, image: '/images/category/fruits.png' },
        ]
    },
    {
        id: 's2',
        vendor: 'Whole Foods Market',
        items: [
            { id: 'd5', name: 'Del Monte Ketchup', size: '1 kg', pcs: 1, price: 145, image: '/images/product/product-img1.png' },
            { id: 'd6', name: 'Green Broccoli', size: '500 gm', pcs: 1, price: 136, image: '/images/product/brokali.png' },
        ]
    },
    {
        id: 's3',
        vendor: 'M Mart',
        items: [
            { id: 'd7', name: 'Fresh Carrots', size: '1 kg', pcs: 2, price: 55, image: '/images/product/product-img5.png' },
            { id: 'd8', name: 'Maggi Ketchup', size: '450 gm', pcs: 1, price: 120, image: '/images/product/product-img1.png' },
            { id: 'd9', name: 'Fresh Tomato', size: '1 kg', pcs: 3, price: 35, image: '/images/product/product-img3.png' },
        ]
    },
    {
        id: 's4',
        vendor: 'Groceri',
        items: [
            { id: 'd10', name: 'Honey Bottle', size: '500 gm', pcs: 1, price: 199, image: '/images/category/snacks.png' },
            { id: 'd11', name: 'Ginger', size: '250 gm', pcs: 1, price: 82, image: '/images/product/product-img6.png' },
        ]
    }
];

// ==================== MAIN COMPONENT ====================
export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, totalItems, subtotal, clearCart } = useCart();
    const router = useRouter();

    // Screen state: 'cart' | 'payment' | 'success'
    const [screen, setScreen] = useState<'cart' | 'payment' | 'success'>('cart');
    const [couponCode, setCouponCode] = useState('');
    const [showCouponInput, setShowCouponInput] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('bob');

    const shipments = useMemo(() => {
        if (cart.length === 0) return DEMO_SHIPMENTS;
        return [{
            id: 'cart-shipment',
            vendor: 'Your Cart',
            items: cart.map(item => ({
                id: String(item.id),
                name: item.name,
                size: item.description || '1 pc',
                pcs: item.quantity,
                price: parseFloat((typeof item.price === 'string' ? item.price : String(item.price)).replace(/[^0-9.]/g, '')) || 0,
                image: item.image,
            }))
        }];
    }, [cart]);

    const isDemo = cart.length === 0;

    const itemTotal = useMemo(() => {
        if (!isDemo) return subtotal;
        return DEMO_SHIPMENTS.reduce((sum, s) =>
            sum + s.items.reduce((si, item) => si + item.price * item.pcs, 0)
        , 0);
    }, [isDemo, subtotal]);

    const deliveryFee = 15;
    const handlingFee = 4;
    const totalPay = itemTotal + deliveryFee + handlingFee;
    const originalPrice = Math.round(totalPay * 1.23);
    const savings = originalPrice - totalPay;

    const getShipmentTotal = (items: { price: number; pcs: number }[]) => {
        return items.reduce((sum, item) => sum + item.price * item.pcs, 0);
    };

    const getShipmentItemCount = (items: { pcs: number }[]) => {
        return items.reduce((s, i) => s + i.pcs, 0);
    };

    // ==================== PAYMENT SUCCESS SCREEN ====================
    if (screen === 'success') {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                {/* Green bar */}
                <div className="w-full h-[12px] bg-[#53B175] sticky top-0 z-[60]" />

                <div className="flex-1 flex flex-col items-center justify-center px-8">
                    {/* Success Badge */}
                    <div className="relative mb-8">
                        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M60 10 L72 25 L90 18 L88 38 L108 45 L95 60 L108 75 L88 82 L90 102 L72 95 L60 110 L48 95 L30 102 L32 82 L12 75 L25 60 L12 45 L32 38 L30 18 L48 25 Z" fill="#53B175"/>
                            <path d="M42 60 L54 72 L78 48" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                    </div>

                    <h1 className="text-[26px] font-extrabold text-[#181725] mb-3">Payment Success</h1>
                    <p className="text-[14px] text-[#7C7C7C] text-center leading-relaxed font-medium">
                        Your Payment was Successful !<br/>
                        Just wait Horecal Arrive Soon at Home.
                    </p>
                </div>

                {/* Bottom Actions */}
                <div className="px-6 pb-8 space-y-3">
                    <button
                        onClick={() => router.push('/orders')}
                        className="w-full bg-[#53B175] text-white py-[18px] rounded-[16px] font-bold text-[17px] transition-all active:scale-[0.98] shadow-lg shadow-[#53B175]/20"
                    >
                        Track Your Order
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-white text-[#181725] py-[18px] rounded-[16px] font-bold text-[17px] border border-[#CFCECE] transition-all active:scale-[0.98]"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // ==================== PAYMENT SCREEN ====================
    if (screen === 'payment') {
        const paymentOptions = [
            {
                section: 'Select your Bank',
                items: [
                    { id: 'bob', name: 'Bank of Baroda', subtitle: 'Checked Automatically', icon: '🏦', color: '#EA580C' },
                    { id: 'idfc', name: 'IDFC First Bank', subtitle: 'Checked Automatically', icon: '🏛️', color: '#7C3AED' },
                ]
            },
            {
                section: 'UPI',
                items: [
                    { id: 'phonepe', name: 'PhonePe', subtitle: '', icon: '', color: '#5B21B6', img: '/images/category/drink-juice.png' },
                    { id: 'gpay', name: 'GPay', subtitle: '', icon: '', color: '#2563EB', img: '/images/category/fruits.png' },
                ]
            }
        ];

        return (
            <div className="min-h-screen bg-white flex flex-col pb-28">
                {/* Header */}
                <header className="flex items-center justify-center px-4 h-14 bg-white sticky top-[12px] z-50 relative">
                    <button onClick={() => setScreen('cart')} className="absolute left-4 p-2">
                        <ArrowLeft size={22} className="text-[#181725]" />
                    </button>
                    <h1 className="text-[20px] font-bold text-[#181725]">Payment</h1>
                </header>

                {/* Payment Options */}
                <div className="flex-1 px-5 pt-4 space-y-6">
                    {paymentOptions.map((section) => (
                        <div key={section.section}>
                            <h2 className="text-[15px] font-bold text-[#181725] mb-3">{section.section}</h2>
                            <div className="space-y-2.5">
                                {section.items.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => setSelectedPayment(option.id)}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-4 rounded-[14px] border transition-all text-left",
                                            selectedPayment === option.id
                                                ? "border-[#53B175] bg-[#F1FBF4]"
                                                : "border-[#E2E2E2] bg-white"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "w-[42px] h-[42px] rounded-[10px] flex items-center justify-center text-[20px] shrink-0",
                                            option.id === 'bob' ? "bg-[#EA580C]/10" :
                                            option.id === 'idfc' ? "bg-[#7C3AED]/10" :
                                            option.id === 'phonepe' ? "bg-[#5B21B6]/10" :
                                            "bg-[#2563EB]/10"
                                        )}>
                                            {option.id === 'bob' && (
                                                <div className="w-6 h-6 bg-[#EA580C] rounded-md flex items-center justify-center text-white text-[10px] font-black">B</div>
                                            )}
                                            {option.id === 'idfc' && (
                                                <div className="w-6 h-6 bg-[#7C3AED] rounded-md flex items-center justify-center text-white text-[10px] font-black">I</div>
                                            )}
                                            {option.id === 'phonepe' && (
                                                <div className="w-6 h-6 bg-[#5B21B6] rounded-full flex items-center justify-center text-white text-[10px] font-black">P</div>
                                            )}
                                            {option.id === 'gpay' && (
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden">
                                                    <div className="w-full h-full bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05] rounded-full flex items-center justify-center text-white text-[10px] font-black">G</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Text */}
                                        <div className="flex-1">
                                            <h3 className="text-[15px] font-bold text-[#181725]">{option.name}</h3>
                                            {option.subtitle && (
                                                <p className="text-[12px] text-[#7C7C7C] font-medium">{option.subtitle}</p>
                                            )}
                                        </div>

                                        {/* Radio */}
                                        <div className={cn(
                                            "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                            selectedPayment === option.id
                                                ? "border-[#53B175]"
                                                : "border-[#D0D0D0]"
                                        )}>
                                            {selectedPayment === option.id && (
                                                <div className="w-[12px] h-[12px] rounded-full bg-[#53B175]" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Confirm Payment Button */}
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

    // ==================== CART SCREEN ====================
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
                {shipments.map((shipment) => {
                    const shipmentItemCount = getShipmentItemCount(shipment.items);
                    const shipmentPrice = getShipmentTotal(shipment.items);

                    return (
                        <Link
                            key={shipment.id}
                            href={`/cart/shipment/${shipment.id}`}
                            className="block bg-white rounded-[16px] border border-[#CFCECE] overflow-hidden"
                        >
                            {/* === SUMMARY ROW (Always visible here, detail is on new page) === */}
                            <div className="w-full p-4 flex items-center gap-3 active:bg-gray-50/50 transition-colors">
                                {/* Green dot */}
                                <div className="w-[7px] h-[7px] rounded-full bg-[#53B175] shrink-0" />

                                {/* Circular Product Thumbnails */}
                                <div className="flex items-center -space-x-6 mr-auto pl-2">
                                    {shipment.items.slice(0, 4).map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="w-[52px] h-[52px] rounded-full bg-white flex items-center justify-center shrink-0"
                                            style={{ zIndex: shipment.items.length - idx }}
                                        >
                                            <img src={item.image} alt="" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ))}
                                </div>

                                {/* Item Count */}
                                <span className="text-[14px] font-bold text-[#181725] whitespace-nowrap">{shipmentItemCount} items</span>

                                {/* Price Badge */}
                                <div className="bg-[#53B175] text-white px-3.5 py-1.5 rounded-[8px] flex items-center gap-0.5 font-bold text-[14px] shrink-0">
                                    <span>₹</span>
                                    <span>{Math.round(shipmentPrice)}</span>
                                </div>

                                <ChevronRight size={20} className="text-gray-400 shrink-0" />
                            </div>
                        </Link>
                    );
                })}

                {/* === COUPON CODE === */}
                <div
                    className="bg-white rounded-[16px] border border-[#CFCECE] overflow-hidden mt-1 cursor-pointer"
                    onClick={() => !showCouponInput && setShowCouponInput(true)}
                >
                    <div className="p-4 flex items-center gap-4">
                        <div className="w-[38px] h-[38px] rounded-full border border-[#E2E2E2] flex items-center justify-center shrink-0">
                            <Percent size={17} className="text-[#53B175]" />
                        </div>
                        <div className="h-8 w-[1px] bg-[#E8E8E8]" />
                        <div className="flex-1 flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[15px] font-bold text-[#181725]">Add a coupan code</span>
                                <span className="bg-[#53B175] text-[8px] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wide">NEW</span>
                            </div>
                            <span className="text-[11px] text-[#7C7C7C] font-medium">* apply coupan code to get discount</span>
                        </div>
                        <ArrowLeft size={18} className="rotate-180 text-[#181725] shrink-0" />
                    </div>

                    {showCouponInput && (
                        <div className="px-4 pb-4 border-t border-[#F0F0F0] pt-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Enter coupon code"
                                    className="flex-1 border border-[#E2E2E2] rounded-[10px] px-3 py-2.5 text-[14px] font-medium text-[#181725] outline-none focus:border-[#53B175] transition-colors placeholder:text-gray-400"
                                    autoFocus
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); }}
                                    className="bg-[#53B175] text-white px-5 py-2.5 rounded-[10px] text-[14px] font-bold active:scale-95 transition-transform"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>

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
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </div>

            {/* === PROCEED TO PAY BUTTON === */}
            <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-[#F2F3F2] via-[#F2F3F2] to-transparent z-50">
                <button
                    onClick={() => setScreen('payment')}
                    className="w-full bg-[#53B175] text-white py-[18px] rounded-[16px] font-bold text-[18px] transition-all active:scale-[0.98] shadow-lg shadow-[#53B175]/20"
                >
                    Proceed to pay
                </button>
            </div>
        </div>
    );
}
