'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { VendorProduct, CartItem, VendorCartGroup } from '@/types';
import { dal } from '@/lib/dal';

// CartItem extended with API item ID (needed for PATCH/DELETE on server cart)
interface CartItemWithId extends CartItem {
    cartItemId?: string; // DB id from server cart
}

interface CartContextType {
    cart: CartItemWithId[];
    groups: VendorCartGroup[];
    addToCart: (product: VendorProduct, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;
    totalAmount: number;
    vendorCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ---- HELPERS ----

function buildGroups(cart: CartItemWithId[]): VendorCartGroup[] {
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
                minOrderValue: item.product.minOrderQuantity || 0,
                meetsMinOrder: false
            };
        }
        grouped[vId].items.push(item);
        grouped[vId].subtotal += (item.product.price || 0) * item.quantity;
        grouped[vId].meetsMinOrder = grouped[vId].subtotal >= grouped[vId].minOrderValue;
    });
    return Object.values(grouped);
}

// Transform API cart response into local CartItemWithId[]
// API shape: { vendorGroups: [{ vendor, items: [{ id, quantity, unitPrice, product, vendor }], subtotal, meetsMov }], total }
function fromApiCart(apiData: { vendorGroups: unknown[]; total: number }): CartItemWithId[] {
    const items: CartItemWithId[] = [];
    for (const group of (apiData.vendorGroups || []) as Array<Record<string, unknown>>) {
        // vendor info lives at group.vendor (not group.vendorName)
        const groupVendor = (group.vendor as Record<string, unknown>) || {};

        for (const raw of ((group.items || []) as Array<Record<string, unknown>>)) {
            const product = raw.product as Record<string, unknown> | null;
            if (!product) continue;

            // Each item also has a vendor relation for logo/name
            const itemVendor = (raw.vendor as Record<string, unknown>) || groupVendor;
            const priceSlabs = (product.priceSlabs as Array<Record<string, unknown>>) || [];
            const inventory = product.inventory as Record<string, unknown> | null;

            const unitPrice = Number(raw.unitPrice) || 0;
            const price = unitPrice > 0 ? unitPrice
                : priceSlabs.length > 0 ? Number(priceSlabs[0].price)
                : Number(product.basePrice) || 0;

            const vp: VendorProduct = {
                id: product.id as string,
                name: (product.name as string) || '',
                description: '',
                price,
                originalPrice: Number(product.basePrice) || 0,
                images: product.imageUrl ? [product.imageUrl as string] : [],
                category: '',
                packSize: (product.packSize as string) || '1 unit',
                unit: (product.unit as string) || 'unit',
                stock: inventory ? Number(inventory.qtyAvailable) || 0 : 0,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                vendorId: (raw.vendorId as string) || (itemVendor.id as string) || '',
                vendorName: (itemVendor.businessName as string) || '',
                vendorLogo: (itemVendor.logoUrl as string) || '',
                bulkPrices: priceSlabs.map(s => ({ minQty: Number(s.minQty), price: Number(s.price) })),
                creditBadge: (product.creditEligible as boolean) || false,
                minOrderQuantity: priceSlabs.length > 0 ? Number(priceSlabs[0].minQty) : 1,
                frequentlyOrdered: false,
                isDeal: false,
            };
            items.push({
                productId: vp.id,
                product: vp,
                quantity: Number(raw.quantity) || 1,
                cartItemId: raw.id as string, // cart item DB id for PATCH/DELETE
            });
        }
    }
    return items;
}

const STORAGE_KEY = 'horeca_cart';

function loadLocalCart(): CartItemWithId[] {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        return s ? JSON.parse(s) : [];
    } catch { return []; }
}

function saveLocalCart(cart: CartItemWithId[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* ignore */ }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const { status: sessionStatus } = useSession();
    const isLoggedIn = sessionStatus === 'authenticated';
    const [cart, setCart] = useState<CartItemWithId[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // On mount: load cart (API if logged in, localStorage if guest)
    useEffect(() => {
        if (sessionStatus === 'loading') return;
        if (isLoggedIn) {
            dal.cart.get()
                .then(apiData => {
                    const items = fromApiCart(apiData as { vendorGroups: unknown[]; total: number });
                    setCart(items);
                })
                .catch(() => {
                    // Fallback to localStorage if API fails
                    setCart(loadLocalCart());
                })
                .finally(() => setIsInitialized(true));
        } else {
            setCart(loadLocalCart());
            setIsInitialized(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionStatus]);

    // Persist to localStorage only for guest users
    useEffect(() => {
        if (!isInitialized || isLoggedIn) return;
        saveLocalCart(cart);
    }, [cart, isInitialized, isLoggedIn]);

    const addToCart = useCallback((product: VendorProduct, quantity: number = 1) => {
        if (isLoggedIn) {
            dal.cart.addItem(product.id, product.vendorId, quantity)
                .then(async () => {
                    // Refresh cart from API to get the cartItemId
                    const apiData = await dal.cart.get();
                    const items = fromApiCart(apiData as { vendorGroups: unknown[]; total: number });
                    setCart(items);
                })
                .catch(() => {
                    // Optimistic update on API failure
                    setCart(prev => {
                        const existing = prev.find(i => i.productId === product.id);
                        if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i);
                        return [...prev, { productId: product.id, product, quantity }];
                    });
                });
        } else {
            setCart(prev => {
                const existing = prev.find(i => i.productId === product.id);
                if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i);
                return [...prev, { productId: product.id, product, quantity }];
            });
        }
    }, [isLoggedIn]);

    const removeFromCart = useCallback((productId: string) => {
        setCart(prev => {
            const item = prev.find(i => i.productId === productId);
            if (isLoggedIn && item?.cartItemId) {
                dal.cart.removeItem(item.cartItemId).catch(() => {});
            }
            return prev.filter(i => i.productId !== productId);
        });
    }, [isLoggedIn]);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setCart(prev => {
            const item = prev.find(i => i.productId === productId);
            if (isLoggedIn && item?.cartItemId) {
                dal.cart.updateItem(item.cartItemId, quantity).catch(() => {});
            }
            return prev.map(i => i.productId === productId ? { ...i, quantity } : i);
        });
    }, [isLoggedIn, removeFromCart]);

    const clearCart = useCallback(() => {
        if (isLoggedIn) {
            dal.cart.clear().catch(() => {});
        }
        setCart([]);
    }, [isLoggedIn]);

    const groups = useMemo(() => buildGroups(cart), [cart]);
    const totalItems = useMemo(() => cart.reduce((sum, i) => sum + (i.quantity || 0), 0), [cart]);
    const subtotal = useMemo(() => cart.reduce((sum, i) => sum + ((i.product?.price || 0) * i.quantity), 0), [cart]);
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
