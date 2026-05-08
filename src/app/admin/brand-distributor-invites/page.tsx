'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Users, Loader2, Mail, Phone, MapPin, Building2, Clock, Check, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Status = 'pending' | 'contacted' | 'onboarded' | 'declined';

interface Invite {
    id: string;
    contactName: string;
    email: string;
    phone: string | null;
    businessName: string;
    city: string | null;
    pincode: string | null;
    notes: string | null;
    status: Status;
    reviewNote: string | null;
    vendorId: string | null;
    createdAt: string;
    brand: { id: string; name: string; slug: string; logoUrl: string | null };
}

const STATUS_CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pending', bg: '#FFF7E6', text: '#D97706' },
    contacted: { label: 'Contacted', bg: '#EFF6FF', text: '#2563EB' },
    onboarded: { label: 'Onboarded', bg: '#EEF8F1', text: '#2e7d46' },
    declined: { label: 'Declined', bg: '#FEF2F2', text: '#DC2626' },
};

export default function AdminBrandInvitesPage() {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
    const [savingId, setSavingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/v1/admin/brand-distributor-invites');
            const j = await r.json();
            if (j.success) setInvites(j.data.invites ?? []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const updateStatus = async (id: string, status: Status, reviewNote?: string) => {
        setSavingId(id);
        try {
            const r = await fetch(`/api/v1/admin/brand-distributor-invites?id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, ...(reviewNote ? { reviewNote } : {}) }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Update failed');
            toast.success(`Marked as ${status}`);
            await load();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Update failed');
        } finally {
            setSavingId(null);
        }
    };

    const filtered = filterStatus === 'all' ? invites : invites.filter(i => i.status === filterStatus);
    const counts: Record<Status | 'all', number> = {
        all: invites.length,
        pending: invites.filter(i => i.status === 'pending').length,
        contacted: invites.filter(i => i.status === 'contacted').length,
        onboarded: invites.filter(i => i.status === 'onboarded').length,
        declined: invites.filter(i => i.status === 'declined').length,
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA]">
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
                    <Link href="/admin/brands" className="p-2 hover:bg-gray-100 rounded-2xl">
                        <ChevronLeft size={20} className="text-gray-700" />
                    </Link>
                    <div>
                        <h1 className="text-[20px] font-extrabold text-[#1A1C1E] flex items-center gap-2">
                            <Users size={20} className="text-[#53B175]" />
                            Brand Distributor Invites
                        </h1>
                        <p className="text-[12px] text-gray-500">Distributor candidates submitted by brand owners — review and onboard.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-5">
                {/* Filter pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {(['all', 'pending', 'contacted', 'onboarded', 'declined'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={cn(
                                'shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-all flex items-center gap-1.5',
                                filterStatus === s
                                    ? 'bg-[#53B175] border-[#53B175] text-white'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#53B175]/40'
                            )}
                        >
                            {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
                            <span className={cn(
                                'text-[10px] font-black px-1.5 py-0.5 rounded-full',
                                filterStatus === s ? 'bg-white/20' : 'bg-gray-100'
                            )}>
                                {counts[s]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-[#53B175]" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="p-16 text-center">
                            <Users size={32} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-[14px] font-bold text-[#181725]">No invites in this view</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filtered.map(i => {
                                const sc = STATUS_CONFIG[i.status];
                                const isSaving = savingId === i.id;
                                return (
                                    <div key={i.id} className="p-4 flex flex-col md:flex-row gap-4">
                                        {/* Brand badge */}
                                        <div className="flex items-center gap-2 shrink-0 md:w-[160px]">
                                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-50 shrink-0 relative">
                                                {i.brand.logoUrl ? (
                                                    <Image src={i.brand.logoUrl} alt="" fill sizes="32px" className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] font-bold">{i.brand.name[0]}</div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold text-[#181725] truncate">{i.brand.name}</p>
                                                <Link href={`/brand/${i.brand.slug}`} target="_blank"
                                                    className="text-[10px] text-[#53B175] hover:underline">/{i.brand.slug}</Link>
                                            </div>
                                        </div>

                                        {/* Candidate info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2">
                                                <Building2 size={14} className="text-gray-400 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[14px] font-bold text-[#181725] truncate">{i.businessName}</p>
                                                    <p className="text-[12px] text-gray-500">Contact: {i.contactName}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500">
                                                <span className="flex items-center gap-1"><Mail size={11} /> {i.email}</span>
                                                {i.phone && <span className="flex items-center gap-1"><Phone size={11} /> {i.phone}</span>}
                                                {i.city && <span className="flex items-center gap-1"><MapPin size={11} /> {i.city}{i.pincode ? ` · ${i.pincode}` : ''}</span>}
                                                <span className="flex items-center gap-1"><Clock size={11} /> {new Date(i.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                            {i.notes && (
                                                <p className="text-[12px] text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">{i.notes}</p>
                                            )}
                                            {i.reviewNote && (
                                                <p className="text-[12px] text-amber-700 mt-2 bg-amber-50 rounded-lg px-3 py-2 flex items-start gap-1.5">
                                                    <MessageSquare size={12} className="shrink-0 mt-0.5" /> {i.reviewNote}
                                                </p>
                                            )}
                                        </div>

                                        {/* Status + actions */}
                                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                            <span className="px-2.5 py-1 text-[10px] font-[900] rounded-md uppercase tracking-wider"
                                                style={{ backgroundColor: sc.bg, color: sc.text }}>
                                                {sc.label}
                                            </span>
                                            {i.status === 'pending' && (
                                                <>
                                                    <button onClick={() => updateStatus(i.id, 'contacted')} disabled={isSaving}
                                                        className="h-[30px] px-3 bg-[#EFF6FF] text-[#2563EB] rounded-lg text-[11px] font-bold hover:bg-[#2563EB] hover:text-white transition-colors flex items-center gap-1 disabled:opacity-60">
                                                        {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />} Mark contacted
                                                    </button>
                                                    <button onClick={() => updateStatus(i.id, 'declined', prompt('Reason (optional):') ?? undefined)} disabled={isSaving}
                                                        className="h-[30px] px-3 bg-[#FEF2F2] text-[#DC2626] rounded-lg text-[11px] font-bold hover:bg-[#DC2626] hover:text-white transition-colors flex items-center gap-1 disabled:opacity-60">
                                                        <X size={11} /> Decline
                                                    </button>
                                                </>
                                            )}
                                            {i.status === 'contacted' && (
                                                <button onClick={() => updateStatus(i.id, 'onboarded')} disabled={isSaving}
                                                    className="h-[30px] px-3 bg-[#EEF8F1] text-[#2e7d46] rounded-lg text-[11px] font-bold hover:bg-[#53B175] hover:text-white transition-colors flex items-center gap-1 disabled:opacity-60">
                                                    {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Mark onboarded
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
