'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Upload, X, Plus, Loader2, Check, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BG_PRESETS = [
    '#fff8e1', '#fde8e8', '#fdf6e3', '#e8f5e9', '#fce4ec',
    '#fff3e0', '#e3f2fd', '#f3e5f5', '#e8eaf6', '#e0f2f1',
];

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
    approvalStatus: string;
    isActive: boolean;
    user: { id: string; fullName: string; email: string };
    _count: { masterProducts: number; productMappings: number };
}

function ImageUploadField({
    label,
    value,
    onChange,
    folder,
    aspectHint,
}: {
    label: string;
    value: string | null;
    onChange: (url: string | null) => void;
    folder: string;
    aspectHint?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = async (file: File) => {
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('folder', folder);
            const res = await fetch('/api/v1/upload', { method: 'POST', body: fd });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Upload failed');
            onChange(json.data.url);
            toast.success('Image uploaded');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-[13px] font-semibold text-gray-700">{label}</label>
            {aspectHint && <p className="text-[11px] text-gray-400">{aspectHint}</p>}

            <div
                className={cn(
                    'relative border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden cursor-pointer',
                    'hover:border-[#53B175] transition-colors',
                    value ? 'h-[160px]' : 'h-[120px] flex items-center justify-center bg-gray-50'
                )}
                onClick={() => inputRef.current?.click()}
            >
                {value ? (
                    <>
                        <Image src={value} alt={label} fill className="object-cover" sizes="400px" />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Upload size={20} className="text-white opacity-0 hover:opacity-100 transition-opacity" />
                        </div>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(null); }}
                            className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
                        >
                            <X size={14} className="text-gray-600" />
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                        {uploading ? <Loader2 size={24} className="animate-spin text-[#53B175]" /> : <Upload size={24} />}
                        <span className="text-[12px] font-medium">{uploading ? 'Uploading…' : 'Click to upload'}</span>
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {/* Manual URL fallback */}
            <input
                type="url"
                placeholder="Or paste image URL…"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value || null)}
                className="w-full text-[12px] border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#53B175]/30 placeholder:text-gray-300"
            />
        </div>
    );
}

function ShowcaseImagesField({
    images,
    onChange,
}: {
    images: string[];
    onChange: (imgs: string[]) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = async (file: File) => {
        if (images.length >= 5) { toast.error('Max 5 showcase images'); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('folder', 'brands');
            const res = await fetch('/api/v1/upload', { method: 'POST', body: fd });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Upload failed');
            onChange([...images, json.data.url]);
            toast.success('Image added');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-[13px] font-semibold text-gray-700">Showcase Images <span className="text-gray-400 font-normal">(up to 5 — first one shows on card)</span></label>
            <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                    <div key={i} className="relative w-[100px] h-[80px] rounded-xl overflow-hidden border border-gray-200">
                        <Image src={img} alt="" fill className="object-cover" sizes="100px" />
                        <button
                            type="button"
                            onClick={() => onChange(images.filter((_, j) => j !== i))}
                            className="absolute top-1 right-1 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center shadow"
                        >
                            <X size={10} className="text-gray-600" />
                        </button>
                    </div>
                ))}
                {images.length < 5 && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="w-[100px] h-[80px] rounded-xl border-2 border-dashed border-gray-200 hover:border-[#53B175] transition-colors flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#53B175]"
                    >
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        <span className="text-[10px] font-medium">{uploading ? 'Uploading…' : 'Add image'}</span>
                    </button>
                )}
            </div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
    );
}

function CategoriesField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const [input, setInput] = useState('');

    const add = () => {
        const trimmed = input.trim();
        if (!trimmed || value.includes(trimmed) || value.length >= 12) return;
        onChange([...value, trimmed]);
        setInput('');
    };

    return (
        <div className="space-y-2">
            <label className="text-[13px] font-semibold text-gray-700">Categories <span className="text-gray-400 font-normal">(up to 12, shown on card)</span></label>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-gray-200 rounded-xl bg-gray-50">
                {value.map((cat) => (
                    <span key={cat} className="flex items-center gap-1 bg-[#e8f5e9] text-[#2e7d46] text-[12px] font-semibold rounded-full px-3 py-1">
                        {cat}
                        <button type="button" onClick={() => onChange(value.filter(c => c !== cat))} className="hover:text-red-500 transition-colors">
                            <X size={11} />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Type a category and press Enter…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                    className="flex-1 text-[13px] border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#53B175]/30"
                />
                <button type="button" onClick={add}
                    className="px-4 py-2 bg-[#53B175] text-white text-[13px] font-bold rounded-xl hover:bg-[#3d9e5f] transition-colors">
                    Add
                </button>
            </div>
        </div>
    );
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

                {/* Images */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                    <h2 className="text-[15px] font-bold text-[#181725]">Images</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <ImageUploadField
                            label="Brand Logo"
                            value={form.logoUrl}
                            onChange={(url) => setForm(p => ({ ...p, logoUrl: url }))}
                            folder="brands"
                            aspectHint="Square PNG/WebP recommended (200×200 px)"
                        />
                        <ImageUploadField
                            label="Banner / Store Header"
                            value={form.bannerUrl}
                            onChange={(url) => setForm(p => ({ ...p, bannerUrl: url }))}
                            folder="brands"
                            aspectHint="Wide banner (1200×400 px recommended)"
                        />
                    </div>
                    <ShowcaseImagesField
                        images={form.showcaseImages}
                        onChange={(imgs) => setForm(p => ({ ...p, showcaseImages: imgs }))}
                    />
                </div>

                {/* Card appearance */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                    <h2 className="text-[15px] font-bold text-[#181725]">Card Appearance</h2>

                    {/* bgColor picker */}
                    <div className="space-y-2">
                        <label className="text-[13px] font-semibold text-gray-700 flex items-center gap-1.5">
                            <Palette size={14} className="text-[#53B175]" />
                            Card Background Colour
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {BG_PRESETS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, bgColor: c }))}
                                    className={cn(
                                        'w-8 h-8 rounded-full border-2 transition-all',
                                        form.bgColor === c ? 'border-[#53B175] scale-110 shadow-md' : 'border-gray-200 hover:border-gray-400'
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <input
                                type="color"
                                value={form.bgColor}
                                onChange={(e) => setForm(p => ({ ...p, bgColor: e.target.value }))}
                                className="w-8 h-8 rounded-full cursor-pointer border-2 border-gray-200"
                                title="Custom colour"
                            />
                        </div>
                        {/* Live preview strip */}
                        <div className="h-10 rounded-xl mt-1 flex items-center justify-center" style={{ backgroundColor: form.bgColor }}>
                            <span className="text-[11px] font-bold text-black/30">Card top preview</span>
                        </div>
                    </div>

                    <CategoriesField
                        value={form.categories}
                        onChange={(cats) => setForm(p => ({ ...p, categories: cats }))}
                    />
                </div>
            </div>
        </div>
    );
}
