'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Vendor {
    id: number;
    name: string;
    logo: string;
    deliveryTime: string;
    offer: string;
    bgColor: string;
    productImages: string[];
}

const VENDORS: Vendor[] = [
    {
        id: 1,
        name: 'Organic Market',
        logo: '/images/top vendors/vendor-logo1.png',
        deliveryTime: 'Delivery by 6:15am',
        offer: '$5 off Snack & Candy',
        bgColor: 'bg-[#f0f9ea]',
        productImages: [
            '/images/recom-product/product-img11.png',
            '/images/recom-product/product-img12.png',
            '/images/recom-product/product-img10.png',
            '/images/recom-product/product-img14.png',
            '/images/recom-product/product-img15.png',
        ]
    },
    {
        id: 2,
        name: 'Safeway',
        logo: '/images/top vendors/vendor-logo2.png',
        deliveryTime: 'Delivery by 6:15am',
        offer: '$5 off Snack & Candy',
        bgColor: 'bg-[#e7f6f8]',
        productImages: [
            '/images/recom-product/product-img11.png',
            '/images/recom-product/product-img12.png',
            '/images/recom-product/product-img10.png',
            '/images/recom-product/product-img14.png',
            '/images/recom-product/product-img15.png',
        ]
    },
    {
        id: 3,
        name: 'Food Max',
        logo: '/images/top vendors/vendor-logo3.png',
        deliveryTime: 'Delivery by 6:15am',
        offer: '$5 off Snack & Candy',
        bgColor: 'bg-[#f5eeff]',
        productImages: [
            '/images/recom-product/product-img11.png',
            '/images/recom-product/product-img12.png',
            '/images/recom-product/product-img10.png',
            '/images/recom-product/product-img14.png',
            '/images/recom-product/product-img15.png',
        ]
    },
    {
        id: 4,
        name: 'HRmart',
        logo: '/images/top vendors/vendor-logo4.png',
        deliveryTime: 'Delivery by 6:15am',
        offer: '$5 off Snack & Candy',
        bgColor: 'bg-[#faefe6]',
        productImages: [
            '/images/recom-product/product-img11.png',
            '/images/recom-product/product-img12.png',
            '/images/recom-product/product-img10.png',
            '/images/recom-product/product-img14.png',
            '/images/recom-product/product-img15.png',
        ]
    },
    {
        id: 5,
        name: 'Lucky Supermarket',
        logo: '/images/top vendors/vendor-logo5.png',
        deliveryTime: 'Delivery by 6:15am',
        offer: '$5 off Snack & Candy',
        bgColor: 'bg-[#faefe6]',
        productImages: [
            '/images/recom-product/product-img11.png',
            '/images/recom-product/product-img12.png',
            '/images/recom-product/product-img10.png',
            '/images/recom-product/product-img14.png',
            '/images/recom-product/product-img15.png',
        ]
    },
    {
        id: 6,
        name: 'Arico Farmer',
        logo: '/images/top vendors/vendor-logo6.png',
        deliveryTime: 'Delivery by 6:15am',
        offer: '$5 off Snack & Candy',
        bgColor: 'bg-[#e7eff8]',
        productImages: [
            '/images/recom-product/product-img11.png',
            '/images/recom-product/product-img12.png',
            '/images/recom-product/product-img10.png',
            '/images/recom-product/product-img14.png',
            '/images/recom-product/product-img15.png',
        ]
    },
    {
        id: 7,
        name: 'Farmer Market',
        logo: '/images/top vendors/vendor-logo7.png',
        deliveryTime: 'Delivery by 6:15am',
        offer: '$5 off Snack & Candy',
        bgColor: 'bg-[#eaf9eb]',
        productImages: [
            '/images/recom-product/product-img11.png',
            '/images/recom-product/product-img12.png',
            '/images/recom-product/product-img10.png',
            '/images/recom-product/product-img14.png',
            '/images/recom-product/product-img15.png',
        ]
    },
    {
        id: 8,
        name: 'Foodsco',
        logo: '/images/top vendors/vendor-logo8.png',
        deliveryTime: 'Delivery by 6:15am',
        offer: '$5 off Snack & Candy',
        bgColor: 'bg-[#f1f9ea]',
        productImages: [
            '/images/recom-product/product-img11.png',
            '/images/recom-product/product-img12.png',
            '/images/recom-product/product-img10.png',
            '/images/recom-product/product-img14.png',
            '/images/recom-product/product-img15.png',
        ]
    }
];

export function TopVendors() {
    return (
        <section className="w-full pb-16 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-[24px] md:text-[32px] font-bold text-text">Weekly Top Vendors</h2>
                    <Link href="/vendors" className="text-[14px] font-bold text-text-muted hover:text-primary transition-colors">
                        All Vendors
                    </Link>
                </div>

                {/* Vendors Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-12 md:gap-x-6">
                    {VENDORS.map((vendor) => (
                        <div key={vendor.id} className={cn(
                            "relative pt-8 md:pt-10 pb-4 md:pb-6 rounded-[20px] md:rounded-[24px] flex flex-col items-center transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 group",
                            vendor.bgColor
                        )}>
                            {/* Logo Wrapper */}
                            <div className="absolute -top-5 md:-top-6 left-1/2 -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-2 md:border-4 border-white transition-transform duration-500 group-hover:scale-110">
                                <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-contain p-1.5 md:p-2" />
                            </div>

                            {/* Vendor Info */}
                            <div className="text-center mb-4 md:mb-6 px-2">
                                <h3 className="text-[14px] md:text-[20px] font-bold text-text mb-0.5 md:mb-1 line-clamp-1">
                                    {vendor.name}
                                </h3>
                                <p className="text-[10px] md:text-[12px] text-text-muted font-medium mb-2 md:mb-3">
                                    {vendor.deliveryTime}
                                </p>
                                <div className="inline-block bg-[#ff6b00] text-white text-[8px] md:text-[11px] font-bold px-2 md:px-4 py-1 md:py-1.5 rounded-full shadow-sm whitespace-nowrap">
                                    {vendor.offer}
                                </div>
                            </div>

                            {/* Product Previews */}
                            <div className="flex items-center justify-center gap-1 md:gap-2 px-2">
                                {vendor.productImages.slice(0, 4).map((img, idx) => (
                                    <div key={idx} className="w-6 h-6 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center p-0.5 md:p-1 shadow-sm overflow-hidden transition-transform duration-300 hover:-translate-y-1">
                                        <img src={img} alt="Product Preview" className="w-full h-full object-contain hover:scale-110 transition-transform" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
