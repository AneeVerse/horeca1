'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { VendorProduct } from '@/types';

interface WishlistContextType {
    wishlist: VendorProduct[];
    addToWishlist: (product: VendorProduct) => void;
    removeFromWishlist: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;
    toggleWishlist: (product: VendorProduct) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [wishlist, setWishlist] = useState<VendorProduct[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('wishlist');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setWishlist(parsed);
            } catch (e) {
                console.error('Failed to parse wishlist', e);
                localStorage.removeItem('wishlist');
            }
        }
    }, []);

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

    const value = useMemo(() => ({
        wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist,
    }), [wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist]);

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
