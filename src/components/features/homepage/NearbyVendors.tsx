'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { MOCK_VENDORS } from '@/lib/mockData';

// Cover images for vendor cards (cycling through available images)
const VENDOR_COVERS = [
    '/images/vendors/chad-peltola-BTvQ2ET_iKc-unsplash.webp',
    '/images/vendors/eryka-ragna-K5dvZHBJp3k-unsplash.webp',
    '/images/vendors/gioia-m-EGjfIKl_ZvE-unsplash.webp',
    '/images/vendors/kylle-pangan-LjpD-uW4dH0-unsplash.webp',
    '/images/vendors/m-veven-4oHtqbwy7Lo-unsplash.webp',
    '/images/vendors/sleeba-thomas-h-T2VPkw9Kw-unsplash.webp',
    '/images/vendors/young-kane-kSDOJRNol9E-unsplash.webp',
];

// Mock distances and addresses for nearby vendors
const VENDOR_LOCATIONS = [
    { distance: '2.3km', address: 'MG Road, Sector 5, Near Metro Station' },
    { distance: '3.1km', address: 'Trade Center, Industrial Area, Phase 2' },
    { distance: '5.7km', address: 'Korum Mall, Khopat, Thane West' },
    { distance: '1.8km', address: 'Station Road, Shop No 12, Main Market' },
    { distance: '4.2km', address: 'Linking Road, Near Signal, Bandra' },
    { distance: '6.5km', address: 'APMC Market, Vashi, Navi Mumbai' },
    { distance: '3.8km', address: 'Hill Road, Near Temple, Dadar' },
    { distance: '2.9km', address: 'LBS Marg, Mulund Check Naka' },
    { distance: '7.1km', address: 'Hiranandani Estate, Thane' },
    { distance: '11km', address: 'Seawoods Grand Central, Nerul' },
    { distance: '4.5km', address: 'Powai Plaza, Chandivali' },
    { distance: '5.2km', address: 'R City Mall, Ghatkopar West' },
];

// Mock offer tags
const VENDOR_OFFERS = [
    'Flat 30% OFF + FLAT ₹250 OFF',
    'Flat 20% OFF + FREE Delivery',
    'Flat 25% OFF on First Order',
    'Buy 2 Get 1 FREE',
    'Flat ₹500 OFF on ₹2000+',
    'Flat 15% OFF + FLAT ₹100 OFF',
];

function VendorCard({ vendor, index }: { vendor: typeof MOCK_VENDORS[0]; index: number }) {
    const cover = VENDOR_COVERS[index % VENDOR_COVERS.length];
    const location = VENDOR_LOCATIONS[index % VENDOR_LOCATIONS.length];
    const offer = VENDOR_OFFERS[index % VENDOR_OFFERS.length];
    const cuisineLabel = vendor.categories.slice(0, 2).join(' • ');
    const priceForTwo = `₹${vendor.minOrderValue} f...`;

    return (
        <Link
            href={`/vendor/${vendor.id}`}
            className="flex-none w-[230px] md:w-[270px] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:-translate-y-1.5 transition-transform duration-300 group"
        >
            {/* Cover Image */}
            <div className="relative w-full h-[160px] md:h-[180px] overflow-hidden">
                <Image
                    src={cover}
                    alt={vendor.name}
                    fill
                    sizes="(max-width: 768px) 230px, 270px"
                    className="object-cover"
                />
                {/* Offer Badge */}
                <div className="absolute bottom-2 left-2 right-2">
                    <span className="inline-flex items-center gap-1 bg-[#2c7a2c]/90 backdrop-blur-sm text-white text-[10px] md:text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                        <span className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full inline-block" />
                        {offer}
                    </span>
                </div>
            </div>

            {/* Info */}
            <div className="p-3.5">
                {/* Name + Bookmark */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-[15px] md:text-[16px] font-extrabold text-[#111] line-clamp-1 leading-tight">
                        {vendor.name}
                    </h3>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="shrink-0 mt-0.5 text-gray-400 hover:text-[#53B175] transition-colors"
                    >
                        <Bookmark size={20} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Rating + Cuisine + Price */}
                <div className="flex items-center gap-1.5 text-[12px] md:text-[13px] text-gray-600 mb-1.5">
                    <div className="flex items-center gap-0.5 bg-[#53B175] text-white rounded-md px-1.5 py-0.5 text-[11px] font-bold">
                        {vendor.rating}
                        <Star size={10} fill="white" className="text-white" />
                    </div>
                    <span className="font-semibold text-gray-700 truncate">{cuisineLabel}</span>
                    <span className="text-gray-300">•</span>
                    <span className="font-semibold text-gray-700 truncate">{priceForTwo}</span>
                </div>

                {/* Distance + Address */}
                <div className="flex items-center gap-1 text-[11px] md:text-[12px] text-gray-500">
                    <MapPin size={11} className="shrink-0 text-gray-500" />
                    <span className="font-bold text-gray-600">{location.distance}</span>
                    <span className="truncate">{location.address}</span>
                </div>
            </div>
        </Link>
    );
}

export function NearbyVendors() {
    const scrollRef = useRef<HTMLDivElement>(null);
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
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -320 : 320,
                behavior: 'smooth',
            });
            setTimeout(checkScroll, 350);
        }
    };

    const displayVendors = MOCK_VENDORS.slice(0, 10);

    return (
        <section id="vendors" className="w-full py-6 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto">
                {/* Header Container */}
                <div className="flex items-center justify-between mb-4 px-6 md:px-[var(--container-padding)]">
                    <div>
                        <h2 className="text-[16px] md:text-[18px] lg:text-[22px] font-bold text-[#181725]">Vendors Near You</h2>
                        <p className="text-[11px] md:text-[12px] text-gray-400 font-medium mt-0.5">Delivering to your area</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-[#299e60] cursor-pointer hover:underline transition-all">See all</span>
                        <div className="hidden md:flex items-center gap-1.5">
                            <button
                                onClick={() => scroll('left')}
                                disabled={!canScrollLeft}
                                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-[#53B175] hover:text-white hover:border-[#53B175] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                disabled={!canScrollRight}
                                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-[#53B175] hover:text-white hover:border-[#53B175] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Horizontal Scroll Cards (Now inside the max-w container to align on desktop) */}
                <div className="overflow-x-auto no-scrollbar scroll-smooth">
                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        className="flex gap-4 py-4 px-6 md:px-[var(--container-padding)] w-max"
                    >
                        {displayVendors.map((vendor, index) => (
                            <VendorCard key={vendor.id} vendor={vendor} index={index} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
