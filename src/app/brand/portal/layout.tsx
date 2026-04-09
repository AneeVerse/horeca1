'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    LayoutDashboard,
    Package,
    GitMerge,
    Settings,
    Bell,
    Menu,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ShieldAlert,
    Home,
    LogOut,
    Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

const SIDEBAR_LINKS = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/brand/portal' },
    { name: 'My Products', icon: Package, href: '/brand/portal/products' },
    { name: 'Distributor Map', icon: GitMerge, href: '/brand/portal/mappings' },
    { name: 'Settings', icon: Settings, href: '/brand/portal/settings' },
];

export default function BrandPortalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [adminBrandName, setAdminBrandName] = useState<string | null>(null);

    React.useEffect(() => {
        const match = document.cookie.match(/(?:^|;\s*)admin_impersonate_brand_name=([^;]+)/);
        setAdminBrandName(match ? decodeURIComponent(match[1]) : null);
    }, []);

    const handleExitAdminView = async () => {
        await fetch('/api/v1/admin/impersonate/brand', { method: 'DELETE' });
        router.push('/admin/brands');
    };

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F8F9FB]">
                <Loader2 className="animate-spin text-[#53B175]" size={40} />
            </div>
        );
    }

    const userRole = (session?.user as { role?: string })?.role;
    if (status === 'unauthenticated' || (userRole !== 'brand' && userRole !== 'admin')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FB] gap-4">
                <ShieldAlert size={48} className="text-[#E74C3C]" />
                <h1 className="text-[24px] font-bold text-[#181725]">Brand Access Only</h1>
                <p className="text-[14px] text-[#7C7C7C]">You need a brand account to access this area.</p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-4 px-6 py-3 bg-[#53B175] text-white rounded-[10px] font-bold hover:bg-[#3d9e41] transition-colors"
                >
                    Go to Homepage
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F9FB] font-[family-name:var(--font-poppins)]">
            {/* Top Header */}
            <header className="h-[70px] bg-white border-b border-[#EEEEEE] flex items-center px-6 sticky top-0 z-50 shrink-0">
                <div className={cn(
                    'shrink-0 flex items-center gap-3 transition-all duration-300',
                    isCollapsed ? 'w-[52px]' : 'w-[210px]'
                )}>
                    <Link href="/brand/portal" className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-9 h-9 bg-[#53B175] rounded-[10px] flex items-center justify-center shrink-0">
                            <Package size={18} className="text-white" />
                        </div>
                        {!isCollapsed && (
                            <div className="whitespace-nowrap">
                                <h1 className="text-[17px] font-extrabold leading-tight text-[#181725]">Brand Portal</h1>
                                <p className="text-[10px] text-[#AEAEAE] font-semibold uppercase tracking-wide -mt-0.5">HoReCa Hub</p>
                            </div>
                        )}
                    </Link>
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="ml-3 p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#181725]"
                >
                    <Menu size={20} />
                </button>

                <div className="flex-1" />

                <div className="flex items-center gap-3">
                    <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
                        <Bell size={20} className="text-[#181725]" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#53B175]/15 flex items-center justify-center text-[#53B175] text-[12px] font-black">
                            {session?.user?.name?.[0]?.toUpperCase() ?? 'B'}
                        </div>
                        {!isCollapsed && (
                            <span className="text-[13px] font-bold text-[#181725] max-w-[140px] truncate">
                                {session?.user?.name ?? 'Brand User'}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className={cn(
                    'bg-white border-r border-[#EEEEEE] flex flex-col shrink-0 sticky top-[70px] h-[calc(100vh-70px)] overflow-y-auto transition-all duration-300 z-40',
                    isCollapsed ? 'w-[72px]' : 'w-[220px]'
                )}>
                    <nav className="flex-1 px-3 py-5 space-y-1">
                        {/* Admin View Indicator */}
                        {adminBrandName && (
                            <div className={cn(
                                'mb-3 bg-amber-50 border border-amber-200 rounded-[10px] overflow-hidden',
                                isCollapsed ? 'flex justify-center py-2' : 'p-3'
                            )}>
                                {isCollapsed ? (
                                    <Eye size={18} className="text-amber-500" />
                                ) : (
                                    <>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Eye size={13} className="text-amber-500 shrink-0" />
                                            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Admin View</span>
                                        </div>
                                        <p className="text-[12px] font-semibold text-amber-800 truncate mb-2">{adminBrandName}</p>
                                        <button
                                            onClick={handleExitAdminView}
                                            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1.5 rounded-[6px] transition-colors"
                                        >
                                            <LogOut size={11} />
                                            Exit Admin View
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                        {SIDEBAR_LINKS.map((link) => {
                            const isActive = link.href === '/brand/portal'
                                ? pathname === '/brand/portal'
                                : pathname.startsWith(link.href);
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    title={isCollapsed ? link.name : ''}
                                    className={cn(
                                        'flex items-center rounded-[10px] transition-all text-[14px] overflow-hidden leading-none',
                                        isCollapsed ? 'justify-center h-[46px] px-0' : 'gap-3 px-4 py-3',
                                        isActive
                                            ? 'bg-[#53B175] text-white shadow-md shadow-[#53B175]/20'
                                            : 'text-[#191919] hover:bg-[#F8F9FB]'
                                    )}
                                >
                                    <link.icon size={20} className={cn('shrink-0', isActive ? 'text-white' : 'text-[#555]')} />
                                    {!isCollapsed && <span className="font-semibold whitespace-nowrap">{link.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="px-3 pb-3 space-y-1">
                        <Link
                            href="/"
                            title={isCollapsed ? 'View Storefront' : ''}
                            className={cn(
                                'flex items-center rounded-[10px] transition-all text-[14px] overflow-hidden leading-none text-[#53B175] hover:bg-[#EEF8F1] font-semibold',
                                isCollapsed ? 'justify-center h-[46px] px-0' : 'gap-3 px-4 py-3'
                            )}
                        >
                            <Home size={20} className="shrink-0" />
                            {!isCollapsed && <span className="whitespace-nowrap">View Storefront</span>}
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            title={isCollapsed ? 'Sign Out' : ''}
                            className={cn(
                                'w-full flex items-center rounded-[10px] transition-all text-[14px] overflow-hidden leading-none text-[#E74C3C] hover:bg-[#FEF2F2] font-semibold',
                                isCollapsed ? 'justify-center h-[46px] px-0' : 'gap-3 px-4 py-3'
                            )}
                        >
                            <LogOut size={20} className="shrink-0" />
                            {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
                        </button>
                    </div>

                    <div className="p-3 border-t border-[#EEEEEE] flex justify-center">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full flex items-center justify-center p-2 hover:bg-gray-50 rounded-lg transition-colors text-[#AEAEAE] hover:text-[#181725]"
                        >
                            {isCollapsed
                                ? <ChevronRight size={18} />
                                : <div className="flex items-center gap-2"><ChevronLeft size={18} /><span className="text-[12px] font-medium">Collapse</span></div>
                            }
                        </button>
                    </div>
                </aside>

                <main className="flex-1 min-w-0 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
