'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, CreditCard, Smartphone, Building2, FileText, Clock, CheckCircle2, Shield } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';

type CheckoutStep = 'review' | 'payment' | 'confirmation';

const PAYMENT_OPTIONS = [
    { id: 'credit', name: 'DiSCCO Credit Line', desc: 'Pay later with credit', icon: CreditCard, color: 'purple' },
    { id: 'online', name: 'Pay Online', desc: 'UPI, Cards, Netbanking', icon: Smartphone, color: 'blue' },
    { id: 'bank_transfer', name: 'Bank Transfer', desc: 'NEFT / RTGS / IMPS', icon: Building2, color: 'green' },
    { id: 'po_number', name: 'PO Number', desc: 'Enterprise purchase order', icon: FileText, color: 'orange' },
];

export default function CheckoutPage() {
    const { groups, totalAmount, totalItems, vendorCount } = useCart();
    const [step, setStep] = useState<CheckoutStep>('review');
    const [selectedPayment, setSelectedPayment] = useState('');

    if (groups.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="text-center">
                    <p className="text-[48px] mb-3">🛒</p>
                    <p className="text-[18px] font-bold text-gray-800 mb-2">Your cart is empty</p>
                    <Link href="/" className="text-[14px] text-[#299e60] font-semibold hover:underline">
                        Browse vendors
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                    <Link href="/cart" className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 mb-2">
                        <ChevronLeft size={16} />
                        Back to cart
                    </Link>
                    <h1 className="text-[20px] md:text-[24px] font-bold text-[#181725]">Checkout</h1>

                    {/* Steps */}
                    <div className="flex items-center gap-2 mt-3">
                        {[
                            { key: 'review', label: 'Review PO' },
                            { key: 'payment', label: 'Payment' },
                            { key: 'confirmation', label: 'Confirmed' },
                        ].map((s, idx) => (
                            <React.Fragment key={s.key}>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                                    step === s.key
                                        ? 'bg-[#299e60] text-white shadow-md shadow-green-200'
                                        : (idx < ['review', 'payment', 'confirmation'].indexOf(step))
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-400'
                                }`}>
                                    <span>{idx + 1}</span>
                                    <span className="hidden sm:inline">{s.label}</span>
                                </div>
                                {idx < 2 && <div className="w-6 h-px bg-gray-200" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                {/* === STEP 1: REVIEW === */}
                {step === 'review' && (
                    <div className="space-y-4">
                        <h2 className="text-[15px] font-bold text-[#181725]">
                            Purchase Order{vendorCount > 1 ? 's' : ''} — {vendorCount} vendor{vendorCount > 1 ? 's' : ''}
                        </h2>

                        {groups.map((group) => (
                            <div key={group.vendorId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                {/* Vendor Header */}
                                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                                    {group.vendorLogo && (
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 border border-gray-100">
                                            <img src={group.vendorLogo} alt={group.vendorName} className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-[13px] font-bold text-[#181725]">{group.vendorName}</p>
                                        <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                            <Clock size={10} />
                                            Delivery: Tomorrow morning
                                        </p>
                                    </div>
                                    <span className="text-[14px] font-bold text-[#181725]">₹{group.subtotal.toLocaleString('en-IN')}</span>
                                </div>

                                {/* Items */}
                                {group.items.map((item) => (
                                    <div key={item.productId} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center p-1 shrink-0">
                                            <img src={item.product.images[0] || '/images/recom-product/product-img10.png'} alt={item.product.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-[#181725] line-clamp-1">{item.product.name}</p>
                                            <p className="text-[10px] text-gray-400">{item.product.packSize} × {item.quantity}</p>
                                        </div>
                                        <span className="text-[12px] font-bold text-[#181725]">₹{(item.product.price * item.quantity).toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Total */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold text-[#181725]">Total Payable</span>
                                <span className="text-[18px] font-bold text-[#299e60]">₹{totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">{totalItems} items from {vendorCount} vendor{vendorCount > 1 ? 's' : ''}</p>
                        </div>

                        <button
                            onClick={() => setStep('payment')}
                            className="w-full py-3.5 bg-[#299e60] text-white text-[14px] font-bold rounded-xl shadow-lg shadow-green-200/50 hover:bg-[#22844f] active:scale-[0.99] transition-all"
                        >
                            Continue to Payment →
                        </button>
                    </div>
                )}

                {/* === STEP 2: PAYMENT === */}
                {step === 'payment' && (
                    <div className="space-y-4">
                        <h2 className="text-[15px] font-bold text-[#181725]">Select Payment Method</h2>

                        <div className="space-y-3">
                            {PAYMENT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setSelectedPayment(opt.id)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                                        selectedPayment === opt.id
                                            ? 'border-[#299e60] bg-green-50/50 shadow-md shadow-green-100'
                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        opt.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                        opt.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                        opt.color === 'green' ? 'bg-green-100 text-green-600' :
                                        'bg-orange-100 text-orange-600'
                                    }`}>
                                        <opt.icon size={20} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-[13px] font-bold text-[#181725]">{opt.name}</p>
                                        <p className="text-[11px] text-gray-400 font-medium">{opt.desc}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        selectedPayment === opt.id ? 'border-[#299e60]' : 'border-gray-200'
                                    }`}>
                                        {selectedPayment === opt.id && (
                                            <div className="w-3 h-3 rounded-full bg-[#299e60]" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Credit info if selected */}
                        {selectedPayment === 'credit' && (
                            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield size={16} className="text-purple-600" />
                                    <span className="text-[13px] font-bold text-purple-800">DiSCCO Credit Line</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-purple-600">Available credit</span>
                                        <span className="font-bold text-purple-800">₹25,000</span>
                                    </div>
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-purple-600">This order</span>
                                        <span className="font-bold text-purple-800">₹{totalAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-purple-600">Next due date</span>
                                        <span className="font-bold text-purple-800">25 Mar 2026</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Total */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold text-[#181725]">Total Payable</span>
                                <span className="text-[18px] font-bold text-[#299e60]">₹{totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('confirmation')}
                            disabled={!selectedPayment}
                            className={`w-full py-3.5 text-[14px] font-bold rounded-xl shadow-lg transition-all ${
                                selectedPayment
                                    ? 'bg-[#299e60] text-white shadow-green-200/50 hover:bg-[#22844f] active:scale-[0.99]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            }`}
                        >
                            Place Order →
                        </button>
                    </div>
                )}

                {/* === STEP 3: CONFIRMATION === */}
                {step === 'confirmation' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={40} className="text-[#299e60]" />
                        </div>
                        <h2 className="text-[22px] font-bold text-[#181725] mb-1">Order Placed!</h2>
                        <p className="text-[14px] text-gray-500 mb-6">
                            Your purchase order{vendorCount > 1 ? 's have' : ' has'} been sent to the vendor{vendorCount > 1 ? 's' : ''}.
                        </p>

                        {/* PO Summaries */}
                        <div className="space-y-3 text-left max-w-md mx-auto mb-6">
                            {groups.map((group, idx) => (
                                <div key={group.vendorId} className="bg-white rounded-2xl border border-gray-100 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[12px] font-bold text-gray-400">PO-2026-{String(idx + 3).padStart(3, '0')}</span>
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending Confirmation</span>
                                    </div>
                                    <p className="text-[14px] font-bold text-[#181725]">{group.vendorName}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{group.items.length} items • ₹{group.subtotal.toLocaleString('en-IN')}</p>
                                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-blue-600 font-medium">
                                        <Clock size={10} />
                                        Delivery: Tomorrow morning
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="/orders"
                                className="px-6 py-2.5 bg-[#299e60] text-white text-[13px] font-bold rounded-xl shadow-md shadow-green-200/50 hover:bg-[#22844f] transition-all"
                            >
                                View Orders
                            </Link>
                            <Link
                                href="/"
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 text-[13px] font-bold rounded-xl hover:bg-gray-200 transition-all"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
