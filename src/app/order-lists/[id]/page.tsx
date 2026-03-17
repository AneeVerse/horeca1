'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Minus, ShoppingCart, ClipboardList, Home, ChevronRight, ChevronUp, ChevronDown, Building2, RotateCcw, AlertTriangle, FileText, X } from 'lucide-react';
import { MOCK_ORDER_LISTS, MOCK_VENDORS, MOCK_VENDOR_PRODUCTS } from '@/lib/mockData';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';
import { toast } from 'sonner';
import type { OrderList } from '@/types';

export default function OrderListDetailPage() {
    const router = useRouter();
    const params = useParams();
    const listId = params.id as string;
    const { addToCart, totalItems } = useCart();
    const { wishlist } = useWishlist();
    const [orderList, setOrderList] = useState<OrderList | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});

    const toggleVendor = (vendorId: string) => {
        setExpandedVendors(prev => ({ ...prev, [vendorId]: prev[vendorId] !== false ? false : true }));
    };
    const isExpanded = (vendorId: string) => expandedVendors[vendorId] !== false;

    React.useEffect(() => {
        // 1. Check Mock Data
        let found = MOCK_ORDER_LISTS.find(l => l.id === listId);

        // 2. Check Merged Local Storage (Mock + Custom)
        if (!found) {
            const saved = localStorage.getItem('horeca_order_lists_all');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    found = parsed.find((l: any) => l.id === listId);
                } catch (e) {
                    console.error('Failed to parse lists', e);
                }
            }
        }

        if (found) {
            setOrderList(found);
            // All quantities start at 0 per spec
            setQuantities(Object.fromEntries(found.items.map(item => [item.productId, 0])));
        }
        setIsLoading(false);
    }, [listId]);

    const updateQty = (productId: string, delta: number) => {
        setQuantities(prev => ({
            ...prev,
            [productId]: Math.max(0, (prev[productId] || 0) + delta),
        }));
    };

    const setQty = (productId: string, val: number) => {
        setQuantities(prev => ({ ...prev, [productId]: Math.max(0, val) }));
    };

    const activeItems = useMemo(() => {
        return Object.entries(quantities).filter(([, qty]) => qty > 0);
    }, [quantities]);

    const totalAmount = useMemo(() => {
        if (!orderList) return 0;
        return activeItems.reduce((sum, [pid, qty]) => {
            const item = orderList.items.find(i => i.productId === pid);
            return sum + (item ? item.product.price * qty : 0);
        }, 0);
    }, [activeItems, orderList]);

    const handleFillLastQty = () => {
        if (!orderList) return;
        const newQtys = Object.fromEntries(
            orderList.items.map(item => [item.productId, item.lastOrderedQty || item.defaultQty || 1])
        );
        setQuantities(newQtys);
        toast.info("Quantities filled based on last order", { duration: 1500 });
    };

    const handleAddAllToCart = () => {
        if (!orderList) return;

        if (activeItems.length === 0) {
            toast.error("No items selected", {
                description: "Please select quantities for items or use 'Re-fill Last Qty' to add products.",
                duration: 3000,
            });
            return;
        }

        let itemsAdded = 0;
        activeItems.forEach(([pid, qty]) => {
            const item = orderList.items.find(i => i.productId === pid);
            if (item && qty > 0) {
                addToCart(item.product, qty);
                itemsAdded++;
            }
        });

        if (itemsAdded > 0) {
            toast.success(`${orderList.name} added to cart!`, {
                description: `Successfully added ${itemsAdded} items to your cart.`,
                duration: 2500,
            });
            router.push('/cart');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-[#299e60] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!orderList) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-6">
                <div className="text-center max-w-xs">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ClipboardList size={40} className="text-gray-200" />
                    </div>
                    <h2 className="text-[20px] font-bold text-[#181725] mb-2">List not found</h2>
                    <p className="text-[14px] text-gray-400 font-medium mb-8">This list might have been deleted or is no longer available.</p>
                    <Link
                        href="/order-lists"
                        className="inline-block w-full bg-[#53B175] text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-100"
                    >
                        Back to lists
                    </Link>
                </div>
            </div>
        );
    }

    // Group items by vendor
    const vendorGroups: { vendorId: string; vendorName: string; vendorLogo?: string; items: typeof orderList.items }[] = [];
    const seen = new Set<string>();
    orderList.items.forEach(item => {
        const vid = item.product?.vendorId || orderList.vendorId;
        if (!seen.has(vid)) {
            seen.add(vid);
            vendorGroups.push({
                vendorId: vid,
                vendorName: item.product?.vendorName || orderList.vendorName,
                vendorLogo: item.product?.vendorLogo || orderList.vendorLogo,
                items: []
            });
        }
        vendorGroups.find(g => g.vendorId === vid)!.items.push(item);
    });

    const isMultiVendor = vendorGroups.length > 1;

    // Compact table for mobile
    const MobileItemTable = ({ items }: { items: typeof orderList.items }) => (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-[1fr_35px_75px_55px] min-[400px]:grid-cols-[1fr_45px_90px_70px] gap-1 min-[400px]:gap-2 px-3 min-[400px]:px-5 py-4 bg-gray-50 border-b border-gray-100 uppercase tracking-tighter">
                <span className="text-[9px] min-[400px]:text-[11px] font-black text-gray-500">Item</span>
                <span className="text-[9px] min-[400px]:text-[11px] font-black text-gray-500 text-center">Last</span>
                <span className="text-[9px] min-[400px]:text-[11px] font-black text-gray-500 text-center">Qty</span>
                <span className="text-[9px] min-[400px]:text-[11px] font-black text-gray-500 text-right">Total</span>
            </div>
            {items.map((item) => {
                const qty = quantities[item.productId] || 0;
                const itemTotal = item.product.price * qty;
                return (
                    <div key={item.productId} className="grid grid-cols-[1fr_35px_75px_55px] min-[400px]:grid-cols-[1fr_45px_90px_70px] gap-1 min-[400px]:gap-2 px-3 min-[400px]:px-5 py-4 border-b border-gray-50 items-center hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-1.5 min-[400px]:gap-3 min-w-0">
                            <div className="w-8 h-8 min-[400px]:w-10 min-[400px]:h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 p-1">
                                <img src={item.product.images[0] || '/images/recom-product/product-img10.png'} alt={item.product.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] min-[400px]:text-[13px] font-bold text-[#181725] leading-tight line-clamp-2 min-[400px]:line-clamp-none">{item.product.name}</p>
                                <p className="text-[9px] min-[400px]:text-[10px] text-gray-400 mt-0.5 font-medium">₹{item.product.price}</p>
                            </div>
                        </div>
                        <div className="text-center font-bold">
                            <span className="text-[11px] min-[400px]:text-[12px] text-gray-400">{item.lastOrderedQty || '-'}</span>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="flex items-center border border-gray-100 rounded-lg overflow-hidden bg-white shadow-sm">
                                <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 min-[400px]:w-7 min-[400px]:h-7 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100">
                                    <Minus size={10} className="text-gray-400" strokeWidth={3} />
                                </button>
                                <input
                                    type="number"
                                    min="0"
                                    value={qty}
                                    onChange={(e) => setQty(item.productId, parseInt(e.target.value) || 0)}
                                    className="w-6 h-6 min-[400px]:w-8 min-[400px]:h-7 text-center text-[11px] min-[400px]:text-[12px] font-bold text-[#181725] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                                />
                                <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 min-[400px]:w-7 min-[400px]:h-7 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100">
                                    <Plus size={10} className="text-[#53B175]" strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-[11px] min-[400px]:text-[13px] font-black ${qty > 0 ? 'text-[#181725]' : 'text-gray-200'}`}>
                                {qty > 0 ? `₹${itemTotal.toLocaleString('en-IN')}` : '—'}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Full desktop card layout (like cart) — with collapse + X per item
    const DesktopVendorCard = ({ group }: { group: typeof vendorGroups[0] }) => {
        const expanded = isExpanded(group.vendorId);
        return (
            <div className="bg-white rounded-2xl border border-[#E2E2E2] overflow-hidden shadow-sm">
                {/* Vendor Header */}
                <div className="px-7 py-5 flex items-center justify-between bg-[#FAFAFA] border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            {group.vendorLogo ? (
                                <img src={group.vendorLogo} alt={group.vendorName} className="w-full h-full object-contain rounded-xl" />
                            ) : (
                                <Building2 size={18} className="text-primary" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[17px] font-bold text-[#181725]">{group.vendorName}</h3>
                            <p className="text-[13px] text-gray-400 font-medium">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => toggleVendor(group.vendorId)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
                    >
                        {expanded
                            ? <ChevronUp size={20} className="text-gray-500" strokeWidth={2.5} />
                            : <ChevronDown size={20} className="text-gray-500" strokeWidth={2.5} />}
                    </button>
                </div>

                {/* Items — collapsible */}
                {expanded && (
                    <div className="divide-y divide-[#F5F5F5] border-t border-[#F0F0F0]">
                        {group.items.map((item) => {
                            const qty = quantities[item.productId] || 0;
                            const itemTotal = item.product.price * qty;
                            return (
                                <div key={item.productId} className="px-7 py-5 flex items-center gap-5 hover:bg-gray-50/40 transition-colors group">
                                    {/* Image */}
                                    <div className="w-[72px] h-[72px] rounded-2xl bg-[#F7F8F7] flex items-center justify-center shrink-0 border border-gray-100 p-2 group-hover:border-primary/10 transition-colors">
                                        <img src={item.product.images[0] || '/images/recom-product/product-img10.png'} alt={item.product.name} className="max-w-full max-h-full object-contain" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[15px] font-bold text-[#181725] leading-snug line-clamp-1">{item.product.name}</h4>
                                        <p className="text-[13px] text-gray-400 font-medium mt-0.5">{item.product.packSize || '1 pc'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-[6px] h-[6px] rounded-full bg-primary" />
                                            <span className="text-[12px] text-gray-400 font-medium">₹{item.product.price}/pc</span>
                                            {item.lastOrderedQty && (
                                                <span className="text-[11px] text-gray-300 font-medium">· Last: {item.lastOrderedQty}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Qty Controls */}
                                    <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden shrink-0">
                                        <button
                                            onClick={() => updateQty(item.productId, -1)}
                                            className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                                        >
                                            <Minus size={16} strokeWidth={2.5} />
                                        </button>
                                        <div className="w-12 h-10 flex items-center justify-center border-x border-gray-200">
                                            <input
                                                type="number"
                                                min="0"
                                                value={qty}
                                                onChange={(e) => setQty(item.productId, parseInt(e.target.value) || 0)}
                                                className="w-full text-center text-[15px] font-bold text-[#181725] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                                            />
                                        </div>
                                        <button
                                            onClick={() => updateQty(item.productId, 1)}
                                            className="w-10 h-10 flex items-center justify-center text-primary hover:bg-green-50 transition-colors"
                                        >
                                            <Plus size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* Total */}
                                    <div className="text-right shrink-0 w-[90px]">
                                        <span className={`text-[16px] font-black ${qty > 0 ? 'text-[#181725]' : 'text-gray-200'}`}>
                                            {qty > 0 ? `₹${itemTotal.toLocaleString('en-IN')}` : '—'}
                                        </span>
                                    </div>

                                    {/* Clear qty button */}
                                    <button
                                        onClick={() => setQty(item.productId, 0)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                                        title="Clear quantity"
                                    >
                                        <X size={16} strokeWidth={2.5} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F2F3F2] flex flex-col pb-32 lg:pb-16">
            {/* Desktop Header */}
            <div className="hidden md:block bg-[#F7F8FA] border-b border-gray-100">
                <div className="md:max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-6">
                    <div className="flex items-center gap-2 text-[13px] text-text-muted mb-3">
                        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
                            <Home size={14} />
                            <span>Home</span>
                        </Link>
                        <ChevronRight size={12} />
                        <Link href="/order-lists" className="hover:text-primary transition-colors">Order Lists</Link>
                        <ChevronRight size={12} />
                        <span className="text-text font-semibold truncate">{orderList.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-2xl border border-gray-100 flex items-center justify-center p-3 shrink-0 shadow-sm">
                                {orderList.vendorLogo ? (
                                    <img src={orderList.vendorLogo} alt={orderList.vendorName} className="w-full h-full object-contain" />
                                ) : (
                                    <ClipboardList size={32} className="text-primary" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-[32px] font-black text-text tracking-tight leading-none mb-2">{orderList.name}</h1>
                                <p className="text-[16px] text-[#299e60] font-black flex items-center gap-2">
                                    <Building2 size={18} />
                                    {orderList.vendorName}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-w-0">
                            <button
                                onClick={() => router.push('/order-lists')}
                                className="p-1 -ml-1 hover:bg-gray-50 rounded-full transition-colors shrink-0"
                            >
                                <ChevronLeft size={22} className="text-[#181725]" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-[17px] min-[340px]:text-[19px] font-bold text-[#181725] truncate">{orderList.name}</h1>
                                <p className="text-[11px] min-[340px]:text-[13px] text-[#299e60] font-bold mt-0.5 truncate">{orderList.vendorName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 px-1">
                            <button
                                onClick={handleFillLastQty}
                                className="text-[12px] font-bold text-[#299e60] px-3 py-1.5 border border-[#299e60]/20 rounded-lg hover:bg-[#299e60]/5 transition-colors flex items-center gap-1.5"
                            >
                                <RotateCcw size={14} />
                                Re-fill
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 pt-4 md:max-w-[var(--container-max)] md:mx-auto md:px-[var(--container-padding)] md:pt-8 md:w-full">
                <div className="md:grid md:grid-cols-1 lg:grid-cols-[1fr_400px] lg:gap-10 md:items-start">

                    {/* ===== LEFT COLUMN ===== */}
                    <div className="space-y-3 md:space-y-5">

                        {/* Mobile: compact table layout */}
                        <div className="lg:hidden space-y-4">
                            {vendorGroups.map(group => (
                                <div key={group.vendorId}>
                                    {isMultiVendor && (
                                        <div className="flex items-center gap-2.5 mb-2 px-1">
                                            <div className="w-7 h-7 rounded-lg border border-gray-100 p-0.5 bg-white shrink-0 overflow-hidden">
                                                {group.vendorLogo ? (
                                                    <img src={group.vendorLogo} alt={group.vendorName} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Building2 size={16} className="text-gray-400 m-auto" />
                                                )}
                                            </div>
                                            <span className="text-[13px] font-extrabold text-[#181725]">{group.vendorName}</span>
                                            <span className="text-[11px] text-gray-400 font-medium">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
                                        </div>
                                    )}
                                    <MobileItemTable items={group.items} />
                                </div>
                            ))}
                        </div>

                        {/* Desktop: cart-style vendor cards */}
                        <div className="hidden lg:block space-y-5">
                            {vendorGroups.map(group => (
                                <DesktopVendorCard key={group.vendorId} group={group} />
                            ))}
                        </div>
                    </div>

                    {/* ===== RIGHT COLUMN — Sticky Sidebar (desktop only) ===== */}
                    <div className="hidden lg:block sticky top-[80px] space-y-4">
                        {/* Re-fill Button */}
                        <button
                            onClick={handleFillLastQty}
                            className="w-full bg-white text-[#299e60] px-6 py-4 border-2 border-[#299e60]/15 rounded-2xl text-[15px] font-black shadow-sm hover:bg-[#299e60]/5 transition-all flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={17} />
                            Re-fill Last Qty
                        </button>

                        {/* Order Summary Card */}
                        <div className="bg-white rounded-2xl border border-[#E2E2E2] overflow-hidden shadow-sm">
                            <div className="px-7 py-5 flex items-center gap-3 border-b border-[#F0F0F0]">
                                <div className="w-[38px] h-[38px] rounded-xl border border-[#E2E2E2] flex items-center justify-center shrink-0 bg-gray-50">
                                    <FileText size={18} className="text-[#181725]" />
                                </div>
                                <span className="text-[17px] font-bold text-[#181725]">Order Summary</span>
                            </div>

                            <div className="px-7 py-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[15px] text-[#4C4F4D] font-medium">Items in list</span>
                                    <span className="text-[15px] font-bold text-[#181725]">{orderList.items.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[15px] text-[#4C4F4D] font-medium">Selected</span>
                                    <span className="text-[15px] font-bold text-[#181725]">{activeItems.length} item{activeItems.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>

                            <div className="px-7 pb-6">
                                <div className="border-t border-dashed border-[#D0D0D0] pt-5">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[18px] font-bold text-[#181725]">Total</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[24px] font-black text-[#181725]">
                                                {activeItems.length > 0 ? `₹${totalAmount.toLocaleString('en-IN')}` : '₹0'}
                                            </span>
                                            {activeItems.length === 0 && (
                                                <span className="text-[12px] text-gray-400 font-medium mt-0.5">Set quantities above</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                            onClick={handleAddAllToCart}
                            className="w-full bg-[#53B175] text-white py-5 rounded-2xl font-bold text-[18px] transition-all hover:bg-[#48a068] active:scale-[0.98] shadow-lg shadow-[#53B175]/20 flex items-center justify-center gap-3"
                        >
                            <ShoppingCart size={22} strokeWidth={2.5} />
                            Add to Cart
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

                {/* Mobile Bill Summary */}
                <div className="lg:hidden mt-3 bg-white rounded-[16px] border border-[#CFCECE] overflow-hidden">
                    <div className="p-4 flex items-center gap-3 border-b border-[#F0F0F0]">
                        <div className="w-[34px] h-[34px] rounded-[8px] border border-[#E2E2E2] flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-[#181725]" />
                        </div>
                        <span className="text-[15px] font-bold text-[#181725]">Order Summary</span>
                    </div>
                    <div className="px-5 pt-5 pb-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[14px] text-[#4C4F4D] font-medium">Items in list</span>
                            <span className="text-[14px] font-bold text-[#181725]">{orderList.items.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[14px] text-[#4C4F4D] font-medium">Selected</span>
                            <span className="text-[14px] font-bold text-[#181725]">{activeItems.length} item{activeItems.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div className="px-5 pb-5 pt-2">
                        <div className="border-t border-dashed border-[#D0D0D0] pt-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[16px] font-bold text-[#181725]">Total</span>
                                <span className="text-[20px] font-extrabold text-[#181725]">
                                    {activeItems.length > 0 ? `₹${totalAmount.toLocaleString('en-IN')}` : '₹0'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Bottom CTA — Mobile + Tablet */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-white via-white to-transparent z-50">
                <button
                    onClick={handleAddAllToCart}
                    className="w-full bg-[#53B175] text-white py-[18px] rounded-[16px] font-bold text-[18px] transition-all active:scale-[0.98] shadow-lg shadow-[#53B175]/20 flex items-center justify-center gap-3"
                >
                    <ShoppingCart size={22} strokeWidth={2.5} />
                    Add to Cart
                    {activeItems.length > 0 && (
                        <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[14px]">{activeItems.length}</span>
                    )}
                </button>
            </div>
        </div>
    );
}
