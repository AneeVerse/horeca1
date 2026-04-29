'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { VendorProduct, CartItem, VendorCartGroup, BulkPriceTier } from '@/types';
import { dal } from '@/lib/dal';

// CartItem extended with API item ID (needed for PATCH/DELETE on server cart)
interface CartItemWithId extends CartItem {
    cartItemId?: string;   // DB id from server cart (for PATCH/DELETE)
    basePriceGross: number; // gross price at qty < first bulk tier (never mutated after first add)
                            // used to recalculate tier price live when qty changes in cart
}

interface CartContextType {
    cart: CartItemWithId[];
    groups: VendorCartGroup[];
    addToCart: (product: VendorProduct, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;       // gross total (GST-inclusive)
    totalTaxable: number;   // taxable value (ex-GST)
    totalGST: number;       // GST portion = subtotal - totalTaxable
    totalAmount: number;
    vendorCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ---- HELPERS ----

/**
 * Given a base gross price and sorted bulk tier array, find the correct gross
 * unit price for `qty`. Tiers must be gross prices (already × (1 + tax%)).
 *
 * Logic: the highest tier whose minQty ≤ qty wins.
 *   qty=9  → no tier matches → basePrice
 *   qty=10 → tier1 (minQty:10) matches → tier1.price
 *   qty=50 → tier2 (minQty:50) also matches → tier2.price wins (highest match)
 */
function getEffectiveGrossPrice(basePriceGross: number, bulkPrices: BulkPriceTier[], qty: number): number {
    let price = basePriceGross;
    // Iterate ascending — last match wins (highest qualifying tier)
    const sorted = [...(bulkPrices || [])].sort((a, b) => a.minQty - b.minQty);
    for (const tier of sorted) {
        if (qty >= tier.minQty) price = tier.price;
    }
    return price;
}

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
                subtotalTaxable: 0,
                totalGST: 0,
                minOrderValue: item.product.vendorMinOrderValue || 0,
                meetsMinOrder: false
            };
        }
        grouped[vId].items.push(item);

        // Gross price (what customer sees) × qty
        const gross = (item.product.price || 0) * item.quantity;
        // Back-calculate taxable from gross: taxable = gross / (1 + gst%)
        const tax = item.product.taxPercent || 0;
        const taxable = tax > 0 ? gross / (1 + tax / 100) : gross;

        grouped[vId].subtotal += gross;
        grouped[vId].subtotalTaxable += taxable;
        grouped[vId].totalGST += gross - taxable;
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

            // unitPrice from DB is the taxable rate (ex-GST) — matches the active slab
            const unitPrice = Number(raw.unitPrice) || 0;
            const taxableRate = unitPrice > 0 ? unitPrice
                : priceSlabs.length > 0 ? Number(priceSlabs[0].price)
                : Number(product.basePrice) || 0;

            // Compute gross (GST-inclusive) price from taxable rate
            const taxPercent = Number(product.taxPercent) || 0;
            const grossPrice = Math.round(taxableRate * (1 + taxPercent / 100) * 100) / 100;

            // MRP: originalPrice from DB is also a taxable rate — compute gross MRP
            const originalTaxableRate = Number(product.originalPrice) || 0;
            const grossMRP = originalTaxableRate > 0
                ? Math.round(originalTaxableRate * (1 + taxPercent / 100) * 100) / 100
                : 0;

            const vp: VendorProduct = {
                id: product.id as string,
                name: (product.name as string) || '',
                description: '',
                price: grossPrice,                 // gross price shown to customer
                originalPrice: grossMRP || grossPrice,
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
                // Bulk price slabs: store gross prices for display
                bulkPrices: priceSlabs.map(s => ({
                    minQty: Number(s.minQty),
                    price: Math.round(Number(s.price) * (1 + taxPercent / 100) * 100) / 100,
                })),
                creditBadge: (product.creditEligible as boolean) || false,
                minOrderQuantity: Number(product.minOrderQty) || 1,
                taxPercent,
                taxableRate,
                vendorMinOrderValue: Number((itemVendor.minOrderValue as number) || 0),
                frequentlyOrdered: false,
                isDeal: false,
            };
            // basePriceGross = gross price at qty < first tier (single unit base price)
            // DB basePrice is taxable rate → compute gross
            const basePriceGross = Math.round(Number(product.basePrice) * (1 + taxPercent / 100) * 100) / 100 || grossPrice;

            items.push({
                productId: vp.id,
                product: vp,
                quantity: Number(raw.quantity) || 1,
                cartItemId: raw.id as string, // cart item DB id for PATCH/DELETE
                basePriceGross,
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

    // On mount: load cart (API if logged in, localStorage if guest).
    // On guest→login transition: merge localStorage items into the server cart
    // first, then load — otherwise items added while logged-out vanish.
    useEffect(() => {
        if (sessionStatus === 'loading') return;
        if (isLoggedIn) {
            const guestItems = loadLocalCart();
            const mergePayload = guestItems
                .map(it => ({
                    productId: it.productId,
                    vendorId: (it.product as { vendorId?: string })?.vendorId ?? '',
                    quantity: it.quantity,
                }))
                .filter(p => p.productId && p.vendorId && p.quantity > 0);

            const mergeFirst = mergePayload.length > 0
                ? fetch('/api/v1/cart/merge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: mergePayload }),
                  })
                    .then(() => { try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } })
                    .catch(() => { /* server merge failed — keep localStorage so we can retry on next login */ })
                : Promise.resolve();

            mergeFirst
                .then(() => dal.cart.get())
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
        // product.price = base gross price (below any bulk tier)
        // Compute the correct tier price for the quantity being added
        const basePriceGross = product.price;
        const effectiveGross = getEffectiveGrossPrice(basePriceGross, product.bulkPrices || [], quantity);
        const tax = product.taxPercent || 0;
        const effectiveTaxableRate = tax > 0 ? effectiveGross / (1 + tax / 100) : effectiveGross;
        const productWithEffectivePrice: VendorProduct = { ...product, price: effectiveGross, taxableRate: effectiveTaxableRate };

        if (isLoggedIn) {
            dal.cart.addItem(product.id, product.vendorId, quantity)
                .then(async () => {
                    // Refresh cart from API to get cartItemId and server-computed prices
                    const apiData = await dal.cart.get();
                    const items = fromApiCart(apiData as { vendorGroups: unknown[]; total: number });
                    setCart(items);
                })
                .catch(() => {
                    // Optimistic update on API failure — use locally-computed effective price
                    setCart(prev => {
                        const existing = prev.find(i => i.productId === product.id);
                        if (existing) {
                            const newQty = existing.quantity + quantity;
                            const newGross = getEffectiveGrossPrice(existing.basePriceGross, existing.product.bulkPrices || [], newQty);
                            const newTaxable = tax > 0 ? newGross / (1 + tax / 100) : newGross;
                            return prev.map(i => i.productId === product.id
                                ? { ...i, quantity: newQty, product: { ...i.product, price: newGross, taxableRate: newTaxable } }
                                : i);
                        }
                        return [...prev, { productId: product.id, product: productWithEffectivePrice, quantity, basePriceGross }];
                    });
                });
        } else {
            setCart(prev => {
                const existing = prev.find(i => i.productId === product.id);
                if (existing) {
                    const newQty = existing.quantity + quantity;
                    const newGross = getEffectiveGrossPrice(existing.basePriceGross, existing.product.bulkPrices || [], newQty);
                    const newTaxable = tax > 0 ? newGross / (1 + tax / 100) : newGross;
                    return prev.map(i => i.productId === product.id
                        ? { ...i, quantity: newQty, product: { ...i.product, price: newGross, taxableRate: newTaxable } }
                        : i);
                }
                return [...prev, { productId: product.id, product: productWithEffectivePrice, quantity, basePriceGross }];
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
            if (!item) return prev;

            // Enforce minOrderQuantity — silently block; UI must show the toast
            const minQty = item.product?.minOrderQuantity || 1;
            if (quantity < minQty) return prev;

            // ── LIVE TIER PRICE RECALCULATION ──────────────────────────────
            // Use the immutable basePriceGross (set at first add) to find the
            // correct tier price for the new quantity.
            //
            //   qty=9  → below tier1 (minQty:10) → basePriceGross (₹100)
            //   qty=10 → tier1 matches            → tier1.price    (₹90)
            //   qty=50 → tier2 also matches        → tier2.price    (₹80)
            const basePriceGross = item.basePriceGross || item.product?.price || 0;
            const newGrossPrice = getEffectiveGrossPrice(basePriceGross, item.product?.bulkPrices || [], quantity);
            const tax = item.product?.taxPercent || 0;
            const newTaxableRate = tax > 0 ? newGrossPrice / (1 + tax / 100) : newGrossPrice;

            // Sync with server cart (server also recalculates slab price)
            if (isLoggedIn && item.cartItemId) {
                dal.cart.updateItem(item.cartItemId, quantity).catch(() => {});
            }

            return prev.map(i => i.productId === productId ? {
                ...i,
                quantity,
                product: { ...i.product, price: newGrossPrice, taxableRate: newTaxableRate },
            } : i);
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

    // subtotal = gross total (GST-inclusive) — what customer pays before delivery
    const subtotal = useMemo(() => cart.reduce((sum, i) => sum + ((i.product?.price || 0) * i.quantity), 0), [cart]);

    // totalTaxable = taxable value (ex-GST): gross / (1 + gst%)
    const totalTaxable = useMemo(() => cart.reduce((sum, i) => {
        const tax = i.product?.taxPercent || 0;
        const gross = (i.product?.price || 0) * i.quantity;
        return sum + (tax > 0 ? gross / (1 + tax / 100) : gross);
    }, 0), [cart]);

    // totalGST = GST portion extracted from inclusive gross price
    const totalGST = useMemo(() => subtotal - totalTaxable, [subtotal, totalTaxable]);

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
        totalTaxable,
        totalGST,
        totalAmount,
        vendorCount,
    }), [cart, groups, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, subtotal, totalTaxable, totalGST, totalAmount, vendorCount]);

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
