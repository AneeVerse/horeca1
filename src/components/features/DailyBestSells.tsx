'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Star, Store, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
    id: number;
    name: string;
    image: string;
    oldPrice: string;
    newPrice: string;
    rating: number;
    reviews: string;
    vendor: string;
    sold: number;
    total: number;
}

const BEST_SELL_PRODUCTS: Product[] = [
    {
        id: 1,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/daily-best-sell/best-sell1.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
        sold: 18,
        total: 35
    },
    {
        id: 2,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/daily-best-sell/best-sell2.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
        sold: 18,
        total: 35
    },
    {
        id: 3,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/daily-best-sell/best-sell3.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
        sold: 18,
        total: 35
    },
    {
        id: 4,
        name: 'Taylor Farms Broccoli Florets Vegetables',
        image: '/images/daily-best-sell/best-sell4.png',
        oldPrice: '$28.99',
        newPrice: '$14.99',
        rating: 4.8,
        reviews: '17k',
        vendor: 'By Lucky Supermarket',
        sold: 18,
        total: 35
    }
];

export function DailyBestSells() {
    return (
        <section className="w-full pb-16 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Header */}
                <h2 className="text-[24px] md:text-[32px] font-bold text-text mb-8">Daily Best Sells</h2>

                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Left: Product Grid (2x2) */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {BEST_SELL_PRODUCTS.map((product) => (
                            <div key={product.id} className="bg-white rounded-2xl border border-gray-100 p-4 transition-all duration-300 hover:shadow-lg flex gap-5 group relative">
                                {/* Sale Badge */}
                                <div className="absolute top-4 left-4 z-10 bg-[#ef4444] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                    Sale 50%
                                </div>

                                {/* Product Image */}
                                <div className="w-[120px] h-[120px] md:w-[140px] md:h-[140px] flex-shrink-0 bg-gray-50/50 rounded-xl p-2 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                                    />
                                </div>

                                {/* Content */}
                                <div className="flex flex-col flex-1 py-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] text-text-muted line-through">{product.oldPrice}</span>
                                        <span className="text-[14px] font-extrabold text-text">{product.newPrice}</span>
                                        <span className="text-[11px] text-text-muted">/Qty</span>
                                    </div>

                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[11px] font-bold text-text">{product.rating}</span>
                                        <Star size={10} className="fill-[#ffb800] text-[#ffb800]" />
                                        <span className="text-[10px] text-text-muted">({product.reviews})</span>
                                    </div>

                                    <h3 className="text-[14px] font-bold text-text leading-tight mb-2 line-clamp-2">
                                        {product.name}
                                    </h3>

                                    <div className="flex items-center gap-1.5 mb-3">
                                        <Store size={12} className="text-primary" />
                                        <span className="text-[11px] text-text-muted italic">{product.vendor}</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-auto">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] text-text-muted font-bold">Sold: {product.sold}/{product.total}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-500"
                                                style={{ width: `${(product.sold / product.total) * 100}%` }}
                                            />
                                        </div>

                                        <button className="w-full flex items-center justify-center gap-2 bg-[#e8f9e9] text-primary hover:bg-primary hover:text-white py-2 rounded-full text-[12px] font-bold transition-all border border-transparent">
                                            Add To Cart <ShoppingCart size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: Large Promo Banner */}
                    <div className="w-full xl:w-[450px] shrink-0 h-[400px] xl:h-auto rounded-[24px] overflow-hidden bg-[#f5eeff] relative flex flex-col items-center justify-center text-center p-8 group">
                        {/* Subtle pattern or overlay could go here */}
                        <div
                            className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply"
                            style={{
                                backgroundImage: "url('/images/banner2/banner-pattern-bg.png')",
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        />

                        <div className="relative z-10 w-full max-w-[320px] mb-8 transition-transform duration-500 group-hover:scale-105">
                            <img
                                src="/images/daily-best-sell/special-snacks-img.png"
                                alt="Special Snacks"
                                className="w-full h-auto drop-shadow-2xl"
                            />
                        </div>

                        <h3 className="relative z-10 text-[32px] md:text-[42px] font-extrabold text-text mb-8 leading-tight">
                            Special Snacks
                        </h3>

                        <Link
                            href="/shop"
                            className="relative z-10 bg-[#ff6b00] hover:bg-[#e66000] text-white px-10 py-3.5 rounded-full font-bold text-[15px] flex items-center gap-2 transition-all shadow-lg"
                        >
                            Shop Now
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
