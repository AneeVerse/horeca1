'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search, Star, MapPin, Clock, ShoppingBag } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { dal } from '@/lib/dal';
import type { Category } from '@/types';
import { VENDOR_COVERS, VENDOR_LOCATIONS, VENDOR_OFFERS } from '@/components/features/homepage/VendorCardShared';
import { StickyCartBar } from '@/components/features/vendor/StickyCartBar';

interface VendorSummary {
    id: string;
    name: string;
    slug: string;
    logo: string;
    rating: number;
    deliveryTime: string;
    minOrderValue: number;
    categories: string[];
}

function CategoryVendorsContent() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [category, setCategory] = useState<Category | null>(null);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [vendors, setVendors] = useState<VendorSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        setLoading(true);

        dal.categories.list()
            .then(async (cats) => {
                setAllCategories(cats);
                const found = cats.find(c =>
                    c.slug === slug ||
                    c.slug.toLowerCase() === slug.toLowerCase() ||
                    c.name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase()
                );
                setCategory(found || null);
                if (found) {
                    const vendorList = await dal.categories.getVendors(found.id);
                    setVendors(vendorList as VendorSummary[]);
                }
            })
            .catch(() => { setCategory(null); setVendors([]); })
            .finally(() => setLoading(false));
    }, [slug]);

    const displayName = category?.name || slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-2 border-[#53B175] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-gray-50/50 min-h-screen pb-24">

            {/* ── MOBILE HEADER ── */}
            <div className="md:hidden bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
                <button onClick={() => router.back()} className="p-1">
                    <ArrowLeft size={22} className="text-[#181725]" strokeWidth={2.5} />
                </button>
                <h1 className="text-[17px] font-black text-[#181725]">{displayName}</h1>
                <Link href="/search" className="p-1">
                    <Search size={22} className="text-[#181725]" strokeWidth={2.5} />
                </Link>
            </div>

            {/* ── DESKTOP HEADER ── */}
            <div className="hidden md:block bg-white border-b border-gray-100">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-8">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-5 font-medium">
                        <Link href="/" className="hover:text-[#53B175] transition-colors">Home</Link>
                        <span>/</span>
                        <span className="text-[#181725] font-semibold">{displayName}</span>
                    </div>

                    <div className="flex items-center gap-5">
                        {category?.image && (
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center p-2">
                                <Image src={category.image} alt={displayName} width={56} height={56} className="object-contain" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-[32px] font-[1000] text-[#181725] tracking-tighter leading-none mb-1">{displayName}</h1>
                            <p className="text-[14px] text-gray-400 font-medium">
                                {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} available
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[var(--container-max)] mx-auto px-4 md:px-[var(--container-padding)]">

                {/* ── CATEGORY TABS (horizontal scroll) ── */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-4">
                    {allCategories.map((cat) => (
                        <Link
                            key={cat.id}
                            href={`/category/${cat.slug}`}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-bold whitespace-nowrap shrink-0 transition-all",
                                cat.slug === slug
                                    ? "bg-[#53B175] border-[#53B175] text-white shadow-lg shadow-green-500/20"
                                    : "bg-white border-gray-100 text-gray-600 hover:border-[#53B175]/40 hover:text-[#53B175]"
                            )}
                        >
                            {cat.image && (
                                <Image src={cat.image} alt={cat.name} width={18} height={18} className="object-contain" />
                            )}
                            {cat.name}
                        </Link>
                    ))}
                </div>

                {/* ── VENDOR LIST ── */}
                {vendors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <ShoppingBag size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-[18px] font-black text-[#181725] mb-1">No vendors yet</h3>
                        <p className="text-gray-400 text-[14px]">No vendors carry {displayName} products right now.</p>
                        <Link href="/vendors" className="mt-4 text-[#53B175] font-bold text-[14px]">Browse all vendors</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-6">
                        {vendors.map((vendor, index) => {
                            const cover = VENDOR_COVERS[index % VENDOR_COVERS.length];
                            const location = VENDOR_LOCATIONS[index % VENDOR_LOCATIONS.length];
                            const offer = VENDOR_OFFERS[index % VENDOR_OFFERS.length];
                            return (
                                <Link
                                    key={vendor.id}
                                    href={`/category/${vendor.slug}/${slug}`}
                                    className="bg-white rounded-[16px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 group"
                                >
                                    {/* Cover Image */}
                                    <div className="relative w-full h-[110px] md:h-[130px] overflow-hidden">
                                        <Image
                                            src={cover}
                                            alt={vendor.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute bottom-1.5 left-1.5">
                                            <span className="inline-flex items-center gap-1 bg-[#1C8C44]/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                                                <span className="w-1 h-1 bg-[#4ADE80] rounded-full" />
                                                {offer}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-2.5 md:p-3">
                                        <div className="flex items-start justify-between gap-1 mb-1">
                                            <h3 className="text-[13px] font-extrabold text-[#181725] leading-tight group-hover:text-[#53B175] transition-colors line-clamp-1">
                                                {vendor.name}
                                            </h3>
                                            <div className="flex items-center gap-0.5 bg-[#53B175] text-white px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0">
                                                {vendor.rating} <Star size={9} fill="white" className="text-white" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold border-t border-gray-50 pt-2 mt-2">
                                            <div className="flex items-center gap-0.5">
                                                <MapPin size={10} className="text-[#53B175]" />
                                                {location.distance}
                                            </div>
                                            <span className="text-gray-200">•</span>
                                            <div className="flex items-center gap-0.5">
                                                <Clock size={10} className="text-[#53B175]" />
                                                {vendor.deliveryTime}
                                            </div>
                                            <div className="ml-auto text-[#181725] font-black text-[10px]">
                                                ₹{vendor.minOrderValue}+
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            <StickyCartBar />
        </div>
    );
}

export default function CategoryPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white animate-pulse" />}>
            <CategoryVendorsContent />
        </Suspense>
    );
}
