'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Bookmark } from 'lucide-react';
import type { Vendor } from '@/types';

// Cover images for vendor cards (cycling through available images)
export const VENDOR_COVERS = [
    '/images/vendors/chad-peltola-BTvQ2ET_iKc-unsplash.webp',
    '/images/vendors/eryka-ragna-K5dvZHBJp3k-unsplash.webp',
    '/images/vendors/gioia-m-EGjfIKl_ZvE-unsplash.webp',
    '/images/vendors/kylle-pangan-LjpD-uW4dH0-unsplash.webp',
    '/images/vendors/m-veven-4oHtqbwy7Lo-unsplash.webp',
    '/images/vendors/sleeba-thomas-h-T2VPkw9Kw-unsplash.webp',
    '/images/vendors/young-kane-kSDOJRNol9E-unsplash.webp',
];

// Mock distances and addresses for nearby vendors
export const VENDOR_LOCATIONS = [
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
export const VENDOR_OFFERS = [
    'Flat 30% OFF + FLAT ₹250 OFF',
    'Flat 20% OFF + FREE Delivery',
    'Flat 25% OFF on First Order',
    'Buy 2 Get 1 FREE',
    'Flat ₹500 OFF on ₹2000+',
    'Flat 15% OFF + FLAT ₹100 OFF',
];

interface VendorCardProps {
    vendor: Vendor;
    index: number;
    /** When true, card takes full width of its grid cell. When false, uses fixed width for horizontal scroll. */
    fluid?: boolean;
}

export function VendorCard({ vendor, index, fluid = false }: VendorCardProps) {
    const cover = VENDOR_COVERS[index % VENDOR_COVERS.length];
    const location = VENDOR_LOCATIONS[index % VENDOR_LOCATIONS.length];
    const offer = VENDOR_OFFERS[index % VENDOR_OFFERS.length];
    const cuisineLabel = vendor.categories.slice(0, 2).join(' • ');
    const priceForTwo = `₹${vendor.minOrderValue} f...`;

    return (
        <Link
            href={`/vendor/${vendor.id}`}
            className={`${fluid ? 'w-full max-w-[480px] min-[500px]:max-w-none mx-auto min-[500px]:mx-0' : 'flex-none w-[230px] md:w-[270px]'} 
                bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 
                flex flex-row min-[500px]:flex-col 
                hover:-translate-y-1.5 transition-transform duration-400 group`}
        >
            {/* 📱 MOBILE VIEW: Horizontal List Style */}
            <div className="min-[500px]:hidden flex flex-row w-full h-full items-center">
                <div className="relative w-28 h-28 overflow-hidden shrink-0">
                    <Image src={cover} alt={vendor.name} fill className="object-cover" />
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between h-28 min-w-0">
                    <div className="space-y-0.5 min-w-0">
                        <h3 className="text-[15px] font-[900] text-[#181725] truncate leading-tight w-full">{vendor.name}</h3>
                        <div className="flex items-center gap-1.5 text-[12px] text-gray-500 mt-0.5 flex-nowrap min-w-0">
                            <div className="flex items-center gap-0.5 bg-[#53B175] text-white rounded-md px-1.5 py-0.5 text-[10px] font-black shrink-0">
                                {vendor.rating} <Star size={10} fill="white" className="text-white" />
                            </div>
                            <span className="font-bold text-gray-700 truncate min-w-0">{cuisineLabel}</span>
                        </div>
                        <div className="text-[#2c7a2c] text-[11px] font-[900] mt-1 truncate w-full">{offer}</div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold border-t border-gray-50 pt-2 mt-auto flex-nowrap overflow-hidden">
                        <div className="flex items-center gap-1 text-gray-700 shrink-0">
                            <MapPin size={11} className="text-[#53B175]" />
                            <span>{location.distance}</span>
                        </div>
                        <span className="text-gray-300 shrink-0">•</span>
                        <span className="truncate">{vendor.deliveryTime}</span>
                    </div>
                </div>
            </div>

            {/* 🖥️ DESKTOP VIEW: Identical to Homepage "Shop by Vendor" */}
            <div className="hidden min-[500px]:flex flex-col w-full h-full">
                {/* Cover Image */}
                <div className="relative w-full aspect-[16/10] min-[500px]:h-[180px] overflow-hidden">
                    <Image
                        src={cover}
                        alt={vendor.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Offer Badge Overlay */}
                    <div className="absolute bottom-2 left-2 right-2">
                        <span className="inline-flex items-center gap-1 bg-[#2c7a2c]/90 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                            <span className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full inline-block" />
                            {offer}
                        </span>
                    </div>
                </div>

                {/* Info Container */}
                <div className="p-3.5">
                    {/* Name + Bookmark */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-[16px] font-extrabold text-[#111] line-clamp-1 leading-tight group-hover:text-[#53B175] transition-colors">
                            {vendor.name}
                        </h3>
                        <button className="shrink-0 mt-0.5 text-gray-400 hover:text-[#53B175] transition-colors">
                            <Bookmark size={20} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Rating + Details line */}
                    <div className="flex items-center gap-1.5 text-[13px] text-gray-600 mb-1.5">
                        <div className="flex items-center gap-0.5 bg-[#53B175] text-white rounded-md px-1.5 py-0.5 text-[11px] font-bold">
                            {vendor.rating}
                            <Star size={10} fill="white" className="text-white" />
                        </div>
                        <span className="font-semibold text-gray-700 truncate">{cuisineLabel}</span>
                        <span className="text-gray-300">•</span>
                        <span className="font-semibold text-gray-700 truncate">{priceForTwo}</span>
                    </div>

                    {/* Distance + Address/Time line */}
                    <div className="flex items-center gap-1 text-[12px] text-gray-500">
                        <MapPin size={11} className="shrink-0 text-gray-500" />
                        <span className="font-bold text-gray-600">{location.distance}</span>
                        <span className="truncate mx-1">•</span>
                        <span className="truncate">{vendor.deliveryTime} delivery</span>
                        <span className="ml-auto uppercase text-[10px] font-bold text-gray-300 tracking-wider">OPEN</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
