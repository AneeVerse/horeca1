'use client';

import React from 'react';

interface Product {
    id: string;
    name: string;
    image: string;
    category: string;
}

interface BrandProductCardProps {
    product: Product;
}

export function BrandProductCard({ product }: BrandProductCardProps) {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23e5e5e5" width="100" height="100"/%3E%3Ctext x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="%23999" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';
    };

    return (
        <div className="flex flex-col gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-primary transition-all">
            {/* Product Image */}
            <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                    onError={handleImageError}
                />
            </div>

            {/* Product Info */}
            <div className="flex-1">
                <p className="text-[12px] font-semibold text-text line-clamp-2">{product.name}</p>
                <p className="text-[10px] text-text-muted mt-1">{product.category}</p>
            </div>
        </div>
    );
}
