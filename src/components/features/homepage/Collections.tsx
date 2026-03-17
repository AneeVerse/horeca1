'use client';

import React from 'react';
import Link from 'next/link';
import { MOCK_COLLECTIONS } from '@/lib/mockData';

export function Collections() {
    return (
        <section className="w-full py-4 bg-white">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[16px] md:text-[18px] lg:text-[22px] font-bold text-[#181725]">Collections</h2>
                    <span className="text-[12px] font-semibold text-[#299e60]">See all</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {MOCK_COLLECTIONS.map((col) => (
                        <Link
                            key={col.id}
                            href={`/category/${col.slug}`}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 hover:border-gray-200 active:scale-[0.98] transition-all text-center"
                            style={{ backgroundColor: col.color + '40' }}
                        >
                            <span className="text-[32px] md:text-[36px]">{col.icon}</span>
                            <h3 className="text-[12px] md:text-[13px] font-bold text-[#181725] leading-tight">{col.name}</h3>
                            <p className="text-[10px] text-gray-500 font-medium leading-tight line-clamp-2">{col.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
