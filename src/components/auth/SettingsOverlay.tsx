'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Globe, Moon, Type, Trash2, LogOut, ShieldCheck, X } from 'lucide-react';
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
        <div className="fixed inset-0 z-[14000] flex items-start justify-center animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="w-full h-full md:h-auto md:max-h-[90vh] md:w-[600px] md:mt-[5vh] md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 bg-[#F2F3F2] md:bg-white flex flex-col animate-in slide-in-from-right md:slide-in-from-bottom md:zoom-in-95 duration-300 relative z-10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center px-4 md:px-6 py-3 md:py-4 shrink-0 relative bg-white border-b border-gray-100">
                    <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 md:hidden z-10">
                        <ChevronLeft size={20} className="text-[#181725]" />
                    </button>
                    <h2 className="w-full text-center md:text-left text-[17px] md:text-[20px] font-[700] text-[#181725]">Settings</h2>
                    <button onClick={onClose} className="hidden md:flex p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 z-10">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 md:pt-6 pb-8">
                    {/* Appearance Section */}
                    <div className="mb-8">
                        <h4 className="text-[14px] md:text-[16px] font-[700] text-[#181725] mb-2 px-1">Appearance</h4>
                        <div className="bg-white md:bg-gray-50/80 border border-gray-100 rounded-[12px] md:rounded-2xl overflow-hidden shadow-sm">
                            {/* Dark Mode */}
                            <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-5 border-b border-gray-50/80">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-gray-800 flex items-center justify-center">
                                        <Moon size={16} className="text-white md:w-5 md:h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] md:text-[15px] font-[600] text-[#181725]">Dark Mode</p>
                                        <p className="text-[11px] md:text-[13px] text-[#7C7C7C] font-[400]">Reduce eye strain at night</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className={cn(
                                        "w-[44px] md:w-[52px] h-[24px] md:h-[28px] rounded-full relative transition-colors duration-300 shrink-0",
                                        darkMode ? "bg-[#53B175]" : "bg-gray-200"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-[20px] md:w-[24px] h-[20px] md:h-[24px] bg-white rounded-full shadow-md absolute top-[2px] transition-all duration-300",
                                            darkMode ? "left-[22px] md:left-[26px]" : "left-[2px]"
                                        )}
                                    />
                                </button>
                            </div>

                            {/* Font Size */}
                            <div className="px-4 py-4 md:px-5 md:py-5 border-b border-gray-50/80">
                                <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-blue-50 flex items-center justify-center">
                                        <Type size={16} className="text-blue-500 md:w-5 md:h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] md:text-[15px] font-[600] text-[#181725]">Font Size</p>
                                        <p className="text-[11px] md:text-[13px] text-[#7C7C7C] font-[400]">Adjust text size for readability</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-12 md:ml-15">
                                    {(['small', 'medium', 'large'] as const).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setFontSize(size)}
                                            className={cn(
                                                "flex-1 py-1.5 md:py-2.5 rounded-lg md:rounded-xl text-[11px] md:text-[13px] font-[700] capitalize transition-all border",
                                                fontSize === size
                                                    ? "bg-[#53B175] text-white border-[#53B175]"
                                                    : "bg-white text-[#181725] border-gray-200 md:hover:border-gray-300"
                                            )}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Language */}
                            <div className="px-4 py-4 md:px-5 md:py-5">
                                <button
                                    onClick={() => setShowLangPicker(!showLangPicker)}
                                    className="w-full flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-green-50 flex items-center justify-center">
                                            <Globe size={16} className="text-[#53B175] md:w-5 md:h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[13px] md:text-[15px] font-[600] text-[#181725]">Language</p>
                                            <p className="text-[11px] md:text-[13px] text-[#7C7C7C] font-[400]">{language}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className={cn("text-gray-300 transition-transform", showLangPicker && "rotate-90")} />
                                </button>

                                {showLangPicker && (
                                    <div className="mt-3 md:mt-4 ml-12 md:ml-15 space-y-1 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
                                        {languages.map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => { setLanguage(lang); setShowLangPicker(false); }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl text-[12px] md:text-[14px] font-[600] transition-colors",
                                                    language === lang
                                                        ? "bg-[#E8F5E9] text-[#53B175]"
                                                        : "text-[#181725] md:hover:bg-white"
                                                )}
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Account Section */}
                    <div>
                        <h4 className="text-[14px] md:text-[16px] font-[700] text-[#181725] mb-2 px-1">Account & Security</h4>
                        <div className="bg-white md:bg-gray-50/80 border border-gray-100 rounded-[12px] md:rounded-2xl overflow-hidden shadow-sm">
                            <button className="w-full flex items-center gap-3 md:gap-4 px-4 py-4 md:px-5 md:py-5 active:bg-gray-100 md:hover:bg-white transition-colors text-left border-b border-gray-50/80">
                                <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-[#E8F5E9] flex items-center justify-center">
                                    <ShieldCheck size={16} className="text-[#53B175] md:w-5 md:h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] md:text-[15px] font-[600] text-[#181725]">Change Password</p>
                                    <p className="text-[11px] md:text-[13px] text-[#7C7C7C] font-[400]">Update your security credentials</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </button>
                            <button className="w-full flex items-center gap-3 md:gap-4 px-4 py-4 md:px-5 md:py-5 active:bg-gray-100 md:hover:bg-white transition-colors text-left border-b border-gray-50/80">
                                <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-orange-50 flex items-center justify-center">
                                    <Trash2 size={16} className="text-orange-500 md:w-5 md:h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] md:text-[15px] font-[600] text-[#181725]">Clear Cache</p>
                                    <p className="text-[11px] md:text-[13px] text-[#7C7C7C] font-[400]">Free up storage space</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </button>
                            <button className="w-full flex items-center gap-3 md:gap-4 px-4 py-4 md:px-5 md:py-5 active:bg-red-50/30 md:hover:bg-red-50/20 transition-colors text-left">
                                <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-red-50 flex items-center justify-center">
                                    <LogOut size={16} className="text-red-500 md:w-5 md:h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] md:text-[15px] font-[600] text-red-500">Delete Account</p>
                                    <p className="text-[11px] md:text-[13px] text-[#7C7C7C] font-[400]">Permanently remove your data</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
