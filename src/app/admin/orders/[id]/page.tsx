'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, User, Package, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderVendor {
    id: string;
    businessName: string;
    slug: string;
    logoUrl: string | null;
}

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
    unitPrice: number;
    totalPrice: number;
}

interface OrderPayment {
    id: string;
    amount: number;
    currency: string;
    status: string;
    method: string | null;
    razorpayPaymentId: string | null;
    createdAt: string;
}

interface DeliverySlot {
    id: string;
    dayOfWeek: string;
    slotStart: string;
    slotEnd: string;
}

interface CreditTxn {
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    createdAt: string;
}

interface OrderData {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    deliveryFee: number;
    totalAmount: number;
    paymentStatus: string;
    deliveryAddress: string | null;
    deliveryPincode: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    vendor: OrderVendor;
    user: OrderUser;
    items: OrderItem[];
    payments: OrderPayment[];
    deliverySlot: DeliverySlot | null;
    creditTxns: CreditTxn[];
}

const ORDER_STATUSES = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
] as const;

function getStatusBadgeClasses(status: string): string {
    switch (status) {
        case 'delivered':
        case 'confirmed':
            return 'bg-[#EEF8F1] text-[#299E60]';
        case 'processing':
        case 'pending':
            return 'bg-[#FFF4E5] text-[#976538]';
        case 'shipped':
            return 'bg-[#E8F0FE] text-[#1A56DB]';
        case 'cancelled':
            return 'bg-[#FEE8E8] text-[#C53030]';
        default:
            return 'bg-[#F3F4F6] text-[#6B7280]';
    }
}

function getPaymentStatusBadgeClasses(status: string): string {
    switch (status) {
        case 'paid':
            return 'bg-[#EEF8F1] text-[#299E60]';
        case 'pending':
            return 'bg-[#FFF4E5] text-[#976538]';
        case 'failed':
            return 'bg-[#FEE8E8] text-[#C53030]';
        default:
            return 'bg-[#F3F4F6] text-[#6B7280]';
    }
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    // Ops: edit line quantities on a pending order (Req 7 / P0-2).
    const [editedQty, setEditedQty] = useState<Record<string, number>>({});
    const [savingQty, setSavingQty] = useState(false);
    // Ops: split + reassign (pending only).
    const [splitQty, setSplitQty] = useState<Record<string, number>>({});
    const [reassignTo, setReassignTo] = useState('');
    const [vendorOptions, setVendorOptions] = useState<{ id: string; businessName: string }[]>([]);
    const [opsBusy, setOpsBusy] = useState(false);

    useEffect(() => {
        fetch('/api/v1/admin/vendors?limit=200')
            .then((r) => r.json())
            .then((j) => {
                const list = (j?.data?.vendors ?? j?.data ?? []) as { id: string; businessName: string }[];
                setVendorOptions(list.map((v) => ({ id: v.id, businessName: v.businessName })));
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        async function fetchOrder() {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`/api/v1/admin/orders/${orderId}`);
                if (!res.ok) {
                    throw new Error(`Failed to fetch order (${res.status})`);
                }
                const json = await res.json();
                if (!json.success) {
                    throw new Error(json.message || 'Failed to fetch order');
                }
                setOrder(json.data);
                setSelectedStatus(json.data.status);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong');
            } finally {
                setLoading(false);
            }
        }

        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    async function handleStatusUpdate() {
        if (!order || selectedStatus === order.status) return;

        try {
            setUpdatingStatus(true);
            const res = await fetch(`/api/v1/admin/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: selectedStatus }),
            });

            if (!res.ok) {
                throw new Error(`Failed to update status (${res.status})`);
            }

            const json = await res.json();
            if (!json.success) {
                throw new Error(json.message || 'Failed to update status');
            }

            setOrder((prev) => (prev ? { ...prev, status: selectedStatus } : prev));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update status');
            setSelectedStatus(order.status);
        } finally {
            setUpdatingStatus(false);
        }
    }

    async function handleSaveQuantities() {
        if (!order) return;
        const lines = order.items
            .map((i) => ({ itemId: i.id, quantity: editedQty[i.id] ?? i.quantity }))
            .filter((l) => l.quantity !== order.items.find((i) => i.id === l.itemId)?.quantity);
        if (lines.length === 0) { toast.message('No quantity changes to save'); return; }
        try {
            setSavingQty(true);
            const res = await fetch(`/api/v1/admin/orders/${orderId}/modify`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lines }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error?.message || json.message || 'Failed to modify order');
            toast.success('Order quantities updated');
            window.location.reload();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to modify order');
        } finally {
            setSavingQty(false);
        }
    }

    async function handleSplit() {
        if (!order) return;
        const lines = order.items.map((i) => ({ itemId: i.id, quantity: splitQty[i.id] || 0 })).filter((l) => l.quantity > 0);
        if (lines.length === 0) { toast.message('Enter quantities to split off'); return; }
        try {
            setOpsBusy(true);
            const res = await fetch(`/api/v1/admin/orders/${orderId}/split`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error?.message || json.message || 'Failed to split order');
            toast.success(`Split into ${json.data?.childOrderNumber ?? 'a new order'}`);
            window.location.reload();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to split order');
        } finally { setOpsBusy(false); }
    }

    async function handleReassign() {
        if (!order || !reassignTo) return;
        try {
            setOpsBusy(true);
            const res = await fetch(`/api/v1/admin/orders/${orderId}/reassign`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newVendorId: reassignTo }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error?.message || json.message || 'Failed to reassign order');
            toast.success('Order reassigned');
            window.location.reload();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to reassign order');
        } finally { setOpsBusy(false); }
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#299E60]" />
            </div>
        );
    }

    // Error state
    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-[15px] font-medium text-[#4B4B4B]">{error || 'Order not found'}</p>
                <button
                    onClick={() => router.back()}
                    className="text-[14px] font-medium text-[#299E60] hover:underline"
                >
                    Go back
                </button>
            </div>
        );
    }

    const paymentMethod = order.payments.length > 0 ? order.payments[0].method : null;

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link
                            href="/admin/orders"
                            className="w-[36px] h-[36px] rounded-full bg-white border border-[#DCDCDC] flex items-center justify-center hover:bg-[#F5F5F5] transition-colors"
                        >
                            <ChevronLeft size={18} className="text-[#4B4B4B]" />
                        </Link>
                        <h1 className="text-[28px] font-bold text-[#000000] leading-none">Order Details</h1>
                    </div>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70 ml-[48px]">
                        {order.orderNumber}
                    </p>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white p-10 md:p-14 rounded-[12px] border border-[#DCDCDC] shadow-sm max-w-[1100px]">
                {/* Order Top Header */}
                <div className="mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <p className="text-[14px] font-medium text-[#7C7C7C] mb-1">{formatDate(order.createdAt)}</p>
                        <p className="text-[14px] font-bold text-[#181725]">Order: {order.orderNumber}</p>
                    </div>
                    <span
                        className={cn(
                            'inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wide w-fit',
                            getStatusBadgeClasses(order.status)
                        )}
                    >
                        {order.status}
                    </span>
                </div>

                {/* Info Triple Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
                    {/* Customer */}
                    <div className="flex gap-4">
                        <div className="w-[52px] h-[52px] bg-[#EEF8F1] rounded-full shrink-0 flex items-center justify-center">
                            <User size={22} className="text-[#299E60]" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-[18px] font-bold text-[#181725]">Customer</h4>
                            <div className="text-[14px] text-[#4B4B4B] font-medium space-y-1 pt-1">
                                <p>{order.user.fullName}</p>
                                <p>{order.user.email}</p>
                                {order.user.phone && <p>{order.user.phone}</p>}
                                {order.user.businessName && (
                                    <p className="text-[#7C7C7C]">{order.user.businessName}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Info */}
                    <div className="flex gap-4">
                        <div className="w-[52px] h-[52px] bg-[#EEF8F1] rounded-full shrink-0 flex items-center justify-center">
                            <Package size={22} className="text-[#299E60]" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-[18px] font-bold text-[#181725]">Order Info</h4>
                            <div className="text-[14px] text-[#4B4B4B] font-medium space-y-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#7C7C7C]">Status:</span>
                                    <span
                                        className={cn(
                                            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase',
                                            getStatusBadgeClasses(order.status)
                                        )}
                                    >
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#7C7C7C]">Payment:</span>
                                    <span
                                        className={cn(
                                            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase',
                                            getPaymentStatusBadgeClasses(order.paymentStatus)
                                        )}
                                    >
                                        {order.paymentStatus}
                                    </span>
                                </div>
                                {paymentMethod && (
                                    <p>
                                        <span className="text-[#7C7C7C]">Method:</span> {paymentMethod}
                                    </p>
                                )}
                                {order.vendor && (
                                    <p>
                                        <span className="text-[#7C7C7C]">Vendor:</span> {order.vendor.businessName}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Deliver To */}
                    <div className="flex gap-4">
                        <div className="w-[52px] h-[52px] bg-[#EEF8F1] rounded-full shrink-0 flex items-center justify-center">
                            <MapPin size={22} className="text-[#299E60]" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-[18px] font-bold text-[#181725]">Deliver To</h4>
                            <div className="text-[14px] text-[#4B4B4B] font-medium space-y-1 pt-1">
                                {order.deliveryAddress && <p>{order.deliveryAddress}</p>}
                                {order.deliveryPincode && (
                                    <p>
                                        <span className="text-[#7C7C7C]">Pincode:</span> {order.deliveryPincode}
                                    </p>
                                )}
                                {order.deliverySlot && (
                                    <p className="text-[#7C7C7C] text-[13px]">
                                        Slot: {order.deliverySlot.dayOfWeek} {order.deliverySlot.slotStart} - {order.deliverySlot.slotEnd}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto mb-10">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="h-[52px] border-b border-[#EEEEEE]">
                                <th className="text-left text-[14px] font-bold text-[#181725] pb-4">Product</th>
                                <th className="text-left text-[14px] font-bold text-[#181725] pb-4">Unit Price</th>
                                <th className="text-center text-[14px] font-bold text-[#181725] pb-4">Quantity</th>
                                <th className="text-right text-[14px] font-bold text-[#181725] pb-4">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item) => (
                                <tr key={item.id} className="group">
                                    <td className="py-6 border-t border-[#EEEEEE]">
                                        <span className="text-[15px] font-bold text-[#181725]">
                                            {item.productName}
                                        </span>
                                    </td>
                                    <td className="py-6 border-t border-[#EEEEEE] text-[15px] font-bold text-[#181725]">
                                        {formatCurrency(item.unitPrice)}
                                    </td>
                                    <td className="py-6 border-t border-[#EEEEEE] text-[15px] font-bold text-[#181725] text-center">
                                        {order.status === 'pending' ? (
                                            <input
                                                type="number"
                                                min={0}
                                                value={editedQty[item.id] ?? item.quantity}
                                                onChange={(e) => setEditedQty((prev) => ({ ...prev, [item.id]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                                                className="w-16 text-center border border-gray-200 rounded-md py-1"
                                            />
                                        ) : item.quantity}
                                    </td>
                                    <td className="py-6 border-t border-[#EEEEEE] text-[15px] font-bold text-[#181725] text-right">
                                        {formatCurrency(item.totalPrice)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Ops: modify quantities (pending only) — P0-2 */}
                {order.status === 'pending' && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <p className="text-[12px] text-amber-800 font-medium">Ops: edit quantities above (0 removes a line), then save. Available only while pending. Split &amp; vendor-reassign are available via the API.</p>
                        <button onClick={handleSaveQuantities} disabled={savingQty} className="bg-[#299e60] text-white text-[13px] font-bold px-4 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap">
                            {savingQty ? 'Saving…' : 'Save quantity changes'}
                        </button>
                    </div>
                )}

                {/* Ops: split + reassign (pending only) — P0-2 */}
                {order.status === 'pending' && (
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                            <p className="text-[13px] font-bold text-[#181725] mb-1">Split order</p>
                            <p className="text-[11px] text-gray-500 mb-3">Move quantities into a new PO (same vendor).</p>
                            <div className="space-y-2 max-h-44 overflow-auto">
                                {order.items.map((i) => (
                                    <div key={i.id} className="flex items-center justify-between gap-2">
                                        <span className="text-[12px] text-[#4B4B4B] truncate">{i.productName} <span className="text-gray-400">(have {i.quantity})</span></span>
                                        <input type="number" min={0} max={i.quantity} value={splitQty[i.id] || 0}
                                            onChange={(e) => setSplitQty((p) => ({ ...p, [i.id]: Math.max(0, Math.min(i.quantity, parseInt(e.target.value, 10) || 0)) }))}
                                            className="w-16 text-center border border-gray-200 rounded-md py-1 text-[12px]" />
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleSplit} disabled={opsBusy} className="mt-3 bg-[#181725] text-white text-[12px] font-bold px-3 py-2 rounded-lg disabled:opacity-50">Create split order</button>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                            <p className="text-[13px] font-bold text-[#181725] mb-1">Reassign vendor</p>
                            <p className="text-[11px] text-gray-500 mb-3">Move to another vendor that carries these items (matched by master SKU).</p>
                            <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className="w-full border border-gray-200 rounded-md py-2 px-2 text-[12px]">
                                <option value="">Select vendor…</option>
                                {vendorOptions.filter((v) => v.id !== order.vendor?.id).map((v) => (
                                    <option key={v.id} value={v.id}>{v.businessName}</option>
                                ))}
                            </select>
                            <button onClick={handleReassign} disabled={opsBusy || !reassignTo} className="mt-3 bg-[#181725] text-white text-[12px] font-bold px-3 py-2 rounded-lg disabled:opacity-50">Reassign</button>
                        </div>
                    </div>
                )}

                {/* Summary Section */}
                <div className="border-t border-[#EEEEEE] pt-8 flex justify-end">
                    <div className="w-full max-w-[320px] space-y-3">
                        <div className="flex justify-between text-[14px] font-medium">
                            <span className="text-[#7C7C7C]">Subtotal</span>
                            <span className="text-[#181725] font-bold">{formatCurrency(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[14px] font-medium pb-4 border-b border-dotted border-[#DCDCDC]">
                            <span className="text-[#7C7C7C]">Delivery Fee</span>
                            <span className="text-[#181725] font-bold">{formatCurrency(order.deliveryFee || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-[16px] font-bold text-[#181725]">Grand Total</span>
                            <span className="text-[24px] font-bold text-[#181725]">{formatCurrency(order.totalAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {order.notes && (
                    <div className="mt-10 pt-8 border-t border-[#EEEEEE]">
                        <h4 className="text-[16px] font-bold text-[#181725] mb-2">Notes</h4>
                        <p className="text-[14px] text-[#4B4B4B] font-medium">{order.notes}</p>
                    </div>
                )}

                {/* Credit Transactions */}
                {order.creditTxns.length > 0 && (
                    <div className="mt-10 pt-8 border-t border-[#EEEEEE]">
                        <h4 className="text-[16px] font-bold text-[#181725] mb-4">Credit Transactions</h4>
                        <div className="space-y-2">
                            {order.creditTxns.map((txn) => (
                                <div
                                    key={txn.id}
                                    className="flex items-center justify-between text-[14px] font-medium py-2 border-b border-[#F5F5F5] last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={cn(
                                                'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase',
                                                txn.type === 'credit'
                                                    ? 'bg-[#EEF8F1] text-[#299E60]'
                                                    : 'bg-[#FEE8E8] text-[#C53030]'
                                            )}
                                        >
                                            {txn.type}
                                        </span>
                                        <span className="text-[#7C7C7C]">{formatDate(txn.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[#181725] font-bold">{formatCurrency(txn.amount)}</span>
                                        <span className="text-[#7C7C7C] text-[12px]">
                                            Bal: {formatCurrency(txn.balanceAfter)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status Update Section */}
                <div className="mt-10 pt-8 border-t border-[#EEEEEE]">
                    <h4 className="text-[16px] font-bold text-[#181725] mb-4">Update Status</h4>
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            disabled={updatingStatus}
                            className="h-[42px] px-4 bg-white border border-[#DCDCDC] rounded-[10px] text-[14px] font-medium text-[#181725] outline-none focus:border-[#299E60]/40 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleStatusUpdate}
                            disabled={updatingStatus || selectedStatus === order.status}
                            className={cn(
                                'h-[42px] px-6 rounded-[10px] text-[14px] font-bold transition-all',
                                selectedStatus === order.status
                                    ? 'bg-[#E0E0E0] text-[#AEAEAE] cursor-not-allowed'
                                    : 'bg-[#299E60] text-white hover:bg-[#238A52] cursor-pointer'
                            )}
                        >
                            {updatingStatus ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Update'
                            )}
                        </button>
                        {selectedStatus !== order.status && (
                            <span className="text-[12px] text-[#7C7C7C] font-medium">
                                {order.status} &rarr; {selectedStatus}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
