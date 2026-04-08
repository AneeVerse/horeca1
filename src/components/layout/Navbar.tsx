'use client';

// Updated: 2026-02-17 20:00

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Search,
    MapPin,
    Heart,
    ShoppingCart,
    ChevronDown,
    Menu,
    PhoneCall,
    User,
    X,
    Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileSearchOverlay } from './MobileSearchOverlay';
import { LocationSelectionOverlay } from './LocationSelectionOverlay';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { useAddress } from '@/context/AddressContext';
import { AuthScreen } from '../auth/AuthScreen';
import { ProfileScreen } from '../auth/ProfileScreen';
import { InitialPincodeOverlay } from './InitialPincodeOverlay';
import { WishlistOverlay } from '../auth/WishlistOverlay';
import { useWishlist } from '@/context/WishlistContext';
import { dal } from '@/lib/dal';
import type { Vendor, Category } from '@/types';

// Maps category slugs to images/colors for display (DB categories don't store these)
const CATEGORY_STYLE: Record<string, { image: string; bgColor: string }> = {
    'vegetables': { image: '/images/category/vegitable.png', bgColor: '#e8f9e9' },
    'fruits': { image: '/images/category/fruits.png', bgColor: '#f0fdf4' },
    'dairy-eggs': { image: '/images/category/milk.png', bgColor: '#eef2ff' },
    'spices-masala': { image: '/images/category/candy.png', bgColor: '#eff6ff' },
    'grains-pulses': { image: '/images/category/snacks.png', bgColor: '#f5f3ff' },
    'meat-poultry': { image: '/images/category/fish & meat.png', bgColor: '#fffbeb' },
    'seafood': { image: '/images/category/fish & meat.png', bgColor: '#fff7ed' },
    'beverages': { image: '/images/category/drink-juice.png', bgColor: '#ecfdf5' },
    'oils-ghee': { image: '/images/category/fruits.png', bgColor: '#f0fdf4' },
    'packaging-supplies': { image: '/images/category/vegitable.png', bgColor: '#f8fafc' },
};
const DEFAULT_STYLE = { image: '/images/category/vegitable.png', bgColor: '#f7f8fa' };

export function Navbar() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isCategoriesSidebarOpen, setIsCategoriesSidebarOpen] = React.useState(false);
    const [isCategoriesExpanded, setIsCategoriesExpanded] = React.useState(false);
    const [isSearchOverlayOpen, setIsSearchOverlayOpen] = React.useState(false);
    const [isLocationOverlayOpen, setIsLocationOverlayOpen] = React.useState(false);
    const [isLoginOverlayOpen, setIsLoginOverlayOpen] = React.useState(false);
    const { data: session, status: sessionStatus } = useSession();
    const isLoggedIn = sessionStatus === 'authenticated';

    const [isScrolled, setIsScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [selectedRole, setSelectedRole] = React.useState<'customer' | 'vendor'>('customer');
    const [searchTab, setSearchTab] = React.useState<'items' | 'stores'>('stores');
    const [isNavSearchFocused, setIsNavSearchFocused] = React.useState(false);
    const [navSearchQuery, setNavSearchQuery] = React.useState('');
    const [isWishlistOpen, setIsWishlistOpen] = React.useState(false);
    const { totalItems } = useCart();
    const { wishlist } = useWishlist();
    const { selectedAddress, setSelectedAddress } = useAddress();

    const [vendors, setVendors] = React.useState<Vendor[]>([]);
    const [apiCategories, setApiCategories] = React.useState<(Category & { image: string; bgColor: string })[]>([]);
    const [hoveredCategoryVendors, setHoveredCategoryVendors] = React.useState<Vendor[]>([]);

    React.useEffect(() => {
        Promise.all([
            dal.vendors.list().then((res) => setVendors(res.vendors)),
            dal.categories.list().then((cats) => {
                setApiCategories(cats.map(c => ({
                    ...c,
                    // Prefer the real image stored in DB (Cloudinary); fall back to slug map then default
                    image: c.image || CATEGORY_STYLE[c.slug]?.image || DEFAULT_STYLE.image,
                    bgColor: CATEGORY_STYLE[c.slug]?.bgColor || DEFAULT_STYLE.bgColor,
                })));
            }),
        ]).catch((err) => {
            console.error('[Navbar] Failed to load data:', err);
        });
    }, []);

    const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);
    const [hoveredCategoryId, setHoveredCategoryId] = React.useState<string | null>(null);
    const [isBrowseAllOpen, setIsBrowseAllOpen] = React.useState(false);

    // Fetch vendors when a category is hovered in the dropdown
    React.useEffect(() => {
        if (!hoveredCategoryId) { setHoveredCategoryVendors([]); return; }
        dal.categories.getVendors(hoveredCategoryId).then((vendorSummaries) => {
            // Convert VendorSummary to Vendor shape for display
            setHoveredCategoryVendors(vendorSummaries.map(vs => ({
                ...vs,
                totalRatings: 0,
                deliverySchedule: 'Tomorrow 7:00 AM',
                deliveryTime: '24 hrs',
                isActive: true,
                description: '',
                categories: [],
            })));
        }).catch(() => setHoveredCategoryVendors([]));
    }, [hoveredCategoryId]);

    const [lastTrigger, setLastTrigger] = React.useState<string>('');

    const openSearch = (tab: 'items' | 'stores' | 'vendors' = 'vendors', initialQuery = '') => {
        setSearchTab(tab === 'vendors' ? 'stores' : tab as 'items' | 'stores');
        setNavSearchQuery(initialQuery);
        setIsSearchOverlayOpen(true);
    };

    // Sub-component to handle URL sync without unmounting the whole Navbar
    function SearchURLSync() {
        const searchParams = useSearchParams();
        const router = useRouter();

        React.useEffect(() => {
            if (!searchParams) return;
            const searchOpen = searchParams.get('searchOpen');
            const q = searchParams.get('q');
            const tab = searchParams.get('tab');

            if (searchOpen === 'true') {
                openSearch(tab as 'items' | 'stores' | 'vendors' || 'items', q || '');

                // Clean up URL immediately to allow re-triggering
                const url = new URL(window.location.href);
                url.searchParams.delete('searchOpen');
                url.searchParams.delete('q');
                url.searchParams.delete('tab');
                router.replace(url.pathname + url.search, { scroll: false });
            }
        }, [searchParams, router]);

        return null;
    }


    const pathname = usePathname();
    const isShipmentPage = pathname?.includes('/cart/shipment/');
    const isAdminPage = pathname?.startsWith('/admin');
    const vendorDashboardPaths = ['/vendor/dashboard', '/vendor/orders', '/vendor/products', '/vendor/inventory', '/vendor/settings'];
    const isVendorDashboard = vendorDashboardPaths.some(p => pathname?.startsWith(p));

    // Completely hide navbar on dashboard and shipment pages
    if (isAdminPage || isVendorDashboard || isShipmentPage) return null;

    return (
        <>
            <React.Suspense fallback={null}>
                <SearchURLSync />
            </React.Suspense>
            {pathname === '/' && (
                <InitialPincodeOverlay
                    onComplete={(pincode) => {
                        if (pincode) {
                            setSelectedAddress({
                                id: `init_${Date.now()}`,
                                label: 'Other',
                                fullAddress: `Airoli, Navi Mumbai - ${pincode}`,
                                shortAddress: 'Airoli',
                                latitude: 19.1579, // Approx lat for Airoli
                                longitude: 72.9935, // Approx lng for Airoli
                                pincode: pincode
                            });
                        } else {
                            // Clear pincode if user goes without
                            localStorage.removeItem('user_pincode');
                            setSelectedAddress(null);
                        }
                    }}
                />
            )}
            {/* Auth Screen (Login/Register) */}
            <AuthScreen
                isOpen={isLoginOverlayOpen}
                onClose={() => setIsLoginOverlayOpen(false)}
                onLoginSuccess={async () => {
                    setIsLoginOverlayOpen(false);
                    try {
                        const res = await fetch('/api/v1/auth/me');
                        const json = await res.json();
                        const role = json?.data?.role;
                        if (role === 'vendor') {
                            router.push('/vendor/dashboard');
                        } else if (role === 'admin') {
                            router.push('/admin/dashboard');
                        } else {
                            router.push('/');
                        }
                    } catch {
                        router.push('/');
                    }
                    setTimeout(() => window.location.reload(), 200);
                }}
            />



            {/* Green Bar — mobile only (desktop green bar lives inside the unified sticky wrapper below) */}
            <div className="md:hidden w-full h-[12px] bg-[#53B175] sticky top-0 z-[10000]" />

            {/* Top Header - Scrolls Away */}
            <header className="w-full bg-white relative z-[1000]">
                <div className="w-full py-3 px-4 md:px-[var(--container-padding)]">
                    <div className="max-w-[var(--container-max)] mx-auto">

                        {/* Mobile Header Layout */}
                        <div className="md:hidden space-y-3 pt-3">
                            {/* Row 1: Logo (Left), Location (Center), Wishlist & Cart (Right) */}
                            <div className="flex items-center justify-between px-1">
                                {/* Logo (Left) */}
                                <Link href="/" className="flex items-center">
                                    <Image
                                        src="/horeca1_logo.jpg"
                                        alt="Horeca1"
                                        width={40}
                                        height={40}
                                        className="h-[40px] w-[40px] object-contain rounded-lg"
                                        priority
                                    />
                                </Link>

                                {/* Location Button (Center) */}
                                <div className="flex-1 flex justify-center px-2 max-w-[190px]">
                                    <button
                                        onClick={() => setIsLocationOverlayOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-full bg-[#F7F7F7] shadow-sm hover:bg-gray-100 transition-colors cursor-pointer w-full justify-center"
                                    >
                                        <MapPin size={13} className="text-[#53B175] shrink-0" />
                                        <span className="text-[12px] font-bold text-gray-600 truncate max-w-[140px]">
                                            {selectedAddress?.shortAddress || 'Select Location'}
                                        </span>
                                        <ChevronDown size={13} className="text-gray-400 shrink-0" />
                                    </button>
                                </div>

                                {/* Wishlist & Cart (Right) */}
                                <div className="flex items-center gap-2">
                                    <Link
                                        href="/wishlist"
                                        className="relative p-1 cursor-pointer"
                                    >
                                        <Heart size={20} className="text-[#181725]" />
                                        {wishlist.length > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 bg-[#FF4B4B] text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-extrabold border-[1.5px] border-white">
                                                {wishlist.length}
                                            </span>
                                        )}
                                    </Link>
                                    <Link href="/cart" className="relative p-1 cursor-pointer">
                                        <ShoppingCart size={20} className="text-[#181725]" />
                                        <span className="absolute -top-1 -right-1 bg-[#53B175] text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border border-white">
                                            {totalItems}
                                        </span>
                                    </Link>
                                </div>
                            </div>

                            {/* Row 3: Search Bar */}
                            {!pathname?.startsWith('/vendor/') &&
                                !pathname?.startsWith('/order-lists') &&
                                !pathname?.startsWith('/category/') &&
                                !pathname?.startsWith('/product/') &&
                                pathname !== '/orders' &&
                                pathname !== '/wishlist' &&
                                pathname !== '/cart' &&
                                pathname !== '/profile' && (
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
                                )}
                        </div>

                        {/* Desktop Header Content — moved to single sticky nav below */}
                        <div className="hidden">
                            <Link href="/" className="flex-shrink-0">
                                <Image src="/Horeca1.png" alt="Horeca1" width={104} height={26} className="h-[26px] w-auto object-contain" priority />
                            </Link>

                            {/* Location Button - Desktop */}
                            <button
                                onClick={() => setIsLocationOverlayOpen(true)}
                                className="hidden lg:flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 max-w-[180px]"
                            >
                                <MapPin size={14} className="text-[#53B175] shrink-0" />
                                <span className="text-[13px] font-semibold text-gray-600 truncate">
                                    {selectedAddress?.shortAddress || 'Select Location'}
                                </span>
                                <ChevronDown size={13} className="text-gray-400 shrink-0" />
                            </button>

                            {!pathname?.startsWith('/vendor/') && (
                                <div className="flex flex-1 max-w-[320px] lg:max-w-[720px] items-center relative group">
                                    <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2.5 lg:py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl w-full focus-within:border-primary/50 transition-all duration-300 shadow-sm">
                                        <input
                                            type="text"
                                            value={navSearchQuery}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setNavSearchQuery(val);
                                                if (val.trim()) {
                                                    openSearch('items', val);
                                                }
                                            }}
                                            placeholder="Search for a product or brand"
                                            className="flex-1 bg-transparent text-[var(--text-base)] outline-none px-3 placeholder:text-gray-400"
                                        />
                                        <button
                                            onClick={() => {
                                                if (navSearchQuery.trim()) {
                                                    openSearch('items', navSearchQuery);
                                                }
                                            }}
                                            className="bg-primary p-2.5 rounded-full text-white hover:bg-primary-dark transition-all shadow-md cursor-pointer"
                                        >
                                            <Search size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 lg:gap-6">
                                <div className="hidden lg:flex flex-col items-end">
                                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Support</span>
                                    <Link href="/under-construction" className="text-[15px] font-black text-text hover:text-primary transition-colors">+91-1234567890</Link>
                                </div>
                                <div className="flex items-center gap-2 lg:gap-4">
                                    <Link href="/wishlist" className="p-2 hover:bg-gray-50 rounded-full transition-all relative group cursor-pointer">
                                        <Heart size={24} className="text-text group-hover:text-primary transition-colors" />
                                        {wishlist.length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">
                                                {wishlist.length}
                                            </span>
                                        )}
                                    </Link>
                                    <Link href="/cart" className="p-2 hover:bg-gray-50 rounded-full transition-all relative group cursor-pointer">
                                        <ShoppingCart size={24} className="text-text group-hover:text-primary transition-colors" />
                                        <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">
                                            {totalItems}
                                        </span>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            if (isLoggedIn) {
                                                router.push('/profile');
                                            } else {
                                                setIsLoginOverlayOpen(true);
                                            }
                                        }}
                                        className="p-2 hover:bg-gray-50 rounded-full transition-all group cursor-pointer"
                                    >
                                        <User size={24} className="text-text group-hover:text-primary transition-colors" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Desktop Navbar — unified sticky wrapper (green bar + navbar as one block) */}
            <div className={cn(
                "hidden md:block sticky top-0 z-[10000] transition-transform duration-300 ease-in-out",
                isScrolled ? "-translate-y-[12px]" : "translate-y-0"
            )}>
                {/* Green bar inside the wrapper */}
                <div className="w-full h-[12px] bg-[#53B175]" />

            <nav className={cn(
                "w-full bg-white border-b border-gray-100 transition-shadow duration-300",
                isScrolled && "shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            )}>
                <div className={cn("w-full max-w-[var(--container-max)] mx-auto px-[var(--container-padding)]", "pt-4 pb-2")}>
                    {/* ─── Row 1: Logo | Browse | Location | Search | Icons | Phone ─── */}
                    <div className={cn(
                        "flex items-center gap-4 lg:gap-5 transition-all duration-300 ease-out",
                        isScrolled ? "h-[68px]" : "h-[76px]"
                    )}>

                        {/* Logo */}
                        <Link href="/" className="shrink-0">
                            <Image src="/Horeca1.png" alt="Horeca1" width={92} height={22} className="h-[22px] w-auto object-contain" priority />
                        </Link>

                        {/* Browse All Categories */}
                        <div
                            className="relative shrink-0"
                            onMouseLeave={() => {
                                setIsBrowseAllOpen(false);
                                setHoveredCategory(null);
                            }}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBrowseAllOpen(!isBrowseAllOpen);
                                }}
                                onMouseEnter={() => setIsBrowseAllOpen(true)}
                                className="bg-primary hover:bg-primary-dark text-white px-5 py-3 flex items-center gap-2.5 font-bold text-[13px] rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-sm shadow-primary/20"
                            >
                                <Menu size={18} className="text-white shrink-0" />
                                <span className="text-white">Browse All Categories</span>
                                <ChevronDown size={14} className={cn("transition-transform text-white shrink-0", isBrowseAllOpen && "rotate-180")} />
                            </button>

                            <div className={cn(
                                "absolute top-full left-0 bg-white shadow-[0_32px_64px_rgba(0,0,0,0.15)] transition-all duration-300 z-[110] rounded-b-2xl overflow-hidden flex min-h-[480px] border border-gray-100 border-t-0",
                                isBrowseAllOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2",
                                !hoveredCategory ? "w-72" : "w-[calc(18rem+450px)]"
                            )}>
                                {/* Categories List */}
                                <div className="w-72 border-r border-gray-100 py-2 bg-white shrink-0">
                                    {apiCategories.map((item) => (
                                        <div
                                            key={item.id}
                                            onMouseEnter={() => { setHoveredCategory(item.name); setHoveredCategoryId(item.id); }}
                                            className={cn(
                                                "flex items-center justify-between px-6 py-3.5 cursor-pointer group/item transition-all",
                                                hoveredCategory === item.name ? "bg-primary/5 text-primary" : "hover:bg-gray-50 text-text"
                                            )}
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-7 h-7 flex items-center justify-center transition-all">
                                                    <img src={item.image} alt="" className="max-w-full max-h-full object-contain" />
                                                </div>
                                                <span className="text-[14px] font-bold">{item.name}</span>
                                            </div>
                                            <ChevronDown size={14} className={cn("-rotate-90 transition-colors", hoveredCategory === item.name ? "text-primary" : "text-gray-300")} />
                                        </div>
                                    ))}
                                </div>

                                {/* Vendors Side Panel */}
                                {hoveredCategory && (
                                    <div className="w-[450px] bg-[#F9FAFB] p-6 overflow-y-auto max-h-[600px] animate-in fade-in slide-in-from-left-2 duration-200">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="text-[15px] font-black text-text uppercase tracking-tight">
                                                {hoveredCategory}
                                            </h4>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            {hoveredCategoryVendors.slice(0, 6).map((vendor) => (
                                                <Link
                                                    key={vendor.id}
                                                    href={`/category/${vendor.slug || slugify(vendor.name)}/${slugify(hoveredCategory || '')}`}
                                                    onClick={() => {
                                                        setHoveredCategory(null);
                                                        setHoveredCategoryId(null);
                                                        setIsBrowseAllOpen(false);
                                                    }}
                                                    className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all group/vendor cursor-pointer"
                                                >
                                                    <div className="w-12 h-12 rounded-lg border border-gray-50 flex items-center justify-center p-1.5 shrink-0 bg-white">
                                                        <img src={vendor.logo} alt="" className="max-w-full max-h-full object-contain group-hover/vendor:scale-110 transition-transform" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="text-[14px] font-bold text-text truncate group-hover/vendor:text-primary transition-colors">{vendor.name}</h5>
                                                        <p className="text-[11px] text-text-muted truncate font-medium">
                                                            {vendor.description || 'View products'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-lg shrink-0">
                                                        <Star size={12} fill="currentColor" />
                                                        <span className="text-[11px] font-bold">{vendor.rating}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>

                                        {hoveredCategoryVendors.length === 0 && (
                                            <div className="text-center py-10">
                                                <p className="text-text-muted text-[13px] font-medium italic">No vendors found for this category yet.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Location */}
                        <button
                            onClick={() => setIsLocationOverlayOpen(true)}
                            className="flex items-center gap-2.5 px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer shrink-0 w-[200px]"
                        >
                            <MapPin size={16} className="text-[#53B175] shrink-0" />
                            <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider leading-none">Deliver to</span>
                                <span className="text-[12px] font-bold text-gray-800 truncate leading-tight mt-0.5 w-full text-left">
                                    {selectedAddress?.shortAddress || 'Select Location'}
                                </span>
                            </div>
                            <ChevronDown size={13} className="text-gray-400 shrink-0" />
                        </button>

                        {/* Search Bar — fills available space */}
                        {!pathname?.startsWith('/vendor/') && (
                            <div className="flex flex-1 items-center min-w-0">
                                <div className="w-full max-w-[700px]">
                                    <div className="flex items-center gap-2 pl-5 pr-2 py-2 bg-gray-50 border-2 border-gray-100 rounded-full w-full focus-within:border-primary/50 focus-within:bg-white transition-all duration-300 shadow-sm">
                                        <Search size={17} className="text-gray-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={navSearchQuery}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setNavSearchQuery(val);
                                                if (val.trim()) {
                                                    openSearch('items', val);
                                                }
                                            }}
                                            placeholder="Search for a product or brand"
                                            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-400 min-w-0"
                                        />
                                        <button
                                            onClick={() => {
                                                if (navSearchQuery.trim()) {
                                                    openSearch('items', navSearchQuery);
                                                }
                                            }}
                                            className="bg-primary hover:bg-primary-dark px-4 py-2 rounded-full text-white font-semibold text-[12px] transition-all shadow-sm cursor-pointer shrink-0"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1" />
                            </div>
                        )}
                        {pathname?.startsWith('/vendor/') && <div className="flex-1" />}

                        {/* Divider */}
                        <div className="h-9 w-px bg-gray-200 shrink-0" />

                        {/* Action Icons */}
                        <div className="flex items-center gap-1 shrink-0">
                            <Link href="/wishlist" className="p-2.5 hover:bg-gray-50 rounded-full transition-all relative group cursor-pointer">
                                <Heart size={22} className="text-text group-hover:text-primary transition-colors" />
                                {wishlist.length > 0 && (
                                    <span className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[10px] w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold border-2 border-white">
                                        {wishlist.length}
                                    </span>
                                )}
                            </Link>
                            <Link href="/cart" className="p-2.5 hover:bg-gray-50 rounded-full transition-all relative group cursor-pointer">
                                <ShoppingCart size={22} className="text-text group-hover:text-primary transition-colors" />
                                <span className="absolute top-0.5 right-0.5 bg-primary text-white text-[10px] w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold border-2 border-white">
                                    {totalItems}
                                </span>
                            </Link>
                            <button
                                onClick={() => {
                                    if (isLoggedIn) {
                                        router.push('/profile');
                                    } else {
                                        setIsLoginOverlayOpen(true);
                                    }
                                }}
                                className="p-2.5 hover:bg-gray-50 rounded-full transition-all group cursor-pointer"
                            >
                                <User size={22} className="text-text group-hover:text-primary transition-colors" />
                            </button>
                        </div>

                        {/* Phone Button */}
                        <Link
                            href="/under-construction"
                            className="hidden xl:flex items-center gap-2.5 bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-xl shadow-sm shadow-primary/20 transition-all active:scale-95 shrink-0"
                        >
                            <PhoneCall size={16} className="text-white shrink-0" />
                            <span className="font-bold text-[13px] whitespace-nowrap text-white">01- 234 567 890</span>
                        </Link>

                    </div>

                    {/* ─── Row 2: Nav Links with active underline ─── */}
                    <div className="flex items-center justify-between h-[48px] border-t border-gray-50">
                        <div className="flex items-center gap-1">
                            {[
                                ...(isLoggedIn && (session?.user as { role?: string })?.role === 'vendor'
                                    ? [{ name: 'Dashboard', href: '/vendor/dashboard' }]
                                    : []),
                                ...(isLoggedIn && (session?.user as { role?: string })?.role === 'admin'
                                    ? [{ name: 'Dashboard', href: '/admin/dashboard' }]
                                    : []),
                                { name: 'Home', href: '/' },
                                { name: 'Vendors', href: '/vendors' },
                                { name: 'Offers', href: '/under-construction' },
                                { name: 'Order Lists', href: '/order-lists' },
                                { name: 'Orders', href: '/orders' },
                                { name: 'Blog', href: '/under-construction' },
                                { name: 'Contact Us', href: '/under-construction' },
                            ].map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={cn(
                                            "relative px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
                                            isActive ? "text-primary" : "text-text-muted hover:text-text"
                                        )}
                                    >
                                        {link.name}
                                        {isActive && (
                                            <span className="absolute bottom-0 left-4 right-4 h-[2.5px] bg-primary rounded-full" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Right side: small promo/info chips */}
                        <div className="hidden lg:flex items-center gap-2 text-[12px] font-semibold text-text-muted">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4FBF6] text-primary rounded-full border border-primary/10">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                Free delivery over ₹2000
                            </span>
                            <Link href="/under-construction" className="hover:text-primary transition-colors whitespace-nowrap">
                                Help Center
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
            </div>{/* end desktop sticky wrapper */}

            {/* Mobile Bottom-Sheet - Categories */}
            <div
                className={cn(
                    "fixed inset-0 z-[10000] bg-black/40 transition-opacity duration-300 md:hidden",
                    isCategoriesSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
                )}
                onClick={() => {
                    setIsCategoriesSidebarOpen(false);
                    setIsCategoriesExpanded(false);
                }}
            >
                <div
                    className={cn(
                        "fixed bottom-0 left-0 right-0 bg-white rounded-t-[30px] transition-transform duration-500 ease-out p-6 max-h-[85vh] overflow-y-auto pb-[90px]",
                        isCategoriesSidebarOpen ? "translate-y-0" : "translate-y-full"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />

                    {/* Header Row */}
                    <div className="flex justify-end mb-2">
                        <button
                            onClick={() => {
                                setIsCategoriesSidebarOpen(false);
                                setIsCategoriesExpanded(false);
                            }}
                            className="p-1 cursor-pointer"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between mb-6 px-1">
                        <h2 className="text-[17px] font-black text-[#181725]">Shop By Category</h2>
                        <button
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            className="text-[#53B175] text-[14px] font-bold cursor-pointer"
                        >
                            {isCategoriesExpanded ? 'Collapse' : 'See All'}
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-y-6 gap-x-3">
                        {(isCategoriesExpanded ? apiCategories : apiCategories.slice(0, 8)).map((item) => (
                            <Link
                                key={item.id}
                                href={`/category/${item.slug}`}
                                className="flex flex-col items-center gap-2 group"
                                onClick={() => {
                                    setIsCategoriesSidebarOpen(false);
                                    setIsCategoriesExpanded(false);
                                }}
                            >
                                <div
                                    className="w-full aspect-square rounded-[18px] flex items-center justify-center p-2 transition-transform active:scale-95 shadow-sm border border-gray-50 overflow-hidden"
                                    style={{
                                        backgroundColor: item.bgColor || '#F7F8FA',
                                        aspectRatio: '1 / 1'
                                    }}
                                >
                                    <div className="relative w-[75%] h-[75%]">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>
                                <span className="text-[10px] font-extrabold text-center text-[#181725] leading-tight px-0.5 line-clamp-2">
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
                onAccountClick={() => {
                    if (isLoggedIn) {
                        router.push('/profile');
                    } else {
                        setIsLoginOverlayOpen(true);
                    }
                }}
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

            <WishlistOverlay
                isOpen={isWishlistOpen}
                onClose={() => setIsWishlistOpen(false)}
            />
        </>
    );
}
