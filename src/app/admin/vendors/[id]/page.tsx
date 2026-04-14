'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    Star,
    MapPin,
    Mail,
    Phone,
    Package,
    ShoppingCart,
    MapPinned,
    CheckCircle2,
    Clock,
    XCircle,
    Loader2,
    ShieldCheck,
    ShieldX,
    User,
    CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';

interface VendorProduct {
    id: string;
    name: string;
    basePrice: number;
    isActive: boolean;
    imageUrl: string | null;
}

interface ServiceArea {
    id: string;
    pincode: string;
    isActive: boolean;
}

interface DeliverySlot {
    id: string;
    dayOfWeek: number | string;
    slotStart: string;
    slotEnd: string;
    cutoffTime: string;
    isActive: boolean;
}

interface VendorUser {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    gstNumber: string | null;
    isActive: boolean;
    createdAt: string;
}

interface VendorData {
    id: string;
    businessName: string;
    slug: string;
    logoUrl: string | null;
    description: string | null;
    rating: number;
    isVerified: boolean;
    isActive: boolean;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    minOrderValue: number;
    deliveryFee: number;
    freeDeliveryAbove: number | null;
    user: VendorUser;
    products: VendorProduct[];
    serviceAreas: ServiceArea[];
    deliverySlots: DeliverySlot[];
    _count: {
        orders: number;
        products: number;
        creditAccounts: number;
    };
}

function formatPrice(value: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_MAP: Record<number, string> = {
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
    7: 'SUNDAY',
};

function formatDayOfWeek(day: string | number): string {
    const dayStr = typeof day === 'number' ? DAY_MAP[day] || 'UNKNOWN' : day.toString();
    if (!dayStr) return 'Unknown';
    return dayStr.charAt(0).toUpperCase() + dayStr.slice(1).toLowerCase();
}

function formatTime(time: string): string {
    // Handles "HH:MM" or "HH:MM:SS" formats
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

export default function VendorDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params.id as string;

    const [vendor, setVendor] = useState<VendorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingVerification, setTogglingVerification] = useState(false);

    const fetchVendor = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/v1/admin/vendors/${vendorId}`);
            if (!res.ok) {
                throw new Error(`Failed to fetch vendor (${res.status})`);
            }
            const json = await res.json();
            if (!json.success) {
                throw new Error(json.message || 'Failed to fetch vendor');
            }
            setVendor(json.data);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, [vendorId]);

    useEffect(() => {
        if (vendorId) {
            fetchVendor();
        }
    }, [vendorId, fetchVendor]);

    const handleToggleVerification = async () => {
        if (!vendor || togglingVerification) return;
        try {
            setTogglingVerification(true);
            const res = await fetch(`/api/v1/admin/vendors/${vendorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isVerified: !vendor.isVerified }),
            });
            if (!res.ok) {
                throw new Error(`Failed to update vendor (${res.status})`);
            }
            const json = await res.json();
            if (json.success && json.data) {
                setVendor((prev) => (prev ? { ...prev, isVerified: json.data.isVerified } : prev));
            } else {
                // Refetch to get the latest state
                await fetchVendor();
            }
        } catch (err: any) {
            alert(err.message || 'Failed to toggle verification');
        } finally {
            setTogglingVerification(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
                <Loader2 size={36} className="animate-spin text-[#299E60]" />
                <p className="text-[14px] font-bold text-[#7C7C7C]">Loading vendor details...</p>
            </div>
        );
    }

    // Error state
    if (error || !vendor) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
                <XCircle size={36} className="text-red-400" />
                <p className="text-[16px] font-bold text-[#7C7C7C]">{error || 'Vendor not found'}</p>
                <button
                    onClick={() => router.back()}
                    className="mt-2 text-[14px] font-bold text-[#299E60] hover:underline"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const fullAddress = [vendor.address, vendor.city, vendor.state, vendor.pincode]
        .filter(Boolean)
        .join(', ');

    const sortedSlots = [...vendor.deliverySlots].sort((a, b) => {
        const orderA = typeof a.dayOfWeek === 'number' ? a.dayOfWeek : DAY_ORDER.indexOf(a.dayOfWeek.toUpperCase()) + 1;
        const orderB = typeof b.dayOfWeek === 'number' ? b.dayOfWeek : DAY_ORDER.indexOf(b.dayOfWeek.toUpperCase()) + 1;
        return orderA - orderB;
    });

    const stats = [
        { label: 'Products', value: vendor._count.products, icon: Package, color: '#299E60' },
        { label: 'Orders', value: vendor._count.orders, icon: ShoppingCart, color: '#F59E0B' },
        { label: 'Service Areas', value: vendor.serviceAreas.length, icon: MapPinned, color: '#3B82F6' },
        {
            label: 'Status',
            value: vendor.isVerified ? 'Verified' : 'Pending',
            icon: vendor.isVerified ? ShieldCheck : ShieldX,
            color: vendor.isVerified ? '#299E60' : '#F59E0B',
        },
    ];

    return (
        <div className="w-full space-y-6 pb-6">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 text-[13px] md:text-[14px] text-[#4B4B4B] flex-wrap">
                <button
                    onClick={() => router.back()}
                    className="hover:text-[#299E60] flex items-center gap-1 transition-colors"
                >
                    <ChevronLeft size={16} />
                    Back
                </button>
                <span className="text-gray-300">|</span>
                <Link href="/admin/vendors" className="hover:text-[#299E60] transition-colors">
                    Sellers
                </Link>
                <span className="text-gray-300">{'>'}</span>
                <span className="font-bold text-[#181725]">Seller Details</span>
            </div>

            {/* Top Section: Vendor Info */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Left: Logo + Basic Info */}
                    <div className="p-4 md:p-8 flex flex-col sm:flex-row gap-4 md:gap-6">
                        <div className="shrink-0 flex flex-col items-center sm:items-start">
                            <div className="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-[16px] bg-[#F1F4F9] flex items-center justify-center p-4">
                                {vendor.logoUrl ? (
                                    <img
                                        src={vendor.logoUrl}
                                        alt={vendor.businessName}
                                        className="w-[70px] h-[70px] md:w-[100px] md:h-[100px] object-contain"
                                    />
                                ) : (
                                    <span className="text-[36px] font-[900] text-[#299E60]">
                                        {getInitials(vendor.businessName)}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleToggleVerification}
                                disabled={togglingVerification}
                                className={cn(
                                    'mt-4 w-full py-2.5 rounded-[10px] text-[13px] font-bold transition-all shadow-sm flex items-center justify-center gap-2',
                                    vendor.isVerified
                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                        : 'bg-[#299E60] text-white hover:bg-[#238a54]'
                                )}
                            >
                                {togglingVerification ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : vendor.isVerified ? (
                                    <ShieldX size={14} />
                                ) : (
                                    <ShieldCheck size={14} />
                                )}
                                {togglingVerification
                                    ? 'Updating...'
                                    : vendor.isVerified
                                      ? 'Revoke Verification'
                                      : 'Verify Vendor'}
                            </button>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[18px] md:text-[22px] font-extrabold text-[#181725] leading-tight">
                                    {vendor.businessName}
                                </h2>
                                {vendor.isVerified && (
                                    <CheckCircle2
                                        size={20}
                                        className="text-[#299E60] shrink-0"
                                        fill="#299E60"
                                        stroke="white"
                                    />
                                )}
                            </div>
                            {vendor.description && (
                                <p className="text-[13px] text-[#7C7C7C] font-medium mt-0.5 line-clamp-2">
                                    {vendor.description}
                                </p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={16}
                                            fill={star <= Math.round(vendor.rating) ? '#F59E0B' : 'none'}
                                            className={
                                                star <= Math.round(vendor.rating)
                                                    ? 'text-[#F59E0B]'
                                                    : 'text-[#E5E7EB]'
                                            }
                                        />
                                    ))}
                                </div>
                                <span className="text-[14px] font-bold text-[#181725]">
                                    {vendor.rating}/5
                                </span>
                            </div>
                            <div className="space-y-3 mt-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-[30px] h-[30px] rounded-full bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <User size={14} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#4B4B4B]">
                                        {vendor.user.fullName}
                                    </span>
                                </div>
                                {fullAddress && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-[30px] h-[30px] rounded-full bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                            <MapPin size={14} />
                                        </div>
                                        <span className="text-[13px] font-bold text-[#4B4B4B]">
                                            {fullAddress}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <div className="w-[30px] h-[30px] rounded-full bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <Mail size={14} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#4B4B4B]">
                                        {vendor.user.email}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-[30px] h-[30px] rounded-full bg-[#EEF8F1] flex items-center justify-center text-[#299E60] shrink-0">
                                        <Phone size={14} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#4B4B4B]">
                                        {vendor.user.phone}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Delivery & Business Info */}
                    <div className="p-4 md:p-8 border-t lg:border-t-0 lg:border-l border-[#EEEEEE]">
                        <h3 className="text-[18px] font-extrabold text-[#181725] mb-6">
                            Business Details
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-medium text-[#7C7C7C]">
                                    GST Number
                                </span>
                                <span className="text-[14px] font-bold text-[#181725]">
                                    {vendor.user.gstNumber || 'Not provided'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-medium text-[#7C7C7C]">
                                    Min Order Value
                                </span>
                                <span className="text-[14px] font-bold text-[#181725]">
                                    {formatPrice(vendor.minOrderValue)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-medium text-[#7C7C7C]">
                                    Delivery Fee
                                </span>
                                <span className="text-[14px] font-bold text-[#181725]">
                                    {vendor.deliveryFee === 0
                                        ? 'Free'
                                        : formatPrice(vendor.deliveryFee)}
                                </span>
                            </div>
                            {vendor.freeDeliveryAbove !== null && vendor.freeDeliveryAbove > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[14px] font-medium text-[#7C7C7C]">
                                        Free Delivery Above
                                    </span>
                                    <span className="text-[14px] font-bold text-[#181725]">
                                        {formatPrice(vendor.freeDeliveryAbove)}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-medium text-[#7C7C7C]">
                                    Account Status
                                </span>
                                <span
                                    className={cn(
                                        'text-[12px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase',
                                        vendor.isActive
                                            ? 'bg-[#E6F9ED] text-[#299E60]'
                                            : 'bg-[#FDE2E2] text-[#EF4444]'
                                    )}
                                >
                                    {vendor.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-medium text-[#7C7C7C]">
                                    Credit Accounts
                                </span>
                                <span className="text-[14px] font-bold text-[#181725]">
                                    {vendor._count.creditAccounts}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[14px] font-medium text-[#7C7C7C]">
                                    Joined
                                </span>
                                <span className="text-[14px] font-bold text-[#181725]">
                                    {new Date(vendor.user.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden hover:shadow-md transition-all group"
                    >
                        <div className="h-[3px] w-full" style={{ backgroundColor: stat.color }} />
                        <div className="p-4 md:p-6 text-center">
                            <div
                                className="w-[44px] h-[44px] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"
                                style={{
                                    backgroundColor: `${stat.color}15`,
                                    color: stat.color,
                                }}
                            >
                                <stat.icon size={20} />
                            </div>
                            <h4 className="text-[16px] md:text-[20px] font-[900] text-[#181725] leading-none">
                                {stat.value}
                            </h4>
                            <p className="text-[12px] font-bold text-[#AEAEAE] mt-2 uppercase tracking-wider">
                                {stat.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 flex items-center justify-between border-b border-[#EEEEEE]">
                    <h3 className="text-[18px] font-extrabold text-[#181725] flex items-center gap-2">
                        <Package size={20} className="text-[#299E60]" />
                        Products
                        <span className="text-[14px] font-bold text-[#AEAEAE]">
                            ({vendor.products.length})
                        </span>
                    </h3>
                </div>

                {vendor.products.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package size={40} className="text-[#E5E7EB] mx-auto mb-3" />
                        <p className="text-[14px] font-bold text-[#AEAEAE]">
                            No products added yet
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Table Header - hidden on mobile */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-[#FAFAFA] border-b border-[#EEEEEE] text-[12px] font-bold text-[#AEAEAE] uppercase">
                            <div className="col-span-1">#</div>
                            <div className="col-span-5">Product Name</div>
                            <div className="col-span-3">Price</div>
                            <div className="col-span-3">Status</div>
                        </div>

                        {/* Table Rows - card on mobile, table row on desktop */}
                        {vendor.products.map((product, i) => (
                            <div
                                key={product.id}
                                className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 border-b border-[#F5F5F5] md:items-center hover:bg-[#FAFAFA] transition-colors"
                            >
                                <div className="hidden md:block col-span-1 text-[13px] font-bold text-[#AEAEAE]">
                                    {i + 1}
                                </div>
                                <div className="md:col-span-5 flex items-center gap-3">
                                    <div className="w-[40px] h-[40px] md:w-[44px] md:h-[44px] rounded-[10px] bg-[#F1F4F9] overflow-hidden shrink-0">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package
                                                    size={18}
                                                    className="text-[#AEAEAE]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[14px] font-bold text-[#1B2559] truncate">
                                        {product.name}
                                    </p>
                                </div>
                                <div className="md:col-span-3 text-[14px] font-bold text-[#181725] pl-[52px] md:pl-0">
                                    {formatPrice(product.basePrice)}
                                </div>
                                <div className="md:col-span-3 pl-[52px] md:pl-0">
                                    {product.isActive ? (
                                        <span className="inline-flex items-center gap-1.5 bg-[#E6F9ED] text-[#299E60] text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase">
                                            <CheckCircle2 size={12} />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 bg-[#FDE2E2] text-[#EF4444] text-[11px] font-[900] px-2.5 py-1.5 rounded-[6px] uppercase">
                                            <XCircle size={12} />
                                            Inactive
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Delivery Slots + Service Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Delivery Slots */}
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                    <div className="p-4 md:p-6 flex items-center gap-2 border-b border-[#EEEEEE]">
                        <CalendarClock size={20} className="text-[#299E60]" />
                        <h3 className="text-[18px] font-extrabold text-[#181725]">
                            Delivery Slots
                        </h3>
                        <span className="text-[14px] font-bold text-[#AEAEAE]">
                            ({vendor.deliverySlots.length})
                        </span>
                    </div>

                    {vendor.deliverySlots.length === 0 ? (
                        <div className="p-12 text-center">
                            <CalendarClock size={40} className="text-[#E5E7EB] mx-auto mb-3" />
                            <p className="text-[14px] font-bold text-[#AEAEAE]">
                                No delivery slots configured
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#F5F5F5]">
                            {sortedSlots.map((slot) => (
                                <div
                                    key={slot.id}
                                    className="px-6 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-[36px] h-[36px] rounded-[10px] bg-[#EEF8F1] flex items-center justify-center text-[#299E60]">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-[#181725]">
                                                {formatDayOfWeek(slot.dayOfWeek)}
                                            </p>
                                            <p className="text-[12px] text-[#7C7C7C] font-medium mt-0.5">
                                                {formatTime(slot.slotStart)} - {formatTime(slot.slotEnd)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-bold text-[#7C7C7C]">
                                            Cutoff: {formatTime(slot.cutoffTime)}
                                        </span>
                                        {slot.isActive ? (
                                            <span className="inline-flex items-center gap-1 bg-[#E6F9ED] text-[#299E60] text-[10px] font-[900] px-2 py-1 rounded-[5px] uppercase">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-[#FDE2E2] text-[#EF4444] text-[10px] font-[900] px-2 py-1 rounded-[5px] uppercase">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Service Areas */}
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                    <div className="p-4 md:p-6 flex items-center gap-2 border-b border-[#EEEEEE]">
                        <MapPinned size={20} className="text-[#3B82F6]" />
                        <h3 className="text-[18px] font-extrabold text-[#181725]">
                            Service Areas
                        </h3>
                        <span className="text-[14px] font-bold text-[#AEAEAE]">
                            ({vendor.serviceAreas.length})
                        </span>
                    </div>

                    {vendor.serviceAreas.length === 0 ? (
                        <div className="p-12 text-center">
                            <MapPinned size={40} className="text-[#E5E7EB] mx-auto mb-3" />
                            <p className="text-[14px] font-bold text-[#AEAEAE]">
                                No service areas configured
                            </p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="flex flex-wrap gap-3">
                                {vendor.serviceAreas.map((area) => (
                                    <div
                                        key={area.id}
                                        className={cn(
                                            'flex items-center gap-2 px-4 py-2.5 rounded-[10px] border text-[13px] font-bold',
                                            area.isActive
                                                ? 'bg-[#F0F7FF] border-[#3B82F6]/20 text-[#3B82F6]'
                                                : 'bg-[#F5F5F5] border-[#EEEEEE] text-[#AEAEAE]'
                                        )}
                                    >
                                        <MapPin size={14} />
                                        {area.pincode}
                                        {!area.isActive && (
                                            <span className="text-[10px] font-[900] uppercase text-[#AEAEAE]">
                                                (inactive)
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
