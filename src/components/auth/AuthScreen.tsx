'use client';

import React, { useState } from 'react';
import { X, Smartphone, Eye, EyeOff, ChevronLeft, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthScreenProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'customer' | 'vendor';
}

export function AuthScreen({ isOpen, onClose, initialMode = 'customer' }: AuthScreenProps) {
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
    const [userRole, setUserRole] = useState<'customer' | 'vendor'>(initialMode);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Field state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');
    const [pincode, setPincode] = useState('');
    const [city, setCity] = useState('');

    if (!isOpen) return null;

    const handleClose = () => {
        onClose();
        // Reset state after closing animation
        setTimeout(() => {
            setStep('form');
            setAuthMode('login');
        }, 300);
    };

    const handleRoleSwitch = () => {
        setUserRole(userRole === 'customer' ? 'vendor' : 'customer');
    };

    const handleNext = () => {
        setErrors({});
        const newErrors: Record<string, string> = {};

        if (authMode === 'login') {
            if (!phoneNumber) newErrors.phone = 'Please fill this field';
        } else {
            // Register validation
            if (!fullName) newErrors.fullName = 'Please fill this field';
            if (!phoneNumber) newErrors.phone = 'Please fill this field';

            if (userRole === 'vendor') {
                if (!businessName) newErrors.businessName = 'Please fill this field';
                if (!email) newErrors.email = 'Please fill this field';
            } else {
                // Customer has address now
                if (!address1) newErrors.address = 'Please fill this field';
                if (!pincode) newErrors.pincode = 'Please fill this field';
                if (!city) newErrors.city = 'Please fill this field';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (authMode === 'register') {
            setStep('otp'); // Now shows for BOTH customer and vendor
        } else {
            handleClose();
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length <= 1) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            // Auto-focus next input
            if (value && index < 3) {
                const nextInput = document.getElementById(`otp-${index + 1}`);
                nextInput?.focus();
            }
        }
    };

    if (step === 'success') {
        return (
            <div className="fixed inset-0 z-[13000] bg-white flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Close Button Top Right */}
                <button
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-full transition-colors z-[10]"
                >
                    <X size={24} className="text-gray-800" />
                </button>

                <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32">
                    {/* Success Icon */}
                    <div className="mb-8">
                        <img
                            src="/images/login/check%20icon.png"
                            alt="Success"
                            className="w-32 h-32 object-contain"
                        />
                    </div>

                    {/* Content */}
                    <h2 className="text-[28px] font-[800] text-gray-800 mb-4 text-center">
                        Register Successful
                    </h2>

                    <p className="text-[15px] text-gray-400 text-center leading-relaxed">
                        {userRole === 'customer'
                            ? "You successfully register with Horeca1 application as Customer."
                            : "Thank you for Choosing us, Our Onboarding Partner will contact you Shortly."
                        }
                    </p>
                </div>
            </div>
        );
    }

    if (step === 'otp') {
        return (
            <div className="fixed inset-0 z-[13000] bg-white flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header with Back Button */}
                <div className="p-6">
                    <button
                        onClick={() => setStep('form')}
                        className="p-2 hover:bg-gray-50 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} className="text-gray-800" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center px-6 pt-12 max-w-sm mx-auto w-full">
                    <h2 className="text-[24px] font-[800] text-gray-800 mb-2">OTP Verification</h2>
                    <p className="text-[14px] text-gray-400 text-center mb-1">
                        Enter The security code we have sent to
                    </p>
                    <div className="flex items-center gap-2 mb-10">
                        <span className="text-[14px] font-bold text-gray-400">+91 {phoneNumber || "6956568958"}</span>
                        <button className="text-[#33a852]">
                            <Pencil size={14} className="stroke-[3px]" />
                        </button>
                    </div>

                    {/* OTP Boxes */}
                    <div className="flex gap-4 mb-12">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`otp-${index}`}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                placeholder="*"
                                className={cn(
                                    "w-[60px] h-[60px] border-2 rounded-lg text-center text-[20px] font-bold outline-none transition-all",
                                    digit ? "border-[#33a852] text-gray-800" : "border-gray-200 text-gray-300 focus:border-[#33a852]"
                                )}
                            />
                        ))}
                    </div>

                    {/* Verify Button */}
                    <button
                        onClick={() => setStep('success')}
                        className="w-full bg-[#33a852] hover:bg-[#2d9448] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-100 active:scale-[0.98] transition-all text-[16px] mb-6"
                    >
                        Verify
                    </button>

                    {/* Resend Footer */}
                    <div className="text-center">
                        <p className="text-[13px] font-bold text-gray-700 mb-1">Don't Receive code?</p>
                        <div className="flex items-center justify-center gap-2">
                            <button className="text-[#33a852] font-bold text-[13px] hover:underline">Resend</button>
                            <span className="text-gray-400 text-[13px] font-bold">- 00:52</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                                        onChange={(e) => {
                                            setPhoneNumber(e.target.value);
                                            if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                        }}
                                        placeholder=""
                                        className={cn(
                                            "w-full pl-[90px] pr-24 py-4 bg-white border rounded-lg text-sm font-bold outline-none transition-colors",
                                            errors.phone ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                        )}
                                    />
                                    <button className="absolute right-2 bg-[#33a852] text-white text-[11px] font-bold px-3 py-2.5 rounded-md hover:bg-[#2d9448] transition-colors">
                                        Send OTP
                                    </button>
                                </div>
                                {errors.phone && <p className="text-[10px] text-red-500 ml-1 mt-0.5">{errors.phone}</p>}
                            </div>

                            {/* OTP Field (Login Only) */}
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">OTP</label>
                                <input
                                    type="password"
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
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-gray-800 ml-1">Full name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => {
                                        setFullName(e.target.value);
                                        if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                                    }}
                                    placeholder="Enter your name."
                                    className={cn(
                                        "w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors",
                                        errors.fullName ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                    )}
                                />
                                {errors.fullName && <p className="text-[10px] text-red-500 ml-1">{errors.fullName}</p>}
                            </div>

                            {userRole === 'vendor' ? (
                                <>
                                    {/* Vendor: Simple + Business Name + Email */}
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-gray-800 ml-1">Business Name</label>
                                        <input
                                            type="text"
                                            value={businessName}
                                            onChange={(e) => {
                                                setBusinessName(e.target.value);
                                                if (errors.businessName) setErrors(prev => ({ ...prev, businessName: '' }));
                                            }}
                                            placeholder="Enter your restaurant name"
                                            className={cn(
                                                "w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors",
                                                errors.businessName ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                            )}
                                        />
                                        {errors.businessName && <p className="text-[10px] text-red-500 ml-1">{errors.businessName}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-gray-800 ml-1">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                                            }}
                                            placeholder="Enter your email id"
                                            className={cn(
                                                "w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors",
                                                errors.email ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                            )}
                                        />
                                        {errors.email && <p className="text-[10px] text-red-500 ml-1">{errors.email}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-gray-800 ml-1">Phone number</label>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => {
                                                setPhoneNumber(e.target.value);
                                                if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                            }}
                                            placeholder="Enter your Phone no."
                                            className={cn(
                                                "w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors",
                                                errors.phone ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                            )}
                                        />
                                        {errors.phone && <p className="text-[10px] text-red-500 ml-1">{errors.phone}</p>}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Customer: Complex Address - No Business Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-bold text-gray-800 ml-1">Phone number</label>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => {
                                                setPhoneNumber(e.target.value);
                                                if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                            }}
                                            placeholder="Enter your Phone no."
                                            className={cn(
                                                "w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors",
                                                errors.phone ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                            )}
                                        />
                                        {errors.phone && <p className="text-[10px] text-red-500 ml-1">{errors.phone}</p>}
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[12px] font-bold text-gray-800 ml-1">Address</label>
                                        <input
                                            type="text"
                                            value={address1}
                                            onChange={(e) => {
                                                setAddress1(e.target.value);
                                                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                                            }}
                                            placeholder="Enter your address (line -1)"
                                            className={cn(
                                                "w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors",
                                                errors.address ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                            )}
                                        />
                                        <input
                                            type="text"
                                            value={address2}
                                            onChange={(e) => setAddress2(e.target.value)}
                                            placeholder="Enter your address (line -2)"
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#33a852] transition-colors"
                                        />
                                        {errors.address && <p className="text-[10px] text-red-500 ml-1">{errors.address}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-bold text-gray-800 ml-1">Pincode</label>
                                            <input
                                                type="text"
                                                value={pincode}
                                                onChange={(e) => {
                                                    setPincode(e.target.value);
                                                    if (errors.pincode) setErrors(prev => ({ ...prev, pincode: '' }));
                                                }}
                                                placeholder="Enter Pincode"
                                                className={cn(
                                                    "w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors",
                                                    errors.pincode ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                                )}
                                            />
                                            {errors.pincode && <p className="text-[10px] text-red-500 ml-1">{errors.pincode}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-bold text-gray-800 ml-1">City</label>
                                            <input
                                                type="text"
                                                value={city}
                                                onChange={(e) => {
                                                    setCity(e.target.value);
                                                    if (errors.city) setErrors(prev => ({ ...prev, city: '' }));
                                                }}
                                                placeholder="Enter City"
                                                className={cn(
                                                    "w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors",
                                                    errors.city ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                                )}
                                            />
                                            {errors.city && <p className="text-[10px] text-red-500 ml-1">{errors.city}</p>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleNext}
                    className="w-full bg-[#33a852] hover:bg-[#2d9448] text-white font-bold py-4 rounded-lg shadow-lg shadow-green-100 mt-10 active:scale-[0.98] transition-all text-base tracking-wide"
                >
                    {authMode === 'login' ? 'Login' : 'Next'}
                </button>

                {/* Role Switcher for Register Mode */}
                {authMode === 'register' && (
                    <div className="mt-8 shrink-0 pb-10 text-center">
                        <p className="text-[14px] text-gray-500">
                            Onboard as <button onClick={handleRoleSwitch} className="text-[#33a852] font-[800] underline ml-1">
                                {userRole === 'customer' ? 'Vendor.' : 'Customer.'}
                            </button>
                        </p>
                    </div>
                )}

                {/* Role Switcher Commented out as per request */}
                {/* 
                {authMode === 'login' && (
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
                */}
            </div>

            {/* Close button */}
            <button
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={24} />
            </button>
        </div>
    );
}
