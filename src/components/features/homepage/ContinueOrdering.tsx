'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Clock, ChevronRight, ChevronLeft, AlertCircle, ShoppingCart, Package, Eye } from 'lucide-react';
import { MOCK_VENDORS, MOCK_ORDER_LISTS } from '@/lib/mockData';
import { useCart } from '@/context/CartContext';


// =============================================================================
// Continue Ordering — Matches UI/UX Notes Section 3
// Priority: 1) Active Cart  2) Past Orders  3) Quick Order Lists  4) Recently Viewed
// =============================================================================

interface ContinueCard {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorLogo: string;
    vendorLogos?: string[]; // Multiple logos for multi-vendor lists
    subtitle: string;
    subtitle2?: string; // Second line (for time/meta)
    subtitleIcon: 'cart' | 'order' | 'list' | 'viewed';
    href: string;
    priority: number; // 1 = cart, 2 = past order, 3 = order list, 4 = recently viewed
    timestamp: number; // for sorting within same priority
}

export function ContinueOrdering() {
    const [isMounted, setIsMounted] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [cards, setCards] = useState<ContinueCard[]>([]);
    const { groups: cartGroups, totalItems: cartTotalItems } = useCart();
    const pathname = usePathname(); // Re-runs buildCards on every route change

    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = 350;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth'
            });
            setTimeout(checkScroll, 350);
        }
    };

    useEffect(() => {
        setIsMounted(true);
        setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    }, []);

    const getRelativeTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    // Build merged cards from all 4 sources
    useEffect(() => {
        if (!isMounted || !isLoggedIn) return;

        const buildCards = () => {
            const seenVendors = new Set<string>();
            const allCards: ContinueCard[] = [];

            // ── SOURCE 1: Active Cart (abandoned cart) ──
            cartGroups.forEach(group => {
                if (seenVendors.has(group.vendorId)) return;
                seenVendors.add(group.vendorId);

                const itemCount = group.items.reduce((sum, item) => sum + item.quantity, 0);
                const total = group.subtotal;

                allCards.push({
                    id: `cart-${group.vendorId}`,
                    vendorId: group.vendorId,
                    vendorName: group.vendorName,
                    vendorLogo: group.vendorLogo || MOCK_VENDORS.find(v => v.id === group.vendorId)?.logo || '',
                    subtitle: `${itemCount} items in cart • ₹${total.toLocaleString('en-IN')}`,
                    subtitleIcon: 'cart',
                    href: '/cart',
                    priority: 1,
                    timestamp: Date.now(),
                });
            });

            // ── SOURCE 2: Past Orders (from localStorage) ──
            try {
                const savedOrders = localStorage.getItem('horeca_orders');
                if (savedOrders) {
                    const orders = JSON.parse(savedOrders);
                    // Sort by createdAt desc
                    orders
                        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .forEach((order: any) => {
                            const vendorId = order.vendorId;
                            if (!vendorId || seenVendors.has(vendorId)) return;
                            seenVendors.add(vendorId);

                            const vendor = MOCK_VENDORS.find(v => v.id === vendorId);
                            const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                            allCards.push({
                                id: `order-${order.id}`,
                                vendorId,
                                vendorName: order.vendorName || vendor?.name || 'Vendor',
                                vendorLogo: order.vendorLogo || vendor?.logo || '',
                                subtitle: `Ordered`,
                                subtitle2: getRelativeTime(new Date(order.createdAt).getTime()),
                                subtitleIcon: 'order',
                                href: '/orders',
                                priority: 2,
                                timestamp: new Date(order.createdAt).getTime(),
                            });
                        });
                }
            } catch (e) {
                console.error('Failed to parse past orders:', e);
            }

            // ── SOURCE 3: Quick Order Lists ──
            try {
                const savedLists = localStorage.getItem('horeca_order_lists_all');
                let orderLists: any[] = [];

                if (savedLists) {
                    orderLists = JSON.parse(savedLists);
                    // Merge missing mock lists
                    if (orderLists.length < MOCK_ORDER_LISTS.length) {
                        MOCK_ORDER_LISTS.forEach(mockList => {
                            if (!orderLists.find((l: any) => l.id === mockList.id)) {
                                orderLists.push(mockList);
                            }
                        });
                        localStorage.setItem('horeca_order_lists_all', JSON.stringify(orderLists));
                    }
                } else {
                    orderLists = [...MOCK_ORDER_LISTS];
                    localStorage.setItem('horeca_order_lists_all', JSON.stringify(MOCK_ORDER_LISTS));
                }

                orderLists
                    .filter((list: any) => !!list.lastUsed)
                    .sort((a: any, b: any) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
                    .forEach((list: any) => {
                        const vendorId = list.vendorId;
                        if (!vendorId || seenVendors.has(vendorId)) return;
                        seenVendors.add(vendorId);

                        const vendor = MOCK_VENDORS.find(v => v.id === vendorId);
                        
                        // Check if list has products from multiple vendors
                        const listVendorIds = new Set<string>();
                        if (list.items) {
                            list.items.forEach((item: any) => {
                                const vid = item.product?.vendorId || list.vendorId || vendorId;
                                if (vid) listVendorIds.add(vid);
                            });
                        }
                        
                        const logos = Array.from(listVendorIds).map(vid => MOCK_VENDORS.find(v => v.id === vid)?.logo).filter(Boolean) as string[];

                        // Get base vendor name to avoid double "+ N more"
                        // Regex strips any existing " + N more" pattern
                        const rawName = list.vendorName || vendor?.name || 'Vendor';
                        const baseVendorName = rawName.replace(/\s\+\s\d+\smore.*/, '');
                        let displayVendorName = baseVendorName;
                        if (listVendorIds.size > 1) {
                            displayVendorName = `${displayVendorName} + ${listVendorIds.size - 1} more`;
                        }

                        allCards.push({
                            id: `list-${list.id}`,
                            vendorId,
                            vendorName: displayVendorName,
                            vendorLogo: list.vendorLogo || vendor?.logo || '',
                            vendorLogos: logos.length > 1 ? logos : undefined,
                            subtitle: `${list.name} • ${list.items.length} items`,
                            subtitle2: `Used ${getRelativeTime(new Date(list.lastUsed).getTime())}`,
                            subtitleIcon: 'list',
                            href: `/order-lists/${list.id}`,
                            priority: 3,
                            timestamp: new Date(list.lastUsed).getTime(),
                        });
                    });
            } catch (e) {
                console.error('Failed to parse order lists:', e);
            }

            // ── SOURCE 4: Recently Viewed Vendors (browsing history) ──
            // If vendor already exists from a higher-priority source, BOOST its timestamp
            // so it appears at the front. If vendor is new, add as a "viewed" card.
            try {
                const savedViewed = localStorage.getItem('horeca_recently_viewed');
                if (savedViewed) {
                    const viewedEntries = JSON.parse(savedViewed);
                    viewedEntries.forEach((entry: any) => {
                        const vendorId = entry.vendorId;
                        if (!vendorId) return;

                        // Build the "Recently Viewed" label from viewed products
                        const products = entry.viewedProducts || [];
                        let productLabel = 'Recently Viewed';
                        if (products.length === 1) {
                            productLabel = `Recently Viewed • ${products[0].name}`;
                        } else if (products.length > 1) {
                            productLabel = `Recently Viewed • ${products[0].name} + ${products.length - 1} more`;
                        }
                        
                        // Always include the relative time in subtitle2
                        const finalSubtitle2 = getRelativeTime(entry.viewedAt || 0);

                        if (seenVendors.has(vendorId)) {
                            // Vendor already has a card from another source —
                            // OVERRIDE it with "Recently Viewed" info since user just browsed
                            const existing = allCards.find(c => c.vendorId === vendorId);
                            if (existing) {
                                existing.subtitle = productLabel;
                                existing.subtitle2 = finalSubtitle2;
                                existing.subtitleIcon = 'viewed';
                                existing.href = products.length > 0 
                                    ? `/recently-viewed/${entry.vendorId}` 
                                    : `/vendor/${entry.vendorId}`;
                                if (entry.viewedAt > existing.timestamp) {
                                    existing.timestamp = entry.viewedAt;
                                }
                            }
                        } else {
                            // New vendor — add a "viewed" card
                            seenVendors.add(vendorId);

                            allCards.push({
                                id: `viewed-${vendorId}`,
                                vendorId,
                                vendorName: entry.vendorName || 'Vendor',
                                vendorLogo: entry.vendorLogo || MOCK_VENDORS.find(v => v.id === vendorId)?.logo || '',
                                subtitle: productLabel,
                                subtitle2: finalSubtitle2,
                                subtitleIcon: 'viewed',
                                href: products.length > 0 
                                    ? `/recently-viewed/${entry.vendorId}` 
                                    : `/vendor/${entry.vendorId}`,
                                priority: 4,
                                timestamp: entry.viewedAt || 0,
                            });
                        }
                    });
                }
            } catch (e) {
                console.error('Failed to parse recently viewed:', e);
            }

            // Sort: by timestamp desc (most recently interacted first)
            allCards.sort((a, b) => b.timestamp - a.timestamp);

            setCards(allCards);
        };

        buildCards();

        // Listen for storage changes from other tabs
        window.addEventListener('storage', buildCards);
        // Listen for tab focus and visibility changes
        window.addEventListener('focus', buildCards);
        const handleVisibility = () => { if (document.visibilityState === 'visible') buildCards(); };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('storage', buildCards);
            window.removeEventListener('focus', buildCards);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [isMounted, isLoggedIn, cartGroups]);

    if (!isMounted || !isLoggedIn || cards.length === 0) return null;

    const getSubtitleIcon = (type: ContinueCard['subtitleIcon']) => {
        switch (type) {
            case 'cart':
                return <ShoppingCart size={10} className="md:w-3 md:h-3" />;
            case 'order':
                return <Package size={10} className="md:w-3 md:h-3" />;
            case 'list':
                return <ClipboardList size={10} className="md:w-3 md:h-3" />;
            case 'viewed':
                return <Eye size={10} className="md:w-3 md:h-3" />;
        }
    };

    const getSubtitleColor = (type: ContinueCard['subtitleIcon']) => {
        switch (type) {
            case 'cart':
                return 'text-[#e67e22] font-bold'; // orange for abandoned cart
            case 'order':
                return 'text-[#299e60] font-bold'; // green for past orders
            case 'list':
                return 'text-[#3b82f6] font-bold'; // blue for order lists
            case 'viewed':
                return 'text-[#8b5cf6] font-bold'; // purple for recently viewed
        }
    };

    return (
        <section className="w-full py-4 bg-white">
            <div className="max-w-[var(--container-max)] mx-auto overflow-hidden">
                <div className="flex items-center justify-between mb-6 px-6 md:px-[var(--container-padding)]">
                    <h2 className="text-[18px] md:text-[22px] lg:text-[24px] font-[900] text-[#181725] tracking-tight">Continue Ordering</h2>
                    <Link href="/continue-ordering" className="text-[#53B175] font-black text-sm transition-all hover:translate-x-1 cursor-pointer">
                        View All
                    </Link>
                </div>

                <div className="relative w-full px-1">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <ChevronLeft size={24} className="text-[#181725]" strokeWidth={2.5} />
                    </button>

                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        className="overflow-x-auto no-scrollbar scroll-smooth w-full"
                    >
                        <div className="flex flex-nowrap gap-3 md:gap-5 py-4 px-6 md:px-[var(--container-padding)] w-max">
                            {cards.map((card) => {
                                const vendor = MOCK_VENDORS.find(v => v.id === card.vendorId);

                                return (
                                    <Link
                                        key={card.id}
                                        href={card.href}
                                        className="flex items-center gap-3 md:gap-4 min-w-[260px] md:min-w-[320px] bg-white rounded-2xl p-3 md:p-4 border border-gray-200 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 hover:border-[#53B175]/40 transition-all group shrink-0"
                                    >
                                        {/* Vendor Logo or Logo Stack */}
                                        <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 relative flex items-center justify-center">
                                            {card.vendorLogos && card.vendorLogos.length > 1 ? (
                                                <div className="relative w-full h-full">
                                                    {card.vendorLogos.slice(0, 4).map((logoUrl, i) => (
                                                        <div 
                                                            key={i} 
                                                            className="absolute rounded-full overflow-hidden aspect-square bg-transparent"
                                                            style={{ 
                                                                width: '60%',
                                                                height: '60%',
                                                                left: (i === 1 || i === 3) ? '40%' : '0%',
                                                                top: (i === 2 || i === 3) ? '40%' : '0%',
                                                                zIndex: 4 - i 
                                                            }}
                                                        >
                                                            <img src={logoUrl} alt="vendor" className="w-full h-full object-cover rounded-full border border-white" />
                                                        </div>
                                                    ))}
                                                    {card.vendorLogos.length > 4 && (
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#53B175] text-white text-[8px] md:text-[9px] font-bold flex items-center justify-center border border-white z-20">
                                                            +{card.vendorLogos.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-transparent overflow-hidden shrink-0 border border-gray-50">
                                                    <img
                                                        src={card.vendorLogo || vendor?.logo || ''}
                                                        alt={card.vendorName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] md:text-[16px] font-bold text-[#181725] line-clamp-1 transition-colors group-hover:text-[#53B175]">
                                                {card.vendorName}
                                            </p>

                                            <div className="flex flex-col mt-0.5">
                                                <div className="flex flex-col text-[10px] md:text-[12px] font-semibold whitespace-nowrap overflow-hidden">
                                                    <div className={`flex items-center gap-0.5 ${getSubtitleColor(card.subtitleIcon)}`}>
                                                        {getSubtitleIcon(card.subtitleIcon)}
                                                        <span className="truncate">{card.subtitle}</span>
                                                    </div>
                                                    {card.subtitle2 && (
                                                        <div className="flex items-center gap-1 mt-0.5 text-[9px] md:text-[11px] font-medium text-[#7C7C7C]">
                                                            <Clock size={10} strokeWidth={2} />
                                                            <span>{card.subtitle2}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chevron */}
                                        <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-white flex items-center justify-center border border-gray-200 text-gray-400 group-hover:text-[#53B175] group-hover:border-[#53B175]/30 transition-all group-hover:translate-x-1 shadow-sm">
                                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 shrink-0" strokeWidth={2.5} />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <ChevronRight size={24} className="text-[#181725]" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </section>
    );
}
