'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Home,
    Store,
    ShoppingCart,
    Package,
    Settings
} from 'lucide-react';

interface MobileBottomNavProps {
    onCategoriesClick?: () => void;
    onStoreClick?: () => void;
}

export function MobileBottomNav({ onCategoriesClick, onStoreClick }: MobileBottomNavProps) {
    const pathname = usePathname();

    const navItems = [
        {
            id: 'home',
            label: 'Home',
            icon: Home,
            href: '/',
        },
        {
            id: 'store',
            label: 'Store',
            icon: Store,
            href: '/category', // Match any category page
            onClick: onStoreClick,
        },
        {
            id: 'cart',
            label: 'Cart',
            icon: ShoppingCart,
            href: '/cart',
        },
        {
            id: 'order',
            label: 'Order',
            icon: Package,
            href: '/orders',
        },
        {
            id: 'setting',
            label: 'Setting',
            icon: Settings,
            href: '/settings',
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
                    const isActive = item.href === '/'
                        ? pathname === '/'
                        : pathname?.startsWith(item.href);

                    const Icon = item.icon;

                    const content = (
                        <div className="flex flex-col items-center justify-center gap-1">
                            <Icon
                                size={24}
                                className={cn(
                                    "transition-all duration-300",
                                    isActive ? "text-[#33a852]" : "text-[#1a1a1a]"
                                )}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className={cn(
                                "text-[10px] font-bold tracking-tight transition-colors duration-300",
                                isActive ? "text-[#33a852]" : "text-[#1a1a1a]"
                            )}>
                                {item.label}
                            </span>
                        </div>
                    );

                    if ('onClick' in item && item.onClick) {
                        return (
                            <button
                                key={item.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    (item as any).onClick?.();
                                }}
                                className="flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform border-none bg-transparent outline-none"
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform"
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

