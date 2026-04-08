'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, ShoppingCart, Star, TrendingUp, Loader2, ArrowRight } from 'lucide-react';

interface VendorStats {
    totalOrders: number;
    totalProducts: number;
    pendingOrders: number;
    rating: number;
    totalRatings: number;
    totalRevenue: number;
}

export default function VendorDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<VendorStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/auth/login');
            return;
        }
        if ((session.user as { role?: string })?.role !== 'vendor') {
            router.push('/');
            return;
        }

        // Fetch vendor stats
        fetch('/api/v1/vendor/dashboard')
            .then(res => res.json())
            .then(json => { if (json.success) setStats(json.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [session, status, router]);

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-[#53B175]" size={32} />
            </div>
        );
    }

    const cards = [
        { label: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', href: '/vendor/orders' },
        { label: 'Pending Orders', value: stats?.pendingOrders ?? 0, icon: Package, color: 'text-orange-500', bg: 'bg-orange-50', href: '/vendor/orders?status=pending' },
        { label: 'Total Products', value: stats?.totalProducts ?? 0, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', href: '/vendor/products' },
        { label: 'Revenue', value: `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-[#53B175]', bg: 'bg-[#53B175]/10', href: '#' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-[28px] font-black text-[#181725]">Vendor Dashboard</h1>
                    <p className="text-gray-500 mt-1">Welcome back, {session?.user?.name || 'Vendor'}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {cards.map((card, i) => (
                        <Link key={i} href={card.href} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.bg}`}>
                                <card.icon size={20} className={card.color} />
                            </div>
                            <p className="text-[13px] text-gray-500 font-medium">{card.label}</p>
                            <p className="text-[22px] font-black text-[#181725] mt-0.5">{card.value}</p>
                        </Link>
                    ))}
                </div>

                {stats && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Star size={18} fill="#FFB800" className="text-[#FFB800]" />
                            <span className="text-[18px] font-black text-[#181725]">{stats.rating.toFixed(1)}</span>
                            <span className="text-gray-400 text-[14px]">({stats.totalRatings} reviews)</span>
                        </div>
                        <p className="text-[13px] text-gray-500">Your average customer rating</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/vendor/products" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div>
                            <p className="text-[16px] font-bold text-[#181725]">Manage Products</p>
                            <p className="text-[13px] text-gray-400 mt-0.5">Add, edit, or remove your products</p>
                        </div>
                        <ArrowRight size={20} className="text-gray-300 group-hover:text-[#53B175] transition-colors" />
                    </Link>
                    <Link href="/vendor/orders" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div>
                            <p className="text-[16px] font-bold text-[#181725]">View Orders</p>
                            <p className="text-[13px] text-gray-400 mt-0.5">Manage and fulfill incoming orders</p>
                        </div>
                        <ArrowRight size={20} className="text-gray-300 group-hover:text-[#53B175] transition-colors" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
