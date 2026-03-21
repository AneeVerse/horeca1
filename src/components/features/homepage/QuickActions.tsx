'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, ListOrdered, Store } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

export function QuickActions() {
    const { status } = useSession();
    const isLoggedIn = status === 'authenticated';
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const actions = [
        { href: '/orders', icon: RotateCcw, label: 'Reorder', color: 'bg-blue-50 text-blue-600', desc: 'From last order' },
        { href: '/order-lists', icon: ListOrdered, label: 'Quick Order', color: 'bg-purple-50 text-purple-600', desc: 'Order lists' },
        { href: '/vendors', icon: Store, label: 'My Vendors', color: 'bg-orange-50 text-orange-600', desc: 'Saved vendors' },
    ];

    if (!isMounted || !isLoggedIn) return null;

    return (
        <section className="w-full py-3 bg-white">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="grid grid-cols-3 md:flex md:items-center md:justify-center gap-2 md:gap-6 lg:gap-8">
                    {actions.map((action) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className="flex flex-col md:flex-row items-center gap-2 md:gap-6 p-2.5 md:p-6 md:flex-1 md:max-w-[360px] rounded-2xl md:rounded-[32px] bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 hover:border-[#53B175]/40 hover:-translate-y-1 active:scale-[0.98] transition-all group"
                        >
                            <div className={cn(
                                "w-9 h-9 min-[340px]:w-11 min-[340px]:h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500 shadow-sm",
                                action.color
                            )}>
                                <action.icon className="w-5 h-5 md:w-8 md:h-8" strokeWidth={2.5} />
                            </div>
                            <div className="text-center md:text-left min-w-0">
                                <p className="text-[11px] min-[340px]:text-[13px] md:text-[18px] font-black text-[#181725] md:mb-1 group-hover:text-[#53B175] transition-colors">{action.label}</p>
                                <p className="text-[9px] min-[340px]:text-[11px] md:text-[14px] text-gray-400 font-medium leading-tight line-clamp-1">{action.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
