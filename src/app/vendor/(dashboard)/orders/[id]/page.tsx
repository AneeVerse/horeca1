'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
    ChevronLeft, User, Package, MapPin, Loader2, AlertCircle, Clock,
    CheckCircle2, XCircle, Printer, ChevronRight, AlertTriangle,
    Truck, ClipboardList, Minus, Plus, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderUser {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    businessName: string | null;
}

interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    fulfilledQty: number;
    unitPrice: number;
    totalPrice: number;
    product?: {
        imageUrl: string | null;
        sku: string | null;
        hsn: string | null;
        unit: string | null;
        packSize: string | null;
        taxPercent: number;
    };
}

interface OrderPayment {
    id: string;
    amount: number;
    status: string;
    method: string | null;
    createdAt: string;
}

interface OrderData {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    promoDiscount: number;
    paymentMethod: string | null;
    paymentStatus: string;
    deliveryDate: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    acceptedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    deliveredAt: string | null;
    deliveryProofType: string | null;
    deliveryProofUrl: string | null;
    deliveryNotes: string | null;
    ewayBillNo: string | null;
    isPartial: boolean;
    user: OrderUser;
    items: OrderItem[];
    payments: OrderPayment[];
    deliverySlot: { dayOfWeek: string; slotStart: string; slotEnd: string } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'ready_for_dispatch', 'shipped', 'delivered'] as const;
const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft', pending: 'Pending Approval', confirmed: 'Accepted', processing: 'Packing',
    ready_for_dispatch: 'Ready for Dispatch', shipped: 'Out for Delivery',
    partially_delivered: 'Partially Delivered', delivered: 'Delivered',
    returned: 'Returned', cancelled: 'Cancelled',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(v: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);
}
function formatTime(t: string): string {
    const [hours, minutes] = t.split(':');
    const h = parseInt(hours, 10);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
}
function formatDateTime(dt: string): string {
    return new Date(dt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}
function getStatusIndex(status: string): number {
    return STATUS_FLOW.indexOf(status as typeof STATUS_FLOW[number]);
}

// ─── StatusTimeline ───────────────────────────────────────────────────────────

function StatusTimeline({ status, createdAt, acceptedAt }: {
    status: string; createdAt: string; acceptedAt: string | null;
}) {
    const currentIdx = getStatusIndex(status);

    if (status === 'cancelled') {
        return (
            <div className="bg-[#FFF0F0] border border-[#FFC9C9] rounded-[14px] p-4 flex items-center gap-3">
                <XCircle size={22} className="text-[#E74C3C] shrink-0" />
                <div>
                    <p className="text-[14px] font-bold text-[#E74C3C]">Order Cancelled</p>
                    <p className="text-[12px] text-[#7C7C7C]">Inventory has been released back to stock.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
            <div className="flex items-center justify-between relative">
                <div className="absolute top-[18px] left-[18px] right-[18px] h-[2px] bg-[#EEEEEE] -z-0" />
                <div
                    className="absolute top-[18px] left-[18px] h-[2px] bg-[#299E60] -z-0 transition-all duration-500"
                    style={{ width: currentIdx > 0 ? `${(currentIdx / (STATUS_FLOW.length - 1)) * 100}%` : '0%' }}
                />
                {STATUS_FLOW.map((step, idx) => {
                    const done = currentIdx > idx;
                    const current = currentIdx === idx;
                    const ts = idx === 0 ? createdAt : idx === 1 ? acceptedAt : null;
                    return (
                        <div key={step} className="flex flex-col items-center z-10 gap-1.5 min-w-0">
                            <div className={cn(
                                'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                                done ? 'bg-[#299E60] border-[#299E60]' :
                                    current ? 'bg-white border-[#299E60] ring-4 ring-[#299E60]/20' :
                                        'bg-white border-[#DDDDDD]'
                            )}>
                                {done ? <CheckCircle2 size={18} className="text-white" />
                                    : current ? <div className="w-3 h-3 rounded-full bg-[#299E60] animate-pulse" />
                                        : <div className="w-3 h-3 rounded-full bg-[#DDDDDD]" />}
                            </div>
                            <div className="text-center">
                                <p className={cn('text-[11px] font-bold', done || current ? 'text-[#181725]' : 'text-[#AEAEAE]')}>
                                    {STATUS_LABELS[step]}
                                </p>
                                {ts && (done || current) && (
                                    <p className="text-[10px] text-[#AEAEAE] whitespace-nowrap">
                                        {new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── ActionPanel ──────────────────────────────────────────────────────────────

function ActionPanel({ order, fulfilledQtys, adjustedTotal, isPartialAccept, onAction, onAccept }: {
    order: OrderData;
    fulfilledQtys: Record<string, number>;
    adjustedTotal: number;
    isPartialAccept: boolean;
    onAction: (status: string, reason?: string, proof?: { proofType?: string; proofUrl?: string; notes?: string }) => Promise<void>;
    onAccept: (qtys: Record<string, number>) => Promise<void>;
}) {
    const [rejecting, setRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showProofModal, setShowProofModal] = useState(false);
    const [proofType, setProofType] = useState<'otp' | 'photo' | 'notes' | 'none'>('none');
    const [proofNotes, setProofNotes] = useState('');
    const [busy, setBusy] = useState(false);
    const reasonRef = useRef<HTMLTextAreaElement>(null);

    const run = async (status: string, reason?: string, proof?: { proofType?: string; proofUrl?: string; notes?: string }) => {
        setBusy(true);
        try { await onAction(status, reason, proof); }
        finally { setBusy(false); }
    };
    const runAccept = async () => {
        setBusy(true);
        try { await onAccept(fulfilledQtys); }
        finally { setBusy(false); }
    };

    useEffect(() => { if (rejecting) reasonRef.current?.focus(); }, [rejecting]);

    if (order.status === 'delivered' || order.status === 'cancelled') return null;

    const hint =
        order.status === 'pending' ? (isPartialAccept ? 'Adjust fulfilled quantities below, then confirm.' : 'Accept in full or reduce quantities for partial fulfilment.') :
            order.status === 'confirmed' ? 'Mark as packed once items are ready in the warehouse.' :
                order.status === 'processing' ? 'Mark as dispatched once goods are handed to delivery.' :
                    'Confirm delivery once the customer has received the goods.';

    return (
        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-[#181725]">Actions</h3>
                <span className="text-[12px] text-[#AEAEAE] hidden sm:block">{hint}</span>
            </div>
            <div className="p-6">

                {/* Partial accept summary banner */}
                {order.status === 'pending' && isPartialAccept && (
                    <div className="mb-4 p-3 rounded-[10px] bg-[#FFF4E5] border border-[#F59E0B]/30 flex items-start gap-2.5">
                        <Info size={16} className="text-[#F59E0B] shrink-0 mt-0.5" />
                        <div className="text-[12px]">
                            <p className="font-bold text-[#976538]">Partial Fulfilment</p>
                            <p className="text-[#7C7C7C]">
                                You&apos;ve reduced quantities on some items. The customer will be notified.
                                Adjusted order value: <span className="font-bold text-[#181725]">{formatPrice(adjustedTotal)}</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Reject reason form */}
                {rejecting ? (
                    <div className="space-y-3">
                        <p className="text-[14px] font-bold text-[#181725]">Why are you rejecting this order?</p>
                        <textarea
                            ref={reasonRef}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Items out of stock, Delivery area not serviceable..."
                            rows={3}
                            className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-3 text-[14px] outline-none focus:border-[#E74C3C]/50 resize-none"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => run('cancelled', rejectReason)}
                                disabled={busy || rejectReason.trim().length < 3}
                                className={cn(
                                    'h-[44px] px-6 rounded-[10px] text-[14px] font-bold transition-all flex items-center gap-2',
                                    rejectReason.trim().length >= 3 && !busy
                                        ? 'bg-[#E74C3C] text-white hover:bg-[#c0392b]'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                )}
                            >
                                {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                Confirm Rejection
                            </button>
                            <button
                                onClick={() => { setRejecting(false); setRejectReason(''); }}
                                disabled={busy}
                                className="h-[44px] px-6 rounded-[10px] text-[14px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {/* Accept (pending) */}
                        {order.status === 'pending' && (
                            <button
                                onClick={runAccept}
                                disabled={busy}
                                className="h-[48px] px-8 rounded-[12px] bg-[#299E60] text-white text-[15px] font-bold hover:bg-[#238a54] transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                            >
                                {busy ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                {isPartialAccept ? 'Accept Partial Order' : 'Accept Order'}
                            </button>
                        )}
                        {/* Mark as Packed (confirmed) */}
                        {order.status === 'confirmed' && (
                            <button
                                onClick={() => run('processing')}
                                disabled={busy}
                                className="h-[48px] px-8 rounded-[12px] bg-[#F59E0B] text-white text-[15px] font-bold hover:bg-[#D97706] transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                            >
                                {busy ? <Loader2 size={18} className="animate-spin" /> : <ClipboardList size={18} />}
                                Mark as Packed
                            </button>
                        )}
                        {/* Mark as Dispatched (processing) */}
                        {order.status === 'processing' && (
                            <button
                                onClick={() => run('shipped')}
                                disabled={busy}
                                className="h-[48px] px-8 rounded-[12px] bg-[#3B82F6] text-white text-[15px] font-bold hover:bg-[#2563EB] transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                            >
                                {busy ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                                Mark as Dispatched
                            </button>
                        )}
                        {/* Confirm Delivery (shipped) — opens proof modal */}
                        {order.status === 'shipped' && (
                            <>
                                <button
                                    onClick={() => setShowProofModal(true)}
                                    disabled={busy}
                                    className="h-[48px] px-8 rounded-[12px] bg-[#299E60] text-white text-[15px] font-bold hover:bg-[#238a54] transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                                >
                                    {busy ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                    Confirm Delivery
                                </button>
                                {showProofModal && (
                                    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                                        <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[420px]">
                                            <div className="px-6 py-4 border-b border-[#F5F5F5]">
                                                <p className="text-[15px] font-bold text-[#181725]">Delivery Proof</p>
                                                <p className="text-[12px] text-[#AEAEAE]">Optional — record how delivery was confirmed</p>
                                            </div>
                                            <div className="p-6 space-y-4">
                                                <div>
                                                    <p className="text-[11px] font-bold text-[#7C7C7C] uppercase mb-2">Proof Type</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {(['none', 'otp', 'photo', 'notes'] as const).map(t => (
                                                            <button key={t} onClick={() => setProofType(t)}
                                                                className={cn('py-2.5 rounded-[10px] border text-[12px] font-semibold transition-colors',
                                                                    proofType === t ? 'border-[#299E60] bg-[#EEF8F1] text-[#299E60]' : 'border-[#EEEEEE] text-[#7C7C7C] hover:bg-[#F5F5F5]')}>
                                                                {t === 'none' ? 'No Proof' : t === 'otp' ? 'OTP Verified' : t === 'photo' ? 'Photo Taken' : 'Notes Only'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {(proofType === 'notes' || proofType === 'otp') && (
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-[#7C7C7C] uppercase mb-1">
                                                            {proofType === 'otp' ? 'OTP Code / Reference' : 'Delivery Notes'}
                                                        </label>
                                                        <input type="text" value={proofNotes} onChange={e => setProofNotes(e.target.value)}
                                                            placeholder={proofType === 'otp' ? 'Enter OTP used' : 'e.g. Left at reception'}
                                                            className="w-full h-[38px] px-3 rounded-[10px] border border-[#EEEEEE] text-[12px] outline-none focus:border-[#299E60]/50" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="px-6 py-4 border-t border-[#F5F5F5] flex gap-3 justify-end">
                                                <button onClick={() => setShowProofModal(false)}
                                                    className="h-[38px] px-4 rounded-[10px] border border-[#EEEEEE] text-[13px] text-[#7C7C7C] hover:bg-[#F5F5F5]">
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowProofModal(false);
                                                        run('delivered', undefined, {
                                                            proofType: proofType !== 'none' ? proofType : undefined,
                                                            notes: proofNotes.trim() || undefined,
                                                        });
                                                    }}
                                                    disabled={busy}
                                                    className="h-[38px] px-5 rounded-[10px] bg-[#299E60] text-white text-[13px] font-bold hover:bg-[#238a54] disabled:opacity-50 flex items-center gap-2">
                                                    {busy && <Loader2 size={12} className="animate-spin" />}
                                                    Confirm Delivery
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        {/* Reject / Cancel */}
                        {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'processing') && (
                            <button
                                onClick={() => setRejecting(true)}
                                disabled={busy}
                                className={cn(
                                    'h-[48px] px-6 rounded-[12px] text-[14px] font-bold transition-all flex items-center gap-2 disabled:opacity-60',
                                    order.status === 'pending'
                                        ? 'bg-[#FFF0F0] text-[#E74C3C] hover:bg-[#FFE0E0]'
                                        : 'bg-[#F5F5F5] text-[#7C7C7C] hover:bg-[#EEEEEE]'
                                )}
                            >
                                <XCircle size={16} />
                                {order.status === 'pending' ? 'Reject Order' : 'Cancel Order'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── PrintPicklist ────────────────────────────────────────────────────────────

function PrintPicklist({ order }: { order: OrderData }) {
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <>
            {/* Print media override — hide everything except #picklist */}
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #picklist { display: block !important; }
                }
            `}</style>

            <div id="picklist" className="hidden print:block font-mono text-[12px] text-black bg-white p-8">
                {/* Header */}
                <div className="border-b-2 border-black pb-3 mb-4">
                    <h1 className="text-[18px] font-bold tracking-tight">
                        PICK SLIP — {order.orderNumber}
                    </h1>
                    <div className="flex justify-between mt-1 text-[11px]">
                        <span>Date: {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        <span>Status: {STATUS_LABELS[order.status] ?? order.status}</span>
                    </div>
                </div>

                {/* Deliver To */}
                <div className="mb-4">
                    <p className="font-bold underline mb-1">Deliver To:</p>
                    <p>{order.user.fullName}</p>
                    {order.user.businessName && <p>{order.user.businessName}</p>}
                    {order.user.phone && <p>{order.user.phone}</p>}
                    {order.user.email && <p>{order.user.email}</p>}
                    {order.deliverySlot && (
                        <p className="mt-1">
                            Delivery Slot: {DAY_NAMES[Number(order.deliverySlot.dayOfWeek)] || `Day ${order.deliverySlot.dayOfWeek}`}
                            {' '}{formatTime(order.deliverySlot.slotStart)} – {formatTime(order.deliverySlot.slotEnd)}
                        </p>
                    )}
                    {order.deliveryDate && (
                        <p>Delivery Date: {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    )}
                </div>

                {/* Items table */}
                <table className="w-full border-collapse border border-black text-[11px] mb-4">
                    <thead>
                        <tr className="border border-black">
                            <th className="border border-black px-2 py-1 text-left w-6">#</th>
                            <th className="border border-black px-2 py-1 text-left">Product Name</th>
                            <th className="border border-black px-2 py-1 text-left w-20">SKU</th>
                            <th className="border border-black px-2 py-1 text-left w-20">Pack Size</th>
                            <th className="border border-black px-2 py-1 text-center w-14">Qty</th>
                            <th className="border border-black px-2 py-1 text-center w-16">✓ Picked</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, idx) => (
                            <tr key={item.id} className="border border-black">
                                <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                                <td className="border border-black px-2 py-1">{item.productName}</td>
                                <td className="border border-black px-2 py-1">{item.product?.sku ?? '—'}</td>
                                <td className="border border-black px-2 py-1">
                                    {item.product?.packSize
                                        ? `${item.product.packSize}${item.product.unit ? ` ${item.product.unit}` : ''}`
                                        : '—'}
                                </td>
                                <td className="border border-black px-2 py-1 text-center font-bold">{item.quantity}</td>
                                <td className="border border-black px-2 py-1 text-center">
                                    <div className="w-4 h-4 border border-black inline-block" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals row */}
                <div className="border border-black p-2 mb-6 text-[11px] flex gap-8">
                    <span>Total Items: <strong>{order.items.length}</strong></span>
                    <span>Total Qty: <strong>{totalQty}</strong></span>
                    <span>Order Value: <strong>{formatPrice(order.totalAmount)}</strong></span>
                </div>

                {/* Notes */}
                {order.notes && (
                    <div className="mb-4 text-[11px]">
                        <span className="font-bold">Customer Notes: </span>{order.notes}
                    </div>
                )}

                {/* Signature line */}
                <div className="border-t border-black pt-4 mt-6 grid grid-cols-3 gap-8 text-[11px]">
                    <div>
                        <p className="mb-6">Packed by:</p>
                        <div className="border-b border-black" />
                    </div>
                    <div>
                        <p className="mb-6">Date:</p>
                        <div className="border-b border-black" />
                    </div>
                    <div>
                        <p className="mb-6">Signature:</p>
                        <div className="border-b border-black" />
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fulfilledQtys, setFulfilledQtys] = useState<Record<string, number>>({});
    const [ewayBill, setEwayBill] = useState('');
    const [ewaySaving, setEwaySaving] = useState(false);

    const fetchOrder = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/vendor/orders/${orderId}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to load order');
            setOrder(json.data);
            setEwayBill(json.data.ewayBillNo ?? '');
            const init: Record<string, number> = {};
            for (const item of json.data.items as OrderItem[]) {
                init[item.id] = item.quantity;
            }
            setFulfilledQtys(init);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    // Derived state for partial-fulfilment indicators
    const isPartialAccept = order?.status === 'pending' && order.items.some(
        item => (fulfilledQtys[item.id] ?? item.quantity) < item.quantity
    );
    const adjustedTotal = order?.items.reduce((sum, item) => {
        const fulfilled = fulfilledQtys[item.id] ?? item.quantity;
        const proportion = item.quantity > 0 ? fulfilled / item.quantity : 0;
        return sum + Number(item.totalPrice) * proportion;
    }, 0) ?? 0;

    const handleAction = useCallback(async (
        status: string,
        reason?: string,
        proof?: { proofType?: string; proofUrl?: string; notes?: string }
    ) => {
        if (!order) return;
        try {
            const res = await fetch(`/api/v1/vendor/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, reason, proof }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Update failed');
            setOrder(prev => prev ? { ...prev, ...json.data } : prev);
            toast.success(
                status === 'cancelled' ? 'Order rejected. Inventory released.' :
                    status === 'delivered' ? 'Delivery confirmed!' :
                        `Order marked as ${STATUS_LABELS[status] ?? status}.`
            );
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Action failed');
            throw err;
        }
    }, [order, orderId]);

    const handleAccept = useCallback(async (qtys: Record<string, number>) => {
        if (!order) return;
        try {
            // Build items array for the API
            const items = order.items.map(item => ({
                itemId: item.id,
                fulfilledQty: qtys[item.id] ?? item.quantity,
            }));
            const res = await fetch(`/api/v1/vendor/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Accept failed');
            setOrder(prev => prev ? { ...prev, ...json.data } : prev);
            toast.success(
                isPartialAccept
                    ? 'Partial order accepted! Unfulfilled stock released.'
                    : 'Order accepted! Inventory reserved.'
            );
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Accept failed');
            throw err;
        }
    }, [order, orderId, isPartialAccept]);

    const saveEwayBill = async () => {
        if (!ewayBill.trim()) return;
        setEwaySaving(true);
        try {
            const res = await fetch(`/api/v1/vendor/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ewayBillNo: ewayBill.trim() }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Save failed');
            setOrder(prev => prev ? { ...prev, ewayBillNo: ewayBill.trim() } : prev);
            toast.success('E-Way Bill number saved.');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setEwaySaving(false);
        }
    };

    const setFulfilledQty = (itemId: string, qty: number, max: number) => {
        setFulfilledQtys(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(qty, max)) }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 size={36} className="animate-spin text-[#299E60]" />
            </div>
        );
    }
    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-[16px] font-bold text-[#7C7C7C]">{error || 'Order not found'}</p>
                <button onClick={() => router.back()} className="text-[14px] font-bold text-[#299E60] hover:underline">Go Back</button>
            </div>
        );
    }

    const isPending = order.status === 'pending';

    return (
        <div className="space-y-5 pb-12">

            {/* ── Header ───────────────────────────────────────── */}
            <div className="flex items-start justify-between print:hidden">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-full hover:bg-[#F1F4F9] flex items-center justify-center transition-colors"
                    >
                        <ChevronLeft size={20} className="text-[#181725]" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-[22px] font-bold text-[#181725]">{order.orderNumber}</h1>
                            {order.isPartial && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF4E5] text-[#976538]">Partial</span>
                            )}
                        </div>
                        <p className="text-[12px] text-[#AEAEAE]">Placed {formatDateTime(order.createdAt)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {(['confirmed', 'processing', 'shipped'] as const).includes(order.status as 'confirmed' | 'processing' | 'shipped') && (
                        <button
                            onClick={() => window.print()}
                            className="h-9 px-4 rounded-[10px] border border-[#EEEEEE] text-[13px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] flex items-center gap-1.5 transition-all"
                        >
                            <Printer size={15} />
                            Print Picklist
                        </button>
                    )}
                    <span className={cn(
                        'px-4 py-2 rounded-[10px] text-[13px] font-bold capitalize',
                        order.status === 'delivered' || order.status === 'confirmed' ? 'bg-[#EEF8F1] text-[#299E60]' :
                            order.status === 'processing' || order.status === 'pending' ? 'bg-[#FFF4E5] text-[#976538]' :
                                order.status === 'shipped' ? 'bg-blue-50 text-blue-600' :
                                    order.status === 'cancelled' ? 'bg-[#FFF0F0] text-[#E74C3C]' :
                                        'bg-gray-100 text-gray-600'
                    )}>
                        {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                </div>
            </div>

            {/* Print picklist — only rendered in DOM for confirmed/processing/shipped so
                the @media print style tag is present when the user prints */}
            {(['confirmed', 'processing', 'shipped'] as const).includes(order.status as 'confirmed' | 'processing' | 'shipped') && (
                <PrintPicklist order={order} />
            )}

            {/* ── Status Timeline ───────────────────────────────── */}
            <div className="print:hidden">
                <StatusTimeline status={order.status} createdAt={order.createdAt} acceptedAt={order.acceptedAt} />
            </div>

            {/* ── Action Panel ──────────────────────────────────── */}
            <div className="print:hidden">
                <ActionPanel
                    order={order}
                    fulfilledQtys={fulfilledQtys}
                    adjustedTotal={adjustedTotal}
                    isPartialAccept={!!isPartialAccept}
                    onAction={handleAction}
                    onAccept={handleAccept}
                />
            </div>

            {/* ── Delivery proof ────────────────────────────────── */}
            {order.status === 'delivered' && (order.deliveryProofType || order.deliveredAt) && (
                <div className="bg-[#EEF8F1] border border-[#299E60]/20 rounded-[14px] p-5 flex gap-3 print:hidden">
                    <CheckCircle2 size={18} className="text-[#299E60] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                        <p className="text-[13px] font-bold text-[#181725]">Delivery Confirmed</p>
                        {order.deliveredAt && (
                            <p className="text-[12px] text-[#7C7C7C]">
                                {new Date(order.deliveredAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                        {order.deliveryProofType && (
                            <p className="text-[12px] text-[#7C7C7C]">Proof: <span className="font-semibold capitalize">{order.deliveryProofType.replace('_', ' ')}</span></p>
                        )}
                        {order.deliveryNotes && (
                            <p className="text-[12px] text-[#7C7C7C]">{order.deliveryNotes}</p>
                        )}
                    </div>
                </div>
            )}

            {/* ── Rejection reason ──────────────────────────────── */}
            {order.status === 'cancelled' && order.rejectionReason && (
                <div className="bg-[#FFF8ED] border border-[#FFDCB3] rounded-[14px] p-5 flex gap-3 print:hidden">
                    <AlertTriangle size={18} className="text-[#F59E0B] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-bold text-[#181725]">Rejection Reason</p>
                        <p className="text-[13px] text-[#7C7C7C] mt-0.5">{order.rejectionReason}</p>
                    </div>
                </div>
            )}

            {/* ── Info cards ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <User size={16} className="text-[#299E60]" />
                        <h3 className="text-[14px] font-bold text-[#181725]">Customer</h3>
                    </div>
                    <div className="space-y-1.5 text-[13px]">
                        <p className="font-bold text-[#181725]">{order.user.fullName}</p>
                        {order.user.businessName && <p className="text-[#7C7C7C]">{order.user.businessName}</p>}
                        <p className="text-[#7C7C7C]">{order.user.email}</p>
                        {order.user.phone && <p className="text-[#7C7C7C]">{order.user.phone}</p>}
                    </div>
                </div>

                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin size={16} className="text-[#3B82F6]" />
                        <h3 className="text-[14px] font-bold text-[#181725]">Delivery</h3>
                    </div>
                    <div className="space-y-1.5 text-[13px]">
                        {order.deliverySlot && (
                            <div className="flex items-center gap-1.5">
                                <Clock size={13} className="text-[#3B82F6]" />
                                <span className="font-bold">{DAY_NAMES[Number(order.deliverySlot.dayOfWeek)] || `Day ${order.deliverySlot.dayOfWeek}`}</span>
                                <span className="text-[#7C7C7C]">{formatTime(order.deliverySlot.slotStart)} – {formatTime(order.deliverySlot.slotEnd)}</span>
                            </div>
                        )}
                        {order.deliveryDate && (
                            <p className="text-[#7C7C7C]">Date: <span className="font-bold text-[#181725]">
                                {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span></p>
                        )}
                        {order.paymentMethod && (
                            <p className="text-[#7C7C7C]">Payment: <span className="capitalize font-bold text-[#181725]">{order.paymentMethod}</span></p>
                        )}
                        {/* E-Way Bill */}
                        {(order.status === 'processing' || order.status === 'shipped') && (
                            <div className="mt-2 pt-2 border-t border-[#F5F5F5]">
                                <p className="text-[11px] font-bold text-[#7C7C7C] uppercase mb-1">E-Way Bill No.</p>
                                {order.ewayBillNo && !['processing'].includes(order.status) ? (
                                    <p className="text-[13px] font-bold text-[#181725]">{order.ewayBillNo}</p>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={ewayBill}
                                            onChange={e => setEwayBill(e.target.value)}
                                            placeholder="Enter E-Way Bill no."
                                            className="flex-1 h-[32px] px-2.5 rounded-[8px] border border-[#EEEEEE] text-[12px] outline-none focus:border-[#299E60]/50"
                                        />
                                        <button
                                            onClick={saveEwayBill}
                                            disabled={ewaySaving || !ewayBill.trim()}
                                            className="h-[32px] px-3 rounded-[8px] bg-[#299E60] text-white text-[11px] font-bold disabled:opacity-40"
                                        >
                                            {ewaySaving ? '...' : 'Save'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {order.ewayBillNo && order.status === 'delivered' && (
                            <p className="text-[#7C7C7C]">E-Way Bill: <span className="font-bold text-[#181725]">{order.ewayBillNo}</span></p>
                        )}
                        {!order.deliverySlot && !order.deliveryDate && <p className="text-[#AEAEAE]">No delivery details set</p>}
                    </div>
                </div>

                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Package size={16} className="text-[#8B5CF6]" />
                        <h3 className="text-[14px] font-bold text-[#181725]">Payment</h3>
                    </div>
                    <div className="space-y-1.5 text-[13px]">
                        <div className="flex justify-between">
                            <span className="text-[#7C7C7C]">Status</span>
                            <span className={cn('font-bold capitalize', order.paymentStatus === 'paid' ? 'text-[#299E60]' : 'text-[#976538]')}>
                                {order.paymentStatus}
                            </span>
                        </div>
                        {order.promoDiscount > 0 && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-[#7C7C7C]">Subtotal</span>
                                    <span className="font-semibold text-[#181725]">{formatPrice(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#299E60]">Promo Discount</span>
                                    <span className="font-bold text-[#299E60]">−{formatPrice(order.promoDiscount)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between">
                            <span className="text-[#7C7C7C]">Order Total</span>
                            <span className="font-bold text-[#181725]">{formatPrice(order.totalAmount)}</span>
                        </div>
                        {isPartialAccept && (
                            <div className="flex justify-between text-[#976538]">
                                <span>Adjusted Total</span>
                                <span className="font-bold">{formatPrice(adjustedTotal)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Items Table ───────────────────────────────────── */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
                    <h3 className="text-[16px] font-bold text-[#181725]">
                        Order Items <span className="text-[#AEAEAE] font-normal">({order.items.length})</span>
                    </h3>
                    {isPending && (
                        <span className="text-[11px] text-[#AEAEAE] hidden sm:block">
                            Adjust &quot;Fulfil&quot; qty to ship less than ordered
                        </span>
                    )}
                    <ChevronRight size={16} className="text-[#AEAEAE] print:hidden" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                <th className="px-5 py-3 text-left text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Product</th>
                                <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">SKU / HSN</th>
                                <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Unit Price</th>
                                <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Ordered</th>
                                {isPending && (
                                    <th className="px-5 py-3 text-center text-[11px] font-bold text-[#976538] uppercase tracking-wide">Fulfil</th>
                                )}
                                <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide print:hidden">GST</th>
                                <th className="px-5 py-3 text-right text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide">Total</th>
                                <th className="px-5 py-3 text-center text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wide hidden print:table-cell">✓</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F5F5F5]">
                            {order.items.map((item) => {
                                const taxPct = Number(item.product?.taxPercent ?? 0);
                                const itemGST = taxPct > 0
                                    ? Number(item.totalPrice) - (Number(item.totalPrice) / (1 + taxPct / 100))
                                    : 0;
                                const fulfilled = isPending ? (fulfilledQtys[item.id] ?? item.quantity) : item.fulfilledQty;
                                const isReduced = isPending && fulfilled < item.quantity;
                                const isSkipped = isPending && fulfilled === 0;

                                return (
                                    <tr key={item.id} className={cn(
                                        'hover:bg-[#FAFAFA]',
                                        isSkipped && isPending ? 'opacity-40' : ''
                                    )}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                {item.product?.imageUrl ? (
                                                    <div className="w-10 h-10 rounded-[8px] overflow-hidden bg-[#F1F4F9] shrink-0 relative print:hidden">
                                                        <Image src={item.product.imageUrl} alt={item.productName} fill className="object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-[8px] bg-[#F1F4F9] shrink-0 flex items-center justify-center print:hidden">
                                                        <Package size={16} className="text-[#AEAEAE]" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[13px] font-bold text-[#181725]">{item.productName}</p>
                                                    {item.product?.packSize && (
                                                        <p className="text-[11px] text-[#7C7C7C]">
                                                            {item.product.packSize}{item.product.unit ? ` · ${item.product.unit}` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="text-[11px] text-[#7C7C7C]">
                                                {item.product?.sku && <p className="font-medium">{item.product.sku}</p>}
                                                {item.product?.hsn && <p>HSN: {item.product.hsn}</p>}
                                                {!item.product?.sku && !item.product?.hsn && <span className="text-[#DDDDDD]">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center text-[13px] text-[#7C7C7C]">
                                            {formatPrice(item.unitPrice)}
                                        </td>
                                        <td className="px-5 py-4 text-center text-[14px] font-bold text-[#181725]">
                                            {item.quantity}
                                        </td>

                                        {/* Fulfil qty editor — only visible on pending orders */}
                                        {isPending && (
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => setFulfilledQty(item.id, (fulfilledQtys[item.id] ?? item.quantity) - 1, item.quantity)}
                                                        className="w-7 h-7 rounded-[6px] border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F5F5F5] text-[#7C7C7C] transition-colors"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={item.quantity}
                                                        value={fulfilledQtys[item.id] ?? item.quantity}
                                                        onChange={(e) => setFulfilledQty(item.id, parseInt(e.target.value) || 0, item.quantity)}
                                                        className={cn(
                                                            'w-12 h-7 text-center text-[13px] font-bold rounded-[6px] border outline-none',
                                                            isSkipped ? 'border-[#E74C3C] text-[#E74C3C] bg-[#FFF0F0]' :
                                                                isReduced ? 'border-[#F59E0B] text-[#976538] bg-[#FFF4E5]' :
                                                                    'border-[#299E60] text-[#299E60] bg-[#F0FBF5]'
                                                        )}
                                                    />
                                                    <button
                                                        onClick={() => setFulfilledQty(item.id, (fulfilledQtys[item.id] ?? item.quantity) + 1, item.quantity)}
                                                        className="w-7 h-7 rounded-[6px] border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F5F5F5] text-[#7C7C7C] transition-colors"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                                {isReduced && !isSkipped && (
                                                    <p className="text-[10px] text-[#976538] mt-0.5">of {item.quantity}</p>
                                                )}
                                                {isSkipped && (
                                                    <p className="text-[10px] text-[#E74C3C] mt-0.5">skipped</p>
                                                )}
                                            </td>
                                        )}

                                        <td className="px-5 py-4 text-center text-[11px] text-[#7C7C7C] print:hidden">
                                            {taxPct > 0 ? (
                                                <div><p className="font-medium">{taxPct}%</p><p>{formatPrice(itemGST)}</p></div>
                                            ) : <span className="text-[#DDDDDD]">—</span>}
                                        </td>
                                        <td className="px-5 py-4 text-right text-[13px] font-bold text-[#181725]">
                                            {isPending && isReduced
                                                ? <div>
                                                    <p className="text-[#976538]">{formatPrice(Number(item.totalPrice) * (fulfilled / item.quantity))}</p>
                                                    <p className="text-[11px] text-[#AEAEAE] line-through">{formatPrice(item.totalPrice)}</p>
                                                </div>
                                                : formatPrice(item.totalPrice)
                                            }
                                        </td>
                                        <td className="px-5 py-4 text-center hidden print:table-cell">
                                            <div className="w-5 h-5 border-2 border-gray-400 rounded inline-block" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div className="px-6 py-5 border-t border-[#EEEEEE] flex flex-col items-end gap-2">
                    {isPending && isPartialAccept ? (
                        <>
                            <div className="flex gap-10 text-[13px]">
                                <span className="text-[#AEAEAE] line-through">Original Total</span>
                                <span className="text-[#AEAEAE] line-through w-28 text-right">{formatPrice(order.totalAmount)}</span>
                            </div>
                            <div className="flex gap-10 text-[15px] pt-2 border-t border-[#EEEEEE] mt-1">
                                <span className="font-bold text-[#976538]">Adjusted Total</span>
                                <span className="font-[900] text-[#976538] w-28 text-right">{formatPrice(adjustedTotal)}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex gap-10 text-[13px]">
                                <span className="text-[#7C7C7C]">Subtotal</span>
                                <span className="font-bold text-[#181725] w-28 text-right">{formatPrice(order.subtotal)}</span>
                            </div>
                            {Number(order.taxAmount) > 0 && (
                                <div className="flex gap-10 text-[13px]">
                                    <span className="text-[#7C7C7C]">GST / Tax</span>
                                    <span className="font-bold text-[#181725] w-28 text-right">{formatPrice(Number(order.taxAmount))}</span>
                                </div>
                            )}
                            <div className="flex gap-10 text-[15px] pt-2 border-t border-[#EEEEEE] mt-1">
                                <span className="font-bold text-[#181725]">Total</span>
                                <span className="font-[900] text-[#299E60] w-28 text-right">{formatPrice(order.totalAmount)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Customer Notes ────────────────────────────────── */}
            {order.notes && (
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-5">
                    <h3 className="text-[14px] font-bold text-[#181725] mb-2">Customer Notes</h3>
                    <p className="text-[13px] text-[#7C7C7C]">{order.notes}</p>
                </div>
            )}
        </div>
    );
}
