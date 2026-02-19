'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    Store,
    CheckSquare,
    Wallet,
    BarChart3,
    Settings,
    Bell,
    Search,
    ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SIDEBAR_LINKS = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { name: 'Orders', icon: ShoppingBag, href: '/admin/orders' },
    { name: 'Customers', icon: Users, href: '/admin/customers' },
    { name: 'Vendors', icon: Store, href: '/admin/vendors' },
    { name: 'Approvals', icon: CheckSquare, href: '/admin/approvals' },
    { name: 'Finance', icon: Wallet, href: '/admin/finance' },
    { name: 'Reports', icon: BarChart3, href: '/admin/reports' },
    { name: 'Settings', icon: Settings, href: '/admin/settings' },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F9FB] font-[family-name:var(--font-poppins)]">
            {/* Full-width Top Header */}
            <header className="h-[80px] bg-white border-b border-[#EEEEEE] flex items-center px-8 sticky top-0 z-50 shrink-0">
                {/* Logo Section - same width as sidebar */}
                <div className="w-[220px] shrink-0 flex items-center gap-3">
                    <Link href="/admin/dashboard" className="flex items-center gap-3">
                        <div className="w-[42px] h-[42px] shrink-0">
                            <img src="/images/admin/Ellipse 2.svg" alt="" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-[22px] font-extrabold leading-tight">
                                <span className="text-[#E74C3C]">Horeca</span><span className="text-[#299E60]">1</span>
                            </h1>
                            <p className="text-[10px] text-[#AEAEAE] font-semibold uppercase tracking-[0.15em] -mt-0.5">Admin Panel</p>
                        </div>
                    </Link>
                </div>

                {/* Search Bar - centered */}
                <div className="flex-1 flex justify-center px-10">
                    <div className="relative group w-full max-w-[520px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={18} />
                        <input
                            type="text"
                            placeholder="search"
                            className="w-full bg-[#F5F5F5] border border-[#EEEEEE] rounded-[14px] py-3 pl-11 pr-4 text-[14px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                        />
                    </div>
                </div>

                {/* Right Side - Bell + Admin */}
                <div className="flex items-center gap-5 shrink-0">
                    <button className="relative hover:bg-gray-50 rounded-full p-2 transition-colors">
                        <Bell size={22} className="text-[#181725]" fill="#181725" />
                    </button>

                    <div className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-[42px] h-[42px] relative flex items-center justify-center shrink-0">
                            <img src="/images/admin/Ellipse 2.svg" alt="" className="absolute inset-0 w-full h-full object-contain" />
                            <span className="relative z-10 text-white font-bold text-[13px]">AD</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[15px] font-bold text-[#181725]">Admin</span>
                            <ChevronDown size={16} className="text-[#AEAEAE] group-hover:text-[#181725] transition-colors" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Body: Sidebar + Content */}
            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-[220px] bg-white border-r border-[#EEEEEE] flex flex-col shrink-0 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto">
                    <nav className="flex-1 px-4 py-6 space-y-1">
                        {SIDEBAR_LINKS.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={cn(
                                        "flex items-center gap-3.5 px-5 py-3.5 rounded-[10px] transition-all group text-[14px]",
                                        isActive
                                            ? "bg-[#299E60] text-white shadow-md shadow-[#299E60]/20"
                                            : "text-[#191919] hover:bg-[#F8F9FB]"
                                    )}
                                >
                                    <link.icon size={20} className={cn(
                                        "transition-colors shrink-0",
                                        isActive ? "text-white" : "text-[#000000] group-hover:text-[#000000]"
                                    )} />
                                    <span className="font-semibold">{link.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
