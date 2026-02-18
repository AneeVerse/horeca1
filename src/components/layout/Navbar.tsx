'use client';

// Updated: 2026-02-17 20:00

import React from 'react';
import Link from 'next/link';
import {
    Search,
    MapPin,
    Heart,
    ShoppingCart,
    ChevronDown,
    Menu,
    PhoneCall,
    User,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileSearchOverlay } from './MobileSearchOverlay';
import { LocationSelectionOverlay } from './LocationSelectionOverlay';
import { useCart } from '@/context/CartContext';
import { useAddress } from '@/context/AddressContext';
import { SplashScreen } from '../auth/SplashScreen';
import { AccountTypeSelection } from '../auth/AccountTypeSelection';
import { AuthScreen } from '../auth/AuthScreen';

export function Navbar() {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isCategoriesSidebarOpen, setIsCategoriesSidebarOpen] = React.useState(false);
    const [isSearchOverlayOpen, setIsSearchOverlayOpen] = React.useState(false);
    const [isLocationOverlayOpen, setIsLocationOverlayOpen] = React.useState(false);
    const [isAccountOverlayOpen, setIsAccountOverlayOpen] = React.useState(false);
    const [isAuthOverlayOpen, setIsAuthOverlayOpen] = React.useState(false);
    const [selectedRole, setSelectedRole] = React.useState<'customer' | 'vendor'>('customer');
    const [searchTab, setSearchTab] = React.useState<'items' | 'stores'>('items');
    const { totalItems } = useCart();
    const { selectedAddress } = useAddress();

    const openSearch = (tab: 'items' | 'stores' = 'items') => {
        setSearchTab(tab);
        setIsSearchOverlayOpen(true);
    };

    const categories = [
        { label: 'Vegetables & Fruit', icon: '🥦' },
        { label: 'Beverages', icon: '🥤' },
        { label: 'Meats & Seafood', icon: '🥩' },
        { label: 'Breakfast & Dairy', icon: '🥛' },
        { label: 'Frozen Foods', icon: '❄️' },
        { label: 'Biscuits & Snacks', icon: '🍪' },
        { label: 'Grocery & Staples', icon: '🍞' }
    ];

    const pathname = usePathname();
    const isCategoryPage = pathname?.startsWith('/category/');

    return (
        <>
            {/* Splash Screen */}
            <SplashScreen />

            {/* Account Selection Overlay */}
            <AccountTypeSelection
                isOpen={isAccountOverlayOpen}
                onClose={() => setIsAccountOverlayOpen(false)}
                onContinue={(role) => {
                    setSelectedRole(role);
                    setIsAccountOverlayOpen(false);
                    setIsAuthOverlayOpen(true);
                }}
            />

            {/* Auth Screen (Login/Register) */}
            <AuthScreen
                isOpen={isAuthOverlayOpen}
                onClose={() => setIsAuthOverlayOpen(false)}
                initialMode={selectedRole}
            />

            {/* Persistent Top Green Line */}
            <div className="w-full h-[12px] bg-primary sticky top-0 z-[10001] shadow-sm" />

            {/* Top Header - Scrolls Away */}
            <header className={cn(
                "w-full bg-white relative z-[1000]",
                (pathname?.startsWith('/category/') || pathname?.startsWith('/product/') || pathname === '/cart') && "hidden md:block"
            )}>
                <div className="w-full py-3 px-4 md:px-[var(--container-padding)]">
                    <div className="max-w-[var(--container-max)] mx-auto">

                        {/* Mobile Header Layout */}
                        <div className="md:hidden space-y-3 pt-3">
                            {/* Row 1: Logo & Cart */}
                            <div className="flex items-center justify-between relative px-1">
                                <div className="w-8" /> {/* Spacer */}

                                <Link href="/" className="absolute left-1/2 -translate-x-1/2">
                                    <img
                                        src="/images/login/Horeca1.png"
                                        alt="Horeca1"
                                        className="h-6 w-auto object-contain"
                                    />
                                </Link>

                                <Link href="/cart" className="relative p-1">
                                    <img
                                        src="/images/mobile-nav/cart.svg"
                                        alt="Cart"
                                        className="w-6 h-6"
                                    />
                                    <span className="absolute -top-1 -right-1 bg-[#299e60] text-white text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold border-2 border-white">
                                        {totalItems}
                                    </span>
                                </Link>
                            </div>

                            {/* Row 2: Location Pill */}
                            <div className="flex justify-center">
                                <button
                                    onClick={() => setIsLocationOverlayOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1 border border-gray-100 rounded-full bg-[#F7F7F7] shadow-sm hover:bg-gray-100 transition-colors"
                                >
                                    <MapPin size={14} className="text-[#299e60]" fill="currentColor" />
                                    <span className="text-[12px] font-bold text-gray-800">
                                        {selectedAddress?.shortAddress || 'Select location'}
                                    </span>
                                    <ChevronDown size={14} className="text-gray-800" />
                                </button>
                            </div>

                            {/* Row 3: Search Bar */}
                            <div className="px-1">
                                <div
                                    onClick={() => setIsSearchOverlayOpen(true)}
                                    className="flex items-center gap-3 px-4 py-3 bg-[#F7F7F7] border border-gray-100 rounded-2xl cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                                >
                                    <Search size={20} className="text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="search for product or brand,store..."
                                        className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-gray-400 cursor-pointer"
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Desktop Header Content (Hidden on Mobile) */}
                        <div className="hidden md:flex items-center justify-between gap-6">
                            {/* Logo */}
                            <Link href="/" className="flex-shrink-0">
                                <h1 className="text-[clamp(1.25rem,2.2vw,2.125rem)] font-extrabold text-primary flex items-center gap-1">
                                    Horeca<span className="text-text">Hub</span>
                                </h1>
                            </Link>

                            {/* Desktop Search Bar */}
                            <div className="flex flex-1 max-w-2xl items-center relative group">
                                <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl w-full focus-within:border-primary/50 transition-all duration-300 shadow-sm">
                                    <div className="flex items-center gap-1 text-[var(--text-sm)] text-text-muted border-r-2 border-gray-100 pr-4 cursor-pointer hover:text-primary font-semibold">
                                        <span>Ice Cream</span>
                                        <ChevronDown size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search for a product or brand"
                                        className="flex-1 bg-transparent text-[var(--text-base)] outline-none px-3 placeholder:text-gray-400"
                                    />
                                    <button className="bg-primary p-2.5 rounded-full text-white hover:bg-primary-dark transition-all shadow-md">
                                        <Search size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Desktop Tools */}
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-50 rounded-xl cursor-pointer hover:border-primary/20 transition-colors bg-white shadow-sm">
                                    <MapPin size={18} className="text-primary flex-shrink-0" />
                                    <div className="flex flex-col leading-tight min-w-0">
                                        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider truncate">{selectedAddress ? 'Delivering to' : 'Location'}</span>
                                        <div className="flex items-center gap-0.5">
                                            <span className="text-sm font-extrabold font-sans truncate">{selectedAddress?.shortAddress || 'Select location'}</span>
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="relative cursor-pointer group">
                                        <Heart size={28} className="group-hover:text-primary transition-colors text-text" />
                                        <span className="absolute -top-2 -right-2 bg-primary text-white text-[11px] w-5 h-5 flex items-center justify-center rounded-full font-extrabold shadow-sm">2</span>
                                    </div>
                                    <Link href="/cart" className="relative cursor-pointer group">
                                        <ShoppingCart size={28} className="group-hover:text-primary transition-colors text-text" />
                                        {totalItems > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-primary text-white text-[11px] w-5 h-5 flex items-center justify-center rounded-full font-extrabold shadow-sm animate-in zoom-in duration-300">
                                                {totalItems}
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Sticky Nav Navigation - Only this sticks */}
            <nav className="sticky top-0 z-[9999] w-full bg-white py-2 px-[var(--container-padding)] hidden md:block border-t border-b border-gray-100 shadow-sm">
                <div className="max-w-[var(--container-max)] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        {/* Categories Dropdown Wrapper */}
                        <div className="relative group">
                            <div className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all font-bold text-[var(--text-sm)]">
                                <Menu size={18} className="text-primary" />
                                <span>All Categories</span>
                                <ChevronDown size={16} className="text-text-muted group-hover:rotate-180 transition-transform duration-300" />
                            </div>

                            {/* Dropdown Menu */}
                            <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-white rounded-xl shadow-2xl ring-1 ring-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-[110] overflow-hidden py-3">
                                {categories.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 cursor-pointer group/item transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl leading-none">{item.icon}</span>
                                            <span className="text-sm font-medium text-text">{item.label}</span>
                                        </div>
                                        <ChevronDown size={14} className="-rotate-90 text-gray-300 group-hover/item:text-primary transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-[var(--text-sm)] font-semibold text-text-muted">
                            <div className="relative group/nav">
                                <Link href="/" className="hover:text-primary flex items-center gap-1 py-4 group-hover/nav:text-primary">
                                    Home <ChevronDown size={14} className="group-hover/nav:rotate-180 transition-transform" />
                                </Link>
                                {/* Home Dropdown */}
                                <div className="absolute top-full left-0 w-48 bg-white rounded-xl shadow-2xl ring-1 ring-gray-100 opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible translate-y-1 group-hover/nav:translate-y-0 transition-all duration-300 z-[110] py-4">
                                    <div className="flex flex-col gap-1">
                                        <Link href="#" className="px-6 py-2 hover:bg-gray-50 hover:text-primary transition-colors">Home Grocery</Link>
                                        <Link href="#" className="px-6 py-2 hover:bg-gray-50 hover:text-primary transition-colors">Home Electronics</Link>
                                        <Link href="#" className="px-6 py-2 hover:bg-gray-50 hover:text-primary transition-colors">Home Fashion</Link>
                                    </div>
                                </div>
                            </div>

                            <Link href="/shop" className="hover:text-primary flex items-center gap-1">Shop <ChevronDown size={14} /></Link>
                            <div className="relative group">
                                <Link href="/pages" className="hover:text-primary flex items-center gap-1">
                                    Pages <ChevronDown size={14} />
                                </Link>
                                <span className="absolute -top-2 -right-4 bg-orange-500 text-[8px] text-white px-1 rounded font-bold uppercase tracking-wider scale-90">New</span>
                            </div>
                            <div className="relative group">
                                <Link href="/vendors" className="hover:text-primary flex items-center gap-1">
                                    Vendors <ChevronDown size={14} />
                                </Link>
                                <span className="absolute -top-2 -right-4 bg-indigo-600 text-[8px] text-white px-1 rounded font-bold uppercase tracking-wider scale-90">New</span>
                            </div>
                            <Link href="/blog" className="hover:text-primary flex items-center gap-1">Blog <ChevronDown size={14} /></Link>
                            <Link href="/contact" className="hover:text-primary">Contact Us</Link>
                        </div>
                    </div>

                    <div className="bg-primary hover:bg-primary-dark transition-all text-white px-6 py-3 flex items-center gap-3 cursor-pointer rounded-lg shadow-lg shadow-primary/20">
                        <PhoneCall size={20} />
                        <span className="font-bold text-[var(--text-sm)]">01- 234 567 890</span>
                    </div>
                </div>
            </nav>

            {/* Mobile Sidebar - Main Menu */}
            <div
                className={cn(
                    "fixed inset-0 z-[200] bg-black/50 transition-opacity duration-300 md:hidden",
                    isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
                )}
                onClick={() => setIsSidebarOpen(false)}
            >
                <div
                    className={cn(
                        "fixed inset-y-0 left-0 w-[280px] bg-white shadow-2xl transition-transform duration-300 ease-out transform p-6 flex flex-col gap-8",
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between">
                        <Link href="/" onClick={() => setIsSidebarOpen(false)}>
                            <h1 className="text-2xl font-extrabold text-primary flex items-center gap-1">
                                Horeca<span className="text-text">Hub</span>
                            </h1>
                        </Link>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setIsSidebarOpen(false)}>
                            <span className="text-2xl font-light leading-none">×</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-1 overflow-y-auto">
                        {[
                            { label: 'Home', href: '/', options: true },
                            { label: 'Shop', href: '/shop', badge: 'New', badgeColor: 'bg-orange-500', options: true },
                            { label: 'Pages', href: '/pages', badge: 'New', badgeColor: 'bg-indigo-600', options: true },
                            { label: 'Vendors', href: '/vendors', options: true },
                            { label: 'Blog', href: '/blog', options: true },
                            { label: 'Contact Us', href: '/contact', options: false },
                        ].map((item, idx) => (
                            <Link key={idx} href={item.href} className="flex items-center justify-between py-3 px-2 border-b border-gray-50 font-semibold" onClick={() => setIsSidebarOpen(false)}>
                                <div className="flex items-center gap-3">
                                    <span>{item.label}</span>
                                    {item.badge && <span className={cn("text-[10px] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider", item.badgeColor)}>{item.badge}</span>}
                                </div>
                                {item.options && <ChevronDown size={14} className="-rotate-90 text-gray-300" />}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar - Categories */}
            <div
                className={cn(
                    "fixed inset-0 z-[200] bg-black/50 transition-opacity duration-300 md:hidden",
                    isCategoriesSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
                )}
                onClick={() => setIsCategoriesSidebarOpen(false)}
            >
                <div
                    className={cn(
                        "fixed inset-y-0 left-0 w-[280px] bg-white shadow-2xl transition-transform duration-300 ease-out transform p-6 flex flex-col gap-8",
                        isCategoriesSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Menu size={20} className="text-primary" />
                            <h2 className="text-xl font-extrabold text-text">Categories</h2>
                        </div>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setIsCategoriesSidebarOpen(false)}>
                            <span className="text-2xl font-light leading-none">×</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-1 overflow-y-auto">
                        {categories.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between py-3.5 px-2 border-b border-gray-50 group hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setIsCategoriesSidebarOpen(false)}>
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl leading-none">{item.icon}</span>
                                    <span className="font-semibold text-text group-hover:text-primary transition-colors">{item.label}</span>
                                </div>
                                <ChevronDown size={16} className="-rotate-90 text-gray-300 group-hover:text-primary transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <MobileBottomNav
                onCategoriesClick={() => setIsCategoriesSidebarOpen(true)}
                onStoreClick={() => openSearch('stores')}
            />
            <MobileSearchOverlay
                isOpen={isSearchOverlayOpen}
                onClose={() => setIsSearchOverlayOpen(false)}
                initialTab={searchTab}
            />

            <LocationSelectionOverlay
                isOpen={isLocationOverlayOpen}
                onClose={() => setIsLocationOverlayOpen(false)}
            />
        </>
    );
}
