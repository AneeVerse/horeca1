'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, GitMerge, CheckCircle, Clock, TrendingUp, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface BrandProfile {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    approvalStatus: string;
    _count: {
        masterProducts: number;
        productMappings: number;
    };
}

export default function BrandPortalDashboard() {
    const [profile, setProfile] = useState<BrandProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/v1/brand/profile')
            .then(r => r.json())
            .then(json => {
                if (json.success) setProfile(json.data);
                else setError(json.error?.message ?? 'Failed to load profile');
            })
            .catch(() => setError('Network error'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#53B175]" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="max-w-[600px] mx-auto mt-16 text-center">
                <AlertCircle size={48} className="mx-auto text-[#E74C3C] mb-4" />
                <h2 className="text-[20px] font-black text-[#181725] mb-2">Brand Profile Not Found</h2>
                <p className="text-[14px] text-[#7C7C7C] mb-6">
                    Your brand profile hasn't been set up yet. Contact the HoReCa admin to get onboarded.
                </p>
            </div>
        );
    }

    const isApproved = profile.approvalStatus === 'approved';
    const isPending = profile.approvalStatus === 'pending';

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-[28px] font-[900] text-[#181725] tracking-tight">
                        Welcome back, {profile.name}
                    </h1>
                    <p className="text-[#7C7C7C] font-medium mt-1">Manage your brand catalog and distributor network</p>
                </div>
                <Link
                    href={`/brand/${profile.slug}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#3d9e41] transition-colors"
                >
                    View Brand Store <ArrowRight size={14} />
                </Link>
            </div>

            {/* Approval Banner */}
            {isPending && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-[14px]">
                    <Clock size={20} className="text-amber-500 shrink-0" />
                    <div>
                        <p className="text-[14px] font-bold text-amber-800">Brand Pending Approval</p>
                        <p className="text-[12px] text-amber-600 mt-0.5">
                            Your brand is under review by our admin team. You can still manage your catalog while waiting.
                        </p>
                    </div>
                </div>
            )}
            {isApproved && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-[14px]">
                    <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                    <p className="text-[14px] font-bold text-emerald-800">Brand Approved &amp; Live</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    {
                        label: 'Catalog Products',
                        value: profile._count.masterProducts,
                        icon: Package,
                        color: '#3B82F6',
                        bg: '#EFF6FF',
                        href: '/brand/portal/products',
                    },
                    {
                        label: 'Active Mappings',
                        value: profile._count.productMappings,
                        icon: GitMerge,
                        color: '#53B175',
                        bg: '#EEF8F1',
                        href: '/brand/portal/mappings',
                    },
                    {
                        label: 'Brand Status',
                        value: profile.approvalStatus === 'approved' ? 'Live' : 'Pending',
                        icon: TrendingUp,
                        color: isApproved ? '#53B175' : '#F59E0B',
                        bg: isApproved ? '#EEF8F1' : '#FFF7E6',
                        href: '/brand/portal/settings',
                    },
                ].map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="bg-white p-5 rounded-[16px] border border-[#EEEEEE] shadow-sm flex items-center gap-4 hover:border-[#53B175]/30 hover:shadow-md transition-all"
                    >
                        <div className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: stat.bg, color: stat.color }}>
                            <stat.icon size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-[24px] font-[900] text-[#181725] leading-none mt-0.5">{stat.value}</h3>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-[20px] border border-[#EEEEEE] p-6">
                <h2 className="text-[16px] font-[900] text-[#181725] mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                        href="/brand/portal/products"
                        className="flex items-center gap-3 p-4 bg-[#F8F9FB] rounded-[12px] hover:bg-[#EEF8F1] transition-colors group"
                    >
                        <div className="w-10 h-10 rounded-[10px] bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
                            <Package size={18} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[14px] font-bold text-[#181725] group-hover:text-[#53B175]">Add New Product</p>
                            <p className="text-[12px] text-[#AEAEAE]">Expand your brand catalog</p>
                        </div>
                        <ArrowRight size={16} className="text-[#AEAEAE] group-hover:text-[#53B175]" />
                    </Link>
                    <Link
                        href="/brand/portal/mappings"
                        className="flex items-center gap-3 p-4 bg-[#F8F9FB] rounded-[12px] hover:bg-[#EEF8F1] transition-colors group"
                    >
                        <div className="w-10 h-10 rounded-[10px] bg-[#53B175]/10 flex items-center justify-center text-[#53B175]">
                            <GitMerge size={18} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[14px] font-bold text-[#181725] group-hover:text-[#53B175]">Run Auto-Mapping</p>
                            <p className="text-[12px] text-[#AEAEAE]">Find distributor matches</p>
                        </div>
                        <ArrowRight size={16} className="text-[#AEAEAE] group-hover:text-[#53B175]" />
                    </Link>
                </div>
            </div>

            {/* Brand Info Card */}
            <div className="bg-white rounded-[20px] border border-[#EEEEEE] overflow-hidden">
                {profile.bannerUrl && (
                    <div className="h-[140px] overflow-hidden">
                        <img src={profile.bannerUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="p-6 flex items-center gap-4">
                    {profile.logoUrl && (
                        <img src={profile.logoUrl} alt={profile.name}
                            className="w-14 h-14 rounded-[12px] object-cover border border-[#EEEEEE] shrink-0" />
                    )}
                    <div>
                        <h3 className="text-[18px] font-[900] text-[#181725]">{profile.name}</h3>
                        {profile.tagline && <p className="text-[13px] text-[#7C7C7C] mt-0.5">{profile.tagline}</p>}
                    </div>
                    <div className="ml-auto">
                        <Link
                            href="/brand/portal/settings"
                            className="text-[13px] font-bold text-[#53B175] hover:underline"
                        >
                            Edit Profile →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
