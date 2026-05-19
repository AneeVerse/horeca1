'use client';

import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ShoppingBag,
    HelpCircle,
    Pencil,
    RotateCcw,
    ListOrdered,
    Store,
    MapPin,
    CreditCard,
    Bell,
    Info,
    Settings,
    LogOut,
    Home,
    User,
    Phone,
    Building2,
    BadgeCheck,
    Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EditProfileOverlay } from './EditProfileOverlay';
import { SavedAddressesOverlay } from './SavedAddressesOverlay';
import { PaymentManagementOverlay } from './PaymentManagementOverlay';
import { NotificationOverlay } from './NotificationOverlay';
import { GeneralInformationOverlay } from './GeneralInformationOverlay';
import { SettingsOverlay } from './SettingsOverlay';

interface ProfileScreenProps {
    isOpen: boolean;
    onClose: () => void;
}

type LucideIcon = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

function DetailRow({ icon: Icon, label, value, sub, muted }: { icon: LucideIcon; label: string; value: string; sub?: string; muted?: boolean }) {
    return (
        <div className="flex items-center gap-4 px-5 py-3.5">
            <span className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-gray-500" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-[700] text-gray-400 uppercase tracking-wider">{label}</p>
                <p className={cn('text-[13.5px] font-[600] truncate mt-0.5', muted ? 'text-gray-400' : 'text-[#181725]')}>{value}</p>
                {sub && <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
}

export function ProfileScreen({ isOpen, onClose }: ProfileScreenProps) {
    const router = useRouter();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isSavedAddressesOpen, setIsSavedAddressesOpen] = useState(false);
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
        // Clear user-scoped caches so the next user on this browser doesn't inherit them
        try {
            localStorage.removeItem('horeca_order_lists_all');
            localStorage.removeItem('horeca_orders');
            localStorage.removeItem('horeca_recently_viewed');
        } catch { /* ignore quota / privacy-mode errors */ }
        toast.success('Logged out successfully');
        onClose();
        window.location.href = '/';
    };

    // Four primary actions for B2B procurement landing — uniform brand styling
    // (no per-tile color pastels) to keep the dashboard feeling enterprise, not consumer.
    const primaryActions = [
        { id: 'reorder', label: 'Reorder', sub: 'From last order', icon: RotateCcw, onClick: () => router.push('/orders') },
        { id: 'quick-order', label: 'Quick Order', sub: 'Saved order lists', icon: ListOrdered, onClick: () => router.push('/order-lists') },
        { id: 'my-vendors', label: 'My Vendors', sub: 'Saved suppliers', icon: Store, onClick: () => router.push('/vendors') },
        { id: 'orders', label: 'Your Orders', sub: 'Track & history', icon: ShoppingBag, onClick: () => router.push('/orders') },
    ];

    const yourInfoItems = [
        { id: 'edit-profile', label: 'Edit Profile', desc: 'Update your personal details', icon: Pencil, onClick: () => setIsEditProfileOpen(true) },
        { id: 'saved-addresses', label: 'Saved Addresses', desc: 'Manage delivery locations', icon: MapPin, onClick: () => setIsSavedAddressesOpen(true) },
        { id: 'payment', label: 'Payment Management', desc: 'Cards, UPI & banking', icon: CreditCard, onClick: () => setIsPaymentOpen(true) },
    ];

    const otherInfoItems = [
        { id: 'notifications', label: 'Notification', desc: 'Push & email preferences', icon: Bell, onClick: () => setIsNotificationOpen(true) },
        { id: 'general', label: 'General Information', desc: 'About, terms & policies', icon: Info, onClick: () => setIsGeneralInfoOpen(true) },
        { id: 'settings', label: 'Settings', desc: 'Language, theme & more', icon: Settings, onClick: () => setIsSettingsOpen(true) },
        { id: 'support', label: 'Help & Support', desc: 'Reach our team', icon: HelpCircle, onClick: () => router.push('/contact') },
    ];

    const isProfileComplete = !!(userData.fullName && userData.businessName && userData.pincode);
    const defaultLocation = [userData.city, userData.pincode].filter(Boolean).join(' · ');

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
                        
                        {/* === MOBILE LAYOUT === */}
                        <div className="md:hidden">
                            {/* Identity card */}
                            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4">
                                <div className="relative shrink-0">
                                    <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-[2px] border-[#53B175] bg-white">
                                        <img src={userData.image || '/images/profile/sample-profile.png'} alt="Profile" className="w-full h-full object-cover" />
                                    </div>
                                    <button onClick={() => setIsEditProfileOpen(true)} className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm cursor-pointer">
                                        <Pencil size={11} className="text-gray-400" />
                                    </button>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-[16px] font-[700] text-[#181725] truncate">{userData.fullName || 'Welcome'}</h3>
                                        {isProfileComplete && <BadgeCheck size={15} className="text-[#53B175] shrink-0" />}
                                    </div>
                                    <p className="text-[12px] text-gray-400 font-medium truncate">{userData.email}</p>
                                    {userData.businessName && (
                                        <span className="inline-flex items-center mt-1 text-[10px] font-bold text-[#53B175] bg-[#53B175]/10 border border-[#53B175]/15 px-2 py-0.5 rounded-full max-w-full truncate">
                                            {userData.businessName}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Primary actions — 2x2 */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {primaryActions.map((action) => {
                                    const Icon = action.icon;
                                    return (
                                        <button key={action.id} onClick={action.onClick} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm active:scale-[0.98] transition-all text-left cursor-pointer">
                                            <div className="w-10 h-10 rounded-xl bg-[#53B175]/10 text-[#53B175] flex items-center justify-center shrink-0">
                                                <Icon size={18} strokeWidth={2.4} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-[700] text-[#181725] leading-tight">{action.label}</p>
                                                <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{action.sub}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Account details snapshot */}
                            {(userData.phone || userData.businessName || userData.address || defaultLocation) && (
                                <div className="mb-6">
                                    <h4 className="text-[12px] font-[800] text-gray-400 uppercase tracking-wider mb-2 px-1">Account details</h4>
                                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
                                        {userData.phone && (
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <Phone size={15} className="text-gray-400 shrink-0" />
                                                <span className="text-[13px] font-[600] text-[#181725]">{userData.phone}</span>
                                            </div>
                                        )}
                                        {userData.email && (
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <Mail size={15} className="text-gray-400 shrink-0" />
                                                <span className="text-[13px] font-[600] text-[#181725] truncate">{userData.email}</span>
                                            </div>
                                        )}
                                        {userData.businessName && (
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <Building2 size={15} className="text-gray-400 shrink-0" />
                                                <span className="text-[13px] font-[600] text-[#181725] truncate">{userData.businessName}</span>
                                            </div>
                                        )}
                                        {(userData.address || defaultLocation) && (
                                            <div className="flex items-start gap-3 px-4 py-3">
                                                <MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />
                                                <div className="text-[13px] font-[600] text-[#181725]">
                                                    {userData.address && <p className="truncate">{userData.address}</p>}
                                                    {defaultLocation && <p className="text-[11px] text-gray-400 font-medium">{defaultLocation}</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Your Information */}
                            <div className="mb-6">
                                <h4 className="text-[12px] font-[800] text-gray-400 uppercase tracking-wider mb-2 px-1">Account</h4>
                                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                    {yourInfoItems.map((item, idx) => {
                                        const Icon = item.icon;
                                        return (
                                            <button key={item.id} onClick={item.onClick} className={cn("w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors text-left cursor-pointer", idx < yourInfoItems.length - 1 && "border-b border-gray-50")}>
                                                <Icon size={16} className="text-gray-500 shrink-0" />
                                                <span className="text-[13px] font-[600] text-[#181725] flex-1">{item.label}</span>
                                                <ChevronRight size={16} className="text-gray-300" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Other Information */}
                            <div className="mb-6">
                                <h4 className="text-[12px] font-[800] text-gray-400 uppercase tracking-wider mb-2 px-1">More</h4>
                                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                    {otherInfoItems.map((item, idx) => {
                                        const Icon = item.icon;
                                        return (
                                            <button key={item.id} onClick={item.onClick} className={cn("w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors text-left cursor-pointer", idx < otherInfoItems.length - 1 && "border-b border-gray-50")}>
                                                <Icon size={16} className="text-gray-500 shrink-0" />
                                                <span className="text-[13px] font-[600] text-[#181725] flex-1">{item.label}</span>
                                                <ChevronRight size={16} className="text-gray-300" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Logout - Mobile */}
                            <button onClick={handleLogout} className="w-full bg-white border border-gray-100 rounded-2xl py-3.5 text-red-500 font-[700] text-[15px] active:bg-red-50/30 transition-colors flex items-center justify-center gap-2 shadow-sm mb-12 cursor-pointer">
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>

                        {/* === DESKTOP LAYOUT — sidebar nav + main dashboard (B2B enterprise feel) === */}
                        <div className="hidden md:grid md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr] md:gap-6 lg:gap-8 md:items-start">

                            {/* LEFT SIDEBAR — profile card + grouped nav + logout */}
                            <aside className="md:sticky md:top-6 md:self-start space-y-3">

                                {/* Profile identity card */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-5">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="relative mb-3">
                                            <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-[2px] border-[#53B175] bg-white">
                                                <img src={userData.image || '/images/profile/sample-profile.png'} alt="Profile" className="w-full h-full object-cover" />
                                            </div>
                                            <button
                                                onClick={() => setIsEditProfileOpen(true)}
                                                className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
                                                title="Edit profile"
                                            >
                                                <Pencil size={11} className="text-gray-400" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1.5 max-w-full">
                                            <h3 className="text-[15px] font-[700] text-[#181725] truncate">{userData.fullName || 'Welcome'}</h3>
                                            {isProfileComplete && <BadgeCheck size={14} className="text-[#53B175] shrink-0" />}
                                        </div>
                                        <p className="text-[11.5px] text-gray-400 font-medium mt-0.5 truncate max-w-full">{userData.email}</p>
                                        {userData.businessName && (
                                            <span className="mt-2 inline-flex items-center text-[10.5px] font-bold text-[#53B175] bg-[#53B175]/10 border border-[#53B175]/15 px-2.5 py-0.5 rounded-full max-w-full truncate">
                                                {userData.businessName}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Grouped nav */}
                                <nav className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-2.5">
                                    <p className="text-[10px] font-[700] text-gray-400 uppercase tracking-[0.12em] px-2 pt-1 pb-1.5">Account</p>
                                    <ul className="space-y-0.5">
                                        {yourInfoItems.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <li key={item.id}>
                                                    <button
                                                        onClick={item.onClick}
                                                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#53B175]/8 text-[#181725] hover:text-[#53B175] transition-colors group cursor-pointer"
                                                    >
                                                        <Icon size={15} className="text-gray-400 group-hover:text-[#53B175] shrink-0" />
                                                        <span className="text-[13px] font-[600] flex-1 text-left">{item.label}</span>
                                                        <ChevronRight size={13} className="text-gray-300 group-hover:text-[#53B175]" />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    <p className="text-[10px] font-[700] text-gray-400 uppercase tracking-[0.12em] px-2 pt-3 pb-1.5">Activity</p>
                                    <ul className="space-y-0.5">
                                        <li>
                                            <button onClick={() => router.push('/orders')} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#53B175]/8 text-[#181725] hover:text-[#53B175] transition-colors group cursor-pointer">
                                                <ShoppingBag size={15} className="text-gray-400 group-hover:text-[#53B175] shrink-0" />
                                                <span className="text-[13px] font-[600] flex-1 text-left">Your Orders</span>
                                                <ChevronRight size={13} className="text-gray-300 group-hover:text-[#53B175]" />
                                            </button>
                                        </li>
                                        <li>
                                            <button onClick={() => router.push('/order-lists')} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#53B175]/8 text-[#181725] hover:text-[#53B175] transition-colors group cursor-pointer">
                                                <ListOrdered size={15} className="text-gray-400 group-hover:text-[#53B175] shrink-0" />
                                                <span className="text-[13px] font-[600] flex-1 text-left">Quick Order Lists</span>
                                                <ChevronRight size={13} className="text-gray-300 group-hover:text-[#53B175]" />
                                            </button>
                                        </li>
                                        <li>
                                            <button onClick={() => router.push('/vendors')} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#53B175]/8 text-[#181725] hover:text-[#53B175] transition-colors group cursor-pointer">
                                                <Store size={15} className="text-gray-400 group-hover:text-[#53B175] shrink-0" />
                                                <span className="text-[13px] font-[600] flex-1 text-left">My Vendors</span>
                                                <ChevronRight size={13} className="text-gray-300 group-hover:text-[#53B175]" />
                                            </button>
                                        </li>
                                    </ul>

                                    <p className="text-[10px] font-[700] text-gray-400 uppercase tracking-[0.12em] px-2 pt-3 pb-1.5">Preferences</p>
                                    <ul className="space-y-0.5">
                                        {otherInfoItems.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <li key={item.id}>
                                                    <button
                                                        onClick={item.onClick}
                                                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#53B175]/8 text-[#181725] hover:text-[#53B175] transition-colors group cursor-pointer"
                                                    >
                                                        <Icon size={15} className="text-gray-400 group-hover:text-[#53B175] shrink-0" />
                                                        <span className="text-[13px] font-[600] flex-1 text-left">{item.label}</span>
                                                        <ChevronRight size={13} className="text-gray-300 group-hover:text-[#53B175]" />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </nav>

                                {/* Logout */}
                                <button
                                    onClick={handleLogout}
                                    className="w-full bg-white border border-gray-100 rounded-2xl py-3 text-red-500 font-[700] text-[13px] hover:bg-red-50/40 transition-colors flex items-center justify-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] cursor-pointer"
                                >
                                    <LogOut size={15} />
                                    Logout
                                </button>
                            </aside>

                            {/* RIGHT MAIN — welcome + actions + account snapshot */}
                            <main className="space-y-6">

                                {/* Welcome strip — flat, professional, B2B-friendly */}
                                <div className="bg-white border border-gray-100 rounded-2xl px-6 lg:px-8 py-5 lg:py-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-[10.5px] font-[800] text-[#53B175] uppercase tracking-[0.18em] mb-1">Welcome back</p>
                                        <h2 className="text-[22px] lg:text-[26px] font-black text-[#181725] leading-tight truncate">
                                            {userData.fullName ? `Hi, ${userData.fullName.split(' ')[0]}` : 'Hi there'}
                                        </h2>
                                        <p className="text-[13px] text-gray-500 mt-1.5 truncate">
                                            {userData.businessName
                                                ? `Manage ${userData.businessName}'s procurement from one place.`
                                                : 'Manage your procurement from one place.'}
                                        </p>
                                    </div>
                                    {!isProfileComplete && (
                                        <button
                                            onClick={() => setIsEditProfileOpen(true)}
                                            className="hidden lg:flex items-center gap-2 shrink-0 bg-[#53B175] text-white text-[12px] font-bold px-4 py-2.5 rounded-xl hover:bg-[#469E66] transition-colors cursor-pointer"
                                        >
                                            <Pencil size={13} />
                                            Complete profile
                                        </button>
                                    )}
                                </div>

                                {/* Primary actions — 4 enterprise-style tiles with shared brand accent */}
                                <section>
                                    <div className="flex items-baseline justify-between mb-3 px-1">
                                        <h3 className="text-[15px] font-[700] text-[#181725]">Shortcuts</h3>
                                        <span className="text-[11px] font-medium text-gray-400">Jump back in</span>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                                        {primaryActions.map((action) => {
                                            const Icon = action.icon;
                                            return (
                                                <button
                                                    key={action.id}
                                                    onClick={action.onClick}
                                                    className="group relative text-left bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#53B175]/40 hover:shadow-[0_8px_24px_rgba(83,177,117,0.12)] hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] cursor-pointer overflow-hidden"
                                                >
                                                    <div className="w-11 h-11 rounded-xl bg-[#53B175]/10 text-[#53B175] flex items-center justify-center mb-4 group-hover:bg-[#53B175] group-hover:text-white transition-colors">
                                                        <Icon size={20} strokeWidth={2.3} />
                                                    </div>
                                                    <p className="text-[14px] font-[700] text-[#181725] leading-tight">{action.label}</p>
                                                    <p className="text-[11.5px] text-gray-400 font-medium mt-1">{action.sub}</p>
                                                    <ChevronRight size={16} className="absolute top-5 right-5 text-gray-200 group-hover:text-[#53B175] transition-colors" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Account details snapshot — surfaces business info from existing userData */}
                                <section>
                                    <div className="flex items-baseline justify-between mb-3 px-1">
                                        <h3 className="text-[15px] font-[700] text-[#181725]">Account details</h3>
                                        <button onClick={() => setIsEditProfileOpen(true)} className="text-[12px] font-bold text-[#53B175] hover:text-[#469E66] transition-colors cursor-pointer">
                                            Edit
                                        </button>
                                    </div>
                                    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] divide-y divide-gray-50">
                                        <DetailRow icon={Mail} label="Email" value={userData.email || '—'} />
                                        <DetailRow icon={Phone} label="Phone" value={userData.phone || 'Not added'} muted={!userData.phone} />
                                        <DetailRow icon={Building2} label="Business" value={userData.businessName || 'Not added'} muted={!userData.businessName} />
                                        <DetailRow
                                            icon={MapPin}
                                            label="Default delivery"
                                            value={userData.address || 'No address saved'}
                                            sub={defaultLocation || undefined}
                                            muted={!userData.address}
                                        />
                                    </div>
                                </section>

                            </main>
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

            {/* Saved Addresses Overlay */}
            <SavedAddressesOverlay
                isOpen={isSavedAddressesOpen}
                onClose={() => setIsSavedAddressesOpen(false)}
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
