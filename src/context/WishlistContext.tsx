'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { VendorProduct } from '@/types';

interface WishlistContextType {
    wishlist: VendorProduct[];
    addToWishlist: (product: VendorProduct) => void;
    removeFromWishlist: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;
    toggleWishlist: (product: VendorProduct) => void;
    clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [wishlist, setWishlist] = useState<VendorProduct[]>(() => {
        try {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('wishlist') : null;
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.error('Failed to parse wishlist', e);
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    const addToWishlist = useCallback((product: VendorProduct) => {
        setWishlist(prev => {
            if (prev.find(p => p.id === product.id)) return prev;
            return [...prev, product];
        });
    }, []);

    const removeFromWishlist = useCallback((productId: string) => {
        setWishlist(prev => prev.filter(p => p.id !== productId));
    }, []);

    // Use a Set for O(1) lookup instead of .some() on every call
    const wishlistIds = useMemo(() => new Set(wishlist.map(p => p.id)), [wishlist]);

    const isInWishlist = useCallback((productId: string) => {
        return wishlistIds.has(productId);
    }, [wishlistIds]);

    const toggleWishlist = useCallback((product: VendorProduct) => {
        if (wishlistIds.has(product.id)) {
            removeFromWishlist(product.id);
        } else {
            addToWishlist(product);
        }
    }, [wishlistIds, removeFromWishlist, addToWishlist]);

    const clearWishlist = useCallback(() => {
        setWishlist([]);
    }, []);

    const value = useMemo(() => ({
        wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist, clearWishlist,
    }), [wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist, clearWishlist]);

    return (
        <WishlistContext.Provider value={value}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
