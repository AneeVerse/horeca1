'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
                setWishlist(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse wishlist', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    const addToWishlist = (product: VendorProduct) => {
        setWishlist(prev => {
            if (prev.find(p => p.id === product.id)) return prev;
            return [...prev, product];
        });
    };

    const removeFromWishlist = (productId: string) => {
        setWishlist(prev => prev.filter(p => p.id !== productId));
    };

    const isInWishlist = (productId: string) => {
        return wishlist.some(p => p.id === productId);
    };

    const toggleWishlist = (product: VendorProduct) => {
        if (isInWishlist(product.id)) {
            removeFromWishlist(product.id);
        } else {
            addToWishlist(product);
        }
    };

    return (
        <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist }}>
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
