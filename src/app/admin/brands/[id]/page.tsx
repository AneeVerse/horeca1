'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { CategoryMultiPicker } from '@/components/features/brand/CategoryMultiPicker';
import { ImageUploadField } from '@/components/ui/ImageUploadField';

interface Brand {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    website: string | null;
    tagline: string | null;
    categories: string[];
    bgColor: string | null;
    showcaseImages: string[];
    brandTier: string | null;
    marketplaceVisibility: string | null;
    creditSupport: boolean | null;
    leadStatus: string | null;
    approvalStatus: string;
    isActive: boolean;
    user: { id: string; fullName: string; email: string };
    _count: { masterProducts: number; productMappings: number };
}



export default function AdminBrandEditPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params.id;

    const [brand, setBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: '',
        tagline: '',
        description: '',
        website: '',
        logoUrl: null as string | null,
        bannerUrl: null as string | null,
        categories: [] as string[],
        bgColor: '#f0faf4' as string,
        showcaseImages: [] as string[],
        brandTier: '',
        marketplaceVisibility: '',
        creditSupport: false,
        leadStatus: '',
    });

    useEffect(() => {
        fetch(`/api/v1/admin/brands/${id}`)
            .then(r => r.json())
            .then(d => {
                const b: Brand = d.data;
                setBrand(b);
                setForm({
                    name: b.name,
                    tagline: b.tagline ?? '',
                    description: b.description ?? '',
                    website: b.website ?? '',
                    logoUrl: b.logoUrl,
                    bannerUrl: b.bannerUrl,
                    categories: b.categories ?? [],
                    bgColor: b.bgColor ?? '#f0faf4',
                    showcaseImages: b.showcaseImages ?? [],
                    brandTier: b.brandTier ?? '',
                    marketplaceVisibility: b.marketplaceVisibility ?? '',
                    creditSupport: b.creditSupport ?? false,
                    leadStatus: b.leadStatus ?? '',
                });
            })
            .catch(() => toast.error('Failed to load brand'))
            .finally(() => setLoading(false));
    }, [id]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/v1/admin/brands/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name || undefined,
                    tagline: form.tagline || null,
                    description: form.description || null,
                    website: form.website || null,
                    logoUrl: form.logoUrl,
                    bannerUrl: form.bannerUrl,
                    categories: form.categories,
                    bgColor: form.bgColor,
                    showcaseImages: form.showcaseImages,
                    brandTier: form.brandTier || null,
                    marketplaceVisibility: form.marketplaceVisibility || null,
                    creditSupport: form.creditSupport,
                    leadStatus: form.leadStatus || null,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Save failed');
            toast.success('Brand saved');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[#53B175]" />
            </div>
        );
    }

    if (!brand) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Brand not found</div>;
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA]">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()}
                            className="p-2.5 hover:bg-gray-100 rounded-2xl transition-colors">
                            <ChevronLeft size={20} className="text-gray-700" />
                        </button>
                        <div>
                            <h1 className="text-[18px] font-extrabold text-[#1A1C1E]">{brand.name}</h1>
                            <p className="text-[12px] text-gray-400">{brand.user.email} · {brand.approvalStatus}</p>
                        </div>
                    </div>
                    <button onClick={save} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#53B175] text-white text-[14px] font-bold rounded-2xl hover:bg-[#3d9e5f] transition-colors disabled:opacity-60">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-32 space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Master Products', value: brand._count.masterProducts },
                        { label: 'Mapped Products', value: brand._count.productMappings },
                        { label: 'Status', value: brand.approvalStatus },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                            <p className="text-[22px] font-black text-[#181725]">{s.value}</p>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Basic info */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="text-[15px] font-bold text-[#181725]">Brand Info</h2>
                    {[
                        { key: 'name', label: 'Brand Name', placeholder: 'e.g. Amul' },
                        { key: 'tagline', label: 'Tagline', placeholder: 'e.g. The Taste of India' },
                        { key: 'website', label: 'Website', placeholder: 'https://amul.com' },
                    ].map(f => (
                        <div key={f.key} className="space-y-1">
                            <label className="text-[13px] font-semibold text-gray-700">{f.label}</label>
                            <input
                                type="text"
                                value={(form as Record<string, unknown>)[f.key] as string}
                                onChange={(e) => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                placeholder={f.placeholder}
                                className="w-full text-[13px] border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#53B175]/30"
                            />
                        </div>
                    ))}
                    <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-gray-700">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                            rows={3}
                            placeholder="Short brand description…"
                            className="w-full text-[13px] border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#53B175]/30 resize-none"
                        />
                    </div>
                </div>

                {/* Images — each upload opens an editor modal with crop + zoom + live preview */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                    <h2 className="text-[15px] font-bold text-[#181725]">Images</h2>
                    <p className="text-[12px] text-gray-500 -mt-4">After upload, an editor opens so you can set the focal point and zoom — the part that stays visible after the site auto-crops.</p>
                    <div className="grid md:grid-cols-2 gap-6">
                        <ImageUploadField
                            label="Brand Logo"
                            value={form.logoUrl}
                            onChange={(url) => setForm(p => ({ ...p, logoUrl: url }))}
                            folder="brands"
                            aspectHint="Square PNG/WebP recommended (200×200 px)"
                            variant="brand-logo"
                        />
                        <ImageUploadField
                            label="Banner / Store Header"
                            value={form.bannerUrl}
                            onChange={(url) => setForm(p => ({ ...p, bannerUrl: url }))}
                            folder="brands"
                            aspectHint="Wide hero — 1600×400 px recommended (4:1 ratio). Renders at up to 1440×320 on desktop."
                            variant="brand-banner"
                        />
                    </div>
                    <ImageUploadField
                        label="Card Banner Image"
                        value={form.showcaseImages[0] ?? null}
                        onChange={(url) => setForm(p => ({ ...p, showcaseImages: url ? [url] : [] }))}
                        folder="brands"
                        aspectHint="Shows on the brand card top section (220×160 area)"
                        variant="brand-card-top"
                    />
                </div>

                {/* Tier B — admin ops */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                    <h2 className="text-[15px] font-bold text-[#181725]">Admin Operations</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[13px] font-semibold text-gray-700">Brand Tier</label>
                            <select value={form.brandTier} onChange={e => setForm(p => ({ ...p, brandTier: e.target.value }))}
                                className="w-full text-[13px] border border-gray-200 rounded-xl px-3 py-2.5">
                                <option value="">Select tier</option>
                                {['Premium', 'Mid', 'Mass'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[13px] font-semibold text-gray-700">Marketplace Visibility</label>
                            <select value={form.marketplaceVisibility} onChange={e => setForm(p => ({ ...p, marketplaceVisibility: e.target.value }))}
                                className="w-full text-[13px] border border-gray-200 rounded-xl px-3 py-2.5">
                                <option value="">Select visibility</option>
                                {['Public', 'Restricted'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[13px] font-semibold text-gray-700">Lead Status</label>
                            <select value={form.leadStatus} onChange={e => setForm(p => ({ ...p, leadStatus: e.target.value }))}
                                className="w-full text-[13px] border border-gray-200 rounded-xl px-3 py-2.5">
                                <option value="">Select status</option>
                                {['Lead', 'Contacted', 'Active'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 pt-6">
                            <input type="checkbox" checked={form.creditSupport}
                                onChange={e => setForm(p => ({ ...p, creditSupport: e.target.checked }))}
                                className="accent-[#299E60] w-4 h-4" />
                            Credit support enabled
                        </label>
                    </div>
                </div>

                {/* Categories */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <CategoryMultiPicker
                        value={form.categories}
                        onChange={(cats) => setForm(p => ({ ...p, categories: cats }))}
                        endpoint="/api/v1/admin/categories"
                        helper="Pick from existing categories. New ones added here are auto-approved (admin)."
                    />
                </div>
            </div>
        </div>
    );
}
