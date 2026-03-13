'use client';

import React, { useState } from 'react';
import { ChevronLeft, Gift, Star, Copy, Check, ShoppingBag, Zap, TrendingUp } from 'lucide-react';

interface RewardsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RewardsOverlay({ isOpen, onClose }: RewardsOverlayProps) {
    const [copied, setCopied] = useState(false);
    const referralCode = 'HORECA250';

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard?.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const rewardHistory = [
        { id: '1', title: 'Order #1024 Cashback', points: '+50', date: '12 Mar 2025', type: 'earned' },
        { id: '2', title: 'Referral Bonus', points: '+100', date: '10 Mar 2025', type: 'earned' },
        { id: '3', title: 'Redeemed on Order #1020', points: '-200', date: '8 Mar 2025', type: 'redeemed' },
        { id: '4', title: 'First Order Reward', points: '+150', date: '5 Mar 2025', type: 'earned' },
        { id: '5', title: 'Weekly Shopping Bonus', points: '+75', date: '1 Mar 2025', type: 'earned' },
    ];

    return (
        <div className="fixed inset-0 z-[14000] bg-[#F2F3F2] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center px-4 py-3 shrink-0 relative bg-white border-b border-gray-50">
                <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 z-10">
                    <ChevronLeft size={20} className="text-[#181725]" />
                </button>
                <h2 className="w-full text-center text-[17px] font-[700] text-[#181725]">Rewards</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
                {/* Points Card */}
                <div className="bg-gradient-to-br from-[#53B175] to-[#3a9d5e] rounded-[16px] p-5 text-white mb-5 shadow-lg shadow-green-200/40 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
                    <div className="absolute -right-2 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <Gift size={18} strokeWidth={2.5} />
                            <span className="text-[12px] font-[600] opacity-90 tracking-wide uppercase">Reward Points</span>
                        </div>
                        <div className="text-[36px] font-[800] leading-tight mb-1">175</div>
                        <p className="text-[12px] opacity-80 font-[500]">≈ ₹17.50 cashback value</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white border border-gray-100 rounded-[12px] p-3 text-center shadow-sm">
                        <TrendingUp size={18} className="text-[#53B175] mx-auto mb-1.5" />
                        <div className="text-[16px] font-[800] text-[#181725]">375</div>
                        <div className="text-[10px] text-[#7C7C7C] font-[500]">Total Earned</div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-[12px] p-3 text-center shadow-sm">
                        <ShoppingBag size={18} className="text-orange-400 mx-auto mb-1.5" />
                        <div className="text-[16px] font-[800] text-[#181725]">200</div>
                        <div className="text-[10px] text-[#7C7C7C] font-[500]">Redeemed</div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-[12px] p-3 text-center shadow-sm">
                        <Zap size={18} className="text-yellow-500 mx-auto mb-1.5" />
                        <div className="text-[16px] font-[800] text-[#181725]">5</div>
                        <div className="text-[10px] text-[#7C7C7C] font-[500]">Orders</div>
                    </div>
                </div>

                {/* Referral Code */}
                <div className="bg-white border border-gray-100 rounded-[12px] p-4 shadow-sm mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Star size={16} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-[13px] font-[700] text-[#181725]">Refer & Earn</span>
                    </div>
                    <p className="text-[11px] text-[#7C7C7C] mb-3 leading-relaxed">Share your code with friends and earn 100 points for each successful referral!</p>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#F7F8FA] border border-dashed border-[#53B175]/40 rounded-lg px-4 py-2.5 text-center">
                            <span className="text-[15px] font-[800] text-[#53B175] tracking-[3px]">{referralCode}</span>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="px-4 py-2.5 bg-[#53B175] rounded-lg active:scale-95 transition-all"
                        >
                            {copied ? <Check size={18} className="text-white" /> : <Copy size={18} className="text-white" />}
                        </button>
                    </div>
                </div>

                {/* Transaction History */}
                <div>
                    <h4 className="text-[14px] font-[700] text-[#181725] mb-2 px-1">History</h4>
                    <div className="bg-white border border-gray-100 rounded-[12px] overflow-hidden shadow-sm">
                        {rewardHistory.map((item, idx) => (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between px-4 py-3.5 ${idx < rewardHistory.length - 1 ? 'border-b border-gray-50/80' : ''}`}
                            >
                                <div>
                                    <p className="text-[13px] font-[500] text-[#181725] mb-0.5">{item.title}</p>
                                    <p className="text-[10px] text-[#7C7C7C] font-[500]">{item.date}</p>
                                </div>
                                <span className={`text-[14px] font-[700] ${item.type === 'earned' ? 'text-[#53B175]' : 'text-red-400'}`}>
                                    {item.points}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
