'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Plus, Minus, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, subtotal } = useCart();
    const router = useRouter();

    // Internal dummy items for UI demonstration if cart is empty
    const displayItems = cart.length > 0 ? cart : [
        {
            id: 'd1',
            name: 'Bell Pepper Red',
            price: '$4.99',
            image: '/images/product/brokali.png', // Placeholder
            quantity: 1,
            description: '1kg, Price'
        },
        {
            id: 'd2',
            name: 'Egg Chicken Red',
            price: '$1.99',
            image: '/images/product/product-img1.png', // Placeholder
            quantity: 1,
            description: '4pcs, Price'
        },
        {
            id: 'd3',
            name: 'Organic Bananas',
            price: '$3.00',
            image: '/images/product/product-img5.png', // Placeholder
            quantity: 1,
            description: '12kg, Price'
        },
        {
            id: 'd4',
            name: 'Ginger',
            price: '$2.99',
            image: '/images/product/product-img6.png', // Placeholder
            quantity: 1,
            description: '250gm, Price'
        }
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto shadow-xl relative pb-32">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5 bg-white sticky top-0 z-50">
                <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-text" />
                </button>
                <h1 className="text-[20px] font-bold text-text">My Cart</h1>
                <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <Search size={22} className="text-text" />
                </button>
            </header>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-6 divide-y divide-gray-100/80">
                {displayItems.map((item) => (
                    <div key={item.id} className="py-6 flex gap-6 items-center">
                        {/* Image */}
                        <div className="w-[80px] h-[70px] flex-shrink-0 flex items-center justify-center p-2 bg-gray-50/50 rounded-xl">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-[16px] font-bold text-text truncate pr-4">{item.name}</h3>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-[13px] text-gray-400 mb-4">{item.description || '1kg, Price'}</p>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="w-[45px] h-[45px] rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-primary transition-colors focus:outline-none"
                                    >
                                        <Minus size={20} />
                                    </button>
                                    <span className="text-[16px] font-bold text-text w-4 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        className="w-[45px] h-[45px] rounded-2xl border border-gray-100 flex items-center justify-center text-primary hover:bg-primary/5 transition-colors focus:outline-none"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                                <span className="text-[18px] font-bold text-text">{item.price}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer / Go to Checkout */}
            <div className="fixed bottom-[72px] left-0 right-0 max-w-md mx-auto px-6 py-4 bg-white border-t border-gray-50 flex flex-col gap-4">

            </div>
            <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-full max-w-[calc(100%-48px)] z-50">
                <button
                    className="w-full bg-[#53b175] text-white py-6 rounded-3xl font-bold text-[18px] shadow-lg shadow-green-200 active:scale-[0.98] transition-all flex items-center justify-center relative overflow-hidden group"
                    onClick={() => console.log('Checkout click')}
                >
                    <span className="relative z-10">Go to Checkout</span>
                    {cart.length > 0 && (
                        <div className="absolute right-6 bg-[#489e67] px-2 py-0.5 rounded-md text-[12px]">
                            ${subtotal.toFixed(2)}
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
}
