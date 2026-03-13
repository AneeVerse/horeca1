'use client';

import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NotificationSetting {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
}

export function NotificationOverlay({ isOpen, onClose }: NotificationOverlayProps) {
    const [settings, setSettings] = useState<NotificationSetting[]>([
        { id: 'order-updates', label: 'Order Updates', description: 'Get notified about order status changes', enabled: true },
        { id: 'promotions', label: 'Promotions & Offers', description: 'Receive deals and discount notifications', enabled: true },
        { id: 'price-alerts', label: 'Price Alerts', description: 'Get notified when prices drop on wishlist items', enabled: false },
        { id: 'delivery', label: 'Delivery Updates', description: 'Real-time delivery tracking notifications', enabled: true },
        { id: 'rewards', label: 'Reward Points', description: 'Points earned and redemption updates', enabled: true },
        { id: 'new-products', label: 'New Products', description: 'Get notified about new arrivals', enabled: false },
        { id: 'newsletter', label: 'Newsletter', description: 'Weekly newsletter with tips and recipes', enabled: false },
    ]);

    if (!isOpen) return null;

    const toggleSetting = (id: string) => {
        setSettings(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    };

    return (
        <div className="fixed inset-0 z-[14000] bg-[#F2F3F2] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center px-4 py-3 shrink-0 relative bg-white border-b border-gray-50">
                <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 z-10">
                    <ChevronLeft size={20} className="text-[#181725]" />
                </button>
                <h2 className="w-full text-center text-[17px] font-[700] text-[#181725]">Notification</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
                {/* Push Notifications */}
                <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">Push Notifications</h4>
                <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm mb-6">
                    {settings.slice(0, 4).map((setting, idx) => (
                        <div
                            key={setting.id}
                            className={cn(
                                "flex items-center justify-between px-4 py-4",
                                idx < 3 && "border-b border-gray-50/80"
                            )}
                        >
                            <div className="flex-1 mr-4">
                                <p className="text-[13px] font-[600] text-[#181725] mb-0.5">{setting.label}</p>
                                <p className="text-[11px] text-[#7C7C7C] font-[400] leading-relaxed">{setting.description}</p>
                            </div>
                            <button
                                onClick={() => toggleSetting(setting.id)}
                                className={cn(
                                    "w-[44px] h-[24px] rounded-full relative transition-colors duration-300 shrink-0",
                                    setting.enabled ? "bg-[#53B175]" : "bg-gray-200"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-[20px] h-[20px] bg-white rounded-full shadow-sm absolute top-[2px] transition-all duration-300",
                                        setting.enabled ? "left-[22px]" : "left-[2px]"
                                    )}
                                />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Email & Other */}
                <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">Email & Updates</h4>
                <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm">
                    {settings.slice(4).map((setting, idx) => (
                        <div
                            key={setting.id}
                            className={cn(
                                "flex items-center justify-between px-4 py-4",
                                idx < settings.slice(4).length - 1 && "border-b border-gray-50/80"
                            )}
                        >
                            <div className="flex-1 mr-4">
                                <p className="text-[13px] font-[600] text-[#181725] mb-0.5">{setting.label}</p>
                                <p className="text-[11px] text-[#7C7C7C] font-[400] leading-relaxed">{setting.description}</p>
                            </div>
                            <button
                                onClick={() => toggleSetting(setting.id)}
                                className={cn(
                                    "w-[44px] h-[24px] rounded-full relative transition-colors duration-300 shrink-0",
                                    setting.enabled ? "bg-[#53B175]" : "bg-gray-200"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-[20px] h-[20px] bg-white rounded-full shadow-sm absolute top-[2px] transition-all duration-300",
                                        setting.enabled ? "left-[22px]" : "left-[2px]"
                                    )}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
