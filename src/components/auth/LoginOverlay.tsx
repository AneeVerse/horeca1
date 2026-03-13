'use client';

import React, { useState } from 'react';
import { X, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export function LoginOverlay({ isOpen, onClose, onLoginSuccess }: LoginOverlayProps) {
    const [phoneNumber, setPhoneNumber] = useState('7777777777');
    const [otp, setOtp] = useState('777777');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = () => {
        setErrors({});
        const newErrors: Record<string, string> = {};

        if (!phoneNumber || phoneNumber.length < 10) {
            newErrors.phone = 'Enter a valid 10-digit number';
        }
        if (!otp || otp.length < 6) {
            newErrors.otp = 'Enter a valid 6-digit OTP';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        // Simulate login
        setTimeout(() => {
            setIsSubmitting(false);
            onLoginSuccess();
        }, 600);
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

                    {/* Phone Number Field */}
                    <div className="space-y-1.5 mb-4">
                        <label className="text-[12px] font-bold text-gray-500 ml-1 tracking-tight">Phone number</label>
                        <div className="relative flex items-center">
                            <div className="absolute left-4 flex items-center gap-2 text-gray-400">
                                <Smartphone size={16} className="text-[#53B175]" />
                                <span className="text-[13px] font-bold border-r border-gray-200 pr-2">+91</span>
                            </div>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => {
                                    setPhoneNumber(e.target.value);
                                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                }}
                                maxLength={10}
                                className={cn(
                                    "w-full pl-[85px] pr-4 py-3.5 bg-[#F7F8FA] border rounded-xl text-[14px] font-bold outline-none transition-all",
                                    errors.phone ? "border-red-400 bg-red-50/50" : "border-gray-100 focus:border-[#53B175] focus:bg-white"
                                )}
                            />
                        </div>
                        {errors.phone && <p className="text-[10px] text-red-500 ml-1">{errors.phone}</p>}
                    </div>

                    {/* OTP Field */}
                    <div className="space-y-1.5 mb-6">
                        <label className="text-[12px] font-bold text-gray-500 ml-1 tracking-tight">OTP</label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => {
                                setOtp(e.target.value);
                                if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
                            }}
                            maxLength={6}
                            className={cn(
                                "w-full px-4 py-3.5 bg-[#F7F8FA] border rounded-xl text-[14px] font-bold tracking-[6px] outline-none transition-all",
                                errors.otp ? "border-red-400 bg-red-50/50" : "border-gray-100 focus:border-[#53B175] focus:bg-white"
                            )}
                        />
                        {errors.otp && <p className="text-[10px] text-red-500 ml-1">{errors.otp}</p>}
                    </div>

                    {/* Submit Button */}
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
                                Verifying...
                            </span>
                        ) : (
                            'Login'
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}
