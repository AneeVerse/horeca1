'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Globe, Moon, Type, Trash2, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsOverlay({ isOpen, onClose }: SettingsOverlayProps) {
    const [language, setLanguage] = useState('English');
    const [darkMode, setDarkMode] = useState(false);
    const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
    const [showLangPicker, setShowLangPicker] = useState(false);

    if (!isOpen) return null;

    const languages = ['English', 'हिन्दी', 'मराठी', 'தமிழ்', 'తెలుగు'];

    return (
        <div className="fixed inset-0 z-[14000] bg-[#F2F3F2] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center px-4 py-3 shrink-0 relative bg-white border-b border-gray-50">
                <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 z-10">
                    <ChevronLeft size={20} className="text-[#181725]" />
                </button>
                <h2 className="w-full text-center text-[17px] font-[700] text-[#181725]">Settings</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
                {/* Appearance */}
                <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">Appearance</h4>
                <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm mb-6">
                    {/* Dark Mode */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-50/80">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center">
                                <Moon size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[13px] font-[600] text-[#181725]">Dark Mode</p>
                                <p className="text-[11px] text-[#7C7C7C] font-[400]">Reduce eye strain at night</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={cn(
                                "w-[44px] h-[24px] rounded-full relative transition-colors duration-300 shrink-0",
                                darkMode ? "bg-[#53B175]" : "bg-gray-200"
                            )}
                        >
                            <div
                                className={cn(
                                    "w-[20px] h-[20px] bg-white rounded-full shadow-sm absolute top-[2px] transition-all duration-300",
                                    darkMode ? "left-[22px]" : "left-[2px]"
                                )}
                            />
                        </button>
                    </div>

                    {/* Font Size */}
                    <div className="px-4 py-4 border-b border-gray-50/80">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                                <Type size={16} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-[13px] font-[600] text-[#181725]">Font Size</p>
                                <p className="text-[11px] text-[#7C7C7C] font-[400]">Adjust text size for readability</p>
                            </div>
                        </div>
                        <div className="flex gap-2 ml-12">
                            {(['small', 'medium', 'large'] as const).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setFontSize(size)}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-[11px] font-[700] capitalize transition-all border",
                                        fontSize === size
                                            ? "bg-[#53B175] text-white border-[#53B175]"
                                            : "bg-white text-[#181725] border-gray-200"
                                    )}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language */}
                    <div className="px-4 py-4">
                        <button
                            onClick={() => setShowLangPicker(!showLangPicker)}
                            className="w-full flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
                                    <Globe size={16} className="text-[#53B175]" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[13px] font-[600] text-[#181725]">Language</p>
                                    <p className="text-[11px] text-[#7C7C7C] font-[400]">{language}</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className={cn("text-gray-300 transition-transform", showLangPicker && "rotate-90")} />
                        </button>

                        {showLangPicker && (
                            <div className="mt-3 ml-12 space-y-1">
                                {languages.map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => { setLanguage(lang); setShowLangPicker(false); }}
                                        className={cn(
                                            "w-full text-left px-3 py-2.5 rounded-lg text-[12px] font-[600] transition-colors",
                                            language === lang
                                                ? "bg-[#E8F5E9] text-[#53B175]"
                                                : "text-[#181725] hover:bg-gray-50"
                                        )}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Account Actions */}
                <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">Account</h4>
                <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm mb-6">
                    <button className="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors text-left border-b border-gray-50/80">
                        <div className="w-9 h-9 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                            <ShieldCheck size={16} className="text-[#53B175]" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[13px] font-[600] text-[#181725]">Change Password</p>
                            <p className="text-[11px] text-[#7C7C7C] font-[400]">Update your security credentials</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors text-left border-b border-gray-50/80">
                        <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center">
                            <Trash2 size={16} className="text-orange-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[13px] font-[600] text-[#181725]">Clear Cache</p>
                            <p className="text-[11px] text-[#7C7C7C] font-[400]">Free up storage space</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-4 active:bg-red-50/30 transition-colors text-left">
                        <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                            <LogOut size={16} className="text-red-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[13px] font-[600] text-red-500">Delete Account</p>
                            <p className="text-[11px] text-[#7C7C7C] font-[400]">Permanently remove your data</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                    </button>
                </div>

                {/* Version Info */}
                <div className="text-center pt-2">
                    <p className="text-[11px] text-[#7C7C7C] font-[500]">HorecaHub v2.1.0</p>
                </div>
            </div>
        </div>
    );
}
