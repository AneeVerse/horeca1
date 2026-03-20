'use client';

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
import { cn, slugify } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileSearchOverlay } from './MobileSearchOverlay';
import { LocationSelectionOverlay } from './LocationSelectionOverlay';
import { CategoryBrowseMenu } from './CategoryBrowseMenu';
import { SearchURLSync } from './SearchURLSync';
import { useCart } from '@/context/CartContext';
import { useAddress } from '@/context/AddressContext';
import { AuthScreen } from '../auth/AuthScreen';
import { InitialPincodeOverlay } from './InitialPincodeOverlay';
import { WishlistOverlay } from '../auth/WishlistOverlay';
import { useWishlist } from '@/context/WishlistContext';
import { vendors } from '@/data/vendorData';

interface NavCategory {
    name: string;
    image: string;
    bgColor: string;
}

const categories: NavCategory[] = [
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
    const pathname = usePathname();
    const [isCategoriesSidebarOpen, setIsCategoriesSidebarOpen] = React.useState(false);
    const [isCategoriesExpanded, setIsCategoriesExpanded] = React.useState(false);
    const [isSearchOverlayOpen, setIsSearchOverlayOpen] = React.useState(false);
    const [isLocationOverlayOpen, setIsLocationOverlayOpen] = React.useState(false);
    const [isLoginOverlayOpen, setIsLoginOverlayOpen] = React.useState(false);
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    const [searchTab, setSearchTab] = React.useState<'items' | 'stores'>('stores');
    const [isNavSearchFocused, setIsNavSearchFocused] = React.useState(false);
    const [navSearchQuery, setNavSearchQuery] = React.useState('');
    const [isWishlistOpen, setIsWishlistOpen] = React.useState(false);
    const [hoveredCategory, setHoveredCategory] = React.useState<string | null>(null);
    const [isBrowseAllOpen, setIsBrowseAllOpen] = React.useState(false);

    const { totalItems } = useCart();
    const { wishlist } = useWishlist();
    const { selectedAddress, setSelectedAddress } = useAddress();

    React.useEffect(() => {
        setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    }, []);

    React.useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setIsScrolled(window.scrollY > 50);
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const openSearch = (tab: 'items' | 'stores' | 'vendors' = 'vendors', initialQuery = '') => {
        setSearchTab(tab === 'vendors' ? 'stores' : tab as 'items' | 'stores');
        setNavSearchQuery(initialQuery);
        setIsSearchOverlayOpen(true);
    };

    const isShipmentPage = pathname?.includes('/cart/shipment/');
    const isAdminPage = pathname?.startsWith('/admin');

    if (isAdminPage || isShipmentPage) return null;

    return (
        <>
            <React.Suspense fallback={null}>
                <SearchURLSync openSearch={openSearch} />
            </React.Suspense>
            
            {pathname === '/' && (
                <InitialPincodeOverlay
                    onComplete={(pincode) => {
                        if (pincode) {
                            setSelectedAddress({
                                id: `init_${Date.now()}`,
                                label: 'Other',
                                line1: 'Airoli',
                                city: 'Navi Mumbai',
                                state: 'Maharashtra',
                                fullAddress: `Airoli, Navi Mumbai - ${pincode}`,
                                shortAddress: 'Airoli',
                                latitude: 19.1579,
                                longitude: 72.9935,
                                pincode: pincode
                            });
                        } else {
                            localStorage.removeItem('user_pincode');
                            setSelectedAddress(null);
                        }
                    }}
                />
            )}

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

            <div className={cn(
                "w-full h-[12px] bg-[#53B175] sticky top-0 z-[10000] transition-transform duration-300",
                isScrolled && "-translate-y-full"
            )} />

            <header className="w-full bg-white relative z-[1000]">
                <div className="w-full py-3 px-4 md:px-[var(--container-padding)]">
                    <div className="max-w-[var(--container-max)] mx-auto">
                        {/* Mobile Header Layout */}
                        <div className="md:hidden space-y-3 pt-3">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex-1 flex justify-start">
                                    <button
                                        onClick={() => setIsLocationOverlayOpen(true)}
                                        className="flex items-center gap-1 px-2.5 py-1 border border-gray-100 rounded-full bg-[#F7F7F7] shadow-sm hover:bg-gray-100 transition-colors cursor-pointer"
                                    >
                                        <MapPin size={12} className="text-[#53B175]" />
                                        <span className="text-[11px] font-bold text-gray-500 truncate max-w-[60px]">
                                            {selectedAddress?.shortAddress || 'Select'}
                                        </span>
                                        <ChevronDown size={12} className="text-gray-400" />
                                    </button>
                                </div>

                                <Link href="/" className="flex justify-center">
                                    <img src="/Horeca1.png" alt="Horeca1" className="h-[20px] w-auto object-contain" />
                                </Link>

                                <div className="flex-1 flex justify-end items-center gap-2">
                                    <Link href="/wishlist" className="relative p-1 cursor-pointer">
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

                            {!pathname?.startsWith('/vendor/') && 
                             !pathname?.startsWith('/order-lists') &&
                             !pathname?.startsWith('/category/') &&
                             !pathname?.startsWith('/product/') &&
                             pathname !== '/orders' &&
                             pathname !== '/wishlist' &&
                             pathname !== '/cart' &&
                             pathname !== '/profile' && (
                                <div className="px-1">
                                    <div className={cn(
                                        "flex items-center gap-3 px-4 py-3 bg-[#F7F7F7] border rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300",
                                        isNavSearchFocused ? "border-[#53B175] bg-white ring-1 ring-[#53B175]/10" : "border-gray-100"
                                    )}>
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

                        {/* Desktop Header Content */}
                        <div className="hidden md:flex items-center justify-between gap-3 lg:gap-6">
                            <Link href="/" className="flex-shrink-0">
                                <img src="/Horeca1.png" alt="Horeca1" className="h-[26px] w-auto object-contain" />
                            </Link>

                            {!pathname?.startsWith('/vendor/') && (
                                <div className="flex flex-1 max-w-[320px] lg:max-w-[720px] items-center relative group">
                                    <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2.5 lg:py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl w-full focus-within:border-primary/50 transition-all duration-300 shadow-sm">
                                        <input
                                            type="text"
                                            value={navSearchQuery}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setNavSearchQuery(val);
                                                if (val.trim()) openSearch('items', val);
                                            }}
                                            placeholder="Search for a product or brand"
                                            className="flex-1 bg-transparent text-[var(--text-base)] outline-none px-3 placeholder:text-gray-400"
                                        />
                                        <button
                                            onClick={() => navSearchQuery.trim() && openSearch('items', navSearchQuery)}
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
                                        onClick={() => isLoggedIn ? router.push('/profile') : setIsLoginOverlayOpen(true)}
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

            {/* Main Navigation - Desktop Only */}
            <nav className={cn(
                "hidden md:block w-full border-b border-gray-100 bg-white sticky z-[900] transition-all duration-300",
                isScrolled ? "top-0 shadow-md" : "top-[12px]"
            )}>
                <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 lg:gap-8">
                        <div
                            className="relative"
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
                                className="bg-primary text-white px-4 lg:px-6 py-3 lg:py-4 flex items-center gap-2 lg:gap-3 font-bold text-[13px] lg:text-[var(--text-sm)] rounded-lg transition-all active:scale-95 cursor-pointer"
                            >
                                <Menu size={20} className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                                <span className="whitespace-nowrap text-white">Browse All Categories</span>
                                <ChevronDown size={14} className={cn("transition-transform text-white", isBrowseAllOpen && "rotate-180")} />
                            </button>

                            <CategoryBrowseMenu
                                isOpen={isBrowseAllOpen}
                                categories={categories}
                                vendors={vendors}
                                hoveredCategory={hoveredCategory}
                                setHoveredCategory={setHoveredCategory}
                                onClose={() => {
                                    setHoveredCategory(null);
                                    setIsBrowseAllOpen(false);
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-4 lg:gap-6 text-[var(--text-sm)] font-semibold text-text-muted">
                            <Link href="/" className="hover:text-primary py-4 cursor-pointer">Home</Link>
                            <Link href="/vendors" className="hover:text-primary cursor-pointer">Vendors</Link>
                            <Link href="/under-construction" className="hover:text-primary cursor-pointer">Blog</Link>
                            <Link href="/under-construction" className="hover:text-primary cursor-pointer">Contact Us</Link>
                        </div>
                    </div>

                    <div className="bg-primary hover:bg-primary-dark transition-all text-white px-4 lg:px-6 py-3 lg:py-4 flex items-center gap-2 lg:gap-3 rounded-lg shadow-lg shadow-primary/20 shrink-0">
                        <PhoneCall size={18} className="lg:w-5 lg:h-5" />
                        <span className="font-bold text-[13px] lg:text-[var(--text-sm)] whitespace-nowrap">01- 234 567 890</span>
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
                    <div className="flex justify-end mb-2">
                        <button onClick={() => {setIsCategoriesSidebarOpen(false); setIsCategoriesExpanded(false);}} className="p-1 cursor-pointer">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between mb-6 px-1">
                        <h2 className="text-[17px] font-black text-[#181725]">Shop By Category</h2>
                        <button onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)} className="text-[#53B175] text-[14px] font-bold cursor-pointer">
                            {isCategoriesExpanded ? 'Collapse' : 'See All'}
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-y-6 gap-x-3">
                        {(isCategoriesExpanded ? categories : categories.slice(0, 8)).map((item, idx) => (
                            <Link
                                key={idx}
                                href={`/category/${slugify(item.name)}`}
                                className="flex flex-col items-center gap-2 group"
                                onClick={() => { setIsCategoriesSidebarOpen(false); setIsCategoriesExpanded(false); }}
                            >
                                <div className="w-full aspect-square rounded-[18px] flex items-center justify-center p-2 transition-transform active:scale-95 shadow-sm border border-gray-50 overflow-hidden" 
                                     style={{ backgroundColor: item.bgColor || '#F7F8FA' }}>
                                    <div className="relative w-[75%] h-[75%]">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
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
                onAccountClick={() => isLoggedIn ? router.push('/profile') : setIsLoginOverlayOpen(true)}
            />
            <MobileSearchOverlay
                isOpen={isSearchOverlayOpen}
                onClose={() => { setIsSearchOverlayOpen(false); setNavSearchQuery(''); }}
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
