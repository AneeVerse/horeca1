'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { VendorProduct, VendorCartGroup, CartItem } from '@/types';

// ============================================================
// Horeca1 V2.2 — Vendor-Grouped Cart Context
// ============================================================

interface CartContextType {
    groups: VendorCartGroup[];
    addToCart: (product: VendorProduct, quantity?: number) => void;
    removeFromCart: (vendorId: string, productId: string) => void;
    updateQuantity: (vendorId: string, productId: string, quantity: number) => void;
    clearVendor: (vendorId: string) => void;
    clearCart: () => void;
    totalItems: number;
    totalAmount: number;
    vendorCount: number;
    getVendorGroup: (vendorId: string) => VendorCartGroup | undefined;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [groups, setGroups] = useState<VendorCartGroup[]>([]);

    const addToCart = useCallback((product: VendorProduct, quantity: number = 1) => {
        setGroups(prev => {
            const existingGroup = prev.find(g => g.vendorId === product.vendorId);

            if (existingGroup) {
                const existingItem = existingGroup.items.find(i => i.productId === product.id);

                if (existingItem) {
                    // Update quantity of existing item
                    const updatedGroups = prev.map(g => {
                        if (g.vendorId !== product.vendorId) return g;
                        const updatedItems = g.items.map(i =>
                            i.productId === product.id
                                ? { ...i, quantity: i.quantity + quantity }
                                : i
                        );
                        const subtotal = updatedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
                        return { ...g, items: updatedItems, subtotal, meetsMinOrder: subtotal >= g.minOrderValue };
                    });
                    return updatedGroups;
                } else {
                    // Add new item to existing vendor group
                    const updatedGroups = prev.map(g => {
                        if (g.vendorId !== product.vendorId) return g;
                        const newItem: CartItem = { productId: product.id, product, quantity };
                        const updatedItems = [...g.items, newItem];
                        const subtotal = updatedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
                        return { ...g, items: updatedItems, subtotal, meetsMinOrder: subtotal >= g.minOrderValue };
                    });
                    return updatedGroups;
                }
            } else {
                // Create new vendor group
                const newItem: CartItem = { productId: product.id, product, quantity };
                const subtotal = product.price * quantity;
                const newGroup: VendorCartGroup = {
                    vendorId: product.vendorId,
                    vendorName: product.vendorName,
                    vendorLogo: product.vendorLogo,
                    items: [newItem],
                    subtotal,
                    minOrderValue: product.minOrderQuantity || 0,
                    meetsMinOrder: true,
                };
                return [...prev, newGroup];
            }
        });
    }, []);

    const removeFromCart = useCallback((vendorId: string, productId: string) => {
        setGroups(prev => {
            const updatedGroups = prev.map(g => {
                if (g.vendorId !== vendorId) return g;
                const updatedItems = g.items.filter(i => i.productId !== productId);
                if (updatedItems.length === 0) return null;
                const subtotal = updatedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
                return { ...g, items: updatedItems, subtotal, meetsMinOrder: subtotal >= g.minOrderValue };
            }).filter(Boolean) as VendorCartGroup[];
            return updatedGroups;
        });
    }, []);

    const updateQuantity = useCallback((vendorId: string, productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(vendorId, productId);
            return;
        }
        setGroups(prev => prev.map(g => {
            if (g.vendorId !== vendorId) return g;
            const updatedItems = g.items.map(i =>
                i.productId === productId ? { ...i, quantity } : i
            );
            const subtotal = updatedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
            return { ...g, items: updatedItems, subtotal, meetsMinOrder: subtotal >= g.minOrderValue };
        }));
    }, [removeFromCart]);

    const clearVendor = useCallback((vendorId: string) => {
        setGroups(prev => prev.filter(g => g.vendorId !== vendorId));
    }, []);

    const clearCart = useCallback(() => {
        setGroups([]);
    }, []);

    const getVendorGroup = useCallback((vendorId: string) => {
        return groups.find(g => g.vendorId === vendorId);
    }, [groups]);

    const totalItems = useMemo(() => groups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0), 0), [groups]);
    const totalAmount = useMemo(() => groups.reduce((sum, g) => sum + g.subtotal, 0), [groups]);
    const vendorCount = groups.length;

    return (
        <CartContext.Provider value={{
            groups, addToCart, removeFromCart, updateQuantity,
            clearVendor, clearCart, totalItems, totalAmount,
            vendorCount, getVendorGroup
        }}>
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
