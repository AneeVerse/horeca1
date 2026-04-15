'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, CreditCard, Smartphone, Building2, FileText, Clock, CheckCircle2, Shield, User, Loader2, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';
import { useSession } from 'next-auth/react';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { dal } from '@/lib/dal';
import { DeliverySlotPicker } from '@/components/features/checkout/DeliverySlotPicker';

declare global {
    interface Window {
        Razorpay: new (options: Record<string, unknown>) => { open(): void };
    }
}

interface RazorpaySuccessPayload {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined') { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
        document.body.appendChild(script);
    });
}

function openRazorpayPopup(opts: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    description: string;
}): Promise<RazorpaySuccessPayload> {
    return new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
            key: opts.key,
            amount: opts.amount,
            currency: opts.currency,
            order_id: opts.order_id,
            name: 'HoReCa Hub',
            description: opts.description,
            theme: { color: '#299e60' },
            handler: (response: RazorpaySuccessPayload) => resolve(response),
            modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
        rzp.open();
    });
}

type CheckoutStep = 'review' | 'payment' | 'confirmation';

const PAYMENT_OPTIONS = [
    { id: 'credit', name: 'DiSCCO Credit Line', desc: 'Pay later with credit', icon: CreditCard, color: 'purple' },
    { id: 'online', name: 'Pay Online', desc: 'UPI, Cards, Netbanking', icon: Smartphone, color: 'blue' },
    { id: 'bank_transfer', name: 'Bank Transfer', desc: 'NEFT / RTGS / IMPS', icon: Building2, color: 'green' },
    { id: 'po_number', name: 'PO Number', desc: 'Enterprise purchase order', icon: FileText, color: 'orange' },
];

export default function CheckoutPage() {
    const { groups, clearCart, removeFromCart } = useCart();
    const { status: sessionStatus } = useSession();
    const [step, setStep] = useState<CheckoutStep>('review');
    const [selectedPayment, setSelectedPayment] = useState('');
    const [orderSnapshot, setOrderSnapshot] = useState<{ groups: any[], total: number, count: number } | null>(null);
    const [showAuthScreen, setShowAuthScreen] = useState(false);
    const [availableCredit, setAvailableCredit] = useState<number | null>(null);
    const [creditDueDate, setCreditDueDate] = useState<string | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [placedOrderIds, setPlacedOrderIds] = useState<string[]>([]);
    const [excludedVendorIds, setExcludedVendorIds] = useState<Set<string>>(new Set());
    const [slotByVendor, setSlotByVendor] = useState<Record<string, string | null>>({});

    const selectedGroups = useMemo(
        () => groups.filter(g => !excludedVendorIds.has(g.vendorId) && g.meetsMinOrder),
        [groups, excludedVendorIds]
    );
    const selectedTotal = useMemo(
        () => selectedGroups.reduce((sum, g) => sum + g.subtotal, 0),
        [selectedGroups]
    );
    const selectedItemCount = useMemo(
        () => selectedGroups.reduce((sum, g) => sum + g.items.reduce((a, i) => a + i.quantity, 0), 0),
        [selectedGroups]
    );
    const selectedVendorCount = selectedGroups.length;

    const toggleVendor = (vendorId: string) => {
        setExcludedVendorIds(prev => {
            const next = new Set(prev);
            if (next.has(vendorId)) next.delete(vendorId);
            else next.add(vendorId);
            return next;
        });
    };

    // Load real credit info when payment step is reached
    React.useEffect(() => {
        if (step !== 'payment' || sessionStatus !== 'authenticated') return;
        fetch('/api/v1/credit/check')
            .then(r => r.json())
            .then(d => {
                if (d.data) {
                    setAvailableCredit(d.data.availableCredit ?? d.data.creditLimit ?? null);
                    setCreditDueDate(d.data.nextDueDate ?? null);
                }
            })
            .catch(() => {}); // silently fall back to null
    }, [step, sessionStatus]);

    const handlePlaceOrder = async () => {
        if (selectedGroups.length === 0) {
            setOrderError('Select at least one vendor PO to place.');
            return;
        }
        setIsPlacingOrder(true);
        setOrderError(null);
        try {
            const vendorOrders = selectedGroups.map(group => ({
                vendorId: group.vendorId,
                items: group.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
                ...(slotByVendor[group.vendorId] ? { deliverySlotId: slotByVendor[group.vendorId] as string } : {}),
            }));

            // 1. Create orders in DB (same for all payment methods)
            const result = await dal.orders.create(vendorOrders, selectedPayment) as {
                orders: Array<{ id: string; orderNumber: string }>;
            };
            const createdOrders = result.orders || [];

            // 2. For online payment: open Razorpay popup for each order
            if (selectedPayment === 'online') {
                await loadRazorpayScript();

                for (let i = 0; i < createdOrders.length; i++) {
                    const order = createdOrders[i];

                    // Initiate — get razorpay_order_id from our backend
                    const initiateRes = await fetch('/api/v1/payments/initiate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: order.id }),
                    });
                    const initiateData = await initiateRes.json();
                    if (!initiateRes.ok) throw new Error(initiateData.error?.message || 'Payment initiation failed');

                    const { razorpay_order_id, amount, currency, key_id } = initiateData.data;

                    // Open popup — awaits user completing or dismissing payment
                    const payment = await openRazorpayPopup({
                        key: key_id,
                        amount,
                        currency,
                        order_id: razorpay_order_id,
                        description: `Order ${order.orderNumber}${createdOrders.length > 1 ? ` (${i + 1}/${createdOrders.length})` : ''}`,
                    });

                    // Verify HMAC signature on our backend
                    const verifyRes = await fetch('/api/v1/payments/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: payment.razorpay_order_id,
                            razorpay_payment_id: payment.razorpay_payment_id,
                            razorpay_signature: payment.razorpay_signature,
                        }),
                    });
                    const verifyData = await verifyRes.json();
                    if (!verifyRes.ok) throw new Error(verifyData.error?.message || 'Payment verification failed');
                }
            }

            // 3. Show confirmation
            setPlacedOrderIds(createdOrders.map(o => o.orderNumber || o.id));
            setOrderSnapshot({ groups: [...selectedGroups], total: selectedTotal, count: selectedVendorCount });
            setStep('confirmation');

            // Remove only the placed vendor groups from cart; leave unselected ones intact.
            const placedAllGroups = selectedGroups.length === groups.length;
            if (placedAllGroups) {
                clearCart();
            } else {
                selectedGroups.forEach(g => g.items.forEach(i => removeFromCart(i.productId)));
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
            setOrderError(msg);
        } finally {
            setIsPlacingOrder(false);
        }
    };

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

    // Guest wall — prompt login before checkout
    if (sessionStatus === 'unauthenticated') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4">
                <div className="bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-10 max-w-md w-full text-center border border-gray-100">
                    <div className="w-16 h-16 bg-[#53B175]/10 rounded-full flex items-center justify-center mx-auto mb-5">
                        <User size={28} className="text-[#53B175]" strokeWidth={2} />
                    </div>
                    <h2 className="text-[22px] font-[1000] text-[#181725] tracking-tight mb-2">Sign in to Checkout</h2>
                    <p className="text-gray-400 text-[14px] font-medium mb-8 leading-relaxed">
                        Create a free account or log in to place your order, track deliveries, and access order lists.
                    </p>
                    <button
                        onClick={() => setShowAuthScreen(true)}
                        className="w-full bg-[#53B175] text-white font-black py-4 rounded-2xl shadow-lg shadow-green-500/20 mb-3 hover:bg-[#48a068] transition-all"
                    >
                        Log In / Sign Up
                    </button>
                    <Link href="/" className="text-[13px] text-gray-400 font-bold hover:text-gray-600 transition-colors">
                        Continue browsing
                    </Link>
                </div>
                <AuthScreen
                    isOpen={showAuthScreen}
                    onClose={() => setShowAuthScreen(false)}
                    onLoginSuccess={() => { setShowAuthScreen(false); }}
                />
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
                        <div className="flex items-end justify-between gap-3 flex-wrap">
                            <h2 className="text-[15px] font-bold text-[#181725]">
                                Purchase Order{groups.length > 1 ? 's' : ''} — {groups.length} vendor{groups.length > 1 ? 's' : ''}
                            </h2>
                            {groups.length > 1 && (
                                <p className="text-[11px] font-medium text-gray-500">
                                    Uncheck any vendor to place their PO later
                                </p>
                            )}
                        </div>

                        {groups.map((group) => {
                            const belowMov = !group.meetsMinOrder;
                            const isSelected = !excludedVendorIds.has(group.vendorId) && !belowMov;
                            const movGap = Math.max(0, (group.minOrderValue || 0) - group.subtotal);
                            return (
                            <div
                                key={group.vendorId}
                                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                                    isSelected ? 'border-gray-100' : 'border-gray-100 opacity-80'
                                }`}
                            >
                                {/* Vendor Header */}
                                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                                    {groups.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => !belowMov && toggleVendor(group.vendorId)}
                                            disabled={belowMov}
                                            aria-label={isSelected ? `Deselect ${group.vendorName}` : `Select ${group.vendorName}`}
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                belowMov
                                                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                                                    : isSelected ? 'bg-[#299e60] border-[#299e60]' : 'bg-white border-gray-300'
                                            }`}
                                        >
                                            {isSelected && <Check size={13} className="text-white" strokeWidth={4} />}
                                        </button>
                                    )}
                                    {group.vendorLogo && (
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 border border-gray-100">
                                            <img src={group.vendorLogo} alt={group.vendorName} className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-[13px] font-bold text-[#181725]">{group.vendorName}</p>
                                        <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                            <Clock size={10} />
                                            Min order ₹{(group.minOrderValue || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <span className="text-[14px] font-bold text-[#181725]">₹{group.subtotal.toLocaleString('en-IN')}</span>
                                </div>

                                {/* MOV banner */}
                                {belowMov && (
                                    <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 text-[12px] font-semibold text-red-700 flex items-center justify-between gap-3">
                                        <span>Add ₹{movGap.toLocaleString('en-IN')} more to meet minimum order</span>
                                        <Link href={`/vendor/${group.vendorId}`} className="shrink-0 text-[11px] underline font-bold">
                                            Shop more
                                        </Link>
                                    </div>
                                )}

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

                                {/* Delivery slot picker */}
                                {isSelected && (
                                    <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                                        <DeliverySlotPicker
                                            vendorId={group.vendorId}
                                            selectedSlotId={slotByVendor[group.vendorId] ?? null}
                                            onChange={(slotId) => setSlotByVendor(prev => ({ ...prev, [group.vendorId]: slotId }))}
                                        />
                                    </div>
                                )}
                            </div>
                            );
                        })}

                        {/* Total */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold text-[#181725]">Total Payable</span>
                                <span className="text-[18px] font-bold text-[#299e60]">₹{selectedTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">{selectedItemCount} items from {selectedVendorCount} vendor{selectedVendorCount !== 1 ? 's' : ''}</p>
                        </div>

                        <button
                            onClick={() => setStep('payment')}
                            disabled={selectedVendorCount === 0}
                            className={`w-full py-3.5 text-[14px] font-bold rounded-xl shadow-lg transition-all ${
                                selectedVendorCount === 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-[#299e60] text-white shadow-green-200/50 hover:bg-[#22844f] active:scale-[0.99]'
                            }`}
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
                                        <span className="font-bold text-purple-800">
                                            {availableCredit !== null ? `₹${availableCredit.toLocaleString('en-IN')}` : 'Loading...'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-purple-600">This order</span>
                                        <span className="font-bold text-purple-800">₹{selectedTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-[12px]">
                                        <span className="text-purple-600">Next due date</span>
                                        <span className="font-bold text-purple-800">
                                            {creditDueDate ? new Date(creditDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Total */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold text-[#181725]">Total Payable</span>
                                <span className="text-[18px] font-bold text-[#299e60]">₹{selectedTotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {orderError && (
                            <div className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium">
                                {orderError}
                            </div>
                        )}
                        <button
                            onClick={handlePlaceOrder}
                            disabled={!selectedPayment || isPlacingOrder}
                            className={`w-full py-3.5 text-[14px] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                                selectedPayment && !isPlacingOrder
                                    ? 'bg-[#299e60] text-white shadow-green-200/50 hover:bg-[#22844f] active:scale-[0.99]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {isPlacingOrder ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {selectedPayment === 'online' ? 'Opening Payment...' : 'Placing Order...'}
                                </>
                            ) : selectedPayment === 'online' ? 'Pay Online →' : 'Place Order →'}
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
                            Your purchase order{(orderSnapshot?.count || 0) > 1 ? 's have' : ' has'} been sent to the vendor{(orderSnapshot?.count || 0) > 1 ? 's' : ''}.
                        </p>

                        {/* PO Summaries */}
                        <div className="space-y-3 text-left max-w-md mx-auto mb-6">
                            {(orderSnapshot?.groups || []).map((group, idx) => (
                                <div key={group.vendorId} className="bg-white rounded-2xl border border-gray-100 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[12px] font-bold text-gray-400">{placedOrderIds[idx] || `PO-${idx + 1}`}</span>
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
