'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Bookmark, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAddress } from '@/context/AddressContext';
import type { Vendor } from '@/types';

const VENDOR_COVERS = [
    '/images/vendors/chad-peltola-BTvQ2ET_iKc-unsplash.webp',
    '/images/vendors/eryka-ragna-K5dvZHBJp3k-unsplash.webp',
    '/images/vendors/gioia-m-EGjfIKl_ZvE-unsplash.webp',
    '/images/vendors/kylle-pangan-LjpD-uW4dH0-unsplash.webp',
    '/images/vendors/m-veven-4oHtqbwy7Lo-unsplash.webp',
    '/images/vendors/sleeba-thomas-h-T2VPkw9Kw-unsplash.webp',
    '/images/vendors/young-kane-kSDOJRNol9E-unsplash.webp',
];

function VendorCard({ vendor, index }: { vendor: Vendor; index: number }) {
    const cover = VENDOR_COVERS[index % VENDOR_COVERS.length];
    const categoryPills = vendor.categories.slice(0, 4);
    const addressLine = vendor.address ? `${vendor.address.city}${vendor.address.state ? ', ' + vendor.address.state : ''}` : null;

    return (
        <Link
            href={`/vendor/${vendor.id}`}
            className="flex-none w-[260px] md:w-[300px] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:-translate-y-1.5 transition-transform duration-300 group"
        >
            <div className="relative w-full h-[180px] md:h-[200px] overflow-hidden">
                <Image src={cover} alt={vendor.name} fill sizes="(max-width: 768px) 260px, 300px" className="object-cover" />
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[17px] md:text-[19px] font-extrabold text-[#111] line-clamp-1 leading-tight">{vendor.name}</h3>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="shrink-0 mt-0.5 text-gray-400 hover:text-[#53B175] transition-colors">
                        <Bookmark size={20} strokeWidth={1.5} />
                    </button>
                </div>
                <div className="flex items-center gap-2 text-[12px] md:text-[13px] text-gray-600 mb-2.5">
                    <div className="flex items-center gap-0.5 bg-[#53B175] text-white rounded-md px-1.5 py-0.5 text-[11px] font-bold shrink-0">
                        {vendor.rating} <Star size={10} fill="white" className="text-white" />
                    </div>
                    {vendor.minOrderValue > 0 && <span className="font-semibold text-gray-500 text-[12px]">MOV ₹{vendor.minOrderValue}</span>}
                </div>
                {categoryPills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5 h-[60px] content-start overflow-hidden">
                        {categoryPills.map((cat) => (
                            <span key={cat} className="text-[11px] font-semibold bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">{cat}</span>
                        ))}
                    </div>
                )}
                {addressLine && (
                    <div className="flex items-center gap-1 text-[11px] md:text-[12px] text-gray-500">
                        <MapPin size={11} className="shrink-0 text-gray-500" />
                        <span className="truncate">{addressLine}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}

/** Frequently Ordered Vendors — top N vendors by order count for the logged-in user (last 90 days). */
export function FrequentlyOrderedVendors() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const { status } = useSession();
    const { selectedAddress } = useAddress();
    const pincode = selectedAddress?.pincode;

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/v1/vendors?sort=frequent&limit=10')
            .then(r => r.json())
            .then(d => setVendors((d.data?.vendors || []).map((v: any) => ({
                id: v.id,
                name: v.businessName || '',
                slug: v.slug || '',
                logo: v.logoUrl || '',
                rating: Number(v.rating) || 0,
                minOrderValue: Number(v.minOrderValue) || 0,
                creditEnabled: v.creditEnabled || false,
                categories: v.categories || [],
                isActive: true,
                deliverySchedule: '',
                deliveryTime: '',
                totalRatings: 0,
                coverImage: v.bannerUrl || '',
                description: '',
            }))))
            .catch(() => setVendors([]));
    }, [status]);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
            setTimeout(checkScroll, 350);
        }
    };

    if (vendors.length === 0) return null;

    return (
        <section className="w-full py-6 bg-white overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto">
                <div className="flex items-center justify-between mb-6 px-6 md:px-[var(--container-padding)]">
                    <h2 className="text-[18px] md:text-[22px] lg:text-[24px] font-[900] text-[#181725] tracking-tight flex items-center gap-2">
                        <TrendingUp size={22} className="text-[#53B175]" />
                        Frequently Ordered
                    </h2>
                    <Link href="/vendors?sort=frequent" className="text-[#53B175] font-black text-sm transition-all hover:translate-x-1 cursor-pointer">See All</Link>
                </div>
                <div className="relative w-full">
                    <button onClick={() => scroll('left')} disabled={!canScrollLeft}
                        className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100 disabled:opacity-20 disabled:cursor-not-allowed">
                        <ChevronLeft size={24} className="text-[#181725]" strokeWidth={2.5} />
                    </button>
                    <div ref={scrollRef} onScroll={checkScroll} className="overflow-x-auto no-scrollbar scroll-smooth w-full">
                        <div className="flex gap-4 md:gap-6 py-4 px-6 md:px-[var(--container-padding)] w-max">
                            {vendors.map((vendor, index) => (
                                <VendorCard key={vendor.id} vendor={vendor} index={index} />
                            ))}
                        </div>
                    </div>
                    <button onClick={() => scroll('right')} disabled={!canScrollRight}
                        className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100 disabled:opacity-20 disabled:cursor-not-allowed">
                        <ChevronRight size={24} className="text-[#181725]" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </section>
    );
}

/** Top Rated Vendors — vendors with rating >= 4.5 AND orderCount >= 10, filtered by serviceability. */
export function TopRatedVendors() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const { selectedAddress } = useAddress();
    const pincode = selectedAddress?.pincode;

    useEffect(() => {
        const params = new URLSearchParams({ sort: 'rating', limit: '10' });
        if (pincode) params.set('pincode', pincode);
        fetch(`/api/v1/vendors?${params}`)
            .then(r => r.json())
            .then(d => setVendors((d.data?.vendors || []).map((v: any) => ({
                id: v.id,
                name: v.businessName || '',
                slug: v.slug || '',
                logo: v.logoUrl || '',
                rating: Number(v.rating) || 0,
                minOrderValue: Number(v.minOrderValue) || 0,
                creditEnabled: v.creditEnabled || false,
                categories: v.categories || [],
                isActive: true,
                deliverySchedule: '',
                deliveryTime: '',
                totalRatings: 0,
                coverImage: v.bannerUrl || '',
                description: '',
            }))))
            .catch(() => setVendors([]));
    }, [pincode]);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
            setTimeout(checkScroll, 350);
        }
    };

    if (vendors.length === 0) return null;

    return (
        <section className="w-full py-8 overflow-hidden">
            <div className="max-w-[var(--container-max)] mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 px-6 md:px-[var(--container-padding)]">
                    <h2 className="text-[18px] md:text-[22px] lg:text-[24px] font-[900] text-[#181725] tracking-tight flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#53B175] to-[#299e60] flex items-center justify-center shadow-md shadow-green-200/50">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="drop-shadow-sm">
                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                            </svg>
                        </div>
                        Top Rated
                    </h2>
                    <Link href="/vendors?sort=rating" className="flex items-center gap-1 text-[#53B175] font-black text-sm hover:gap-2 transition-all cursor-pointer group">
                        See All
                        <ChevronRight size={14} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                {/* Scrollable cards */}
                <div className="relative w-full">
                    <button onClick={() => scroll('left')} disabled={!canScrollLeft}
                        className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100 disabled:opacity-20 disabled:cursor-not-allowed">
                        <ChevronLeft size={24} className="text-[#181725]" strokeWidth={2.5} />
                    </button>
                    <div ref={scrollRef} onScroll={checkScroll} className="overflow-x-auto no-scrollbar scroll-smooth w-full">
                        <div className="flex gap-4 md:gap-5 py-4 px-6 md:px-[var(--container-padding)] w-max">
                            {vendors.map((vendor, index) => {
                                const ratingNum = Number(vendor.rating);
                                const fullStars = Math.round(ratingNum);
                                const rank = index + 1;
                                return (
                                    <Link key={vendor.id} href={`/vendor/${vendor.id}`}
                                        className="flex-none w-[180px] md:w-[200px] bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#53B175]/25 hover:shadow-[0_12px_40px_rgba(83,177,117,0.12)] hover:-translate-y-1.5 transition-all duration-400 group relative"
                                    >
                                        {/* Rating Hero — large rating number as hero */}
                                        <div className="relative h-[100px] md:h-[110px] bg-gradient-to-br from-[#53B175] to-[#299e60] flex flex-col items-center justify-center">
                                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-30" />
                                            <span className="text-[42px] md:text-[48px] font-black text-white leading-none drop-shadow-md tracking-tight">
                                                {ratingNum.toFixed(1)}
                                            </span>
                                            <div className="flex items-center gap-0.5 mt-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <svg key={star} width="10" height="10" viewBox="0 0 24 24"
                                                        fill={star <= fullStars ? 'white' : 'none'}
                                                        className={star <= fullStars ? 'text-white' : 'text-white/30'}
                                                        stroke="currentColor" strokeWidth="1.5">
                                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                                    </svg>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Vendor info */}
                                        <div className="px-4 pb-4 -mt-8 relative z-10">
                                            {/* Logo circle — overlaps green area */}
                                            <div className="w-[52px] h-[52px] md:w-[56px] md:h-[56px] rounded-xl overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] border-2 border-white mx-auto mb-2.5 group-hover:shadow-[0_6px_20px_rgba(83,177,117,0.2)] transition-shadow">
                                                <div className="w-full h-full relative">
                                                    <Image
                                                        src={vendor.logo || VENDOR_COVERS[index % VENDOR_COVERS.length]}
                                                        alt={vendor.name}
                                                        fill
                                                        sizes="56px"
                                                        className="object-cover"
                                                    />
                                                </div>
                                            </div>

                                            {/* Vendor name */}
                                            <h3 className="text-[13px] md:text-[14px] font-[900] text-[#181725] text-center line-clamp-1 leading-tight">
                                                {vendor.name}
                                            </h3>

                                            {/* Categories */}
                                            {vendor.categories.slice(0, 2).length > 0 && (
                                                <div className="flex items-center justify-center gap-1 mt-1.5">
                                                    {vendor.categories.slice(0, 2).map((cat) => (
                                                        <span key={cat} className="text-[9px] font-bold text-gray-400 bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5 truncate max-w-[70px]">
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Rank badge */}
                                            <div className="flex items-center justify-center gap-1 mt-2">
                                                <div className="text-[10px] font-black text-gray-300 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                                                    #{rank}
                                                </div>
                                                {vendor.minOrderValue > 0 && (
                                                    <span className="text-[9px] font-bold text-gray-400">MOV ₹{vendor.minOrderValue}</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <button onClick={() => scroll('right')} disabled={!canScrollRight}
                        className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] items-center justify-center hover:scale-110 active:scale-95 transition-all border border-gray-100 disabled:opacity-20 disabled:cursor-not-allowed">
                        <ChevronRight size={24} className="text-[#181725]" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </section>
    );
}
