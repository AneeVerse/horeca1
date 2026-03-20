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
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('wishlist');
        if (saved) {
            try {
                setWishlist(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse wishlist', e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Persist to localStorage (only after initial load to avoid overwriting with empty state)
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
        }
    }, [wishlist, isInitialized]);

    const addToWishlist = useCallback((product: VendorProduct) => {
        setWishlist(prev => {
            if (prev.find(p => p.id === product.id)) return prev;
            return [...prev, product];
        });
    }, []);

    const removeFromWishlist = useCallback((productId: string) => {
        setWishlist(prev => prev.filter(p => p.id !== productId));
    }, []);

    const isInWishlist = useCallback((productId: string) => {
        return wishlist.some(p => p.id === productId);
    }, [wishlist]);

    const toggleWishlist = useCallback((product: VendorProduct) => {
        setWishlist(prev => {
            const exists = prev.find(p => p.id === product.id);
            if (exists) {
                return prev.filter(p => p.id !== product.id);
            }
            return [...prev, product];
        });
    }, []);

    const value = useMemo(() => ({
        wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist
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

