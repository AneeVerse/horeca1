'use client';

import React from 'react';
import Link from 'next/link';
import { RotateCcw, ListOrdered, Store } from 'lucide-react';

export function QuickActions() {
    const actions = [
        { href: '/orders', icon: RotateCcw, label: 'Reorder', color: 'bg-blue-50 text-blue-600', desc: 'From last order' },
        { href: '/order-lists', icon: ListOrdered, label: 'Quick Order', color: 'bg-purple-50 text-purple-600', desc: 'Order lists' },
        { href: '/vendors', icon: Store, label: 'My Vendors', color: 'bg-orange-50 text-orange-600', desc: 'Saved vendors' },
    ];

    return (
        <section className="w-full py-3 bg-white">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="grid grid-cols-3 gap-3">
                    {actions.map((action) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl bg-gray-50/80 border border-gray-100 hover:shadow-md hover:border-gray-200 active:scale-[0.98] transition-all"
                        >
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${action.color}`}>
                                <action.icon size={20} />
                            </div>
                            <div className="text-center">
                                <p className="text-[12px] md:text-[13px] font-bold text-[#181725]">{action.label}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{action.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
