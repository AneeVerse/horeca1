'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Star, Home, Package, LogIn, X, Loader2, Store, Clock, CheckCircle2, XCircle, Truck, CreditCard } from 'lucide-react';
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
    totalAmount: string | number;
    createdAt: string;
    vendor: ApiOrderVendor;
    items: ApiOrderItem[];
    review?: { rating: number } | null;
    payments?: Array<{ id: string; status: string; razorpayPaymentId?: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:    { label: 'Pending',    color: 'text-amber-600',   bg: 'bg-amber-50',   icon: <Clock size={10} /> },
    confirmed:  { label: 'Confirmed',  color: 'text-blue-600',    bg: 'bg-blue-50',    icon: <CheckCircle2 size={10} /> },
    processing: { label: 'Processing', color: 'text-purple-600',  bg: 'bg-purple-50',  icon: <Loader2 size={10} /> },
    shipped:    { label: 'Shipped',    color: 'text-indigo-600',  bg: 'bg-indigo-50',  icon: <Truck size={10} /> },
    delivered:  { label: 'Delivered',  color: 'text-green-600',   bg: 'bg-green-50',   icon: <CheckCircle2 size={10} /> },
    cancelled:  { label: 'Cancelled',  color: 'text-red-500',     bg: 'bg-red-50',     icon: <XCircle size={10} /> },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
    unpaid:   { label: 'Unpaid',   color: 'text-red-500' },
    paid:     { label: 'Paid',     color: 'text-green-600' },
    partial:  { label: 'Partial',  color: 'text-amber-500' },
    refunded: { label: 'Refunded', color: 'text-gray-400' },
};

function getProductImage(item: ApiOrderItem): string | null {
    return item.product?.imageUrl || item.product?.images?.[0] || null;
}

function formatAmount(val: string | number): string {
    const n = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(n) ? '—' : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string, long = false): string {
    try {
        return new Date(iso).toLocaleDateString('en-IN', long
            ? { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { day: 'numeric', month: 'short', year: 'numeric' }
        );
    } catch { return iso; }
}

export default function OrderHistoryPage() {
    const router = useRouter();
    const { status: sessionStatus } = useSession();
    const isLoggedIn = sessionStatus === 'authenticated';
    const isLoading = sessionStatus === 'loading';
    const { addToCart } = useCart();
    const [orders, setOrders] = React.useState<ApiOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = React.useState(true);
    const [allProducts, setAllProducts] = React.useState<VendorProduct[]>([]);
    const [ratingModal, setRatingModal] = React.useState<{ orderId: string } | null>(null);
    const [selectedStars, setSelectedStars] = React.useState(0);
    const [ratingComment, setRatingComment] = React.useState('');
    const [isSubmittingRating, setIsSubmittingRating] = React.useState(false);

    React.useEffect(() => {
        if (!isLoggedIn) return;
        dal.vendors.list()
            .then(r => Promise.all(r.vendors.map(v =>
                dal.vendors.getProducts(v.id).then(r2 => r2.products).catch(() => [] as VendorProduct[])
            )))
            .then(arrays => setAllProducts(arrays.flat()))
            .catch(() => {});
    }, [isLoggedIn]);

    React.useEffect(() => {
        if (isLoading) return;
        if (!isLoggedIn) { setOrdersLoading(false); return; }
        setOrdersLoading(true);
        dal.orders.list()
            .then(r => setOrders((r.orders || []) as ApiOrder[]))
            .catch(() => setOrders([]))
            .finally(() => setOrdersLoading(false));
    }, [isLoggedIn, isLoading]);

    const handleSaveAsOrderList = async (order: ApiOrder, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            const vendorId = order.vendor?.id;
            if (!vendorId) { toast.error('Could not determine vendor'); return; }
            const res = await fetch('/api/v1/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `${order.orderNumber} List`, vendorId }),
            });
            const json = await res.json();
            const listId = json.data?.id;
            if (!listId) throw new Error('No list ID');
            for (const item of order.items) {
                await fetch(`/api/v1/lists/${listId}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: item.productId, vendorId, defaultQty: item.quantity }),
                });
            }
            toast.success('Saved as Order List!');
        } catch { toast.error('Failed to save as order list'); }
    };

    const handleOrderAgain = (order: ApiOrder, e?: React.MouseEvent) => {
        e?.stopPropagation();
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

    const openRatingModal = (orderId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedStars(0); setRatingComment(''); setRatingModal({ orderId });
    };

    const handleSubmitRating = async () => {
        if (!ratingModal || selectedStars === 0) return;
        setIsSubmittingRating(true);
        try {
            await dal.reviews.submit(ratingModal.orderId, selectedStars, ratingComment || undefined);
            setOrders(prev => prev.map(o =>
                o.id === ratingModal.orderId ? { ...o, review: { rating: selectedStars } } : o
            ));
            if (detailOrder?.id === ratingModal.orderId) {
                setDetailOrder(prev => prev ? { ...prev, review: { rating: selectedStars } } : prev);
            }
            toast.success('Review submitted!');
            setRatingModal(null);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to submit review');
        } finally {
            setIsSubmittingRating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F3F2]">
            {/* Mobile Header */}
            <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center">
                <button onClick={() => router.push('/')} className="p-2 -ml-2">
                    <ChevronLeft size={22} className="text-[#181725]" />
                </button>
                <h1 className="text-[17px] font-bold text-[#181725] absolute left-1/2 -translate-x-1/2">My Orders</h1>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block bg-white border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-5">
                    <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-3">
                        <Link href="/" className="hover:text-[#299e60] flex items-center gap-1 transition-colors">
                            <Home size={14} /><span>Home</span>
                        </Link>
                        <ChevronRight size={12} />
                        <span className="text-[#181725] font-semibold">My Orders</span>
                    </div>
                    <h1 className="text-[28px] font-black text-[#181725] tracking-tight flex items-center gap-3">
                        <Package size={26} className="text-[#299e60]" />
                        My Orders
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[var(--container-max)] mx-auto px-4 md:px-[var(--container-padding)] py-5 md:py-8 pb-28">
                {(isLoading || ordersLoading) ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#299e60] rounded-full animate-spin mb-5" />
                        <p className="text-[14px] text-gray-400 font-medium">Loading orders...</p>
                    </div>
                ) : !isLoggedIn ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                            <LogIn size={36} className="text-gray-300" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-[20px] font-bold text-[#181725] mb-2">Sign in to view orders</h2>
                        <p className="text-[14px] text-gray-400 font-medium mb-8 max-w-[240px]">
                            Log in to see your order history and reorder items.
                        </p>
                        <button onClick={() => router.push('/login')}
                            className="px-8 py-3 bg-[#299e60] text-white font-bold rounded-2xl shadow-lg shadow-green-200/50 hover:bg-[#22844f]">
                            Log In
                        </button>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                            <Package size={36} className="text-gray-300" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-[20px] font-bold text-[#181725] mb-2">No orders yet</h2>
                        <p className="text-[14px] text-gray-400 font-medium mb-8 max-w-[220px]">
                            Start shopping to see your orders here.
                        </p>
                        <button onClick={() => router.push('/')}
                            className="px-8 py-3 bg-[#299e60] text-white font-bold rounded-2xl shadow-lg shadow-green-200/50 hover:bg-[#22844f]">
                            Browse Vendors
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {orders.map(order => {
                            const statusCfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'text-gray-500', bg: 'bg-gray-100', icon: null };
                            const paymentCfg = PAYMENT_STATUS[order.paymentStatus] ?? { label: order.paymentStatus, color: 'text-gray-400' };
                            const hasReview = !!(order.review?.rating);

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => router.push(`/orders/${order.id}`)}
                                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-[#299e60]/20 transition-all cursor-pointer flex flex-col group"
                                >
                                    {/* Header: vendor + status */}
                                    <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                            {order.vendor?.logoUrl
                                                ? <img src={order.vendor.logoUrl} alt={order.vendor.businessName} className="w-full h-full object-contain p-1" />
                                                : <Store size={16} className="text-gray-400" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-[#181725] truncate">{order.vendor?.businessName || 'Vendor'}</p>
                                            <p className="text-[11px] text-gray-400">{formatDate(order.createdAt)}</p>
                                        </div>
                                        <span className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide', statusCfg.bg, statusCfg.color)}>
                                            {statusCfg.icon}
                                            {statusCfg.label}
                                        </span>
                                    </div>

                                    {/* Order number + amount */}
                                    <div className="px-4 pb-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] text-gray-400 font-medium">Order</p>
                                            <p className="text-[15px] font-black text-[#181725]">{order.orderNumber}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn('text-[11px] font-bold', paymentCfg.color)}>{paymentCfg.label}</p>
                                            <p className="text-[18px] font-black text-[#299e60]">{formatAmount(order.totalAmount)}</p>
                                        </div>
                                    </div>

                                    {/* Product images strip */}
                                    <div className="px-4 pb-3">
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                            {order.items.map((item, idx) => {
                                                const img = getProductImage(item);
                                                return (
                                                    <div key={idx} className="w-[52px] h-[52px] min-w-[52px] rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center p-1.5 shrink-0">
                                                        {img
                                                            ? <img src={img} alt={item.productName} className="w-full h-full object-contain" />
                                                            : <Package size={18} className="text-gray-300" />
                                                        }
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-2 font-medium">
                                            {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {order.items.slice(0, 2).map(i => i.productName).join(', ')}{order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                                        </p>
                                    </div>

                                    {/* Review stars if rated */}
                                    {hasReview && (
                                        <div className="px-4 pb-2 flex items-center gap-1">
                                            {[1,2,3,4,5].map(s => (
                                                <Star key={s} size={12}
                                                    className={s <= (order.review?.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-none'} />
                                            ))}
                                            <span className="text-[11px] text-gray-400 ml-1">Your rating</span>
                                        </div>
                                    )}

                                    {/* Action footer */}
                                    <div className="flex items-center border-t border-gray-50 mt-auto">
                                        {!hasReview && (
                                            <>
                                                <button onClick={(e) => openRatingModal(order.id, e)}
                                                    className="flex-1 py-3 text-center text-[11px] font-bold text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-wide">
                                                    Rate Order
                                                </button>
                                                <div className="w-px h-7 bg-gray-100" />
                                            </>
                                        )}
                                        <button onClick={(e) => handleSaveAsOrderList(order, e)}
                                            className="flex-1 py-3 text-center text-[11px] font-bold text-[#299e60] hover:bg-green-50 transition-colors uppercase tracking-wide">
                                            Save as List
                                        </button>
                                        <div className="w-px h-7 bg-gray-100" />
                                        <button onClick={(e) => handleOrderAgain(order, e)}
                                            className="flex-1 py-3 text-center text-[11px] font-bold text-[#299e60] hover:bg-green-50 transition-colors uppercase tracking-wide">
                                            Reorder
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── RATING MODAL ── */}
            {ratingModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[18px] font-black text-[#181725]">Rate Your Order</h3>
                            <button onClick={() => setRatingModal(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            {[1,2,3,4,5].map(s => (
                                <button key={s} onClick={() => setSelectedStars(s)} className="transition-transform active:scale-90">
                                    <Star size={36} className={s <= selectedStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-none'} />
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-[13px] font-bold text-gray-400 mb-4">
                            {['Tap to rate','Very Poor','Poor','Average','Good','Excellent!'][selectedStars]}
                        </p>
                        <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)}
                            maxLength={200} placeholder="Add a comment (optional)..." rows={3}
                            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-[13px] text-[#181725] placeholder-gray-300 resize-none focus:outline-none focus:border-[#299e60] transition-colors mb-4" />
                        <button onClick={handleSubmitRating} disabled={selectedStars === 0 || isSubmittingRating}
                            className={cn('w-full py-3.5 rounded-2xl text-[14px] font-black flex items-center justify-center gap-2 transition-all',
                                selectedStars > 0 && !isSubmittingRating
                                    ? 'bg-[#299e60] text-white shadow-lg shadow-green-200/50 hover:bg-[#22844f]'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                            {isSubmittingRating ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Review'}
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
