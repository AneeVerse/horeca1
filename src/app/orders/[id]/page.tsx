'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Home, Package, Store, Clock, CheckCircle2, XCircle, Truck, CreditCard, Star, Loader2, X, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { dal } from '@/lib/dal';
import type { VendorProduct } from '@/types';
import { cn } from '@/lib/utils';

interface ApiOrderItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: string | number;
    totalPrice: string | number;
    product?: { imageUrl: string | null; images: string[] } | null;
}

interface ApiOrderVendor {
    id: string;
    businessName: string;
    slug: string;
    logoUrl: string | null;
}

interface ApiOrder {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    subtotal: string | number;
    taxAmount?: string | number;
    totalAmount: string | number;
    notes?: string | null;
    createdAt: string;
    updatedAt?: string;
    vendor: ApiOrderVendor;
    items: ApiOrderItem[];
    review?: { rating: number; comment?: string } | null;
    payments?: Array<{ id: string; status: string; razorpayPaymentId?: string | null; amount: string | number }>;
}

const STATUS_CONFIG: Record<string, { label: string; textColor: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
    pending:    { label: 'Pending Confirmation', textColor: 'text-amber-700',  bgColor: 'bg-amber-50',   borderColor: 'border-amber-200', icon: <Clock size={14} /> },
    confirmed:  { label: 'Confirmed',            textColor: 'text-blue-700',   bgColor: 'bg-blue-50',    borderColor: 'border-blue-200',  icon: <CheckCircle2 size={14} /> },
    processing: { label: 'Being Processed',       textColor: 'text-purple-700', bgColor: 'bg-purple-50',  borderColor: 'border-purple-200',icon: <Loader2 size={14} /> },
    shipped:    { label: 'Out for Delivery',      textColor: 'text-indigo-700', bgColor: 'bg-indigo-50',  borderColor: 'border-indigo-200',icon: <Truck size={14} /> },
    delivered:  { label: 'Delivered',             textColor: 'text-green-700',  bgColor: 'bg-green-50',   borderColor: 'border-green-200', icon: <CheckCircle2 size={14} /> },
    cancelled:  { label: 'Cancelled',             textColor: 'text-red-700',    bgColor: 'bg-red-50',     borderColor: 'border-red-200',   icon: <XCircle size={14} /> },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
    unpaid:   { label: 'Unpaid',   color: 'text-red-600',   bg: 'bg-red-50' },
    paid:     { label: 'Paid',     color: 'text-green-600', bg: 'bg-green-50' },
    partial:  { label: 'Partial',  color: 'text-amber-600', bg: 'bg-amber-50' },
    refunded: { label: 'Refunded', color: 'text-gray-500',  bg: 'bg-gray-50' },
};

function fmt(val: string | number): string {
    const n = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(n) ? '—' : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
    } catch { return iso; }
}

function fmtTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

function getImg(item: ApiOrderItem): string | null {
    return item.product?.imageUrl || item.product?.images?.[0] || null;
}

export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;
    const { status: sessionStatus } = useSession();
    const { addToCart } = useCart();

    const [order, setOrder] = React.useState<ApiOrder | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [allProducts, setAllProducts] = React.useState<VendorProduct[]>([]);

    // Rating state
    const [showRating, setShowRating] = React.useState(false);
    const [selectedStars, setSelectedStars] = React.useState(0);
    const [ratingComment, setRatingComment] = React.useState('');
    const [isSubmittingRating, setIsSubmittingRating] = React.useState(false);

    React.useEffect(() => {
        if (sessionStatus === 'unauthenticated') { router.push('/'); return; }
        if (sessionStatus !== 'authenticated') return;
        setLoading(true);
        dal.orders.getById(orderId)
            .then((result: any) => setOrder(result.data ?? result))
            .catch(() => { toast.error('Order not found'); router.push('/orders'); })
            .finally(() => setLoading(false));
    }, [orderId, sessionStatus]);

    React.useEffect(() => {
        if (sessionStatus !== 'authenticated') return;
        dal.vendors.list()
            .then(r => Promise.all(r.vendors.map((v: any) =>
                dal.vendors.getProducts(v.id).then((r2: any) => r2.products).catch(() => [] as VendorProduct[])
            )))
            .then((arrays: VendorProduct[][]) => setAllProducts(arrays.flat()))
            .catch(() => {});
    }, [sessionStatus]);

    const handleReorder = () => {
        if (!order) return;
        let added = 0;
        for (const item of order.items) {
            const product = allProducts.find(p => p.id === item.productId);
            if (product) { addToCart(product, item.quantity); added++; }
        }
        if (added > 0) {
            toast.success(`${added} item${added > 1 ? 's' : ''} added to cart`);
            router.push('/cart');
        } else {
            toast.error('Products not found in current catalog');
        }
    };

    const handleSubmitRating = async () => {
        if (!order || selectedStars === 0) return;
        setIsSubmittingRating(true);
        try {
            await dal.reviews.submit(order.id, selectedStars, ratingComment || undefined);
            setOrder(prev => prev ? { ...prev, review: { rating: selectedStars, comment: ratingComment } } : prev);
            toast.success('Review submitted! Thank you.');
            setShowRating(false);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to submit review');
        } finally {
            setIsSubmittingRating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F2F3F2] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-[#299e60] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[14px] text-gray-400 font-medium">Loading order...</p>
                </div>
            </div>
        );
    }

    if (!order) return null;

    const statusCfg = STATUS_CONFIG[order.status] ?? { label: order.status, textColor: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', icon: null };
    const paymentCfg = PAYMENT_STATUS[order.paymentStatus] ?? { label: order.paymentStatus, color: 'text-gray-500', bg: 'bg-gray-50' };
    const subtotal = typeof order.subtotal === 'string' ? parseFloat(order.subtotal) : order.subtotal;
    const total = typeof order.totalAmount === 'string' ? parseFloat(order.totalAmount) : order.totalAmount;
    const tax = order.taxAmount ? (typeof order.taxAmount === 'string' ? parseFloat(order.taxAmount) : order.taxAmount) : 0;

    return (
        <div className="min-h-screen bg-[#F2F3F2]">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-[var(--container-max)] mx-auto px-4 md:px-[var(--container-padding)]">
                    {/* Breadcrumb — desktop */}
                    <div className="hidden md:flex items-center gap-2 text-[13px] text-gray-400 pt-4 mb-1">
                        <Link href="/" className="hover:text-[#299e60] transition-colors flex items-center gap-1">
                            <Home size={13} /><span>Home</span>
                        </Link>
                        <ChevronRight size={11} />
                        <Link href="/orders" className="hover:text-[#299e60] transition-colors">Orders</Link>
                        <ChevronRight size={11} />
                        <span className="text-[#181725] font-semibold">{order.orderNumber}</span>
                    </div>

                    <div className="flex items-center gap-3 py-3 md:pb-4">
                        <button onClick={() => router.push('/orders')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                            <ChevronLeft size={22} className="text-[#181725]" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-gray-400 font-medium hidden md:block">Order Details</p>
                            <h1 className="text-[17px] md:text-[20px] font-black text-[#181725]">{order.orderNumber}</h1>
                        </div>
                        <span className={cn('hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border', statusCfg.bgColor, statusCfg.textColor, statusCfg.borderColor)}>
                            {statusCfg.icon}
                            {statusCfg.label}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-[var(--container-max)] mx-auto px-4 md:px-[var(--container-padding)] py-5 md:py-8 pb-28">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">

                    {/* ── LEFT COLUMN ── */}
                    <div className="space-y-4">

                        {/* Status banner (mobile) */}
                        <div className={cn('md:hidden flex items-center gap-2.5 px-4 py-3 rounded-2xl border font-bold text-[13px]', statusCfg.bgColor, statusCfg.textColor, statusCfg.borderColor)}>
                            {statusCfg.icon}
                            {statusCfg.label}
                        </div>

                        {/* Vendor card */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {order.vendor?.logoUrl
                                    ? <img src={order.vendor.logoUrl} alt={order.vendor.businessName} className="w-full h-full object-contain p-1.5" />
                                    : <Store size={22} className="text-gray-400" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-gray-400 font-medium mb-0.5">Vendor</p>
                                <p className="text-[16px] font-black text-[#181725] truncate">{order.vendor?.businessName}</p>
                                <p className="text-[12px] text-gray-400 mt-0.5">{fmtDate(order.createdAt)} · {fmtTime(order.createdAt)}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-[14px] font-black text-[#181725]">Items Ordered</h2>
                                <span className="text-[12px] text-gray-400 font-medium">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {order.items.map(item => {
                                    const img = getImg(item);
                                    return (
                                        <div key={item.id} className="flex items-center gap-4 px-4 py-4">
                                            <div className="w-14 h-14 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center p-1.5 shrink-0">
                                                {img
                                                    ? <img src={img} alt={item.productName} className="w-full h-full object-contain" />
                                                    : <Package size={20} className="text-gray-300" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[14px] font-bold text-[#181725] leading-snug">{item.productName}</p>
                                                <p className="text-[12px] text-gray-400 mt-0.5">
                                                    {item.quantity} × {fmt(item.unitPrice)}
                                                </p>
                                            </div>
                                            <p className="text-[15px] font-black text-[#181725] shrink-0">{fmt(item.totalPrice)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Notes if any */}
                        {order.notes && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                                <p className="text-[11px] text-amber-600 font-bold uppercase tracking-wide mb-1">Order Notes</p>
                                <p className="text-[13px] text-amber-800 font-medium">{order.notes}</p>
                            </div>
                        )}

                        {/* Your review */}
                        {order.review?.rating && !showRating && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                <p className="text-[12px] text-gray-400 font-bold uppercase tracking-wide mb-2">Your Review</p>
                                <div className="flex gap-1 mb-2">
                                    {[1,2,3,4,5].map(s => (
                                        <Star key={s} size={18}
                                            className={s <= (order.review?.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-none'} />
                                    ))}
                                </div>
                                {order.review.comment && <p className="text-[13px] text-gray-600 font-medium">{order.review.comment}</p>}
                            </div>
                        )}

                        {/* Rating form (inline) */}
                        {showRating && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[15px] font-black text-[#181725]">Rate This Order</h3>
                                    <button onClick={() => setShowRating(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                                        <X size={14} className="text-gray-500" />
                                    </button>
                                </div>
                                <div className="flex justify-center gap-3 mb-3">
                                    {[1,2,3,4,5].map(s => (
                                        <button key={s} onClick={() => setSelectedStars(s)} className="transition-transform active:scale-90">
                                            <Star size={32} className={s <= selectedStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-none'} />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-center text-[12px] font-bold text-gray-400 mb-4">
                                    {['Tap to rate','Very Poor','Poor','Average','Good','Excellent!'][selectedStars]}
                                </p>
                                <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)}
                                    maxLength={200} placeholder="Share your experience (optional)..." rows={3}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#181725] placeholder-gray-300 resize-none focus:outline-none focus:border-[#299e60] transition-colors mb-4" />
                                <button onClick={handleSubmitRating} disabled={selectedStars === 0 || isSubmittingRating}
                                    className={cn('w-full py-3 rounded-xl text-[14px] font-black flex items-center justify-center gap-2 transition-all',
                                        selectedStars > 0 && !isSubmittingRating
                                            ? 'bg-[#299e60] text-white shadow-md shadow-green-200/50 hover:bg-[#22844f]'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                                    {isSubmittingRating ? <><Loader2 size={15} className="animate-spin" /> Submitting...</> : 'Submit Review'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT COLUMN ── */}
                    <div className="space-y-4">

                        {/* Price breakdown */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-50">
                                <h2 className="text-[14px] font-black text-[#181725]">Bill Summary</h2>
                            </div>
                            <div className="px-5 py-4 space-y-3">
                                <div className="flex justify-between text-[14px]">
                                    <span className="text-gray-500 font-medium">Subtotal ({order.items.length} items)</span>
                                    <span className="font-bold text-[#181725]">{fmt(subtotal)}</span>
                                </div>
                                {tax > 0 && (
                                    <div className="flex justify-between text-[14px]">
                                        <span className="text-gray-500 font-medium">Tax</span>
                                        <span className="font-bold text-[#181725]">{fmt(tax)}</span>
                                    </div>
                                )}
                                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-baseline">
                                    <span className="text-[15px] font-black text-[#181725]">Total</span>
                                    <span className="text-[22px] font-black text-[#299e60]">{fmt(total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment info */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-50">
                                <h2 className="text-[14px] font-black text-[#181725]">Payment</h2>
                            </div>
                            <div className="px-5 py-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <CreditCard size={14} className="text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-[12px] text-gray-400 font-medium">Method</p>
                                            <p className="text-[13px] font-bold text-[#181725] capitalize">
                                                {order.paymentMethod === 'razorpay' ? 'Razorpay' : order.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : order.paymentMethod === 'po_number' ? 'PO Number' : order.paymentMethod === 'credit' ? 'Credit Line' : order.paymentMethod || '—'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-black', paymentCfg.bg, paymentCfg.color)}>
                                        {paymentCfg.label}
                                    </span>
                                </div>

                                {/* Razorpay payment IDs */}
                                {order.payments && order.payments.length > 0 && order.payments[0].razorpayPaymentId && (
                                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                                        <p className="text-[11px] text-gray-400 font-medium">Transaction ID</p>
                                        <p className="text-[12px] font-mono text-gray-600">{order.payments[0].razorpayPaymentId}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <button onClick={handleReorder}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#299e60] text-white text-[14px] font-black rounded-2xl shadow-lg shadow-green-200/50 hover:bg-[#22844f] transition-all active:scale-[0.99]">
                                <ShoppingCart size={16} />
                                Reorder All Items
                            </button>
                            {!order.review?.rating && !showRating && (
                                <button onClick={() => setShowRating(true)}
                                    className="w-full py-3.5 border-2 border-gray-200 text-[14px] font-black text-gray-600 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                                    <Star size={16} />
                                    Rate This Order
                                </button>
                            )}
                            <Link href="/orders"
                                className="w-full py-3 flex items-center justify-center gap-1 text-[13px] font-bold text-gray-400 hover:text-gray-600 transition-colors">
                                <ChevronLeft size={14} />
                                Back to All Orders
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
