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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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

    const [userData, setUserData] = useState({
        fullName: 'Alex Mordoti',
        phone: '88678 68776',
        businessName: 'XYZ FoodTi',
        address: 'S60, Fz. Chowk, Thane',
        address2: 'New Mumbai, aharashtra',
        pincode: '005425',
        city: 'Thane',
    });

    useEffect(() => {
        const storedPhone = localStorage.getItem('userPhone');
        if (storedPhone) {
            setUserData(prev => ({ ...prev, phone: storedPhone }));
        }
    }, []);

    if (!isOpen) return null;

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userPhone');
        onClose();
        window.location.reload(); // Optional, but good to refresh state
    };

    const topActions = [
        { id: 'reorder', label: 'Reorder', sub: 'From last order', icon: RotateCcw, color: 'bg-blue-50 text-blue-600', onClick: () => { onClose(); router.push('/orders'); } },
        { id: 'quick-order', label: 'Quick Order', sub: 'Order lists', icon: ListOrdered, color: 'bg-purple-50 text-purple-600', onClick: () => { onClose(); router.push('/order-lists'); } },
        { id: 'my-vendors', label: 'My Vendors', sub: 'Saved vendors', icon: Store, color: 'bg-orange-50 text-orange-600', onClick: () => { onClose(); router.push('/vendors'); } },
    ];

    const quickActions = [
        {
            id: 'orders',
            label: 'Your\nOrder',
            icon: ShoppingBag,
        },
        {
            id: 'support',
            label: 'Help &\nSupports',
            icon: HelpCircle,
        },
        {
            id: 'wishlist',
            label: 'Your\nWishlist',
            icon: Heart,
            onClick: () => {
                onClose();
                router.push('/wishlist');
            },
        },
    ];

    const yourInfoItems = [
        { id: 'edit-profile', label: 'Edit Profile', onClick: () => setIsEditProfileOpen(true) },
        { id: 'saved-addresses', label: 'Saved addresses', onClick: () => setIsSavedAddressesOpen(true) },
        { id: 'rewards', label: 'Rewards', onClick: () => setIsRewardsOpen(true) },
        { id: 'payment', label: 'Payment Management', onClick: () => setIsPaymentOpen(true) },
    ];

    const otherInfoItems = [
        { id: 'notifications', label: 'Notification', onClick: () => setIsNotificationOpen(true) },
        { id: 'general', label: 'General Information', onClick: () => setIsGeneralInfoOpen(true) },
        { id: 'settings', label: 'Settings', onClick: () => setIsSettingsOpen(true) },
    ];

    return (
        <>
            <div className="w-full min-h-screen bg-[#F2F3F2] flex flex-col animate-in fade-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center px-4 py-3 shrink-0 relative bg-transparent">
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors absolute left-4 z-10"
                    >
                        <ChevronLeft size={20} className="text-[#181725]" />
                    </button>
                    <h2 className="w-full text-center text-[18px] font-[700] text-[#181725]">Profile</h2>
                </div>

                <div className="flex-1 overflow-y-auto pb-24 px-4 pt-2">
                    {/* User Avatar & Info */}
                    <div className="flex flex-col items-center pb-6">
                        <div className="relative mb-3">
                            <div className="w-[82px] h-[82px] rounded-full overflow-hidden border-[1px] border-[#53B175] bg-white">
                                <img
                                    src="/images/profile/sample-profile.png"
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <button className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
                                <Pencil size={11} className="text-gray-400" />
                            </button>
                        </div>
                        <h3 className="text-[19px] font-[700] text-[#181725] mb-0.5">{userData.fullName}</h3>
                        <p className="text-[12px] text-gray-400 font-medium">+91 {userData.phone}</p>
                    </div>

                    {/* Top Top Actions (Reorder, etc) */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {topActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.id}
                                    onClick={action.onClick}
                                    className="flex flex-col items-center bg-white border border-gray-100 rounded-[15px] py-3 px-1 shadow-sm active:scale-[0.98] transition-all"
                                >
                                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center mb-1.5", action.color)}>
                                        <Icon size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[11px] font-[700] text-[#181725] leading-tight mb-0.5">{action.label}</p>
                                        <p className="text-[8px] text-gray-400 font-medium whitespace-nowrap uppercase tracking-tighter">{action.sub}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Utility Actions */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.id}
                                    onClick={action.onClick}
                                    className="flex flex-col items-center bg-white border border-gray-100 rounded-[12px] py-4 px-1 shadow-sm group active:scale-[0.98] transition-all"
                                >
                                    <div className="mb-3">
                                        <Icon size={20} className="text-[#181725]" strokeWidth={2} />
                                    </div>
                                    <span className="text-[11px] font-[600] text-[#181725] text-center leading-tight whitespace-pre-line px-1">
                                        {action.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Your Information */}
                    <div className="mb-6">
                        <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">Your Infomation</h4>
                        <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm">
                            {yourInfoItems.map((item, idx) => (
                                <button
                                    key={item.id}
                                    onClick={item.onClick}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 group active:bg-gray-50 transition-colors text-left",
                                        idx < yourInfoItems.length - 1 && "border-b border-gray-50/80"
                                    )}
                                >
                                    <span className="text-[13px] font-[500] text-[#181725]">
                                        {item.label}
                                    </span>
                                    <ChevronRight size={16} className="text-gray-400/60" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Other Information */}
                    <div className="mb-8">
                        <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">Other Infomation</h4>
                        <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm">
                            {otherInfoItems.map((item, idx) => (
                                <button
                                    key={item.id}
                                    onClick={item.onClick}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 group active:bg-gray-50 transition-colors text-left",
                                        idx < otherInfoItems.length - 1 && "border-b border-gray-50/80"
                                    )}
                                >
                                    <span className="text-[13px] font-[500] text-[#181725]">
                                        {item.label}
                                    </span>
                                    <ChevronRight size={16} className="text-gray-400/60" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Logout */}
                    <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm mb-12">
                        <button
                            onClick={handleLogout}
                            className="w-full py-3.5 text-center text-red-500 font-[700] text-[15px] active:bg-red-50/30 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Profile Overlay */}
            <EditProfileOverlay
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                userData={userData}
                onSave={(data) => setUserData(data)}
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
