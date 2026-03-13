'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, FileText, Shield, HelpCircle, Info, MessageSquare, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeneralInformationOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GeneralInformationOverlay({ isOpen, onClose }: GeneralInformationOverlayProps) {
    if (!isOpen) return null;

    const infoItems = [
        { id: 'about', label: 'About HorecaHub', description: 'Learn more about us', icon: Info, color: 'bg-blue-50 text-blue-500' },
        { id: 'terms', label: 'Terms & Conditions', description: 'Our terms of service', icon: FileText, color: 'bg-orange-50 text-orange-500' },
        { id: 'privacy', label: 'Privacy Policy', description: 'How we handle your data', icon: Shield, color: 'bg-green-50 text-[#53B175]' },
        { id: 'faq', label: 'FAQ', description: 'Frequently asked questions', icon: HelpCircle, color: 'bg-purple-50 text-purple-500' },
        { id: 'feedback', label: 'Send Feedback', description: 'Help us improve', icon: MessageSquare, color: 'bg-pink-50 text-pink-500' },
        { id: 'rate', label: 'Rate Us', description: 'Rate us on the app store', icon: Star, color: 'bg-yellow-50 text-yellow-500' },
    ];

    return (
        <div className="fixed inset-0 z-[14000] bg-[#F2F3F2] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center px-4 py-3 shrink-0 relative bg-white border-b border-gray-50">
                <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 z-10">
                    <ChevronLeft size={20} className="text-[#181725]" />
                </button>
                <h2 className="w-full text-center text-[17px] font-[700] text-[#181725]">General Information</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
                <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm mb-6">
                    {infoItems.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                className={cn(
                                    "w-full flex items-center gap-3.5 px-4 py-4 active:bg-gray-50 transition-colors text-left",
                                    idx < infoItems.length - 1 && "border-b border-gray-50/80"
                                )}
                            >
                                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", item.color)}>
                                    <Icon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-[600] text-[#181725] mb-0.5">{item.label}</p>
                                    <p className="text-[11px] text-[#7C7C7C] font-[400]">{item.description}</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 shrink-0" />
                            </button>
                        );
                    })}
                </div>

                {/* App Version */}
                <div className="text-center pt-4">
                    <p className="text-[11px] text-[#7C7C7C] font-[500]">HorecaHub v2.1.0</p>
                    <p className="text-[10px] text-[#BABABA] font-[400] mt-1">© 2025 HorecaHub. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
