'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signIn } from 'next-auth/react';

interface LoginOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export function LoginOverlay({ isOpen, onClose, onLoginSuccess }: LoginOverlayProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setErrors({});
        setApiError('');
        const newErrors: Record<string, string> = {};

        if (!email) {
            newErrors.email = 'Email is required';
        }
        if (!password) {
            newErrors.password = 'Password is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setApiError('Invalid email or password. Please try again.');
            } else {
                onLoginSuccess();
            }
        } catch {
            setApiError('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[13000] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-[13001] animate-in slide-in-from-bottom duration-300">
                <div className="bg-white rounded-t-[28px] px-6 pt-4 pb-8 max-w-md mx-auto w-full shadow-2xl">
                    {/* Handle */}
                    <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[20px] font-[800] text-[#181725]">Quick Login</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* API Error */}
                    {apiError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-[13px] text-red-600 font-medium">
                            {apiError}
                        </div>
                    )}

                    {/* Email Field */}
                    <div className="space-y-1.5 mb-4">
                        <label className="text-[12px] font-bold text-gray-500 ml-1 tracking-tight">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#53B175]" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                                }}
                                placeholder="Enter your email"
                                className={cn(
                                    "w-full pl-11 pr-4 py-3.5 bg-[#F7F8FA] border rounded-xl text-[14px] font-bold outline-none transition-all",
                                    errors.email ? "border-red-400 bg-red-50/50" : "border-gray-100 focus:border-[#53B175] focus:bg-white"
                                )}
                            />
                        </div>
                        {errors.email && <p className="text-[10px] text-red-500 ml-1">{errors.email}</p>}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5 mb-4">
                        <label className="text-[12px] font-bold text-gray-500 ml-1 tracking-tight">Password</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#53B175]" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                                }}
                                placeholder="Enter your password"
                                className={cn(
                                    "w-full pl-11 pr-12 py-3.5 bg-[#F7F8FA] border rounded-xl text-[14px] font-bold outline-none transition-all",
                                    errors.password ? "border-red-400 bg-red-50/50" : "border-gray-100 focus:border-[#53B175] focus:bg-white"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password && <p className="text-[10px] text-red-500 ml-1">{errors.password}</p>}
                    </div>



                    {/* Login Buttons */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={cn(
                                "w-full bg-[#53B175] text-white font-bold py-4 rounded-xl shadow-lg shadow-green-100 active:scale-[0.98] transition-all text-[15px]",
                                isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-[#48a068]"
                            )}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                'Login'
                            )}
                        </button>


                    </div>

                    {/* Register hint */}
                    <p className="text-[13px] text-gray-400 text-center mt-5">
                        Don&apos;t have an account?{' '}
                        <button
                            onClick={() => {
                                onClose();
                                onLoginSuccess();
                            }}
                            className="text-[#53B175] font-bold"
                        >
                            Register
                        </button>
                    </p>
                </div>
            </div>
        </>
    );
}
