'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Minus, ShoppingCart, ClipboardList, Home, ChevronRight, Building2, RotateCcw } from 'lucide-react';
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
        
        // If nothing selected, show warning
        if (activeItems.length === 0) {
            toast.error("No items selected", {
                description: "Please select quantities for items or use 'Re-fill Last Qty' to add products.",
                duration: 3000,
            });
            return;
        }

        const itemsToProcess = activeItems;

        let itemsAdded = 0;
        itemsToProcess.forEach(([pid, qty]) => {
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

    return (
        <div className="min-h-screen bg-gray-50/50 pb-32">
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
                        <button 
                            onClick={handleFillLastQty}
                            className="bg-white text-[#299e60] px-6 py-3 border-2 border-[#299e60]/10 rounded-xl text-[15px] font-black shadow-sm hover:bg-[#299e60]/5 transition-all flex items-center gap-2"
                        >
                            <RotateCcw size={16} />
                            Re-fill Last Qty
                        </button>
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

            {/* Items Table — grouped by vendor when multi-vendor */}
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-4">
                {(() => {
                    // Group items by vendorId (from the product)
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

                    const ItemTable = ({ items }: { items: typeof orderList.items }) => (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            {/* Column Headers */}
                            <div className="grid grid-cols-[1fr_35px_75px_55px] min-[400px]:grid-cols-[1fr_45px_90px_70px] md:grid-cols-[1fr_80px_100px_100px] lg:grid-cols-[1fr_100px_120px_120px] gap-1 min-[400px]:gap-2 px-3 min-[400px]:px-5 py-4 bg-gray-50 border-b border-gray-100 uppercase tracking-tighter">
                                <span className="text-[9px] min-[400px]:text-[11px] md:text-[12px] font-black text-gray-500">Item</span>
                                <span className="text-[9px] min-[400px]:text-[11px] md:text-[12px] font-black text-gray-500 text-center">Last</span>
                                <span className="text-[9px] min-[400px]:text-[11px] md:text-[12px] font-black text-gray-500 text-center">Qty</span>
                                <span className="text-[9px] min-[400px]:text-[11px] md:text-[12px] font-black text-gray-500 text-right">Total</span>
                            </div>
                            {items.map((item) => {
                                const qty = quantities[item.productId] || 0;
                                const itemTotal = item.product.price * qty;
                                return (
                                    <div key={item.productId} className="grid grid-cols-[1fr_35px_75px_55px] min-[400px]:grid-cols-[1fr_45px_90px_70px] md:grid-cols-[1fr_80px_100px_100px] lg:grid-cols-[1fr_100px_120px_120px] gap-1 min-[400px]:gap-2 px-3 min-[400px]:px-5 py-4 border-b border-gray-50 items-center hover:bg-gray-50/50 transition-colors">
                                        {/* Product Info */}
                                        <div className="flex items-center gap-1.5 min-[400px]:gap-3 min-w-0">
                                            <div className="w-8 h-8 min-[400px]:w-10 min-[400px]:h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 p-1">
                                                <img src={item.product.images[0] || '/images/recom-product/product-img10.png'} alt={item.product.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] min-[400px]:text-[13px] md:text-[15px] font-bold text-[#181725] leading-tight line-clamp-2 min-[400px]:line-clamp-none">{item.product.name}</p>
                                                <p className="text-[9px] min-[400px]:text-[10px] md:text-[12px] text-gray-400 mt-0.5 font-medium">₹{item.product.price}</p>
                                            </div>
                                        </div>
                                        {/* Last Ordered Qty */}
                                        <div className="text-center font-bold">
                                            <span className="text-[11px] min-[400px]:text-[12px] md:text-[14px] text-gray-400">
                                                {item.lastOrderedQty || '-'}
                                            </span>
                                        </div>
                                        {/* Quantity Selector */}
                                        <div className="flex items-center justify-center">
                                            <div className="flex items-center border border-gray-100 rounded-lg md:rounded-xl overflow-hidden bg-white shadow-sm">
                                                <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 min-[400px]:w-7 min-[400px]:h-7 md:w-9 md:h-9 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100">
                                                    <Minus size={10} className="text-gray-400 md:w-3.5 md:h-3.5" strokeWidth={3} />
                                                </button>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={qty}
                                                    onChange={(e) => setQty(item.productId, parseInt(e.target.value) || 0)}
                                                    className="w-6 h-6 min-[400px]:w-8 min-[400px]:h-7 md:w-10 md:h-9 text-center text-[11px] min-[400px]:text-[12px] md:text-[14px] font-bold text-[#181725] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                                                />
                                                <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 min-[400px]:w-7 min-[400px]:h-7 md:w-9 md:h-9 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100">
                                                    <Plus size={10} className="text-[#53B175] md:w-3.5 md:h-3.5" strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Total */}
                                        <div className="text-right">
                                            <span className={`text-[11px] min-[400px]:text-[13px] md:text-[16px] font-black ${qty > 0 ? 'text-[#181725]' : 'text-gray-200'}`}>
                                                {qty > 0 ? `₹${itemTotal.toLocaleString('en-IN')}` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );

                    if (!isMultiVendor) {
                        return <ItemTable items={vendorGroups[0]?.items || orderList.items} />;
                    }

                    // Multi-vendor: render each vendor group with a header
                    return (
                        <div className="space-y-4">
                            {vendorGroups.map(group => (
                                <div key={group.vendorId}>
                                    {/* Vendor section header */}
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
                                    <ItemTable items={group.items} />
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* Fixed Bottom CTA Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#299E60] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:max-w-[800px] md:rounded-3xl border-t border-[#FFFFFF33] backdrop-blur-md">
                <div className="px-5 md:px-10 py-4 md:py-5 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-white text-[14px] md:text-[16px] font-black uppercase tracking-tight">
                            {activeItems.length > 0 ? `${activeItems.length} items selected` : 'Add all items'}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-green-50 text-[12px] md:text-[14px] font-bold">
                                {activeItems.length > 0 ? `Total: ₹${totalAmount.toLocaleString('en-IN')}` : 'Ready to restock list'}
                            </span>
                            {activeItems.length > 0 && <span className="text-[10px] text-green-200 opacity-60">incl. all items</span>}
                        </div>
                    </div>
                    <button
                        onClick={handleAddAllToCart}
                        className="bg-white text-[#299E60] px-6 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl text-[14px] md:text-[16px] font-black shadow-xl hover:shadow-[#00000033] hover:-translate-y-0.5 active:scale-[0.96] transition-all flex items-center gap-2 md:gap-3 group"
                    >
                        <ShoppingCart size={20} className="md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                        ADD TO CART
                    </button>
                </div>
            </div>

            {/* General StickyCartBar hidden here as we have the local Add to Cart bar */}
        </div>
    );
}
