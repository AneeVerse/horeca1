'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Check, Save } from 'lucide-react';

interface BrandProfile {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    website: string | null;
    approvalStatus: string;
}

export default function BrandSettingsPage() {
    const [profile, setProfile] = useState<BrandProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ name: '', tagline: '', description: '', logoUrl: '', bannerUrl: '', website: '' });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/v1/brand/profile')
            .then(r => r.json())
            .then(json => {
                if (json.success) {
                    setProfile(json.data);
                    setForm({
                        name: json.data.name ?? '',
                        tagline: json.data.tagline ?? '',
                        description: json.data.description ?? '',
                        logoUrl: json.data.logoUrl ?? '',
                        bannerUrl: json.data.bannerUrl ?? '',
                        website: json.data.website ?? '',
                    });
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            const res = await fetch('/api/v1/brand/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name || undefined,
                    tagline: form.tagline || undefined,
                    description: form.description || undefined,
                    logoUrl: form.logoUrl || undefined,
                    bannerUrl: form.bannerUrl || undefined,
                    website: form.website || undefined,
                }),
            });
            const json = await res.json();
            if (json.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
            else setError(json.error?.message ?? 'Failed to save');
        } catch { setError('Network error'); }
        finally { setSaving(false); }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#53B175]" /></div>;
    }

    const fields = [
        { key: 'name', label: 'Brand Name', placeholder: 'Your brand name', required: true },
        { key: 'tagline', label: 'Tagline', placeholder: 'Short brand description' },
        { key: 'website', label: 'Website', placeholder: 'https://yourbrand.com' },
        { key: 'logoUrl', label: 'Logo URL', placeholder: 'https://...' },
        { key: 'bannerUrl', label: 'Banner URL', placeholder: 'https://...' },
    ];

    return (
        <div className="max-w-[700px] mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight">Brand Settings</h1>
                <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px]">Update your brand profile information</p>
            </div>

            {profile && (
                <div className="flex items-center gap-3 p-3 bg-[#F8F9FB] rounded-[12px] border border-[#EEEEEE]">
                    <div className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">Brand Slug</div>
                    <code className="text-[13px] font-bold text-[#53B175]">{profile.slug}</code>
                    <div className={`ml-auto text-[11px] font-[900] px-2 py-0.5 rounded-[6px] ${profile.approvalStatus === 'approved' ? 'bg-[#EEF8F1] text-[#53B175]' : 'bg-[#FFF7E6] text-amber-600'}`}>
                        {profile.approvalStatus.toUpperCase()}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[20px] border border-[#EEEEEE] p-6 space-y-5">
                {fields.map(field => (
                    <div key={field.key}>
                        <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1.5 uppercase tracking-wider">
                            {field.label}{field.required && ' *'}
                        </label>
                        <input
                            type="text"
                            value={form[field.key as keyof typeof form]}
                            onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-2.5 text-[14px] font-medium outline-none focus:border-[#53B175]/50 bg-[#FAFAFA] focus:bg-white transition-colors"
                        />
                    </div>
                ))}

                <div>
                    <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1.5 uppercase tracking-wider">Description</label>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Tell buyers about your brand..."
                        rows={4}
                        className="w-full border border-[#EEEEEE] rounded-[10px] px-4 py-3 text-[14px] font-medium outline-none focus:border-[#53B175]/50 bg-[#FAFAFA] focus:bg-white transition-colors resize-none"
                    />
                </div>

                {error && <p className="text-[13px] text-[#E74C3C] font-bold">{error}</p>}

                <div className="flex items-center justify-end pt-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold disabled:opacity-60 hover:bg-[#3d9e41] transition-colors"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
                        {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
