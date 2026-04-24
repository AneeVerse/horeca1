'use client';

import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ShoppingBag,
    HelpCircle,
    Heart,
    Pencil,
    RotateCcw,
    ListOrdered,
    Store,
    MapPin,
    Gift,
    CreditCard,
    Bell,
    Info,
    Settings,
    LogOut,
    Home,
    User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EditProfileOverlay } from './EditProfileOverlay';
import { WishlistOverlay } from './WishlistOverlay';
import { SavedAddressesOverlay } from './SavedAddressesOverlay';
import { RewardsOverlay } from './RewardsOverlay';
import { PaymentManagementOverlay } from './PaymentManagementOverlay';
import { NotificationOverlay } from './NotificationOverlay';
import { GeneralInformationOverlay } from './GeneralInformationOverlay';
import { SettingsOverlay } from './SettingsOverlay';

interface ProfileScreenProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileScreen({ isOpen, onClose }: ProfileScreenProps) {
    const router = useRouter();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    const [isSavedAddressesOpen, setIsSavedAddressesOpen] = useState(false);
    const [isRewardsOpen, setIsRewardsOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isGeneralInfoOpen, setIsGeneralInfoOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const { data: session } = useSession();

    const [userData, setUserData] = useState({
        fullName: '',
        phone: '',
        businessName: '',
        email: '',
        address: '',
        address2: '',
        pincode: '',
        city: '',
        image: '',
    });

    // Fetch full profile from DB (session only carries name/email/role)
    // Also pull the default saved address to fill address/city fields
    useEffect(() => {
        if (!session?.user) return;
        Promise.all([
            fetch('/api/v1/auth/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
            fetch('/api/v1/addresses', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        ])
            .then(([profileJson, addrJson]) => {
                const p = profileJson?.success ? profileJson.data : null;
                const addresses = addrJson?.success ? addrJson.data : [];
                const defaultAddr = addresses?.[0]; // already sorted by isDefault desc, then createdAt desc
                setUserData(prev => ({
                    ...prev,
                    fullName: p?.fullName || prev.fullName || '',
                    phone: p?.phone || '',
                    businessName: p?.businessName || '',
                    email: p?.email || '',
                    pincode: p?.pincode || defaultAddr?.pincode || '',
                    image: p?.image || '',
                    address: defaultAddr?.shortAddress || defaultAddr?.fullAddress || '',
                    address2: defaultAddr?.flatInfo || defaultAddr?.landmark || '',
                    city: defaultAddr?.city || '',
                }));
            })
            .catch(() => {});
    }, [session]);

    if (!isOpen) return null;

    const handleLogout = async () => {
        await signOut({ redirect: false });
        toast.success('Logged out successfully');
        onClose();
        window.location.href = '/';
    };

    const topActions = [
        { id: 'reorder', label: 'Reorder', sub: 'From last order', icon: RotateCcw, color: 'bg-blue-50 text-blue-600', onClick: () => { router.push('/orders'); } },
        { id: 'quick-order', label: 'Quick Order', sub: 'Order lists', icon: ListOrdered, color: 'bg-purple-50 text-purple-600', onClick: () => { router.push('/order-lists'); } },
        { id: 'my-vendors', label: 'My Vendors', sub: 'Saved vendors', icon: Store, color: 'bg-orange-50 text-orange-600', onClick: () => { router.push('/vendors'); } },
    ];

    const quickActions = [
        {
            id: 'orders',
            label: 'Your\nOrder',
            icon: ShoppingBag,
            onClick: () => { router.push('/orders'); }
        },
        {
            id: 'support',
            label: 'Help &\nSupports',
            icon: HelpCircle,
            onClick: () => { router.push('/contact'); }
        },
        {
            id: 'wishlist',
            label: 'Your\nWishlist',
            icon: Heart,
            onClick: () => {
                router.push('/wishlist');
            },
        },
    ];

    const yourInfoItems = [
        { id: 'edit-profile', label: 'Edit Profile', desc: 'Update your personal details', icon: Pencil, onClick: () => setIsEditProfileOpen(true) },
        { id: 'saved-addresses', label: 'Saved Addresses', desc: 'Manage delivery locations', icon: MapPin, onClick: () => setIsSavedAddressesOpen(true) },
        { id: 'rewards', label: 'Rewards', desc: 'View points & referrals', icon: Gift, onClick: () => setIsRewardsOpen(true) },
        { id: 'payment', label: 'Payment Management', desc: 'Cards, UPI & banking', icon: CreditCard, onClick: () => setIsPaymentOpen(true) },
    ];

    const otherInfoItems = [
        { id: 'notifications', label: 'Notification', desc: 'Push & email preferences', icon: Bell, onClick: () => setIsNotificationOpen(true) },
        { id: 'general', label: 'General Information', desc: 'About, terms & policies', icon: Info, onClick: () => setIsGeneralInfoOpen(true) },
        { id: 'settings', label: 'Settings', desc: 'Language, theme & more', icon: Settings, onClick: () => setIsSettingsOpen(true) },
    ];

    return (
        <>
            <div className="w-full min-h-screen bg-[#F2F3F2] flex flex-col animate-in fade-in slide-in-from-bottom duration-300">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center px-4 py-3 shrink-0 relative bg-transparent">
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors absolute left-4 z-10"
                    >
                        <ChevronLeft size={20} className="text-[#181725]" />
                    </button>
                    <h2 className="w-full text-center text-[18px] font-[700] text-[#181725]">Profile</h2>
                </div>

                {/* Desktop Header */}
                <div className="hidden md:block bg-[#F7F8FA] border-b border-gray-100">
                    <div className="md:max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-6">
                        <div className="flex items-center gap-2 text-[13px] text-text-muted mb-3">
                            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
                                <Home size={14} />
                                <span>Home</span>
                            </Link>
                            <ChevronRight size={12} />
                            <span className="text-text font-semibold">Profile</span>
                        </div>
                        <h1 className="text-[32px] font-black text-text tracking-tight">
                            <User size={32} className="inline-block mr-3 -mt-1 text-primary" />
                            My Account
                        </h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-24 md:pb-16 px-4 pt-2 md:px-0 md:pt-0">
                    <div className="md:max-w-[var(--container-max)] md:mx-auto md:px-[var(--container-padding)] md:pt-10">
                        
                        {/* === MOBILE LAYOUT (unchanged) === */}
                        <div className="md:hidden">
                            {/* User Avatar & Info */}
                            <div className="flex flex-col items-center pb-6">
                                <div className="relative mb-3">
                                    <div className="w-[82px] h-[82px] rounded-full overflow-hidden border-[2px] border-[#53B175] bg-white">
                                        <img src={userData.image || '/images/profile/sample-profile.png'} alt="Profile" className="w-full h-full object-cover" />
                                    </div>
                                    <button className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm cursor-pointer">
                                        <Pencil size={11} className="text-gray-400" />
                                    </button>
                                </div>
                                <h3 className="text-[19px] font-[700] text-[#181725] mb-0.5">{userData.fullName}</h3>
                                <p className="text-[12px] text-gray-400 font-medium">{userData.email}</p>
                            </div>

                            {/* Top Actions */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {topActions.map((action) => {
                                    const Icon = action.icon;
                                    return (
                                        <button key={action.id} onClick={action.onClick} className="flex flex-col items-center bg-white border border-gray-100 rounded-[15px] py-3 px-1 shadow-sm active:scale-[0.98] transition-all cursor-pointer">
                                            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center mb-1.5", action.color)}>
                                                <Icon size={16} strokeWidth={2.5} />
                                            </div>
                                            <p className="text-[11px] font-[700] text-[#181725] leading-tight mb-0.5">{action.label}</p>
                                            <p className="text-[8px] text-gray-400 font-medium whitespace-nowrap uppercase tracking-tighter">{action.sub}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-3 gap-3 mb-8">
                                {quickActions.map((action) => {
                                    const Icon = action.icon;
                                    return (
                                        <button key={action.id} onClick={action.onClick} className="flex flex-col items-center bg-white border border-gray-100 rounded-[12px] py-4 px-1 shadow-sm active:scale-[0.98] transition-all cursor-pointer">
                                            <div className="mb-3"><Icon size={20} className="text-[#181725]" strokeWidth={2} /></div>
                                            <span className="text-[11px] font-[600] text-[#181725] text-center leading-tight whitespace-pre-line px-1">{action.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Your Information */}
                            <div className="mb-6">
                                <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">Your Information</h4>
                                <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm">
                                    {yourInfoItems.map((item, idx) => {
                                        const Icon = item.icon;
                                        return (
                                            <button key={item.id} onClick={item.onClick} className={cn("w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors text-left cursor-pointer", idx < yourInfoItems.length - 1 && "border-b border-gray-50/80")}>
                                                <span className="text-[13px] font-[600] text-[#181725]">{item.label}</span>
                                                <ChevronRight size={16} className="text-gray-400/60" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Other Information */}
                            <div className="mb-8">
                                <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">Other Information</h4>
                                <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm">
                                    {otherInfoItems.map((item, idx) => {
                                        const Icon = item.icon;
                                        return (
                                            <button key={item.id} onClick={item.onClick} className={cn("w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors text-left cursor-pointer", idx < otherInfoItems.length - 1 && "border-b border-gray-50/80")}>
                                                <span className="text-[13px] font-[600] text-[#181725]">{item.label}</span>
                                                <ChevronRight size={16} className="text-gray-400/60" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Logout - Mobile */}
                            <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm mb-12">
                                <button onClick={handleLogout} className="w-full py-3.5 text-center text-red-500 font-[700] text-[15px] active:bg-red-50/30 transition-colors cursor-pointer">
                                    Logout
                                </button>
                            </div>
                        </div>

                        {/* === DESKTOP LAYOUT === */}
                        <div className="hidden md:grid md:grid-cols-[280px_1fr] lg:grid-cols-[340px_1fr] xl:grid-cols-[360px_1fr] md:gap-6 lg:gap-10 md:items-start">
                            
                            {/* LEFT COLUMN: Profile Card + Your Information */}
                            <div className="space-y-6">
                                {/* Profile Card */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-6 md:p-6 lg:p-8 pb-8">
                                    <div className="flex flex-col items-center">
                                        <div className="relative mb-4 lg:mb-5">
                                            <div className="w-[100px] h-[100px] lg:w-[120px] lg:h-[120px] rounded-full overflow-hidden border-[3px] border-[#53B175] bg-white transition-all">
                                                <img src={userData.image || '/images/profile/sample-profile.png'} alt="Profile" className="w-full h-full object-cover" />
                                            </div>
                                            <button className="absolute bottom-1 right-1 w-7 h-7 lg:w-8 lg:h-8 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
                                                <Pencil size={12} className="text-gray-400 lg:!w-3.5 lg:!h-3.5" />
                                            </button>
                                        </div>
                                        <h3 className="text-[20px] lg:text-[24px] font-[700] text-[#181725] mb-0.5">{userData.fullName}</h3>
                                        <p className="text-[14px] text-gray-400 font-medium">{userData.email}</p>
                                        {userData.businessName && <p className="text-[13px] text-gray-400 font-medium mt-1.5">{userData.businessName}</p>}
                                    </div>
                                </div>

                                {/* Logout Button */}
                                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                    <button onClick={handleLogout} className="w-full py-4 text-center text-red-500 font-[700] text-[15px] hover:bg-red-50/30 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                                        <LogOut size={18} />
                                        Logout
                                    </button>
                                </div>

                                {/* Your Information */}
                                <div>
                                    <h4 className="text-[18px] font-[700] text-[#181725] mb-3 px-1">Your Information</h4>
                                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                                        {yourInfoItems.map((item, idx) => {
                                            const Icon = item.icon;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={item.onClick}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4 group active:bg-gray-50 transition-colors text-left hover:bg-gray-50/50 cursor-pointer",
                                                        idx < yourInfoItems.length - 1 && "border-b border-gray-50/80"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                            <Icon size={18} className="text-text-muted" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[15px] font-[600] text-[#181725] block">{item.label}</span>
                                                            <span className="text-[12px] text-gray-400 font-medium mt-0.5 block">{item.desc}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-gray-300" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Action Cards + Other Information */}
                            <div className="space-y-6">
                                {/* Top Actions (Reorder, Quick Order, My Vendors) */}
                                <div className="grid grid-cols-3 gap-3 lg:gap-5">
                                    {topActions.map((action) => {
                                        const Icon = action.icon;
                                        return (
                                            <button
                                                key={action.id}
                                                onClick={action.onClick}
                                                className="flex flex-col items-center bg-white border border-gray-100 rounded-2xl py-5 lg:py-7 px-2 lg:px-3 shadow-sm active:scale-[0.98] transition-all hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 cursor-pointer"
                                            >
                                                <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-3", action.color)}>
                                                    <Icon size={22} strokeWidth={2.5} />
                                                </div>
                                                <p className="text-[15px] font-[700] text-[#181725] leading-tight mb-1">{action.label}</p>
                                                <p className="text-[11px] text-gray-400 font-medium whitespace-nowrap uppercase tracking-tighter">{action.sub}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Quick Utility Actions (Your Order, Help, Wishlist) */}
                                <div className="grid grid-cols-3 gap-3 lg:gap-5">
                                    {quickActions.map((action) => {
                                        const Icon = action.icon;
                                        return (
                                            <button
                                                key={action.id}
                                                onClick={action.onClick}
                                                className="flex flex-col items-center bg-white border border-gray-100 rounded-2xl py-6 lg:py-8 px-2 lg:px-3 shadow-sm group active:scale-[0.98] transition-all hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 cursor-pointer"
                                            >
                                                <div className="mb-4">
                                                    <Icon size={26} className="text-[#181725]" strokeWidth={2} />
                                                </div>
                                                <span className="text-[14px] font-[600] text-[#181725] text-center leading-tight whitespace-pre-line px-1">{action.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Other Information */}
                                <div>
                                    <h4 className="text-[18px] font-[700] text-[#181725] mb-3 px-1">Other Information</h4>
                                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                                        {otherInfoItems.map((item, idx) => {
                                            const Icon = item.icon;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={item.onClick}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-5 py-4 group active:bg-gray-50 transition-colors text-left hover:bg-gray-50/50 cursor-pointer",
                                                        idx < otherInfoItems.length - 1 && "border-b border-gray-50/80"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                            <Icon size={18} className="text-text-muted" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[15px] font-[600] text-[#181725] block">{item.label}</span>
                                                            <span className="text-[12px] text-gray-400 font-medium mt-0.5 block">{item.desc}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-gray-300" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Edit Profile Overlay */}
            <EditProfileOverlay
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                userData={userData}
                onSave={async (data) => {
                    setUserData(prev => ({ ...prev, ...data }));
                    try {
                        const patch: Record<string, string> = {};
                        if (data.fullName) patch.fullName = data.fullName;
                        if (data.businessName) patch.businessName = data.businessName;
                        if (/^\d{6}$/.test(data.pincode)) patch.pincode = data.pincode;
                        await fetch('/api/v1/auth/me', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify(patch),
                        });
                        // Mark profile complete when core fields are filled
                        if (data.fullName && data.businessName && /^\d{6}$/.test(data.pincode)) {
                            await fetch('/api/v1/me/profile', { method: 'POST', credentials: 'include' });
                        }
                    } catch { /* silent — local state already updated */ }
                }}
            />

            {/* Wishlist Overlay */}
            <WishlistOverlay
                isOpen={isWishlistOpen}
                onClose={() => setIsWishlistOpen(false)}
            />

            {/* Saved Addresses Overlay */}
            <SavedAddressesOverlay
                isOpen={isSavedAddressesOpen}
                onClose={() => setIsSavedAddressesOpen(false)}
            />

            {/* Rewards Overlay */}
            <RewardsOverlay
                isOpen={isRewardsOpen}
                onClose={() => setIsRewardsOpen(false)}
            />

            {/* Payment Management Overlay */}
            <PaymentManagementOverlay
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
            />

            {/* Notification Overlay */}
            <NotificationOverlay
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
            />

            {/* General Information Overlay */}
            <GeneralInformationOverlay
                isOpen={isGeneralInfoOpen}
                onClose={() => setIsGeneralInfoOpen(false)}
            />

            {/* Settings Overlay */}
            <SettingsOverlay
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    );
}
