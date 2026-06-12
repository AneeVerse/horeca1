'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
    Menu,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ShieldAlert,
    Package,
    Tag,
    Home,
    Sparkles,
    RotateCcw,
    CreditCard,
    Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessAccountSwitcherDropdown } from '@/components/account-switcher/BusinessAccountSwitcherDropdown';
import type { PermissionKey } from '@/lib/permissions/registry';

interface AdminSidebarLink {
    name: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    href: string;
    // ANY-match: if array, user needs at least one of the listed perms.
    // Omit → always visible (e.g. Dashboard).
    requiredPerm?: PermissionKey | PermissionKey[];
}

const SIDEBAR_LINKS: AdminSidebarLink[] = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', requiredPerm: 'dashboard.view' },
    { name: 'Orders', icon: ShoppingBag, href: '/admin/orders', requiredPerm: 'orders.view' },
    { name: 'Customers', icon: Users, href: '/admin/customers', requiredPerm: 'customers.view' },
    { name: 'Vendors', icon: Store, href: '/admin/vendors', requiredPerm: 'vendors.view' },
    { name: 'Products', icon: Package, href: '/admin/products', requiredPerm: 'products.view' },
    { name: 'Categories', icon: Tag, href: '/admin/categories', requiredPerm: 'products.edit' },
    { name: 'Approvals', icon: CheckSquare, href: '/admin/approvals', requiredPerm: ['vendors.approve', 'brands.approve', 'products.approve'] },
    { name: 'Returns', icon: RotateCcw, href: '/admin/returns', requiredPerm: 'orders.edit' },
    { name: 'Brands', icon: Sparkles, href: '/admin/brands', requiredPerm: 'brands.view' },
    { name: 'Finance', icon: Wallet, href: '/admin/finance', requiredPerm: 'payments.view' },
    { name: 'Credit & Wallet', icon: CreditCard, href: '/admin/credit', requiredPerm: 'payments.view' },
    { name: 'Promotions', icon: Gift, href: '/admin/promotions', requiredPerm: 'promotions.view' },
    { name: 'Reports', icon: BarChart3, href: '/admin/reports', requiredPerm: 'analytics.view' },
    { name: 'Team', icon: Users, href: '/admin/team', requiredPerm: ['users.view', 'users.create', 'users.edit', 'users.delete'] },
    { name: 'Settings', icon: Settings, href: '/admin/settings', requiredPerm: 'settings.view' },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [pendingApprovals, setPendingApprovals] = useState(0);

    // Hide sidebar links the current admin role cannot use. Server-side RBAC
    // still enforces access; this keeps the sidebar honest with what UI is
    // reachable. Empty permissions array means no restrictions yet (legacy /
    // root admin) — show everything; otherwise filter by requiredPerm.
    const sessionPerms = ((session?.user as { permissions?: string[] } | undefined)?.permissions) ?? [];
    const can = (need?: PermissionKey | PermissionKey[]): boolean => {
        if (!need) return true;
        if (sessionPerms.length === 0) return true;
        return Array.isArray(need)
            ? need.some((p) => sessionPerms.includes(p))
            : sessionPerms.includes(need);
    };
    const visibleLinks = SIDEBAR_LINKS.filter((link) => can(link.requiredPerm));

    // Poll the pending-approvals count so the sidebar badge reflects reality
    // without a full page reload. 60s cadence is friendly to the DB and good
    // enough for admins — the Approvals page itself shows live numbers.
    useEffect(() => {
        if (status !== 'authenticated') return;
        let cancelled = false;
        const fetchCount = () => {
            fetch('/api/v1/admin/approvals/summary', { credentials: 'include' })
                .then((r) => (r.ok ? r.json() : null))
                .then((j) => {
                    if (cancelled || !j?.success) return;
                    const { pendingVendors = 0, pendingProducts = 0, pendingCategories = 0 } = j.data ?? {};
                    Promise.resolve().then(() => setPendingApprovals(pendingVendors + pendingProducts + pendingCategories));
                })
                .catch(() => {});
        };
        fetchCount();
        const id = setInterval(fetchCount, 60_000);
        return () => { cancelled = true; clearInterval(id); };
    }, [status, pathname]);

    // Show loading while checking auth
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F8F9FB]">
                <Loader2 className="animate-spin text-[#299E60]" size={40} />
            </div>
        );
    }

    // Block non-admin users
    const userRole = (session?.user as { role?: string })?.role;
    if (status === 'unauthenticated' || userRole !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FB] gap-4">
                <ShieldAlert size={48} className="text-[#E74C3C]" />
                <h1 className="text-[24px] font-bold text-[#181725]">Access Denied</h1>
                <p className="text-[14px] text-[#7C7C7C]">You need admin privileges to access this area.</p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-4 px-6 py-3 bg-[#299E60] text-white rounded-[10px] font-bold hover:bg-[#238a54] transition-colors"
                >
                    Go to Homepage
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F9FB]">
            {/* Full-width Top Header */}
            <header className="h-[80px] bg-white border-b border-[#EEEEEE] flex items-center px-8 sticky top-0 z-50 shrink-0">
                {/* Logo Section - same width as sidebar */}
                <div className={cn(
                    "shrink-0 flex items-center gap-3 transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-[60px]" : "w-[220px]"
                )}>
                    <Link href="/admin/dashboard" className="flex items-center gap-3 overflow-hidden">
                        <div className="w-[42px] h-[42px] shrink-0">
                            <img src="/images/admin/Ellipse 2.svg" alt="" className="w-full h-full object-contain" />
                        </div>
                        {!isCollapsed && (
                            <div className="whitespace-nowrap">
                                <h1 className="text-[22px] font-extrabold leading-tight">
                                    <span className="text-[#E74C3C]">Horeca</span><span className="text-[#299E60]">1</span>
                                </h1>
                                <p className="text-[10px] text-[#AEAEAE] font-semibold uppercase tracking-[0.15em] -mt-0.5">Admin Panel</p>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Sidebar Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#181725]"
                >
                    <Menu size={22} />
                </button>

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

                    <BusinessAccountSwitcherDropdown />
                </div>
            </header>

            {/* Body: Sidebar + Content */}
            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className={cn(
                    "bg-white border-r border-[#EEEEEE] flex flex-col shrink-0 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto transition-all duration-300 ease-in-out z-40",
                    isCollapsed ? "w-[80px]" : "w-[240px]"
                )}>
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {visibleLinks.map((link) => {
                            const isActive = pathname === link.href;
                            // Badge count only for the Approvals row (extend here if more rows need badges later).
                            const badge = link.name === 'Approvals' ? pendingApprovals : 0;
                            const badgeLabel = badge > 99 ? '99+' : String(badge);
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    title={isCollapsed ? (badge > 0 ? `${link.name} (${badgeLabel} pending)` : link.name) : ""}
                                    className={cn(
                                        "relative flex items-center rounded-[10px] transition-all group text-[14px] overflow-hidden leading-none",
                                        isCollapsed ? "justify-center h-[48px] px-0" : "gap-3.5 px-5 py-3.5",
                                        isActive
                                            ? "bg-[#299E60] text-white shadow-md shadow-[#299E60]/20"
                                            : "text-[#191919] hover:bg-[#F8F9FB]"
                                    )}
                                >
                                    <span className="relative shrink-0">
                                        <link.icon size={22} className={cn(
                                            "transition-colors",
                                            isActive ? "text-white" : "text-[#000000] group-hover:text-[#000000]"
                                        )} />
                                        {/* Collapsed: small red dot on the icon corner with a ping ring */}
                                        {isCollapsed && badge > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 border border-white" />
                                            </span>
                                        )}
                                    </span>
                                    {!isCollapsed && (
                                        <>
                                            <span className="font-semibold whitespace-nowrap flex-1">{link.name}</span>
                                            {/* Expanded: numeric pill on the right with a soft ping ring */}
                                            {badge > 0 && (
                                                <span className="relative inline-flex items-center justify-center">
                                                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />
                                                    <span className={cn(
                                                        "relative inline-flex min-w-[22px] h-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold border",
                                                        isActive ? "bg-white text-red-600 border-white" : "bg-red-500 text-white border-white"
                                                    )}>
                                                        {badgeLabel}
                                                    </span>
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* View Storefront */}
                    <div className="px-4 pb-3">
                        <Link
                            href="/"
                            title={isCollapsed ? 'View Storefront' : ''}
                            className={cn(
                                'flex items-center rounded-[10px] transition-all text-[14px] overflow-hidden leading-none text-[#299E60] hover:bg-[#E8F7EF] font-semibold',
                                isCollapsed ? 'justify-center h-[48px] px-0' : 'gap-3.5 px-5 py-3.5'
                            )}
                        >
                            <Home size={22} className="shrink-0" />
                            {!isCollapsed && <span className="whitespace-nowrap">View Storefront</span>}
                        </Link>
                    </div>

                    {/* Collapse Toggle Footer (Optional extra toggle) */}
                    <div className="p-4 border-t border-[#EEEEEE] flex justify-center">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full flex items-center justify-center p-2 hover:bg-gray-50 rounded-lg transition-colors text-[#AEAEAE] hover:text-[#181725]"
                        >
                            {isCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={20} /><span className="text-[13px] font-medium">Collapse Menu</span></div>}
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
