'use client';

import React from 'react';
import { Star, MapPin, Phone, Heart, Grid, Share2, ChevronLeft, Image as ImageIcon, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Vendor } from '@/types';
import { VENDOR_COVERS } from '@/components/features/homepage/VendorCardShared';

interface VendorStoreHeaderProps {
    vendor: Vendor;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function VendorStoreHeader({ vendor, activeTab, onTabChange }: VendorStoreHeaderProps) {
    const router = useRouter();
    const coverIndex = Math.abs(vendor.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % VENDOR_COVERS.length;
    const coverImage = vendor.coverImage || VENDOR_COVERS[coverIndex];
    
    const handleShare = async () => {
        const shareData = {
            title: vendor.name,
            text: `Check out ${vendor.name} on Horeca1`,
            url: window.location.href,
        };
        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!');
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="w-full bg-white md:bg-white md:pb-6 md:pt-4">
            {/* ── MOBILE HEADER (Matches Nandhini Deluxe Screenshot) ── */}
            <div className="block md:hidden relative">
                {/* Fixed Hero Image */}
                <div className="relative w-full h-[260px]">
                    <Image
                        src={coverImage}
                        alt={vendor.name}
                        fill
                        className="object-cover"
                        priority
                    />
                    
                    {/* Top Layer: Navigation */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                        <button 
                            onClick={() => router.back()}
                            className="p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white shadow-lg"
                        >
                            <ChevronLeft size={22} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Gallery Badge */}
                    <div className="absolute bottom-16 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-[12px] font-black">
                        <ImageIcon size={14} />
                        5/15
                    </div>
                </div>

                {/* Overlapping Bottom Sheet Card */}
                <div className="relative mt-[-45px] bg-white rounded-t-[40px] px-6 pt-8 pb-6 shadow-[0_-20px_50px_rgba(0,0,0,0.12)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <h1 className="text-[26px] font-[1000] text-[#181725] tracking-tight leading-none mb-3">
                                {vendor.name}
                            </h1>
                            <div className="space-y-1">
                                <p className="text-[13px] text-gray-500 font-bold leading-tight">
                                    957.4 km • Plot No 114/3, Sector 5, Navi Mumbai
                                </p>
                                <p className="text-[13px] text-gray-400 font-medium">
                                    {vendor.categories.slice(0, 3).join(', ')} | Min ₹{vendor.minOrderValue}
                                </p>
                            </div>
                        </div>

                        {/* Rating Pill */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="bg-[#1C8C44] text-white px-2.5 py-1.5 rounded-xl flex items-center gap-1 text-[14px] font-black shadow-lg shadow-green-500/20">
                                {vendor.rating} <Star size={14} fill="white" className="text-white" />
                            </div>
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">2K ratings</span>
                        </div>
                    </div>

                    {/* Operational Actions Pills (Now responsive for mobile) */}
                    <div className="flex items-center gap-3 mt-6 overflow-x-auto no-scrollbar pb-1">
                        <div className="shrink-0 bg-gray-50 border border-gray-100/50 px-3 py-2 rounded-2xl flex items-center gap-1.5 min-w-fit">
                            <span className="text-[#1C8C44] text-[12px] font-black">Open</span>
                            <span className="text-gray-400 text-[12px] font-bold whitespace-nowrap">till 8:00 PM</span>
                        </div>
                        <button className="shrink-0 bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black text-gray-800">
                            <Navigation size={16} className="text-[#53B175]" strokeWidth={3} />
                            Directions
                        </button>
                        <button className="shrink-0 p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-800">
                            <Phone size={18} className="text-[#53B175]" strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {/* Mobile Tabs */}
                <div className="px-6 flex items-center gap-6 border-b border-gray-100 mt-2 overflow-x-auto no-scrollbar">
                    {[
                        { key: 'all', label: 'Catalog' },
                        { key: 'deals', label: 'Deals' },
                        { key: 'orders', label: 'My Orders' },
                        { key: 'ratings', label: 'Ratings' },
                        { key: 'about', label: 'Info' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => onTabChange(tab.key)}
                            className={cn(
                                "pb-3 pt-2 text-[14px] font-black transition-all relative",
                                activeTab === tab.key ? "text-[#53B175]" : "text-gray-400"
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#53B175] rounded-full" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── DESKTOP HEADER — Full-image hero with gradient overlay (Zomato/DoorDash style) ── */}
            <div className="hidden md:block max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">

                {/* ── HERO IMAGE — full visible, name on gradient ── */}
                <div className="relative w-full h-[440px] lg:h-[520px] rounded-[32px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
                    <Image
                        src={coverImage}
                        alt={vendor.name}
                        fill
                        className="object-cover"
                        priority
                    />

                    {/* Gradient: transparent top → dark bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                    {/* Top-right: gallery badge */}
                    <div className="absolute top-5 right-5 flex items-center gap-2">
                        <div className="bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[12px] font-black">
                            <ImageIcon size={13} />
                            5/15
                        </div>
                    </div>

                    {/* Bottom: vendor identity + stats */}
                    <div className="absolute bottom-0 left-0 right-0 px-8 pb-7 pt-20">
                        {/* Status + rating badges */}
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="flex items-center gap-1.5 bg-[#1C8C44] text-white px-3 py-1.5 rounded-xl text-[13px] font-black shadow-lg shadow-green-900/30">
                                {vendor.rating} <Star size={13} fill="white" className="text-white" />
                            </div>
                            <span className="text-white/70 text-[13px] font-bold">2K ratings</span>
                            <span className="text-white/30 text-lg leading-none">•</span>
                            <span className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[12px] font-black px-3 py-1 rounded-lg">
                                Open till 8:00 PM
                            </span>
                            <span className="text-white/30 text-lg leading-none">•</span>
                            <span className="text-white/70 text-[13px] font-bold">Next: {vendor.deliverySchedule}</span>
                        </div>

                        {/* Vendor name */}
                        <h1 className="text-[44px] lg:text-[56px] font-[1000] text-white tracking-tighter leading-[0.95] mb-4 drop-shadow-lg">
                            {vendor.name}
                        </h1>

                        {/* Cuisine + delivery info row */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {vendor.deliverySchedule && (
                        <span className="text-white/60 text-[12px] font-bold">📦 Next: {vendor.deliverySchedule}</span>
                    )}
                    {vendor.categories.slice(0, 3).map((cat, i) => (
                                <span key={cat} className="flex items-center gap-2">
                                    <span className="text-white/85 text-[14px] font-bold">{cat}</span>
                                    {i < Math.min(vendor.categories.length, 3) - 1 && (
                                        <span className="text-white/30">•</span>
                                    )}
                                </span>
                            ))}
                            <span className="text-white/30">|</span>
                            <span className="text-white/85 text-[14px] font-bold">Min ₹{vendor.minOrderValue}</span>
                        </div>
                    </div>
                </div>

                {/* ── INFO BAR — address left, actions right ── */}
                <div className="flex items-center justify-between px-1 pt-5 pb-4 border-b border-gray-100">
                    {/* Left: address */}
                    <div className="flex items-center gap-2 min-w-0">
                        <MapPin size={16} className="text-[#53B175] shrink-0" strokeWidth={2.5} />
                        <span className="text-[14px] font-medium text-gray-500 truncate">
                            Plot No 114/3, Sector 5, Navi Mumbai
                        </span>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 ml-6">
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-[13px] font-black text-gray-700 hover:bg-[#53B175]/5 hover:border-[#53B175]/40 hover:text-[#53B175] transition-all duration-200">
                            <Phone size={15} strokeWidth={2.5} />
                            Call Vendor
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-[13px] font-black text-gray-700 hover:bg-[#53B175]/5 hover:border-[#53B175]/40 hover:text-[#53B175] transition-all duration-200">
                            <Heart size={15} strokeWidth={2.5} />
                            Favourite
                        </button>
                        <button onClick={handleShare} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-[13px] font-black text-gray-700 hover:bg-[#53B175]/5 hover:border-[#53B175]/40 hover:text-[#53B175] transition-all duration-200">
                            <Share2 size={15} strokeWidth={2.5} />
                            Share
                        </button>
                    </div>
                </div>

                {/* ── TABS ── */}
                <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                    {[
                        { key: 'all', label: 'Catalog' },
                        { key: 'deals', label: 'Deals' },
                        { key: 'orders', label: 'My Orders' },
                        { key: 'ratings', label: 'Ratings' },
                        { key: 'about', label: 'About' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => onTabChange(tab.key)}
                            className={cn(
                                "pb-3 pt-3 text-[15px] font-bold transition-all relative",
                                activeTab === tab.key || (activeTab === 'all' && tab.key === 'all')
                                    ? "text-[#53B175]"
                                    : "text-gray-400 hover:text-gray-700"
                            )}
                        >
                            {tab.label}
                            {(activeTab === tab.key || (activeTab === 'all' && tab.key === 'all')) && (
                                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#53B175] rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
