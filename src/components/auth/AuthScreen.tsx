'use client';

import React, { useState } from 'react';
import { X, Smartphone, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthScreenProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'customer' | 'vendor';
}

export function AuthScreen({ isOpen, onClose, initialMode = 'customer' }: AuthScreenProps) {
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [userRole, setUserRole] = useState<'customer' | 'vendor'>(initialMode);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    if (!isOpen) return null;

    const handleRoleSwitch = () => {
        setUserRole(userRole === 'customer' ? 'vendor' : 'customer');
    };

    return (
        <div className="fixed inset-0 z-[13000] bg-white flex flex-col animate-in fade-in slide-in-from-bottom duration-300">
            {/* Header / Logo */}
            <div className="flex flex-col items-center pt-20 pb-8 shrink-0">
                <h1 className="text-[34px] font-[900] tracking-tight flex items-center justify-center">
                    <span className="text-[#ee2c2c]">Horeca</span>
                    <span className="text-[#1a237e]">1</span>
                </h1>
            </div>

            <div className="flex-1 flex flex-col px-6 max-w-sm mx-auto w-full overflow-y-auto pb-6">
                <h2 className="text-[22px] font-bold text-gray-800 mb-6 shrink-0">
                    {authMode === 'login' ? 'Login to your Account' : 'Create your Account'}
                </h2>

                {/* Login/Register Toggle */}
                <div className="flex p-0.5 bg-[#f8f9fa] rounded-lg border border-gray-100 mb-6 overflow-hidden shrink-0">
                    <button
                        onClick={() => setAuthMode('login')}
                        className={cn(
                            "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
                            authMode === 'login' ? "bg-[#33a852] text-white shadow-md" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setAuthMode('register')}
                        className={cn(
                            "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
                            authMode === 'register' ? "bg-[#33a852] text-white shadow-md" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Register
                    </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    {authMode === 'login' ? (
                        <>
                            {/* Phone Number Field */}
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">Phone number</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 flex items-center gap-2 text-gray-400">
                                        <Smartphone size={18} className="text-[#33a852]" />
                                        <span className="text-sm font-bold border-r border-gray-200 pr-2">+91</span>
                                    </div>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder=""
                                        autoComplete="one-time-code"
                                        autoCorrect="off"
                                        spellCheck="false"
                                        data-lpignore="true"
                                        className="w-full pl-[90px] pr-24 py-4 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-[#33a852] transition-colors"
                                    />
                                    <button className="absolute right-2 bg-[#33a852] text-white text-[11px] font-bold px-3 py-2.5 rounded-md hover:bg-[#2d9448] transition-colors">
                                        Send OTP
                                    </button>
                                </div>
                            </div>

                            {/* OTP Field */}
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">OTP</label>
                                <input
                                    type="password"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder=""
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    data-lpignore="true"
                                    className="w-full px-4 py-4 bg-white border border-gray-200 rounded-lg text-sm font-bold tracking-[8px] outline-none focus:border-[#33a852] transition-colors"
                                />
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div
                                        onClick={() => setRememberMe(!rememberMe)}
                                        className={cn(
                                            "w-5 h-5 rounded-[4px] border-2 transition-colors flex items-center justify-center",
                                            rememberMe ? "bg-[#33a852] border-[#33a852]" : "border-gray-100 group-hover:border-gray-200"
                                        )}
                                    >
                                        {rememberMe && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-[12px] font-semibold text-gray-400 tracking-tight">Remember me</span>
                                </label>
                                <button className="text-[12px] font-bold text-[#33a852] hover:underline">
                                    Forgot Password?
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Registration Fields - Role Specific */
                        <div className="space-y-4">
                            {/* Full Name - Common */}
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-gray-800 ml-1">Full name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your name."
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                />
                            </div>

                            {userRole === 'customer' ? (
                                <>
                                    {/* Customer Specific */}
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-gray-800 ml-1">Email</label>
                                        <input
                                            type="email"
                                            placeholder="Enter your email id"
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-gray-800 ml-1">Phone number</label>
                                        <input
                                            type="tel"
                                            placeholder="Enter your Phone no."
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Vendor Specific */}
                                    <div className="space-y-1.5">
                                        <label className="text-[12px) font-bold text-gray-800 ml-1">Business Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter your restaurant name"
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-gray-800 ml-1">Phone number</label>
                                        <input
                                            type="tel"
                                            placeholder="Enter your Phone no."
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[12px] font-bold text-gray-800 ml-1">Address</label>
                                        <input
                                            type="text"
                                            placeholder="Enter your address (line -1)"
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Enter your address (line -2)"
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-bold text-gray-800 ml-1">Pincode</label>
                                            <input
                                                type="text"
                                                placeholder="Enter Pincode"
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-bold text-gray-800 ml-1">City</label>
                                            <input
                                                type="text"
                                                placeholder="Enter City"
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button className="w-full bg-[#33a852] hover:bg-[#2d9448] text-white font-bold py-4 rounded-lg shadow-lg shadow-green-100 mt-10 active:scale-[0.98] transition-all text-base tracking-wide">
                    {authMode === 'login' ? 'Login' : (userRole === 'vendor' ? 'Next' : 'Register')}
                </button>

                {authMode === 'login' && (
                    /* Role Switcher only for Login */
                    <div className="mt-8 shrink-0 pb-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-[1px] flex-1 bg-gray-50" />
                            <span className="text-[12px] font-medium text-gray-300 tracking-tight">Or login with</span>
                            <div className="h-[1px] flex-1 bg-gray-50" />
                        </div>

                        <button
                            onClick={handleRoleSwitch}
                            className="w-full bg-[#f8f9fa] border border-gray-100 py-4 rounded-lg text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100"
                        >
                            Onboard as <span className="text-[#33a852] font-[800] underline ml-1">
                                {userRole === 'customer' ? 'Vendor.' : 'Customer.'}
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-6 left-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={24} />
            </button>
        </div>
    );
}
