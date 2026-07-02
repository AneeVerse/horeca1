'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Loader2, Check, X, Mail, Phone, MapPin, Building2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AuthorizedDistributor {
    id: string;
    vendorId: string;
    status: 'pending' | 'approved' | 'rejected';
    brandApprovedAt: string | null;
    adminApprovedAt: string | null;
    note: string | null;
    vendor: {
        id: string;
        businessName: string;
        slug: string;
        logoUrl: string | null;
        city: string | null;
        _count?: { products: number };
    };
}

interface Invite {
    id: string;
    contactName: string;
    email: string;
    phone: string | null;
    businessName: string;
    city: string | null;
    pincode: string | null;
    notes: string | null;
    status: 'pending' | 'contacted' | 'onboarded' | 'declined';
    reviewNote: string | null;
    createdAt: string;
}

const STATUS_CONFIG: Record<Invite['status'], { label: string; bg: string; text: string }> = {
    pending: { label: 'Pending review', bg: '#FFF7E6', text: '#D97706' },
    contacted: { label: 'Admin contacted', bg: '#EFF6FF', text: '#2563EB' },
    onboarded: { label: 'Onboarded', bg: '#EEF8F1', text: '#2e7d46' },
    declined: { label: 'Declined', bg: '#FEF2F2', text: '#DC2626' },
};

export default function BrandDistributorsPage() {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [distributors, setDistributors] = useState<AuthorizedDistributor[]>([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [actingId, setActingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        contactName: '', email: '', phone: '', businessName: '', city: '', pincode: '', notes: '',
    });
    const [formError, setFormError] = useState<string | null>(null);

    const fetchDistributors = useCallback(async () => {
        try {
            setAuthLoading(true);
            const r = await fetch('/api/v1/brand/authorized-distributors');
            const j = await r.json();
            if (j.success) setDistributors(j.data.distributors ?? []);
        } catch { /* silent */ }
        finally { setAuthLoading(false); }
    }, []);

    const fetchInvites = useCallback(async () => {
        try {
            setLoading(true);
            const r = await fetch('/api/v1/brand/distributor-invites');
            const j = await r.json();
            if (j.success) setInvites(j.data.invites ?? []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchInvites(); fetchDistributors(); }, [fetchInvites, fetchDistributors]);

    const handleDistributorAction = async (vendorId: string, action: 'approve' | 'reject') => {
        setActingId(vendorId);
        try {
            const r = await fetch('/api/v1/brand/authorized-distributors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vendorId, action }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Action failed');
            toast.success(action === 'approve' ? 'Distributor approved — awaiting admin confirmation' : 'Distributor rejected');
            fetchDistributors();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Action failed');
        } finally {
            setActingId(null);
        }
    };

    const submit = async () => {
        setFormError(null);
        if (!form.contactName.trim() || !form.email.trim() || !form.businessName.trim()) {
            setFormError('Contact name, email, and business name are required');
            return;
        }
        if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
            setFormError('Pincode must be 6 digits');
            return;
        }
        setSubmitting(true);
        try {
            const r = await fetch('/api/v1/brand/distributor-invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactName: form.contactName.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim() || undefined,
                    businessName: form.businessName.trim(),
                    city: form.city.trim() || undefined,
                    pincode: form.pincode.trim() || undefined,
                    notes: form.notes.trim() || undefined,
                }),
            });
            const j = await r.json();
            if (!j.success) throw new Error(j.error?.message || 'Submission failed');
            toast.success('Distributor candidate submitted to admin');
            setShowForm(false);
            setForm({ contactName: '', email: '', phone: '', businessName: '', city: '', pincode: '', notes: '' });
            fetchInvites();
        } catch (e: unknown) {
            setFormError(e instanceof Error ? e.message : 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const counts = {
        pending: invites.filter(i => i.status === 'pending').length,
        contacted: invites.filter(i => i.status === 'contacted').length,
        onboarded: invites.filter(i => i.status === 'onboarded').length,
        declined: invites.filter(i => i.status === 'declined').length,
    };

    return (
        <div className="max-w-[900px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight flex items-center gap-2">
                        <Users size={26} className="text-[#53B175]" /> Distributor Network
                    </h1>
                    <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px] max-w-2xl">
                        Submit distributor candidates you want stocking your products. Admin reviews and onboards them — they then list your products and customers can buy in your storefront.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setFormError(null); }}
                    className="h-[40px] px-5 bg-[#53B175] text-white rounded-[12px] text-[13px] font-bold hover:bg-[#3d9e5f] transition-colors flex items-center gap-1.5"
                >
                    <Plus size={14} /> Submit Distributor
                </button>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Pending', value: counts.pending, color: '#D97706', bg: '#FFF7E6' },
                    { label: 'Contacted', value: counts.contacted, color: '#2563EB', bg: '#EFF6FF' },
                    { label: 'Onboarded', value: counts.onboarded, color: '#2e7d46', bg: '#EEF8F1' },
                    { label: 'Declined', value: counts.declined, color: '#DC2626', bg: '#FEF2F2' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-[26px] font-[900]" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5" style={{ color: s.color }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Form modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !submitting && setShowForm(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-[520px] shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div>
                                <h3 className="text-[16px] font-bold text-[#181725]">Submit a distributor candidate</h3>
                                <p className="text-[12px] text-gray-500 mt-0.5">Admin will review and reach out to onboard them.</p>
                            </div>
                            <button onClick={() => !submitting && setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            {[
                                { key: 'contactName', label: 'Contact Name *', placeholder: 'e.g. Rajesh Kumar' },
                                { key: 'email', label: 'Email *', placeholder: 'rajesh@traders.com', type: 'email' },
                                { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
                                { key: 'businessName', label: 'Business Name *', placeholder: 'Kumar Traders Pvt Ltd' },
                                { key: 'city', label: 'City', placeholder: 'Mumbai' },
                                { key: 'pincode', label: 'Pincode (6 digits)', placeholder: '400001' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1 uppercase tracking-wider">{f.label}</label>
                                    <input
                                        type={f.type ?? 'text'}
                                        value={(form as Record<string, string>)[f.key]}
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className="w-full h-[40px] border border-gray-200 rounded-[10px] px-3 text-[13px] outline-none focus:border-[#53B175]/50"
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1 uppercase tracking-wider">Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    rows={2}
                                    placeholder="Why this distributor? Any context for admin?"
                                    className="w-full border border-gray-200 rounded-[10px] px-3 py-2 text-[13px] outline-none focus:border-[#53B175]/50 resize-none"
                                />
                            </div>
                            {formError && <p className="text-[12px] font-bold text-red-600">{formError}</p>}
                        </div>
                        <div className="p-5 pt-0 flex items-center justify-end gap-3">
                            <button onClick={() => !submitting && setShowForm(false)} disabled={submitting}
                                className="h-[38px] px-4 bg-gray-100 text-gray-700 rounded-[10px] text-[13px] font-bold hover:bg-gray-200">
                                Cancel
                            </button>
                            <button onClick={submit} disabled={submitting}
                                className="h-[38px] px-5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-60 flex items-center gap-1.5 hover:bg-[#3d9e5f]">
                                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                {submitting ? 'Submitting…' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Authorized distributors (vendors who mapped your SKUs) */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-[15px] font-bold text-[#181725]">Authorized distributors</h2>
                    <p className="text-[12px] text-gray-500 mt-0.5">Vendors carrying your catalog — approve them so customers see stock on your brand store (admin must also approve).</p>
                </div>
                {authLoading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-[#53B175]" /></div>
                ) : distributors.length === 0 ? (
                    <div className="p-8 text-center text-[13px] text-gray-400">No distributor requests yet — they appear when a vendor maps your SKUs.</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {distributors.map((d) => (
                            <div key={d.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Building2 size={16} className="text-[#53B175] shrink-0" />
                                    <div>
                                        <p className="text-[14px] font-bold text-[#181725]">{d.vendor.businessName}</p>
                                        <p className="text-[11px] text-gray-500">
                                            {d.vendor.city ?? '—'}
                                            {d.vendor._count ? ` · ${d.vendor._count.products} mapped SKU(s)` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn('px-2.5 py-1 text-[10px] font-[900] rounded-md uppercase tracking-wider',
                                        d.status === 'approved' ? 'bg-[#EEF8F1] text-[#2e7d46]'
                                            : d.status === 'pending' ? 'bg-[#FFF7E6] text-[#D97706]'
                                                : 'bg-[#FEF2F2] text-[#DC2626]')}>
                                        {d.status === 'approved' ? 'Live' : d.status === 'pending' ? (d.brandApprovedAt ? 'Awaiting admin' : 'Pending your review') : 'Rejected'}
                                    </span>
                                    {d.status === 'pending' && !d.brandApprovedAt && (
                                        <>
                                            <button onClick={() => handleDistributorAction(d.vendorId, 'approve')} disabled={actingId === d.vendorId}
                                                className="h-[32px] px-3 bg-[#53B175] text-white rounded-[8px] text-[11px] font-bold disabled:opacity-60 flex items-center gap-1">
                                                {actingId === d.vendorId ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                Approve
                                            </button>
                                            <button onClick={() => handleDistributorAction(d.vendorId, 'reject')} disabled={actingId === d.vendorId}
                                                className="h-[32px] px-3 bg-gray-100 text-gray-700 rounded-[8px] text-[11px] font-bold">
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Invites list */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-[15px] font-bold text-[#181725]">Submitted candidates</h2>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-[#53B175]" /></div>
                ) : invites.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users size={32} className="mx-auto text-gray-200 mb-2" />
                        <p className="text-[14px] font-bold text-[#181725]">No distributor candidates submitted yet</p>
                        <p className="text-[12px] text-gray-400 mt-1">Click <strong>Submit Distributor</strong> to introduce one to the admin team.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {invites.map(i => {
                            const sc = STATUS_CONFIG[i.status];
                            return (
                                <div key={i.id} className="p-4">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="flex-1 min-w-[200px]">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} className="text-[#53B175]" />
                                                <p className="text-[14px] font-bold text-[#181725]">{i.businessName}</p>
                                            </div>
                                            <p className="text-[12px] text-gray-500 mt-0.5">Contact: {i.contactName}</p>
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
                                                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                                    Admin note: {i.reviewNote}
                                                </p>
                                            )}
                                        </div>
                                        <span className={cn("px-2.5 py-1 text-[10px] font-[900] rounded-md uppercase tracking-wider")}
                                            style={{ backgroundColor: sc.bg, color: sc.text }}>
                                            {sc.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
