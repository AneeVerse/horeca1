'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Clock, CreditCard, Package, ChevronLeft, Share2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { Vendor } from '@/types';

// Maps category names to images (same mapping as Navbar)
const CATEGORY_IMAGE: Record<string, string> = {
    'vegetables': '/images/category/vegitable.png',
    'fruits': '/images/category/fruits.png',
    'dairy & eggs': '/images/category/milk.png',
    'spices & masala': '/images/category/candy.png',
    'grains & pulses': '/images/category/snacks.png',
    'meat & poultry': '/images/category/fish & meat.png',
    'seafood': '/images/category/fish & meat.png',
    'beverages': '/images/category/drink-juice.png',
    'oils & ghee': '/images/category/fruits.png',
    'packaging & supplies': '/images/category/vegitable.png',
};

interface VendorStoreHeaderProps {
    vendor: Vendor;
}

export function VendorStoreHeader({ vendor }: VendorStoreHeaderProps) {
    const handleShare = async () => {
        const shareData = {
            title: vendor.name,
            text: `Check out ${vendor.name} on Horeca1 - ${vendor.description || ''}`,
            url: window.location.href,
        };

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!', {
                    description: 'You can now share this store with others.',
                });
            }
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                toast.error('Failed to share store link');
            }
        }
    };

    return (
        <div className="w-full bg-white">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]">
                {/* Back + Share */}
                <div className="flex items-center justify-between pt-4 pb-2">
                    <Link href="/" className="flex items-center gap-1 text-[14px] font-bold text-[#7C7C7C] hover:text-[#181725] transition-colors">
                        <ChevronLeft size={20} />
                        <span>Back</span>
                    </Link>
                    <button onClick={handleShare} className="p-2 rounded-full hover:bg-gray-50 transition-colors">
                        <Share2 size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Vendor Info */}
                <div className="flex items-start gap-3 pb-4">
                    {/* Logo */}
                    <div className="w-[70px] h-[70px] md:w-[90px] md:h-[90px] rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 pt-1">
                        <h1 className="text-[18px] md:text-[24px] font-[800] text-[#181725] leading-none mb-1">
                            {vendor.name}
                        </h1>
                        {vendor.description && (
                            <p className="text-[11px] md:text-[13px] text-[#7C7C7C] font-medium leading-tight mb-3">
                                {vendor.description}
                            </p>
                        )}

                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Rating */}
                            <div className="flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-1 rounded-full border border-[#C8E6C9]">
                                <Star size={11} fill="currentColor" />
                                <span className="text-[10px] font-bold">{vendor.rating}</span>
                                <span className="text-[9px] opacity-70">({vendor.totalRatings || 0})</span>
                            </div>

                            {/* Delivery */}
                            <div className="flex items-center gap-1 bg-[#E3F2FD] text-[#1565C0] px-2.5 py-1 rounded-full border border-[#BBDEFB]">
                                <Clock size={11} />
                                <span className="text-[10px] font-extrabold uppercase tracking-tight">{vendor.deliverySchedule}</span>
                            </div>

                            {/* MOV */}
                            <div className="flex items-center gap-1 bg-[#FFF3E0] text-[#EF6C00] px-2.5 py-1 rounded-full border border-[#FFE0B2]">
                                <Package size={11} />
                                <span className="text-[10px] font-extrabold uppercase tracking-tight">Min ₹{vendor.minOrderValue}</span>
                            </div>
                        </div>

                        {/* Credit Badge */}
                        {vendor.creditEnabled && (
                            <div className="flex items-center gap-1.5 bg-[#F3E5F5] text-[#7B1FA2] px-3 py-1 rounded-full border border-[#E1BEE7] w-fit mt-2">
                                <CreditCard size={11} />
                                <span className="text-[10px] font-extrabold uppercase tracking-wide">Credit Available</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Vendor Categories (Icon Style) */}
                <div className="flex items-start gap-4 pb-6 overflow-x-auto no-scrollbar -mx-[var(--container-padding)] px-[var(--container-padding)]">
                    {(vendor.categories || []).map((catName, idx) => {
                        const image = CATEGORY_IMAGE[catName.toLowerCase()] || '/images/category/vegitable.png';
                        
                        const slugify = (text: string) => text.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                        
                        return (
                            <Link 
                                key={idx} 
                                href={`/category/${vendor.id}/${slugify(catName)}`}
                                className="flex flex-col items-center gap-2 shrink-0 active:scale-95 transition-transform group"
                            >
                                <div className="w-[70px] h-[70px] rounded-[18px] bg-[#F7F8FA] border border-gray-50 flex items-center justify-center overflow-hidden group-hover:bg-[#F2F3F2] transition-colors">
                                    <div className="relative w-[70%] h-[70%]">
                                        <Image
                                            src={image}
                                            alt={catName}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold text-[#181725] text-center leading-tight max-w-[70px] line-clamp-2 group-hover:text-[#53B175] transition-colors">
                                    {catName}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
