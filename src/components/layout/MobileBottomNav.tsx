'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
    activeTab?: string;
    onCategoriesClick: () => void;
}

export function MobileBottomNav({ activeTab = 'home', onCategoriesClick }: MobileBottomNavProps) {
    const navItems = [
        {
            id: 'home',
            label: 'Shop',
            icon: '/images/mobile-nav/shop.png',
            href: '/',
            type: 'link'
        },
        {
            id: 'categories',
            label: 'Explore',
            icon: '/images/mobile-nav/explore.png',
            onClick: onCategoriesClick,
            type: 'button'
        },
        {
            id: 'cart',
            label: 'Cart',
            icon: '/images/mobile-nav/cart.png',
            href: '/cart',
            type: 'link'
        },
        {
            id: 'wishlist',
            label: 'Favourite',
            icon: '/images/mobile-nav/fav.png',
            href: '#',
            type: 'link'
        },
        {
            id: 'account',
            label: 'Account',
            icon: '/images/mobile-nav/account.png',
            href: '/account',
            type: 'link'
        }
    ];

    return (
        <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-100 pb-safe-area-inset-bottom h-[72px]"
            style={{
                boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
                transform: 'translate3d(0, 0, 0)',
                WebkitBackfaceVisibility: 'hidden'
            }}
        >
            <div className="flex items-center justify-around h-full px-2">
                {navItems.map((item) => {
                    const isCart = item.id === 'cart';

                    const content = (
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div className="relative w-[22px] h-[22px]">
                                <img
                                    src={item.icon}
                                    alt={item.label}
                                    className={cn(
                                        "w-full h-full object-contain transition-all duration-300",
                                        isCart ? "" : "brightness-0 opacity-80"
                                    )}
                                />
                            </div>
                            <span className={cn(
                                "text-[11px] font-bold tracking-tight",
                                isCart ? "text-[#33a852]" : "text-[#1a1a1a]"
                            )}>
                                {item.label}
                            </span>
                        </div>
                    );

                    if (item.type === 'link') {
                        return (
                            <Link
                                key={item.id}
                                href={item.href || '#'}
                                className="flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform"
                            >
                                {content}
                            </Link>
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={item.onClick}
                            className="flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform border-none bg-transparent"
                        >
                            {content}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
