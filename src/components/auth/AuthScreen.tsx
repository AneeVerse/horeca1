'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, ChevronLeft, Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signIn } from 'next-auth/react';

interface AuthScreenProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess?: () => void;
    initialMode?: 'customer' | 'vendor';
}

export function AuthScreen({ isOpen, onClose, onLoginSuccess, initialMode = 'customer' }: AuthScreenProps) {
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [userRole, setUserRole] = useState<'customer' | 'vendor'>(initialMode);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [apiError, setApiError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Login fields
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register fields
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [pincode, setPincode] = useState('');

    if (!isOpen) return null;

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setStep('form');
            setAuthMode('login');
            setApiError('');
            setErrors({});
        }, 300);
    };

    const handleRoleSwitch = () => {
        setUserRole(userRole === 'customer' ? 'vendor' : 'customer');
    };

    // ── LOGIN: Uses Auth.js signIn with credentials ──
    const handleLogin = async () => {
        setErrors({});
        setApiError('');
        const newErrors: Record<string, string> = {};

        if (!loginEmail) newErrors.email = 'Email is required';
        if (!loginPassword) newErrors.password = 'Password is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        try {
            const result = await signIn('credentials', {
                email: loginEmail,
                password: loginPassword,
                redirect: false,
            });

            if (result?.error) {
                setApiError('Invalid email or password. Please try again.');
            } else {
                // Login successful — Auth.js session is now active
                if (onLoginSuccess) onLoginSuccess();
                handleClose();
            }
        } catch {
            setApiError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── REGISTER: Calls signup API, then auto-logs in ──
    const handleRegister = async () => {
        setErrors({});
        setApiError('');
        const newErrors: Record<string, string> = {};

        if (!fullName) newErrors.fullName = 'Name is required';
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        if (password && password.length < 6) newErrors.password = 'Min 6 characters';
        if (!phoneNumber) newErrors.phone = 'Phone is required';
        if (userRole === 'vendor' && !businessName) newErrors.businessName = 'Business name is required';
        if (userRole === 'customer' && !pincode) newErrors.pincode = 'Pincode is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        try {
            // Step 1: Call signup API
            const res = await fetch('/api/v1/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    fullName,
                    phone: `+91${phoneNumber.replace(/^\+91/, '')}`,
                    role: userRole,
                    pincode: pincode || '400001',
                    businessName: businessName || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setApiError(data.error?.message || 'Registration failed. Please try again.');
                return;
            }

            // Step 2: Auto-login after successful signup
            const loginResult = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (loginResult?.error) {
                // Signup succeeded but auto-login failed — show success anyway
                setStep('success');
            } else {
                if (onLoginSuccess) onLoginSuccess();
                handleClose();
            }
        } catch {
            setApiError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = () => {
        if (authMode === 'login') {
            handleLogin();
        } else {
            handleRegister();
        }
    };

    // ── SUCCESS SCREEN ──
    if (step === 'success') {
        return (
            <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-white md:bg-black/50 md:backdrop-blur-sm animate-in fade-in duration-300"
                onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
            >
                <div className="relative w-full h-full flex flex-col bg-white md:w-auto md:h-auto md:max-w-[460px] md:rounded-[20px] md:shadow-2xl md:mx-4 animate-in zoom-in duration-300">
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-full transition-colors z-[10]"
                    >
                        <X size={24} className="text-gray-800" />
                    </button>

                    <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32 md:py-12 md:pb-12">
                        <div className="mb-8">
                            <img
                                src="/images/login/check%20icon.png"
                                alt="Success"
                                className="w-32 h-32 object-contain"
                            />
                        </div>
                        <h2 className="text-[28px] font-[800] text-gray-800 mb-4 text-center">
                            Register Successful
                        </h2>
                        <p className="text-[15px] text-gray-400 text-center leading-relaxed">
                            {userRole === 'customer'
                                ? "Your account has been created. You can now login with your email and password."
                                : "Thank you for choosing us. Our onboarding partner will contact you shortly."
                            }
                        </p>
                        <button
                            onClick={() => { setAuthMode('login'); setStep('form'); }}
                            className="mt-8 bg-[#33a852] hover:bg-[#2d9448] text-white font-bold py-3 px-8 rounded-xl transition-all"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── MAIN FORM ──
    return (
        <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-white md:bg-black/50 md:backdrop-blur-sm animate-in fade-in duration-300"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="relative w-full h-full flex flex-col bg-white md:w-auto md:h-auto md:max-w-[460px] md:rounded-[20px] md:shadow-2xl md:mx-4 md:max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            {/* Header / Logo */}
            <div className="flex flex-col items-center pt-20 pb-8 md:pt-10 md:pb-6 shrink-0">
                <h1 className="text-[34px] font-[900] tracking-tight flex items-center justify-center">
                    <span className="text-[#ee2c2c]">Horeca</span>
                    <span className="text-[#1a237e]">1</span>
                </h1>
            </div>

            <div className="flex-1 flex flex-col px-6 max-w-sm mx-auto w-full overflow-y-auto pb-6 md:px-8 md:pb-8">
                <h2 className="text-[22px] font-bold text-gray-800 mb-6 shrink-0">
                    {authMode === 'login' ? 'Login to your Account' : 'Create your Account'}
                </h2>

                {/* Login/Register Toggle */}
                <div className="flex p-0.5 bg-[#f8f9fa] rounded-lg border border-gray-100 mb-6 overflow-hidden shrink-0">
                    <button
                        onClick={() => { setAuthMode('login'); setApiError(''); setErrors({}); }}
                        className={cn(
                            "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
                            authMode === 'login' ? "bg-[#33a852] text-white shadow-md" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setAuthMode('register'); setApiError(''); setErrors({}); }}
                        className={cn(
                            "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
                            authMode === 'register' ? "bg-[#33a852] text-white shadow-md" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Register
                    </button>
                </div>

                {/* API Error */}
                {apiError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-[13px] text-red-600 font-medium">
                        {apiError}
                    </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                    {authMode === 'login' ? (
                        <>
                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">Email</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#33a852]" />
                                    <input
                                        type="email"
                                        value={loginEmail}
                                        onChange={(e) => { setLoginEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
                                        placeholder="Enter your email"
                                        className={cn(
                                            "w-full pl-12 pr-4 py-4 bg-white border rounded-lg text-sm font-bold outline-none transition-colors",
                                            errors.email ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                        )}
                                    />
                                </div>
                                {errors.email && <p className="text-[10px] text-red-500 ml-1 mt-0.5">{errors.email}</p>}
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">Password</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#33a852]" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={loginPassword}
                                        onChange={(e) => { setLoginPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
                                        placeholder="Enter your password"
                                        className={cn(
                                            "w-full pl-12 pr-12 py-4 bg-white border rounded-lg text-sm font-bold outline-none transition-colors",
                                            errors.password ? "border-red-500" : "border-gray-200 focus:border-[#33a852]"
                                        )}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-[10px] text-red-500 ml-1 mt-0.5">{errors.password}</p>}
                            </div>

                            {/* Quick login hint */}
                            <p className="text-[11px] text-gray-400 ml-1">
                                Demo: <span className="font-bold">chef@tajpalace.com</span> / <span className="font-bold">customer123</span>
                            </p>
                        </>
                    ) : (
                        /* ── REGISTER FORM ── */
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-gray-800 ml-1">Full name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' })); }}
                                    placeholder="Enter your name"
                                    className={cn("w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors", errors.fullName ? "border-red-500" : "border-gray-200 focus:border-[#33a852]")}
                                />
                                {errors.fullName && <p className="text-[10px] text-red-500 ml-1">{errors.fullName}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-gray-800 ml-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
                                    placeholder="Enter your email"
                                    className={cn("w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors", errors.email ? "border-red-500" : "border-gray-200 focus:border-[#33a852]")}
                                />
                                {errors.email && <p className="text-[10px] text-red-500 ml-1">{errors.email}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-gray-800 ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
                                        placeholder="Min 6 characters"
                                        className={cn("w-full px-4 pr-12 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors", errors.password ? "border-red-500" : "border-gray-200 focus:border-[#33a852]")}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-[10px] text-red-500 ml-1">{errors.password}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[12px] font-bold text-gray-800 ml-1">Phone number</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => { setPhoneNumber(e.target.value); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })); }}
                                    placeholder="10 digit mobile number"
                                    className={cn("w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors", errors.phone ? "border-red-500" : "border-gray-200 focus:border-[#33a852]")}
                                />
                                {errors.phone && <p className="text-[10px] text-red-500 ml-1">{errors.phone}</p>}
                            </div>

                            {userRole === 'vendor' ? (
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-bold text-gray-800 ml-1">Business Name</label>
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => { setBusinessName(e.target.value); if (errors.businessName) setErrors(prev => ({ ...prev, businessName: '' })); }}
                                        placeholder="Enter your restaurant/business name"
                                        className={cn("w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors", errors.businessName ? "border-red-500" : "border-gray-200 focus:border-[#33a852]")}
                                    />
                                    {errors.businessName && <p className="text-[10px] text-red-500 ml-1">{errors.businessName}</p>}
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-bold text-gray-800 ml-1">Pincode</label>
                                    <input
                                        type="text"
                                        value={pincode}
                                        onChange={(e) => { setPincode(e.target.value); if (errors.pincode) setErrors(prev => ({ ...prev, pincode: '' })); }}
                                        placeholder="Your delivery pincode"
                                        className={cn("w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors", errors.pincode ? "border-red-500" : "border-gray-200 focus:border-[#33a852]")}
                                    />
                                    {errors.pincode && <p className="text-[10px] text-red-500 ml-1">{errors.pincode}</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full bg-[#33a852] hover:bg-[#2d9448] text-white font-bold py-4 rounded-lg shadow-lg shadow-green-100 mt-10 md:mt-8 active:scale-[0.98] transition-all text-base tracking-wide disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading && <Loader2 size={18} className="animate-spin" />}
                    {authMode === 'login' ? 'Login' : 'Create Account'}
                </button>

                {/* Role Switcher */}
                {authMode === 'register' && (
                    <div className="mt-8 shrink-0 pb-10 md:pb-4 text-center">
                        <p className="text-[14px] text-gray-500">
                            Onboard as <button onClick={handleRoleSwitch} className="text-[#33a852] font-[800] underline ml-1">
                                {userRole === 'customer' ? 'Vendor.' : 'Customer.'}
                            </button>
                        </p>
                    </div>
                )}
            </div>

            {/* Close button */}
            <button
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={24} />
            </button>
          </div>
        </div>
    );
}
