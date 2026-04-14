'use client';

import React, { useState, useEffect } from 'react';
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
    ChevronDown,
    Menu,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ShieldAlert,
    Package,
    Tag,
    Home,
    Sparkles,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountSwitcherDropdown } from '@/components/account-switcher/AccountSwitcherDropdown';

const SIDEBAR_LINKS = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    { name: 'Orders', icon: ShoppingBag, href: '/admin/orders' },
    { name: 'Customers', icon: Users, href: '/admin/customers' },
    { name: 'Vendors', icon: Store, href: '/admin/vendors' },
    { name: 'Products', icon: Package, href: '/admin/products' },
    { name: 'Categories', icon: Tag, href: '/admin/categories' },
    { name: 'Approvals', icon: CheckSquare, href: '/admin/approvals' },
    { name: 'Brands', icon: Sparkles, href: '/admin/brands' },
    { name: 'Finance', icon: Wallet, href: '/admin/finance' },
    { name: 'Reports', icon: BarChart3, href: '/admin/reports' },
    { name: 'Team', icon: Users, href: '/admin/team' },
    { name: 'Settings', icon: Settings, href: '/admin/settings' },
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
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Close mobile sidebar on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobileOpen]);

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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FB] gap-4 px-4">
                <ShieldAlert size={48} className="text-[#E74C3C]" />
                <h1 className="text-[24px] font-bold text-[#181725] text-center">Access Denied</h1>
                <p className="text-[14px] text-[#7C7C7C] text-center">You need admin privileges to access this area.</p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-4 px-6 py-3 bg-[#299E60] text-white rounded-[10px] font-bold hover:bg-[#238a54] transition-colors"
                >
                    Go to Homepage
                </button>
            </div>
        );
    }

    const SidebarContent = () => (
        <>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {SIDEBAR_LINKS.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            title={isCollapsed ? link.name : ""}
                            className={cn(
                                "flex items-center rounded-[10px] transition-all group text-[14px] overflow-hidden leading-none",
                                isCollapsed && !isMobileOpen ? "justify-center h-[48px] px-0" : "gap-3.5 px-5 py-3.5",
                                isActive
                                    ? "bg-[#299E60] text-white shadow-md shadow-[#299E60]/20"
                                    : "text-[#191919] hover:bg-[#F8F9FB]"
                            )}
                        >
                            <link.icon size={22} className={cn(
                                "transition-colors shrink-0",
                                isActive ? "text-white" : "text-[#000000] group-hover:text-[#000000]"
                            )} />
                            {(!isCollapsed || isMobileOpen) && (
                                <span className="font-semibold whitespace-nowrap">{link.name}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* View Storefront */}
            <div className="px-4 pb-3">
                <Link
                    href="/"
                    title={isCollapsed && !isMobileOpen ? 'View Storefront' : ''}
                    className={cn(
                        'flex items-center rounded-[10px] transition-all text-[14px] overflow-hidden leading-none text-[#299E60] hover:bg-[#E8F7EF] font-semibold',
                        isCollapsed && !isMobileOpen ? 'justify-center h-[48px] px-0' : 'gap-3.5 px-5 py-3.5'
                    )}
                >
                    <Home size={22} className="shrink-0" />
                    {(!isCollapsed || isMobileOpen) && <span className="whitespace-nowrap">View Storefront</span>}
                </Link>
            </div>

            {/* Collapse Toggle Footer — hidden on mobile */}
            <div className="p-4 border-t border-[#EEEEEE] hidden lg:flex justify-center">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center p-2 hover:bg-gray-50 rounded-lg transition-colors text-[#AEAEAE] hover:text-[#181725]"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={20} /><span className="text-[13px] font-medium">Collapse Menu</span></div>}
                </button>
            </div>
        </>
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F9FB] font-[family-name:var(--font-poppins)] overflow-x-hidden max-w-[100vw]">
            {/* Full-width Top Header */}
            <header className="h-[64px] lg:h-[80px] bg-white border-b border-[#EEEEEE] flex items-center px-4 lg:px-8 sticky top-0 z-50 shrink-0 max-w-[100vw] overflow-hidden">
                {/* Logo Section - same width as sidebar on desktop */}
                <div className={cn(
                    "shrink-0 flex items-center gap-3 transition-all duration-300 ease-in-out",
                    isCollapsed ? "lg:w-[60px]" : "lg:w-[220px]"
                )}>
                    <Link href="/admin/dashboard" className="flex items-center gap-3 overflow-hidden">
                        <div className="w-[36px] h-[36px] lg:w-[42px] lg:h-[42px] shrink-0">
                            <img src="/images/admin/Ellipse 2.svg" alt="" className="w-full h-full object-contain" />
                        </div>
                        <div className={cn("whitespace-nowrap", isCollapsed && "hidden lg:hidden")}>
                            <h1 className="text-[20px] lg:text-[22px] font-extrabold leading-tight">
                                <span className="text-[#E74C3C]">Horeca</span><span className="text-[#299E60]">1</span>
                            </h1>
                            <p className="text-[9px] lg:text-[10px] text-[#AEAEAE] font-semibold uppercase tracking-[0.15em] -mt-0.5">Admin Panel</p>
                        </div>
                    </Link>
                </div>

                {/* Sidebar Toggle Button */}
                <button
                    onClick={() => {
                        // On mobile: toggle mobile drawer. On desktop: toggle collapse.
                        if (window.innerWidth < 1024) {
                            setIsMobileOpen(!isMobileOpen);
                        } else {
                            setIsCollapsed(!isCollapsed);
                        }
                    }}
                    className="ml-2 lg:ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#181725]"
                >
                    <Menu size={22} />
                </button>

                {/* Search Bar - hidden on mobile, centered on desktop */}
                <div className="flex-1 hidden md:flex justify-center px-4 lg:px-10">
                    <div className="relative group w-full max-w-[800px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={18} />
                        <input
                            type="text"
                            placeholder="search"
                            className="w-full bg-[#F5F5F5] border border-[#EEEEEE] rounded-[14px] py-3 pl-11 pr-4 text-[14px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                        />
                    </div>
                </div>

                {/* Right Side - Bell + Admin */}
                <div className="flex items-center gap-3 lg:gap-5 shrink-0 ml-auto min-w-0 overflow-hidden">
                    <button className="relative hover:bg-gray-50 rounded-full p-2 transition-colors">
                        <Bell size={20} className="lg:w-[22px] lg:h-[22px] text-[#181725]" fill="#181725" />
                    </button>

                    <AccountSwitcherDropdown />
                </div>
            </header>

            {/* Body: Sidebar + Content */}
            <div className="flex flex-1 w-full">
                {/* Mobile Sidebar Overlay */}
                {isMobileOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}

                {/* Mobile Sidebar Drawer */}
                <aside className={cn(
                    "fixed top-0 left-0 h-full bg-white border-r border-[#EEEEEE] flex flex-col z-50 w-[280px] transition-transform duration-300 ease-in-out lg:hidden",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    {/* Mobile Drawer Header */}
                    <div className="h-[64px] flex items-center justify-between px-4 border-b border-[#EEEEEE] shrink-0">
                        <Link href="/admin/dashboard" className="flex items-center gap-3">
                            <div className="w-[36px] h-[36px] shrink-0">
                                <img src="/images/admin/Ellipse 2.svg" alt="" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="text-[20px] font-extrabold leading-tight">
                                    <span className="text-[#E74C3C]">Horeca</span><span className="text-[#299E60]">1</span>
                                </h1>
                                <p className="text-[9px] text-[#AEAEAE] font-semibold uppercase tracking-[0.15em] -mt-0.5">Admin Panel</p>
                            </div>
                        </Link>
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#7C7C7C]"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <SidebarContent />
                    </div>
                </aside>

                {/* Desktop Sidebar */}
                <aside className={cn(
                    "bg-white border-r border-[#EEEEEE] flex-col shrink-0 sticky top-[80px] h-[calc(100vh-80px)] overflow-y-auto transition-all duration-300 ease-in-out z-40 hidden lg:flex",
                    isCollapsed ? "w-[80px]" : "w-[240px]"
                )}>
                    <SidebarContent />
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col p-3 md:p-5 lg:p-6 min-w-0 w-full overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
