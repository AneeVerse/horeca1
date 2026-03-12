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
import { AuthScreen } from '../auth/AuthScreen';

export function Navbar() {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isCategoriesSidebarOpen, setIsCategoriesSidebarOpen] = React.useState(false);
    const [isSearchOverlayOpen, setIsSearchOverlayOpen] = React.useState(false);
    const [isLocationOverlayOpen, setIsLocationOverlayOpen] = React.useState(false);
    const [isAuthOverlayOpen, setIsAuthOverlayOpen] = React.useState(false);
    const [selectedRole, setSelectedRole] = React.useState<'customer' | 'vendor'>('customer');
    const [searchTab, setSearchTab] = React.useState<'items' | 'stores'>('items');
    const [isNavSearchFocused, setIsNavSearchFocused] = React.useState(false);
    const [navSearchQuery, setNavSearchQuery] = React.useState('');
    const { totalItems } = useCart();
    const { selectedAddress } = useAddress();

    const openSearch = (tab: 'items' | 'stores' = 'items', initialQuery = '') => {
        setSearchTab(tab);
        setNavSearchQuery(initialQuery);
        setIsSearchOverlayOpen(true);
    };

    const categories = [
        { name: 'Fruits & Vegetables', image: '/images/category/vegitable.png' },
        { name: 'Dairy', image: '/images/category/milk.png' },
        { name: 'Canned & Imported', image: '/images/category/candy.png' },
        { name: 'Flours', image: '/images/category/snacks.png' },
        { name: 'Sauces & Seasoning', image: '/images/category/drink-juice.png' },
        { name: 'Masala, Salt & Sugar', image: '/images/category/candy.png' },
        { name: 'Chicken & Eggs', image: '/images/category/animal food.png' },
        { name: 'Edible Oils', image: '/images/category/fruits.png' },
        { name: 'Custom Packaging', image: '/images/category/vegitable.png' },
        { name: 'Frozen & Instant Food', image: '/images/category/frozen foods.png' },
        { name: 'Packaging Material', image: '/images/category/vegitable.png' },
        { name: 'Bakery & Chocolates', image: '/images/category/candy.png' },
        { name: 'Beverages & Mixers', image: '/images/category/drink-juice.png' },
        { name: 'Cleaning & Consumables', image: '/images/category/vegitable.png' },
        { name: 'Pulses', image: '/images/category/snacks.png' },
        { name: 'Mutton, Duck & Meat', image: '/images/category/fish & meat.png' },
    ];

    const pathname = usePathname();
    const isShipmentPage = pathname?.includes('/cart/shipment/');
    const isAdminPage = pathname?.startsWith('/admin');

    // Completely hide navbar on these pages
    if (isAdminPage || isShipmentPage) return null;

    return (
        <>
            {/* Auth Screen (Login/Register) */}
            <AuthScreen
                isOpen={isAuthOverlayOpen}
                onClose={() => setIsAuthOverlayOpen(false)}
                initialMode={selectedRole}
            />

            {/* Persistent 12px Top Green Bar - Now part of Navbar for easy toggling */}
            <div className="w-full h-[12px] bg-[#53B175] sticky top-0 z-[10000]" />

            {/* Top Header - Scrolls Away */}
            <header className={cn(
                "w-full bg-white relative z-[1000]",
                (pathname?.startsWith('/category/') || pathname?.startsWith('/product/') || pathname === '/cart' || pathname === '/orders') && "hidden md:block"
            )}>
                <div className="w-full py-3 px-4 md:px-[var(--container-padding)]">
                    <div className="max-w-[var(--container-max)] mx-auto">

                        {/* Mobile Header Layout */}
                        <div className="md:hidden space-y-3 pt-3">
                            {/* Row 1: Logo & Cart */}
                            <div className="flex items-center justify-end relative px-1">
                                {/* <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <Menu size={22} className="text-[#181725]" />
                                </button> */}

                                <Link href="/" className="absolute left-1/2 -translate-x-1/2">
                                    <img
                                        src="/Horeca1.png"
                                        alt="Horeca1"
                                        className="h-[22px] w-auto object-contain"
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
                                    <MapPin size={14} className="text-primary" />
                                    <span className="text-[12px] font-bold text-text-muted">
                                        {selectedAddress?.shortAddress || 'Select location'}
                                    </span>
                                    <ChevronDown size={14} className="text-text-muted" />
                                </button>
                            </div>

                            {/* Row 3: Search Bar */}
                            <div className="px-1">
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 bg-[#F7F7F7] border rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300",
                                        isNavSearchFocused ? "border-[#53B175] bg-white ring-1 ring-[#53B175]/10" : "border-gray-100"
                                    )}
                                >
                                    <Search size={20} className={cn("transition-colors", isNavSearchFocused ? "text-[#53B175]" : "text-gray-400")} />
                                    <input
                                        type="text"
                                        placeholder="search for product or brand,store..."
                                        className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-gray-400 font-medium"
                                        onFocus={() => setIsNavSearchFocused(true)}
                                        onBlur={() => setIsNavSearchFocused(false)}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.length > 0) {
                                                openSearch('items', val);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Desktop Header Content (Hidden on Mobile) */}
                        <div className="hidden md:flex items-center justify-between gap-6">
                            <Link href="/" className="flex-shrink-0">
                                <img src="/Horeca1.png" alt="Horeca1" className="h-[26px] w-auto object-contain" />
                            </Link>

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

                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Support</span>
                                    <Link href="/contact" className="text-[15px] font-black text-text hover:text-primary transition-colors">+91-1234567890</Link>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Link href="/wishlist" className="p-2 hover:bg-gray-50 rounded-full transition-all relative group">
                                        <Heart size={24} className="text-text group-hover:text-primary transition-colors" />
                                        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">0</span>
                                    </Link>
                                    <Link href="/cart" className="p-2 hover:bg-gray-50 rounded-full transition-all relative group">
                                        <ShoppingCart size={24} className="text-text group-hover:text-primary transition-colors" />
                                        <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">
                                            {totalItems}
                                        </span>
                                    </Link>
                                    <button
                                        onClick={() => setIsAuthOverlayOpen(true)}
                                        className="p-2 hover:bg-gray-50 rounded-full transition-all group"
                                    >
                                        <User size={24} className="text-text group-hover:text-primary transition-colors" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Navigation - Desktop Only */}
            <nav className="hidden md:block w-full border-b border-gray-100 bg-white sticky top-[12px] z-[900]">
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="relative group/main">
                            <button className="bg-primary text-white px-6 py-4 flex items-center gap-3 font-bold text-[var(--text-sm)] rounded-t-lg">
                                <Menu size={20} />
                                <span>Browse All Categories</span>
                                <ChevronDown size={14} className="group-hover/main:rotate-180 transition-transform" />
                            </button>
                            <div className="absolute top-full left-0 w-64 bg-white shadow-2xl ring-1 ring-gray-100 opacity-0 invisible group-hover/main:opacity-100 group-hover/main:visible transition-all duration-300 z-[110] rounded-b-xl overflow-hidden py-2">
                                {categories.slice(0, 10).map((item, idx) => (
                                    <Link key={idx} href={`/category/${item.name.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 cursor-pointer group/item transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                <img src={item.image} alt="" className="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <span className="text-sm font-medium text-text">{item.name}</span>
                                        </div>
                                        <ChevronDown size={14} className="-rotate-90 text-gray-300 group-hover/item:text-primary transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-[var(--text-sm)] font-semibold text-text-muted">
                            <Link href="/" className="hover:text-primary py-4">Home</Link>
                            <Link href="/shop" className="hover:text-primary">Shop</Link>
                            <Link href="/pages" className="hover:text-primary">Pages</Link>
                            <Link href="/vendors" className="hover:text-primary">Vendors</Link>
                            <Link href="/blog" className="hover:text-primary">Blog</Link>
                            <Link href="/contact" className="hover:text-primary">Contact Us</Link>
                        </div>
                    </div>

                    <div className="bg-primary hover:bg-primary-dark transition-all text-white px-6 py-3 flex items-center gap-3 cursor-pointer rounded-lg shadow-lg shadow-primary/20">
                        <PhoneCall size={20} />
                        <span className="font-bold text-[var(--text-sm)]">01- 234 567 890</span>
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom-Sheet - Categories */}
            <div
                className={cn(
                    "fixed inset-0 z-[10000] bg-black/40 transition-opacity duration-300 md:hidden",
                    isCategoriesSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
                )}
                onClick={() => setIsCategoriesSidebarOpen(false)}
            >
                <div
                    className={cn(
                        "fixed bottom-0 left-0 right-0 bg-white rounded-t-[30px] transition-transform duration-500 ease-out p-6 max-h-[85vh] overflow-y-auto",
                        isCategoriesSidebarOpen ? "translate-y-0" : "translate-y-full"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[20px] font-black text-[#181725]">All Categories</h2>
                        <button onClick={() => setIsCategoriesSidebarOpen(false)} className="p-2 bg-gray-50 rounded-full">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-y-8 gap-x-4">
                        {categories.map((item, idx) => (
                            <Link
                                key={idx}
                                href={`/category/${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                                className="flex flex-col items-center gap-2 group"
                                onClick={() => setIsCategoriesSidebarOpen(false)}
                            >
                                <div className="w-full aspect-square bg-[#F7F8FA] rounded-2xl flex items-center justify-center p-2 transition-transform active:scale-95">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-[75%] h-[75%] object-contain"
                                    />
                                </div>
                                <span className="text-[11px] font-bold text-center text-[#181725] leading-tight line-clamp-2">
                                    {item.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <MobileBottomNav
                isCategoriesOpen={isCategoriesSidebarOpen}
                onCategoriesClick={() => setIsCategoriesSidebarOpen(true)}
                onStoreClick={() => openSearch('stores')}
                onAccountClick={() => setIsAuthOverlayOpen(true)}
            />
            <MobileSearchOverlay
                isOpen={isSearchOverlayOpen}
                onClose={() => {
                    setIsSearchOverlayOpen(false);
                    setNavSearchQuery('');
                }}
                initialTab={searchTab}
                initialQuery={navSearchQuery}
            />

            <LocationSelectionOverlay
                isOpen={isLocationOverlayOpen}
                onClose={() => setIsLocationOverlayOpen(false)}
            />
        </>
    );
}
