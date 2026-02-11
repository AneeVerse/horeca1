'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
    id: number | string;
    name: string;
    price: string;
    image: string;
    quantity: number;
    description?: string;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: any) => void;
    removeFromCart: (productId: number | string) => void;
    updateQuantity: (productId: number | string, delta: number) => void;
    totalItems: number;
    subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            const rawPrice = product.newPrice || product.price;
            const formattedPrice = typeof rawPrice === 'number' ? `$${rawPrice.toFixed(2)}` : rawPrice;

            return [...prev, {
                id: product.id,
                name: product.name,
                price: formattedPrice,
                image: product.image,
                quantity: 1,
                description: product.vendor || product.weight || '1kg, Price'
            }];
        });
    };

    const removeFromCart = (productId: number | string) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: number | string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => {
        const priceStr = typeof item.price === 'string' ? item.price : String(item.price);
        const price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
        return sum + (price * item.quantity);
    }, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, totalItems, subtotal }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
