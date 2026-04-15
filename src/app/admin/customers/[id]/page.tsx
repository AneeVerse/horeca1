'use client';

import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    Mail,
    Phone,
    CheckCircle2,
    XCircle,
    Package,
    ListOrdered,
    Shield,
    Building2,
    Star,
    FileText,
    Calendar,
    Loader2,
    AlertCircle,
    Power,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface VendorProfile {
    id: string;
    businessName: string;
    isVerified: boolean;
    isActive: boolean;
    rating: number | null;
}

interface UserData {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: 'customer' | 'vendor' | 'admin';
    businessName: string | null;
    gstNumber: string | null;
    pincode: string | null;
    image: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    vendor: VendorProfile | null;
    _count: {
        orders: number;
        quickOrderLists: number;
    };
}

function formatDateIndian(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function truncateId(id: string): string {
    if (id.length <= 12) return id;
    return id.slice(0, 6) + '...' + id.slice(-4);
}

function getRoleBadgeStyles(role: string) {
    switch (role) {
        case 'admin':
            return 'bg-purple-50 text-purple-700';
        case 'vendor':
            return 'bg-blue-50 text-blue-700';
        default:
            return 'bg-[#EEF8F1] text-[#299E60]';
    }
}

export default function CustomerDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        async function fetchUser() {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`/api/v1/admin/users/${userId}`);
                if (!res.ok) {
                    throw new Error(`Failed to fetch user (${res.status})`);
                }
                const json = await res.json();
                if (!json.success) {
                    throw new Error(json.message || 'Failed to fetch user');
                }
                setUser(json.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            } finally {
                setLoading(false);
            }
        }

        if (userId) {
            fetchUser();
        }
    }, [userId]);

    async function handleToggleActive() {
        if (!user || toggling) return;
        try {
            setToggling(true);
            const res = await fetch(`/api/v1/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !user.isActive }),
            });
            if (!res.ok) {
                throw new Error(`Failed to update user (${res.status})`);
            }
            const json = await res.json();
            if (json.success) {
                setUser((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
            } else {
                throw new Error(json.message || 'Failed to update user');
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update user status');
        } finally {
            setToggling(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#299E60]" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-[16px] font-bold text-[#4B4B4B]">{error || 'User not found'}</p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-[#299E60] text-white rounded-xl text-[14px] font-bold hover:bg-[#238a53] transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const avatarUrl = user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.fullName)}`;

    return (
        <div className="space-y-6 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[14px] text-[#4B4B4B]">
                <button
                    onClick={() => router.back()}
                    className="hover:text-[#299E60] flex items-center gap-1 transition-colors"
                >
                    <ChevronLeft size={16} />
                    Back
                </button>
                <span className="text-gray-300">|</span>
                <span className="font-bold text-[#181725]">Customer Details</span>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                        <div className="h-24 bg-[#299E60] relative">
                            <div
                                className="absolute inset-0 opacity-10"
                                style={{
                                    backgroundImage:
                                        'radial-gradient(circle, #fff 1.5px, transparent 1.5px)',
                                    backgroundSize: '16px 16px',
                                }}
                            />
                        </div>
                        <div className="px-6 pb-6 relative">
                            <div className="absolute -top-10 left-6">
                                <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
                                    <img
                                        src={avatarUrl}
                                        alt={user.fullName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            <div className="pt-12">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-[20px] font-[800] text-[#181725]">
                                        {user.fullName}
                                    </h2>
                                    {user.isActive ? (
                                        <CheckCircle2
                                            size={18}
                                            className="text-[#299E60]"
                                            fill="#EEF8F1"
                                        />
                                    ) : (
                                        <XCircle
                                            size={18}
                                            className="text-red-400"
                                            fill="#FFF0F0"
                                        />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span
                                        className={cn(
                                            'text-[11px] font-[800] px-2.5 py-1 rounded-md capitalize',
                                            getRoleBadgeStyles(user.role)
                                        )}
                                    >
                                        {user.role}
                                    </span>
                                </div>
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-[14px] text-[#4B4B4B]">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#7C7C7C]">
                                            <Mail size={16} />
                                        </div>
                                        <span className="font-bold truncate">{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[14px] text-[#4B4B4B]">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#7C7C7C]">
                                            <Phone size={16} />
                                        </div>
                                        <span className="font-bold">{user.phone}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggleActive}
                                    disabled={toggling}
                                    className={cn(
                                        'w-full py-2.5 rounded-xl text-[14px] font-[800] transition-all flex items-center justify-center gap-2 shadow-sm',
                                        user.isActive
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                            : 'bg-[#299E60] text-white hover:bg-[#238a53]'
                                    )}
                                >
                                    {toggling ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Power size={16} />
                                    )}
                                    {toggling
                                        ? 'Updating...'
                                        : user.isActive
                                          ? 'Deactivate User'
                                          : 'Activate User'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Customer Details Card */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
                            <h3 className="font-[800] text-[16px] text-[#181725]">
                                Customer Details
                            </h3>
                            <span
                                className={cn(
                                    'text-[11px] font-[800] px-2.5 py-1 rounded-md flex items-center gap-1.5',
                                    user.isActive
                                        ? 'bg-[#EEF8F1] text-[#299E60]'
                                        : 'bg-red-50 text-red-500'
                                )}
                            >
                                <span
                                    className={cn(
                                        'w-1.5 h-1.5 rounded-full',
                                        user.isActive
                                            ? 'bg-[#299E60] animate-pulse shadow-[0_0_8px_rgba(41,158,96,0.5)]'
                                            : 'bg-red-400'
                                    )}
                                />
                                {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="divide-y divide-[#EEEEEE]">
                            <DetailRow label="Account ID" value={truncateId(user.id)} />
                            <DetailRow label="Email" value={user.email} />
                            <DetailRow label="Phone" value={user.phone} />
                            <DetailRow
                                label="Pincode"
                                value={user.pincode || '--'}
                            />
                            <DetailRow
                                label="Business Name"
                                value={user.businessName || '--'}
                            />
                            <DetailRow
                                label="GST Number"
                                value={user.gstNumber || '--'}
                            />
                            <DetailRow
                                label="Joined"
                                value={formatDateIndian(user.createdAt)}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="xl:col-span-8 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            label="Total Orders"
                            value={String(user._count.orders)}
                            icon={Package}
                        />
                        <StatCard
                            label="Order Lists"
                            value={String(user._count.quickOrderLists)}
                            icon={ListOrdered}
                        />
                        <div className="bg-white p-5 rounded-[14px] border border-[#EEEEEE] flex items-center justify-between shadow-sm">
                            <div className="space-y-1">
                                <p className="text-[13px] font-[800] text-[#7C7C7C]">Role</p>
                                <span
                                    className={cn(
                                        'inline-block text-[14px] font-[800] px-3 py-1 rounded-md capitalize',
                                        getRoleBadgeStyles(user.role)
                                    )}
                                >
                                    {user.role}
                                </span>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-[#299E60]/10 flex items-center justify-center text-[#299E60]">
                                <Shield size={20} />
                            </div>
                        </div>
                    </div>

                    {/* Vendor Profile Card (conditional) */}
                    {user.vendor && (
                        <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
                                <h3 className="font-[800] text-[16px] text-[#181725] flex items-center gap-2">
                                    <Building2 size={18} className="text-[#299E60]" />
                                    Vendor Profile
                                </h3>
                                <span
                                    className={cn(
                                        'text-[11px] font-[800] px-2.5 py-1 rounded-md',
                                        user.vendor.isVerified
                                            ? 'bg-[#EEF8F1] text-[#299E60]'
                                            : 'bg-amber-50 text-amber-600'
                                    )}
                                >
                                    {user.vendor.isVerified ? 'Verified' : 'Unverified'}
                                </span>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-[12px] font-[800] text-[#7C7C7C] mb-1">
                                            Business Name
                                        </p>
                                        <p className="text-[14px] font-[800] text-[#181725]">
                                            {user.vendor.businessName}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-[800] text-[#7C7C7C] mb-1">
                                            Vendor ID
                                        </p>
                                        <p className="text-[14px] font-[800] text-[#181725]">
                                            {truncateId(user.vendor.id)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-[800] text-[#7C7C7C] mb-1">
                                            Status
                                        </p>
                                        <span
                                            className={cn(
                                                'inline-block text-[12px] font-[800] px-2.5 py-1 rounded-md',
                                                user.vendor.isActive
                                                    ? 'bg-[#EEF8F1] text-[#299E60]'
                                                    : 'bg-red-50 text-red-500'
                                            )}
                                        >
                                            {user.vendor.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-[800] text-[#7C7C7C] mb-1">
                                            Rating
                                        </p>
                                        {user.vendor.rating !== null ? (
                                            <div className="flex items-center gap-1.5">
                                                <Star
                                                    size={16}
                                                    className="text-amber-400 fill-amber-400"
                                                />
                                                <span className="text-[14px] font-[800] text-[#181725]">
                                                    {user.vendor.rating.toFixed(1)}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-[14px] font-[800] text-[#7C7C7C]">
                                                No rating yet
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Account Timeline Card */}
                    <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#EEEEEE]">
                            <h3 className="font-[800] text-[16px] text-[#181725] flex items-center gap-2">
                                <Calendar size={18} className="text-[#299E60]" />
                                Account Timeline
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-[10px] bg-[#EAF7EF] flex items-center justify-center text-[#299E60] shadow-sm">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-[800] text-[#7C7C7C]">
                                            Account Created
                                        </p>
                                        <p className="text-[14px] font-[800] text-[#181725]">
                                            {formatDateIndian(user.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-[10px] bg-[#EAF7EF] flex items-center justify-center text-[#299E60] shadow-sm">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-[800] text-[#7C7C7C]">
                                            Last Updated
                                        </p>
                                        <p className="text-[14px] font-[800] text-[#181725]">
                                            {formatDateIndian(user.updatedAt)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="px-6 py-4 flex items-center justify-between text-[13px]">
            <span className="font-[800] text-[#4B4B4B]">{label} :</span>
            <span className="font-[800] text-[#181725] text-right max-w-[60%] truncate">
                {value}
            </span>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: React.ComponentType<{ size?: number }>;
}) {
    return (
        <div className="bg-white p-5 rounded-[14px] border border-[#EEEEEE] flex items-center justify-between shadow-sm">
            <div className="space-y-1">
                <p className="text-[13px] font-[800] text-[#7C7C7C]">{label}</p>
                <h4 className="text-[22px] font-[800] text-[#181725]">{value}</h4>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#299E60]/10 flex items-center justify-center text-[#299E60]">
                <Icon size={20} />
            </div>
        </div>
    );
}
