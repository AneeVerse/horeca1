'use client';

import React from 'react';
import Link from 'next/link';
import { Home, LayoutGrid, User, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
    activeTab?: string;
    onCategoriesClick: () => void;
}

export function MobileBottomNav({ activeTab = 'home', onCategoriesClick }: MobileBottomNavProps) {
    return (
        <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-100 pb-safe-area-inset-bottom"
            style={{
                transform: 'translate3d(0, 0, 0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
            }}
        >
            <div className="flex items-center justify-around py-3 px-2">
                <Link
                    href="/"
                    className={cn(
                        "flex flex-col items-center gap-1 min-w-[64px]",
                        activeTab === 'home' ? "text-primary" : "text-gray-500"
                    )}
                >
                    <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Home</span>
                </Link>

                <button
                    onClick={onCategoriesClick}
                    className={cn(
                        "flex flex-col items-center gap-1 min-w-[64px]",
                        activeTab === 'categories' ? "text-primary" : "text-gray-500"
                    )}
                >
                    <LayoutGrid size={22} strokeWidth={activeTab === 'categories' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Categories</span>
                </button>

                <Link
                    href="https://wa.me/911234567890"
                    target="_blank"
                    className="flex flex-col items-center gap-1 min-w-[64px] text-gray-500"
                >
                    <div className="relative">
                        <svg
                            viewBox="0 0 24 24"
                            width="22"
                            height="22"
                            fill="currentColor"
                            className="text-[#25D366]"
                        >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.12.554 4.189 1.602 6.06L0 24l6.117-1.605a11.77 11.77 0 005.925 1.585h.005c6.637 0 12.032-5.396 12.035-12.03a11.799 11.799 0 00-3.517-8.471z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-bold">WhatsApp</span>
                </Link>

                <Link
                    href="/account"
                    className={cn(
                        "flex flex-col items-center gap-1 min-w-[64px]",
                        activeTab === 'account' ? "text-primary" : "text-gray-500"
                    )}
                >
                    <User size={22} strokeWidth={activeTab === 'account' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Account</span>
                </Link>
            </div>
        </div>
    );
}
