'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { VendorProduct, CartItem, VendorCartGroup } from '@/types';

interface CartContextType {
    cart: CartItem[];
    groups: VendorCartGroup[];
    addToCart: (product: VendorProduct, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;
    totalAmount: number; // Aliases subtotal for backward compatibility
    vendorCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initial load from localStorage
    useEffect(() => {
        const storedCart = localStorage.getItem('horeca_cart');
        if (storedCart) {
            try {
                const parsed = JSON.parse(storedCart);
                setCart(parsed);
            } catch (err) {
                console.error('Failed to load cart:', err);
            }
        }
        setIsInitialized(true);
    }, []);

    // Persist to localStorage
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('horeca_cart', JSON.stringify(cart));
        }
    }, [cart, isInitialized]);

    const addToCart = useCallback((product: VendorProduct, quantity: number = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { productId: product.id, product, quantity }];
        });
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    }, []);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setCart(prev => prev.map(item =>
            item.productId === productId ? { ...item, quantity } : item
        ));
    }, [removeFromCart]);

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    // Derived: Groups by Vendor
    const groups = useMemo(() => {
        const grouped: Record<string, VendorCartGroup> = {};
        cart.forEach(item => {
            if (!item.product) return;
            const vId = item.product.vendorId;
            if (!grouped[vId]) {
                grouped[vId] = {
                    vendorId: vId,
                    vendorName: item.product.vendorName,
                    vendorLogo: item.product.vendorLogo,
                    items: [],
                    subtotal: 0,
                    minOrderValue: item.product.minOrderQuantity || 0, // Simplified MOV
                    meetsMinOrder: false
                };
            }
            grouped[vId].items.push(item);
            grouped[vId].subtotal += (item.product.price || 0) * item.quantity;
            grouped[vId].meetsMinOrder = grouped[vId].subtotal >= grouped[vId].minOrderValue;
        });
        return Object.values(grouped);
    }, [cart]);

    const totalItems = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity || 0), 0), [cart]);
    
    const subtotal = useMemo(() => cart.reduce((sum, item) => {
        if (!item.product) return sum;
        const price = item.product.price || 0;
        return sum + (price * item.quantity);
    }, 0), [cart]);

    const totalAmount = subtotal;
    const vendorCount = groups.length;

    const value = useMemo(() => ({
        cart,
        groups,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        totalAmount,
        vendorCount,
    }), [cart, groups, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, subtotal, totalAmount, vendorCount]);

    return (
        <CartContext.Provider value={value}>
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
