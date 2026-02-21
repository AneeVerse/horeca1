'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Search,
    ChevronDown,
    Star,
    MapPin,
    Mail,
    Phone,
    Heart,
    MoreVertical,
    TrendingUp,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const getVendorSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');

const VENDORS = [
    {
        name: 'ZARA International',
        category: 'Fashion',
        website: 'www.zara.com',
        rating: 4.5,
        reviews: '3.5k',
        address: '4604, Philli Lane Kiowa IN 47404',
        email: 'zarafashionworld@dayrep.com',
        phone: '+243 812-801-9335',
        revenue: '$200k',
        revenueProgress: 65,
        stock: '865',
        sells: '+4.5k',
        happyClients: '+2k',
        logo: '/images/admin/vendors/zara.svg'
    },
    {
        name: 'Rolex Watches',
        category: 'Watch',
        website: 'www.rolex.com',
        rating: 4.5,
        reviews: '1.2k',
        address: '1678 Avenue Milwaukee, WI 53202',
        email: 'rolexwatches@dayrep.com',
        phone: '+243 252-223-1454',
        revenue: '$349k',
        revenueProgress: 75,
        stock: '261',
        sells: '+2.9k',
        happyClients: '+1.4k',
        logo: '/images/admin/vendors/rolex.svg'
    },
    {
        name: 'Dyson Machinery',
        category: 'Electronics',
        website: 'www.dyson.com',
        rating: 4.1,
        reviews: '3.7k',
        address: '23 Cubbine Road GHOOLI WA 6426',
        email: 'dysonmachine@dayrep.com',
        phone: '+81(08) 9059 8047',
        revenue: '$545k',
        revenueProgress: 85,
        stock: '781',
        sells: '+5.3k',
        happyClients: '+3.1k',
        logo: '/images/admin/vendors/dyson.svg'
    },
    {
        name: 'GoPro Camera',
        category: 'Electronics',
        website: 'www.gopro.com',
        rating: 4.3,
        reviews: '7.2k',
        address: '5 Gaffney Street MIDDLE PARK VIC 3206',
        email: 'goprocamera@dayrep.com',
        phone: '+81(08) 6727 4227',
        revenue: '$465k',
        revenueProgress: 70,
        stock: '890',
        sells: '+10.6k',
        happyClients: '+6.1k',
        logo: '/images/admin/vendors/gopro.svg'
    },
    {
        name: 'H&M',
        category: 'Fashion',
        website: 'www.hm.com',
        rating: 4.5,
        reviews: '15.3k',
        address: '1697 Bay Street Toronto, ON M5J 2R8',
        email: 'hmfashion@dayrep.com',
        phone: '+1(416) 123-4567',
        revenue: '$1.2M',
        revenueProgress: 90,
        stock: '2.4k',
        sells: '+45k',
        happyClients: '+12k',
        logo: '/images/admin/vendors/h&m.svg'
    },
    {
        name: 'Huawei Phone',
        category: 'Electronics',
        rating: 4.1,
        reviews: '8.2k',
        website: 'www.huawei.com',
        address: '2182 Blanchard Victoria, BC V8W 2H9',
        email: 'huaweiphone@dayrep.com',
        phone: '+1(250) 987-6543',
        revenue: '$850k',
        revenueProgress: 80,
        stock: '1.2k',
        sells: '+15.2k',
        happyClients: '+8k',
        logo: '/images/admin/vendors/huawei.svg'
    },
    {
        name: 'Nike Clothings',
        category: 'Fashion',
        rating: 4.5,
        reviews: '18.9k',
        website: 'www.nike.com',
        address: '2113 Eglinton Avenue Toronto 1A5',
        email: 'nikefashion@dayrep.com',
        phone: '+1(416) 987-6543',
        revenue: '$2.5M',
        revenueProgress: 95,
        stock: '5.2k',
        sells: '+85k',
        happyClients: '+45k',
        logo: '/images/admin/vendors/nike.svg'
    },
    {
        name: 'The North Face',
        category: 'Fashion',
        rating: 4.4,
        reviews: '12.7k',
        website: 'www.thenorthface.com',
        address: '1377 49th Avenue Clyde River, 0E0',
        email: 'thenorthface@dayrep.com',
        phone: '+1(867) 123-4567',
        revenue: '$650k',
        revenueProgress: 75,
        stock: '1.5k',
        sells: '+12.5k',
        happyClients: '+9k',
        logo: '/images/admin/vendors/thenorthface.svg'
    }
];

export default function VendorsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    const handleCardClick = (vendorName: string) => {
        router.push(`/admin/vendors/${getVendorSlug(vendorName)}`);
    };

    const filteredVendors = VENDORS.filter(vendor =>
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Sellers List</h1>
                    <p className="text-[#000000] text-[13px] font-medium opacity-70">Whole data about your Vendors/Sellers</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group w-full md:w-[240px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                        <input
                            type="text"
                            placeholder="Search Sellers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-[44px] w-full bg-white border border-[#EEEEEE] rounded-[12px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Vendors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-[24px]">
                {filteredVendors.map((vendor, idx) => (
                    <div
                        key={idx}
                        onClick={() => handleCardClick(vendor.name)}
                        className="bg-white rounded-[16px] border border-[#EEEEEE] shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-all cursor-pointer max-w-[381px] w-full mx-auto active:scale-[0.98]"
                    >
                        {/* Top Grey Logo Box */}
                        <div className="p-3">
                            <div className="bg-[#F1F4F9] rounded-[12px] h-[144px] relative flex items-center justify-center p-6">
                                <button
                                    onClick={(e) => { e.stopPropagation(); /* detail info */ }}
                                    className="absolute top-4 right-4 text-[#AEAEAE] hover:text-[#181725] transition-colors z-20"
                                >
                                    <Info size={18} />
                                </button>
                                <img
                                    src={vendor.logo}
                                    alt={vendor.name}
                                    className="w-[120px] h-[120px] object-contain"
                                />
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="px-6 pb-6 pt-2 flex flex-col flex-1">
                            {/* Header Info */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between gap-1.5 items-start">
                                    <div className="flex flex-col">
                                        <h3 className="text-[17px] font-extrabold text-[#181725] line-clamp-1">{vendor.name}</h3>
                                        <span className="text-[13px] text-[#4B4B4B] font-medium mt-0.5">({vendor.category})</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 bg-[#F5F9FD] px-2 py-1 rounded-md shrink-0">
                                        <Star size={14} fill="#F59E0B" className="text-[#F59E0B]" />
                                        <span className="text-[13px] font-bold text-[#181725]">{vendor.rating}</span>
                                        <span className="text-[12px] text-[#AEAEAE] font-medium">{vendor.reviews}</span>
                                    </div>
                                </div>
                                <a
                                    href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[13px] font-bold text-[#299E60] hover:underline mt-2 block w-fit"
                                >
                                    {vendor.website}
                                </a>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-4 my-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-[32px] h-[32px] rounded-[10px] bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0 mt-0.5">
                                        <MapPin size={15} />
                                    </div>
                                    <span className="text-[13px] font-[800] text-[#7C7C7C] leading-tight line-clamp-2 min-h-[32px] flex items-center">{vendor.address}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-[32px] h-[32px] rounded-[10px] bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <Mail size={15} />
                                    </div>
                                    <span className="text-[13px] font-[800] text-[#7C7C7C] truncate">{vendor.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-[32px] h-[32px] rounded-[10px] bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <Phone size={15} />
                                    </div>
                                    <span className="text-[13px] font-[800] text-[#7C7C7C]">{vendor.phone}</span>
                                </div>
                            </div>

                            {/* Progress Section */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[14px] font-bold text-[#181725]">{vendor.category}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[14px] font-bold text-[#181725]">{vendor.revenue}</span>
                                        <TrendingUp size={16} className="text-[#299E60]" />
                                    </div>
                                </div>
                                <div className="h-[6px] w-full bg-[#F5F5F5] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#299E60] transition-all duration-1000 relative"
                                        style={{ width: `${vendor.revenueProgress}%` }}
                                    >
                                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)', backgroundSize: '10px 10px' }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="mt-8 flex items-center border-t border-[#EEEEEE] -mx-6 pt-6 px-6">
                                <div className="flex-1 text-center">
                                    <p className="text-[16px] font-[900] text-[#181725] leading-none">{vendor.stock}</p>
                                    <p className="text-[12px] font-bold text-[#AEAEAE] mt-2">Item Stock</p>
                                </div>
                                <div className="w-[1px] h-10 bg-[#EEEEEE]" />
                                <div className="flex-1 text-center">
                                    <p className="text-[16px] font-[900] text-[#181725] leading-none">{vendor.sells}</p>
                                    <p className="text-[12px] font-bold text-[#AEAEAE] mt-2">Sells</p>
                                </div>
                                <div className="w-[1px] h-10 bg-[#EEEEEE]" />
                                <div className="flex-1 text-center">
                                    <p className="text-[16px] font-[900] text-[#181725] leading-none">{vendor.happyClients}</p>
                                    <p className="text-[12px] font-bold text-[#AEAEAE] mt-2">Happy Client</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 border-t border-[#EEEEEE] flex items-center gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCardClick(vendor.name); }}
                                className="flex-1 h-[44px] bg-[#299E60] text-white rounded-[10px] text-[14px] font-bold hover:bg-[#238a54] transition-all shadow-sm flex items-center justify-center"
                            >
                                View Profile
                            </button>
                            <button
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 h-[44px] bg-[#EEF8F1] text-[#299E60] rounded-[10px] text-[14px] font-bold hover:bg-[#e0f0e5] transition-all"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={(e) => e.stopPropagation()}
                                className="group w-[44px] h-[44px] rounded-[10px] border border-[#EEEEEE] flex items-center justify-center text-[#299E60] hover:bg-[#EEF8F1] transition-all"
                            >
                                <Heart size={18} className="transition-all group-hover:fill-[#299E60]" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
