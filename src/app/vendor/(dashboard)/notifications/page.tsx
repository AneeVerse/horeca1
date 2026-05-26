'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Loader2, CheckCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendorNotification {
    id: string;
    type: string;
    title: string | null;
    body: string | null;
    status: string;
    readAt: string | null;
    createdAt: string;
    referenceId: string | null;
    referenceType: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeColor(type: string) {
    if (type.includes('Order')) return 'bg-blue-50 text-blue-600';
    if (type.includes('Low') || type.includes('Stock')) return 'bg-amber-50 text-amber-600';
    if (type.includes('Payment') || type.includes('Credit')) return 'bg-[#EEF8F1] text-[#299E60]';
    if (type.includes('Cancel') || type.includes('Reject')) return 'bg-[#FFF0F0] text-[#E74C3C]';
    return 'bg-[#F5F5F5] text-[#7C7C7C]';
}

function relativeTime(isoStr: string) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorNotificationsPage() {
    const [notifications, setNotifications] = useState<VendorNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [markingRead, setMarkingRead] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/vendor/notifications');
            const json = await res.json();
            if (json.success) {
                setNotifications(json.data.notifications);
                setUnreadCount(json.data.unreadCount);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const markAllRead = async () => {
        if (unreadCount === 0) return;
        setMarkingRead(true);
        try {
            await fetch('/api/v1/vendor/notifications', { method: 'PATCH' });
            setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
            setUnreadCount(0);
        } catch (err) {
            console.error(err);
        } finally {
            setMarkingRead(false);
        }
    };

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[24px] font-bold text-[#181725]">Notifications</h1>
                    <p className="text-[12px] text-[#AEAEAE]">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        disabled={markingRead}
                        className="h-[36px] px-4 rounded-[10px] border border-[#EEEEEE] bg-white text-[12px] font-bold text-[#7C7C7C] hover:bg-[#F5F5F5] transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {markingRead ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                        Mark all read
                    </button>
                )}
            </div>

            {/* Notification feed */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-[#299E60]" size={28} />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-16 text-center">
                        <Bell size={36} className="text-[#E5E7EB] mx-auto mb-3" />
                        <p className="text-[14px] font-bold text-[#AEAEAE]">No notifications yet</p>
                        <p className="text-[12px] text-[#AEAEAE] mt-1">Order events, low-stock alerts, and payment updates will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#F5F5F5]">
                        {notifications.map(n => (
                            <div
                                key={n.id}
                                className={cn(
                                    'flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[#FAFAFA]',
                                    !n.readAt && 'bg-blue-50/20'
                                )}
                            >
                                {/* Type dot */}
                                <div className={cn('mt-0.5 w-8 h-8 rounded-[8px] shrink-0 flex items-center justify-center text-[10px] font-bold uppercase', typeColor(n.type))}>
                                    {n.type.slice(0, 2)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className={cn('text-[13px] leading-snug', n.readAt ? 'text-[#7C7C7C]' : 'font-bold text-[#181725]')}>
                                            {n.title ?? n.type}
                                        </p>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {!n.readAt && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                                            <span className="text-[11px] text-[#AEAEAE]">{relativeTime(n.createdAt)}</span>
                                        </div>
                                    </div>
                                    {n.body && (
                                        <p className="text-[12px] text-[#AEAEAE] mt-0.5 line-clamp-2">{n.body}</p>
                                    )}
                                    {n.status === 'failed' && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <AlertCircle size={11} className="text-[#E74C3C]" />
                                            <span className="text-[10px] text-[#E74C3C] font-bold">Delivery failed</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
