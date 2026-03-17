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
    X,
    Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileSearchOverlay } from './MobileSearchOverlay';
import { LocationSelectionOverlay } from './LocationSelectionOverlay';
import { useCart } from '@/context/CartContext';
import { useAddress } from '@/context/AddressContext';
import { AuthScreen } from '../auth/AuthScreen';
import { ProfileScreen } from '../auth/ProfileScreen';
import { InitialPincodeOverlay } from './InitialPincodeOverlay';
import { WishlistOverlay } from '../auth/WishlistOverlay';
import { useWishlist } from '@/context/WishlistContext';
import { vendors } from '@/data/vendorData';

const categories = [
    { name: 'Fruits & Vegetables', image: '/images/category/vegitable.png', bgColor: '#e8f9e9' },
    { name: 'Dairy', image: '/images/category/milk.png', bgColor: '#eef2ff' },
    { name: 'Canned & Imported', image: '/images/category/animal food.png', bgColor: '#fff7ed' },
    { name: 'Flours', image: '/images/category/snacks.png', bgColor: '#fef2f2' },
    { name: 'Sauces & Seasoning', image: '/images/category/drink-juice.png', bgColor: '#fdf4ff' },
    { name: 'Masala, Salt & Sugar', image: '/images/category/candy.png', bgColor: '#eff6ff' },
    { name: 'Chicken & Eggs', image: '/images/category/fish & meat.png', bgColor: '#fffbeb' },
    { name: 'Edible Oils', image: '/images/category/fruits.png', bgColor: '#f0fdf4' },
    { name: 'Custom Packaging', image: '/images/category/vegitable.png', bgColor: '#f8fafc' },
    { name: 'Frozen & Instant Food', image: '/images/category/frozen foods.png', bgColor: '#f0f9ff' },
    { name: 'Packaging Material', image: '/images/category/vegitable.png', bgColor: '#fdf2f8' },
    { name: 'Bakery & Chocolates', image: '/images/category/candy.png', bgColor: '#fff1f2' },
    { name: 'Beverages & Mixers', image: '/images/category/drink-juice.png', bgColor: '#ecfdf5' },
    { name: 'Cleaning & Consumables', image: '/images/category/vegitable.png', bgColor: '#fafaf9' },
    { name: 'Pulses', image: '/images/category/snacks.png', bgColor: '#f5f3ff' },
    { name: 'Mutton, Duck & Meat', image: '/images/category/fish & meat.png', bgColor: '#fdfcf0' },
];

export function Navbar() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isCategoriesSidebarOpen, setIsCategoriesSidebarOpen] = React.useState(false);
    const [isCategoriesExpanded, setIsCategoriesExpanded] = React.useState(false);
    const [isSearchOverlayOpen, setIsSearchOverlayOpen] = React.useState(false);
    const [isLocationOverlayOpen, setIsLocationOverlayOpen] = React.useState(false);
    const [isLoginOverlayOpen, setIsLoginOverlayOpen] = React.useState(false);
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);

    React.useEffect(() => {
        setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    }, []);

    const [isScrolled, setIsScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
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

    const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);
    const [isBrowseAllOpen, setIsBrowseAllOpen] = React.useState(false);

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

    // Completely hide navbar on these pages
    if (isAdminPage || isShipmentPage) return null;

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
                onLoginSuccess={() => {
                    setIsLoginOverlayOpen(false);
                    setIsLoggedIn(true);
                    router.push('/');
                    setTimeout(() => window.location.reload(), 100);
                }}
            />



            {/* Persistent 12px Top Green Bar - Now part of Navbar for easy toggling */}
            <div className={cn(
                "w-full h-[12px] bg-[#53B175] sticky top-0 z-[10000] transition-transform duration-300",
                isScrolled && "-translate-y-full"
            )} />

            {/* Top Header - Scrolls Away */}
            <header className={cn(
                "w-full bg-white relative z-[1000]",
                (pathname?.startsWith('/category/') || pathname?.startsWith('/product/') || pathname === '/cart' || pathname === '/orders' || pathname === '/wishlist' || pathname === '/profile') && "hidden md:block"
            )}>
                <div className="w-full py-3 px-4 md:px-[var(--container-padding)]">
                    <div className="max-w-[var(--container-max)] mx-auto">

                        {/* Mobile Header Layout */}
                        <div className="md:hidden space-y-3 pt-3">
                            {/* Row 1: Location, Logo, Wishlist & Cart */}
                            <div className="flex items-center justify-between px-1">
                                {/* Location Button (Left) */}
                                <div className="flex-1 flex justify-start">
                                    <button
                                        onClick={() => setIsLocationOverlayOpen(true)}
                                        className="flex items-center gap-1 px-2.5 py-1 border border-gray-100 rounded-full bg-[#F7F7F7] shadow-sm hover:bg-gray-100 transition-colors"
                                    >
                                        <MapPin size={12} className="text-[#53B175]" />
                                        <span className="text-[11px] font-bold text-gray-500 truncate max-w-[60px]">
                                            {selectedAddress?.shortAddress || 'Select'}
                                        </span>
                                        <ChevronDown size={12} className="text-gray-400" />
                                    </button>
                                </div>

                                {/* Logo (Center) */}
                                <Link href="/" className="flex justify-center">
                                    <img
                                        src="/Horeca1.png"
                                        alt="Horeca1"
                                        className="h-[20px] w-auto object-contain"
                                    />
                                </Link>

                                {/* Wishlist & Cart (Right) */}
                                <div className="flex-1 flex justify-end items-center gap-2">
                                    <Link
                                        href="/wishlist"
                                        className="relative p-1"
                                    >
                                        <Heart size={20} className="text-[#181725]" />
                                        {wishlist.length > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 bg-[#FF4B4B] text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-extrabold border-[1.5px] border-white">
                                                {wishlist.length}
                                            </span>
                                        )}
                                    </Link>
                                    <Link href="/cart" className="relative p-1">
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

                        {/* Desktop Header Content (Hidden on Mobile) */}
                        <div className="hidden md:flex items-center justify-between gap-6">
                            <Link href="/" className="flex-shrink-0">
                                <img src="/Horeca1.png" alt="Horeca1" className="h-[26px] w-auto object-contain" />
                            </Link>

                            {!pathname?.startsWith('/vendor/') && (
                                <div className="flex flex-1 max-w-2xl items-center relative group">
                                    <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl w-full focus-within:border-primary/50 transition-all duration-300 shadow-sm">
                                        <div className="flex items-center gap-1 text-[var(--text-sm)] text-text-muted border-r-2 border-gray-100 pr-4 cursor-pointer hover:text-primary font-semibold select-none group/cat">
                                            <span>Categories</span>
                                            <ChevronDown size={16} className="group-hover/cat:translate-y-0.5 transition-transform" />
                                        </div>
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
                                            onClick={() => openSearch('items', navSearchQuery)}
                                            className="bg-primary p-2.5 rounded-full text-white hover:bg-primary-dark transition-all shadow-md"
                                        >
                                            <Search size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-6">
                                <div className="hidden lg:flex flex-col items-end">
                                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Support</span>
                                    <Link href="/contact" className="text-[15px] font-black text-text hover:text-primary transition-colors">+91-1234567890</Link>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Link href="/wishlist" className="p-2 hover:bg-gray-50 rounded-full transition-all relative group">
                                        <Heart size={24} className="text-text group-hover:text-primary transition-colors" />
                                        {wishlist.length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">
                                                {wishlist.length}
                                            </span>
                                        )}
                                    </Link>
                                    <Link href="/cart" className="p-2 hover:bg-gray-50 rounded-full transition-all relative group">
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
            <nav className={cn(
                "hidden md:block w-full border-b border-gray-100 bg-white sticky z-[900] transition-all duration-300",
                isScrolled ? "top-0 shadow-md" : "top-[12px]"
            )}>
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-3 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div 
                            className="relative group/main"
                            onMouseEnter={() => setIsBrowseAllOpen(true)}
                            onMouseLeave={() => {
                                setIsBrowseAllOpen(false);
                                setHoveredCategory(null);
                            }}
                        >
                            <button 
                                className="bg-primary text-white px-6 py-4 flex items-center gap-3 font-bold text-[var(--text-sm)] rounded-lg"
                            >
                                <Menu size={20} />
                                <span>Browse All Categories</span>
                                <ChevronDown size={14} className="group-hover/main:rotate-180 transition-transform" />
                            </button>

                            <div className={cn(
                                "absolute top-full left-0 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all duration-300 z-[110] rounded-b-2xl overflow-hidden flex min-h-[480px] opacity-0 invisible group-hover/main:opacity-100 group-hover/main:visible",
                                !hoveredCategory ? "w-72" : "w-[calc(18rem+450px)]"
                            )}>
                                    {/* Categories List */}
                                    <div className="w-72 border-r border-gray-100 py-2 bg-white shrink-0">
                                        {categories.slice(0, 10).map((item, idx) => (
                                            <div 
                                                key={idx} 
                                                onMouseEnter={() => setHoveredCategory(item.name)}
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
                                                {vendors.filter(v => 
                                                    hoveredCategory && v.categories.some(c => c.toLowerCase() === hoveredCategory.toLowerCase())
                                                ).slice(0, 6).map((vendor) => (
                                                    <Link 
                                                        key={vendor.id} 
                                                        href={`/category/${vendor.slug || slugify(vendor.name)}/${slugify(hoveredCategory || '')}`}
                                                        onClick={() => {
                                                            setHoveredCategory(null);
                                                            setIsBrowseAllOpen(false);
                                                        }}
                                                        className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all group/vendor"
                                                    >
                                                        <div className="w-12 h-12 rounded-lg border border-gray-50 flex items-center justify-center p-1.5 shrink-0 bg-white">
                                                            <img src={vendor.logo} alt="" className="max-w-full max-h-full object-contain group-hover/vendor:scale-110 transition-transform" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="text-[14px] font-bold text-text truncate group-hover/vendor:text-primary transition-colors">{vendor.name}</h5>
                                                            <p className="text-[11px] text-text-muted truncate font-medium">
                                                                {vendor.categories.join(', ')}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-lg shrink-0">
                                                            <Star size={12} fill="currentColor" />
                                                            <span className="text-[11px] font-bold">{vendor.rating}</span>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                            
                                            {vendors.filter(v => 
                                                hoveredCategory && v.categories.some(c => c.toLowerCase() === hoveredCategory.toLowerCase())
                                            ).length === 0 && (
                                                <div className="text-center py-10">
                                                    <p className="text-text-muted text-[13px] font-medium italic">No direct matches found. Try exploring the category.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                        </div>

                        <div className="flex items-center gap-6 text-[var(--text-sm)] font-semibold text-text-muted">
                            <Link href="/" className="hover:text-primary py-4">Home</Link>
                            <Link href="/vendors" className="hover:text-primary">Vendors</Link>
                            <Link href="/blog" className="hover:text-primary">Blog</Link>
                            <Link href="/contact" className="hover:text-primary">Contact Us</Link>
                        </div>
                    </div>

                    <div className="bg-primary hover:bg-primary-dark transition-all text-white px-6 py-4 flex items-center gap-3 cursor-pointer rounded-lg shadow-lg shadow-primary/20">
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
                            className="p-1"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between mb-6 px-1">
                        <h2 className="text-[17px] font-black text-[#181725]">Shop By Category</h2>
                        <button
                            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                            className="text-[#53B175] text-[14px] font-bold"
                        >
                            {isCategoriesExpanded ? 'Collapse' : 'See All'}
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-y-6 gap-x-3">
                        {(isCategoriesExpanded ? categories : categories.slice(0, 8)).map((item, idx) => (
                            <Link
                                key={idx}
                                href={`/category/${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                                className="flex flex-col items-center gap-2 group"
                                onClick={() => {
                                    setIsCategoriesSidebarOpen(false);
                                    setIsCategoriesExpanded(false);
                                }}
                            >
                                <div
                                    className="w-full aspect-square rounded-[18px] flex items-center justify-center p-2 transition-transform active:scale-95 shadow-sm border border-gray-50 overflow-hidden"
                                    style={{
                                        backgroundColor: (item as any).bgColor || '#F7F8FA',
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
