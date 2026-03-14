'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, ShoppingCart, Star } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
    id: string;
    image: string;
}

interface Order {
    id: string;
    status: string;
    date: string;
    price: number;
    items: OrderItem[];
    rating?: number;
    canRate?: boolean;
}

const MOCK_ORDERS: Order[] = [
    {
        id: '1',
        status: 'Order delivered',
        date: 'Placed at 14th Feb 2025, 03:55 pm',
        price: 569,
        items: [
            { id: 'p1', image: '/images/category/milk.png' },
            { id: 'p2', image: '/images/category/vegitable.png' },
            { id: 'p3', image: '/images/category/fruits.png' },
            { id: 'p4', image: '/images/category/snacks.png' },
            { id: 'p5', image: '/images/category/milk.png' },
            { id: 'p6', image: '/images/category/vegitable.png' },
        ],
        rating: 3,
        canRate: false
    },
    {
        id: '2',
        status: 'Order delivered',
        date: 'Placed at 9th Feb 2025, 12:55 pm',
        price: 1335,
        items: [
            { id: 'p1', image: '/images/category/vegitable.png' },
            { id: 'p2', image: '/images/category/fruits.png' },
            { id: 'p3', image: '/images/category/snacks.png' },
            { id: 'p4', image: '/images/category/milk.png' },
            { id: 'p5', image: '/images/category/vegitable.png' },
        ],
        canRate: true
    }
];

export default function OrderHistoryPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#F2F3F2]">

            {/* Header */}
            <div className="sticky top-[12px] z-50 bg-[#F2F3F2] px-2 min-[340px]:px-4 h-16 flex items-center justify-between">
                <button onClick={() => router.back()} className="p-2 -ml-1 flex-shrink-0">
                    <ChevronLeft size={22} className="text-[#181725]" />
                </button>
                <h1 className="text-[16px] min-[340px]:text-[20px] font-bold text-[#181725] absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Your Orders
                </h1>
                <div className="flex items-center gap-1 min-[340px]:gap-4 flex-shrink-0">
                    <button className="p-1.5 grayscale-[0.5] opacity-80">
                        <Heart size={20} className="text-[#181725]" />
                    </button>
                    <Link href="/cart" className="relative p-1.5 flex items-center justify-center">
                        <ShoppingCart size={20} className="text-[#181725]" />
                        <span className="absolute top-0 right-0 bg-[#53B175] text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border-2 border-white translate-x-1 -translate-y-1">
                            0
                        </span>
                    </Link>
                </div>
            </div>

            {/* Orders List */}
            <div className="p-4 space-y-4 pb-24 max-w-[600px] mx-auto">
                {MOCK_ORDERS.map((order) => (
                    <div key={order.id} className="bg-white rounded-[18px] border border-[#CFCECE] overflow-hidden">
                        <div className="p-5 md:p-6">
                            <div className="flex justify-between items-center mb-1">
                                <h2 className="text-[18px] font-bold text-[#181725]">{order.status}</h2>
                                <span className="text-[18px] font-bold text-[#181725]">₹ {order.price}</span>
                            </div>
                            <p className="text-[13px] text-[#7C7C7C] mb-5">{order.date}</p>

                            {/* Product Images */}
                            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 py-0.5">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="w-[50px] h-[50px] min-w-[50px] rounded-[8px] border border-[#CFCECE] flex items-center justify-center p-1 bg-white">
                                        <img src={item.image} alt="product" className="max-w-[85%] max-h-[85%] object-contain" />
                                    </div>
                                ))}
                            </div>

                            {/* Rating Area (for rated orders) */}
                            {order.rating !== undefined ? (
                                <div className="flex flex-col gap-5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] text-[#1a2b4b] font-medium leading-tight opacity-90">Your delevery experience rating:</span>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star 
                                                    key={s} 
                                                    size={18} 
                                                    className={s <= (order.rating || 0) ? "fill-[#53B175] text-[#53B175]" : "text-[#D3D3D3] fill-none"} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="w-full flex justify-center pt-2">
                                        <button className="text-[#FF4B4B] font-bold text-[16px] hover:opacity-80 transition-opacity">
                                            Order Again
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Footer Split Actions (for unrated orders) */}
                        {order.rating === undefined && (
                            <div className="flex items-center border-t border-[#F2F3F2]">
                                <button className="flex-1 py-4.5 text-center font-bold text-[#4C4F4D] text-[16px] active:bg-gray-50 transition-colors">
                                    Rate Order
                                </button>
                                <div className="w-[1px] h-8 bg-[#F2F3F2]" />
                                <button className="flex-1 py-4.5 text-center font-bold text-[#FF4B4B] text-[16px] active:bg-gray-50 transition-colors">
                                    Order Again
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
