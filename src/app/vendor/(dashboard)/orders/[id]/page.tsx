'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, User, Package, MapPin, Loader2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
    paymentMethod: string | null;
    paymentStatus: string;
    deliveryDate: string | null;
    notes: string | null;
    createdAt: string;
    user: OrderUser;
    items: OrderItem[];
    payments: OrderPayment[];
    deliverySlot: { dayOfWeek: string; slotStart: string; slotEnd: string } | null;
}

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getStatusStyle(status: string): string {
    switch (status) {
        case 'delivered': case 'confirmed': return 'bg-[#EEF8F1] text-[#299E60]';
        case 'processing': case 'pending': return 'bg-[#FFF4E5] text-[#976538]';
        case 'shipped': return 'bg-blue-50 text-blue-600';
        case 'cancelled': return 'bg-[#FFF0F0] text-[#E74C3C]';
        default: return 'bg-gray-100 text-gray-600';
    }
}

function formatPrice(v: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);
}

function formatTime(t: string): string {
    const [hours, minutes] = t.split(':');
    const h = parseInt(hours, 10);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function VendorOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newStatus, setNewStatus] = useState('');
    const [updating, setUpdating] = useState(false);

    const fetchOrder = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/vendor/orders/${orderId}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to load order');
            setOrder(json.data);
            setNewStatus(json.data.status);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    const handleUpdateStatus = async () => {
        if (!order || newStatus === order.status || updating) return;
        try {
            setUpdating(true);
            const res = await fetch(`/api/v1/vendor/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to update');
            setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setUpdating(false);
        }
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

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="hover:text-[#299E60] transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-[24px] font-bold text-[#181725]">Order {order.orderNumber}</h1>
                        <p className="text-[13px] text-[#7C7C7C]">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                <span className={cn('px-4 py-2 rounded-[10px] text-[14px] font-bold capitalize', getStatusStyle(order.status))}>
                    {order.status}
                </span>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Customer */}
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <User size={18} className="text-[#299E60]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Customer</h3>
                    </div>
                    <div className="space-y-2 text-[14px]">
                        <p className="font-bold text-[#181725]">{order.user.fullName}</p>
                        {order.user.businessName && <p className="text-[#7C7C7C]">{order.user.businessName}</p>}
                        <p className="text-[#7C7C7C]">{order.user.email}</p>
                        {order.user.phone && <p className="text-[#7C7C7C]">{order.user.phone}</p>}
                    </div>
                </div>

                {/* Delivery */}
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin size={18} className="text-[#3B82F6]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Delivery</h3>
                    </div>
                    <div className="space-y-2 text-[14px]">
                        {order.deliverySlot && (
                            <div className="flex items-center gap-1.5 text-[#181725]">
                                <Clock size={14} className="text-[#3B82F6]" />
                                <span className="font-bold">{DAY_NAMES[Number(order.deliverySlot.dayOfWeek)] || `Day ${order.deliverySlot.dayOfWeek}`}</span>
                                <span className="text-[#7C7C7C]">{formatTime(order.deliverySlot.slotStart)} - {formatTime(order.deliverySlot.slotEnd)}</span>
                            </div>
                        )}
                        {order.deliveryDate && (
                            <p className="text-[#7C7C7C]">
                                Delivery Date: {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                        )}
                        {order.paymentMethod && (
                            <p className="text-[#7C7C7C]">Payment: <span className="capitalize font-bold text-[#181725]">{order.paymentMethod}</span></p>
                        )}
                        {!order.deliverySlot && !order.deliveryDate && (
                            <p className="text-[#AEAEAE]">No delivery details set</p>
                        )}
                    </div>
                </div>

                {/* Payment */}
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Package size={18} className="text-[#8B5CF6]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Payment</h3>
                    </div>
                    <div className="space-y-2 text-[14px]">
                        <div className="flex justify-between">
                            <span className="text-[#7C7C7C]">Status</span>
                            <span className={cn('font-bold capitalize', order.paymentStatus === 'paid' ? 'text-[#299E60]' : 'text-[#976538]')}>
                                {order.paymentStatus}
                            </span>
                        </div>
                        {order.payments[0]?.method && (
                            <div className="flex justify-between">
                                <span className="text-[#7C7C7C]">Method</span>
                                <span className="font-bold text-[#181725] capitalize">{order.payments[0].method}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#EEEEEE]">
                    <h3 className="text-[18px] font-bold text-[#181725]">Order Items ({order.items.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#FAFAFA] border-b border-[#EEEEEE]">
                                <th className="px-6 py-3 text-left text-[12px] font-bold text-[#AEAEAE] uppercase">Product</th>
                                <th className="px-6 py-3 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">SKU / HSN</th>
                                <th className="px-6 py-3 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Unit Price</th>
                                <th className="px-6 py-3 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">Qty</th>
                                <th className="px-6 py-3 text-center text-[12px] font-bold text-[#AEAEAE] uppercase">GST</th>
                                <th className="px-6 py-3 text-right text-[12px] font-bold text-[#AEAEAE] uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F5F5F5]">
                            {order.items.map((item) => {
                                const taxPct = Number(item.product?.taxPercent ?? 0);
                                const itemGST = taxPct > 0 ? Number(item.totalPrice) - (Number(item.totalPrice) / (1 + taxPct / 100)) : 0;
                                return (
                                    <tr key={item.id} className="hover:bg-[#FAFAFA]">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {item.product?.imageUrl ? (
                                                    <div className="w-[40px] h-[40px] rounded-[8px] overflow-hidden bg-[#F1F4F9] shrink-0">
                                                        <img src={item.product.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-[40px] h-[40px] rounded-[8px] bg-[#F1F4F9] shrink-0 flex items-center justify-center">
                                                        <Package size={16} className="text-[#AEAEAE]" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[14px] font-bold text-[#181725]">{item.productName}</p>
                                                    {item.product?.packSize && (
                                                        <p className="text-[11px] text-[#7C7C7C]">{item.product.packSize}{item.product.unit ? ` / ${item.product.unit}` : ''}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-[12px] text-[#7C7C7C]">
                                                {item.product?.sku && <p>{item.product.sku}</p>}
                                                {item.product?.hsn && <p className="text-[11px]">HSN: {item.product.hsn}</p>}
                                                {!item.product?.sku && !item.product?.hsn && '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-[14px] text-[#7C7C7C]">{formatPrice(item.unitPrice)}</td>
                                        <td className="px-6 py-4 text-center text-[14px] font-bold text-[#181725]">{item.quantity}</td>
                                        <td className="px-6 py-4 text-center text-[12px] text-[#7C7C7C]">
                                            {taxPct > 0 ? (
                                                <div>
                                                    <p>{taxPct}%</p>
                                                    <p className="text-[11px]">{formatPrice(itemGST)}</p>
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-[14px] font-bold text-[#181725]">{formatPrice(item.totalPrice)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* Summary */}
                <div className="p-6 border-t border-[#EEEEEE] flex flex-col items-end gap-2">
                    <div className="flex gap-8 text-[14px]">
                        <span className="text-[#7C7C7C]">Subtotal</span>
                        <span className="font-bold text-[#181725] w-28 text-right">{formatPrice(order.subtotal)}</span>
                    </div>
                    {Number(order.taxAmount) > 0 && (
                        <div className="flex gap-8 text-[14px]">
                            <span className="text-[#7C7C7C]">GST / Tax</span>
                            <span className="font-bold text-[#181725] w-28 text-right">{formatPrice(Number(order.taxAmount))}</span>
                        </div>
                    )}
                    <div className="flex gap-8 text-[16px] pt-2 border-t border-[#EEEEEE]">
                        <span className="font-bold text-[#181725]">Total</span>
                        <span className="font-[900] text-[#299E60] w-28 text-right">{formatPrice(order.totalAmount)}</span>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {order.notes && (
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                    <h3 className="text-[16px] font-bold text-[#181725] mb-2">Customer Notes</h3>
                    <p className="text-[14px] text-[#7C7C7C]">{order.notes}</p>
                </div>
            )}

            {/* Status Update */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                    <h3 className="text-[16px] font-bold text-[#181725] mb-4">Update Order Status</h3>
                    <div className="flex items-center gap-4">
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] font-medium outline-none focus:border-[#299E60]/40 min-w-[200px]"
                        >
                            {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleUpdateStatus}
                            disabled={updating || newStatus === order.status}
                            className={cn(
                                'h-[44px] px-6 rounded-[10px] text-[14px] font-bold transition-all',
                                newStatus !== order.status
                                    ? 'bg-[#299E60] text-white hover:bg-[#238a54] shadow-sm'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            )}
                        >
                            {updating ? 'Updating...' : 'Update Status'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
