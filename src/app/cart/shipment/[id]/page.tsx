'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Search, ChevronRight, Plus, Minus, FileText, AlertTriangle } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const SavingsDemo = 131;

// Redefining demo data for the detail page
const DEMO_SHIPMENTS = [
    {
        id: 's1',
        vendor: 'G Mart Store',
        vendorId: 'demo-vendor',
        items: [
            { id: 'd1', name: 'Kissan - Tomato Ketchup', size: '2 kg', pcs: 1, price: 188, image: '/images/product/product-img1.png' },
            { id: 'd2', name: 'Fortune - Sunflower Refined Oil, 5 L', size: '5 Litre', pcs: 1, price: 550, image: '/images/category/milk.png' },
        ]
    }
];

export default function ShipmentDetailPage() {
    const router = useRouter();
    const { id } = useParams();
    const { groups, removeFromCart, updateQuantity } = useCart();
    const [demoQuantities, setDemoQuantities] = React.useState<Record<string, number>>({});

    // Find shipment data
    const shipment = React.useMemo(() => {
        if (id === 'cart-shipment') {
            // Flatten all vendor groups for the shipment view
            const allItems = groups.flatMap(g =>
                g.items
                    .filter(item => !!item.product)
                    .map(item => ({
                        id: String(item.productId || (item.product && item.product.id)),
                        vendorId: g.vendorId,
                        name: item.product.name,
                        size: item.product.packSize || '1 pc',
                        pcs: item.quantity,
                        price: item.product.price || 0,
                        image: (item.product.images && item.product.images[0]) || '/images/recom-product/product-img10.png',
                    }))
            );
            return {
                id: 'cart-shipment',
                vendor: 'Your Cart',
                vendorId: 'cart',
                items: allItems,
            };
        }

        const baseShipment = DEMO_SHIPMENTS.find(s => s.id === id) || DEMO_SHIPMENTS[0];
        return {
            ...baseShipment,
            items: baseShipment.items.map(item => ({
                ...item,
                vendorId: baseShipment.vendorId,
                pcs: demoQuantities[item.id] ?? item.pcs
            })).filter(item => item.pcs > 0)
        };
    }, [id, groups, demoQuantities]);

    const handleQuantityChange = (itemId: string, vendorId: string, delta: number, currentPcs: number) => {
        if (id === 'cart-shipment') {
            const newQty = currentPcs + delta;
            if (newQty <= 0) {
                removeFromCart(itemId);
            } else {
                updateQuantity(itemId, newQty);
            }
        } else {
            setDemoQuantities(prev => ({
                ...prev,
                [itemId]: Math.max(0, (prev[itemId] ?? currentPcs) + delta)
            }));
        }
    };

    const itemTotal = shipment.items.reduce((sum, item) => sum + item.price * item.pcs, 0);
    const deliveryFee = 15;
    const handlingFee = 4;
    const totalPay = itemTotal + deliveryFee + handlingFee;
    const minOrder = 600;
    const shortfall = minOrder - itemTotal;
    const isDemo = id !== 'cart-shipment';

    return (
        <div className="min-h-screen bg-[#F9F9F9] flex flex-col pb-28 font-sans">
            {/* Top Branding Bar */}
            <div className="w-full h-[12px] bg-[#53B175] sticky top-0 z-[110]" />

            {/* Header */}
            <header className="flex items-center justify-between px-4 h-[60px] bg-white border-b border-[#EEEEEE] sticky top-[12px] z-[100]">
                <button onClick={() => router.back()} className="p-2 -ml-2">
                    <ArrowLeft size={24} className="text-[#181725]" />
                </button>
                <h1 className="text-[20px] font-bold text-[#181725]">Cart</h1>
                <button className="p-2 -mr-2">
                    <Search size={24} className="text-[#181725]" strokeWidth={1.5} />
                </button>
            </header>

            {/* Content Container */}
            <div className="flex-1 px-4 py-4 space-y-4">

                {/* Store Header Card */}
                <div className="bg-white rounded-[12px] border border-[#E2E2E2] p-4 flex items-start justify-between">
                    <div className="flex-1 pr-4">
                        <h3 className="text-[17px] font-bold text-[#181725] leading-tight">{shipment.vendor}</h3>
                        <p className="text-[12px] text-[#7C7C7C] font-medium mt-1 leading-tight">
                            Items from this vendor will be packed separately
                        </p>
                    </div>
                    <button className="flex items-center gap-1.5 border border-[#EEEEEE] px-3 py-1 rounded-full text-[11px] font-bold text-[#181725] bg-white whitespace-nowrap shadow-sm active:scale-95 transition-transform">
                        Visit store <ChevronRight size={13} strokeWidth={3} />
                    </button>
                </div>

                {/* Main Shipment Card */}
                {shipment.items.length > 0 ? (
                    <div className="bg-white rounded-[12px] border border-[#E2E2E2] overflow-hidden">
                        <div className="divide-y divide-[#F2F3F2]">
                            {shipment.items.map((item) => (
                                <div key={item.id} className="p-4 flex items-start gap-4">
                                    <div className="flex items-center">
                                        <div className="w-[68px] h-[68px] rounded-full bg-white flex items-center justify-center shrink-0">
                                            <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-[16px] font-bold text-[#181725] leading-tight">{item.name}</h4>
                                                <p className="text-[12px] text-[#7C7C7C] font-medium mt-1">{item.size} * {item.pcs} pc</p>
                                                <p className="text-[11px] text-[#53B175] font-bold mt-1">From {shipment.vendor}</p>
                                            </div>
                                            <div className="text-right pl-2 shrink-0">
                                                <span className="text-[15px] font-bold text-[#181725]">₹{item.price}/pc</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end mt-2">
                                            <div className="flex items-center border border-[#E2E2E2] rounded-full px-2 py-0.5 bg-white scale-90 origin-right">
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, item.vendorId, -1, item.pcs)}
                                                    className="w-[28px] h-[28px] flex items-center justify-center text-[#53B175] active:scale-75 transition-transform"
                                                >
                                                    <Minus size={16} strokeWidth={3} />
                                                </button>
                                                <div className="w-[24px] flex items-center justify-center">
                                                    <span className="text-[14px] font-bold text-[#181725]">{item.pcs}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, item.vendorId, 1, item.pcs)}
                                                    className="w-[28px] h-[28px] flex items-center justify-center text-[#53B175] active:scale-75 transition-transform"
                                                >
                                                    <Plus size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-[12px] border border-[#E2E2E2] p-10 text-center">
                        <p className="text-[#181725] font-bold">No items in this shipment</p>
                        <button
                            onClick={() => router.push('/cart')}
                            className="text-[#53B175] font-bold mt-2 underline"
                        >
                            Back to cart
                        </button>
                    </div>
                )}

                {/* Minimum Order Warning Box */}
                <div className="bg-white rounded-[10px] border border-[#E2E2E2] px-4 py-3 flex items-center gap-3">
                    <AlertTriangle size={24} className="text-[#555555] shrink-0" fill="#555555" stroke="white" strokeWidth={2.5} />
                    <p className="text-[12px] text-[#181725] font-bold leading-snug">
                        Minimum order for selected items is ₹600. Add <span className="text-[#181725] font-black">₹{Math.max(0, Math.round(shortfall))}</span> more to proceed.
                    </p>
                </div>

                {/* Bill Summary */}
                <div className="bg-white rounded-[12px] border border-[#E2E2E2] shadow-sm">
                    <div className="px-4 py-4 flex items-center gap-3 border-b border-[#F2F3F2]">
                        <div className="w-[38px] h-[38px] border border-[#EEEEEE] rounded-[10px] flex items-center justify-center bg-white">
                            <FileText size={20} className="text-[#181725]" strokeWidth={2} />
                        </div>
                        <h3 className="text-[17px] font-bold text-[#181725]">Bill Summary</h3>
                    </div>

                    <div className="px-5 py-4 space-y-3.5">
                        <div className="flex justify-between items-center text-[14px] font-medium text-[#7C7C7C]">
                            <span>Item Total</span>
                            <span className="text-[#181725] font-bold">₹ {itemTotal}</span>
                        </div>
                        <div className="flex justify-between items-center text-[14px] font-medium text-[#7C7C7C]">
                            <span>Delivery Fee</span>
                            <span className="text-[#181725] font-bold">₹ {deliveryFee}</span>
                        </div>
                        <div className="flex justify-between items-center text-[14px] font-medium text-[#7C7C7C]">
                            <span>Handling Fee</span>
                            <span className="text-[#181725] font-bold">₹ {handlingFee}</span>
                        </div>

                        <div className="pt-2">
                            <div className="border-t border-dashed border-[#CFCECE] w-full" />
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-[16px] font-bold text-[#181725]">To Pay</span>
                            <div className="text-right">
                                <div className="text-[18px] font-black text-[#181725]">₹ {totalPay.toFixed(2)}</div>
                                <div className="text-[11px] text-[#7C7C7C] font-semibold line-through">₹{(totalPay + SavingsDemo).toFixed(0)}</div>
                            </div>
                        </div>
                    </div>
                </div>



            </div>

            {/* Sticky Bottom Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#F2F3F2] z-[100]">
                <button
                    onClick={() => router.push('/cart')}
                    className="w-full bg-[#53B175] text-white py-[18px] rounded-[18px] font-bold text-[18px] transition-all active:scale-[0.98] shadow-lg shadow-[#53B175]/20"
                >
                    Proceed to pay
                </button>
            </div>
        </div>
    );
}
