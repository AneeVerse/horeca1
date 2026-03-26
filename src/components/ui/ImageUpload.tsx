'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    value: string; // current image URL
    onChange: (url: string) => void;
    folder?: 'products' | 'categories' | 'vendors' | 'banners' | 'misc';
    label?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

interface MultiImageUploadProps {
    values: string[];
    onChange: (urls: string[]) => void;
    folder?: 'products' | 'categories' | 'vendors' | 'banners' | 'misc';
    label?: string;
    max?: number;
}

async function uploadFile(file: File, folder: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch('/api/v1/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (!json.success) {
        throw new Error(json.error?.message || 'Upload failed');
    }

    return json.data.url;
}

// ─── Single Image Upload ─────────────────────────────────────────────────

export function ImageUpload({
    value,
    onChange,
    folder = 'misc',
    label,
    className,
    size = 'md',
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const sizeMap = {
        sm: { box: 'w-[80px] h-[80px]', icon: 16, text: '10px' },
        md: { box: 'w-[120px] h-[120px]', icon: 22, text: '11px' },
        lg: { box: 'w-full h-[180px]', icon: 28, text: '12px' },
    };
    const s = sizeMap[size];

    const handleUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Max file size is 10MB');
            return;
        }

        setUploading(true);
        setError('');
        try {
            const url = await uploadFile(file, folder);
            onChange(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    }, [folder, onChange]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleUpload(file);
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                    {label}
                </label>
            )}

            {value ? (
                <div className={cn('relative rounded-[12px] overflow-hidden border border-[#EEEEEE] group', s.box)}>
                    <img
                        src={value}
                        alt="Uploaded"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="w-[32px] h-[32px] rounded-[8px] bg-white/90 flex items-center justify-center text-[#181725] hover:bg-white transition-colors"
                            title="Replace image"
                        >
                            <Upload size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="w-[32px] h-[32px] rounded-[8px] bg-white/90 flex items-center justify-center text-[#E74C3C] hover:bg-white transition-colors"
                            title="Remove image"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    {uploading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <Loader2 size={20} className="animate-spin text-[#299E60]" />
                        </div>
                    )}
                </div>
            ) : (
                <div
                    onClick={() => !uploading && inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={cn(
                        'rounded-[12px] border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all',
                        s.box,
                        dragOver
                            ? 'border-[#299E60] bg-[#EEF8F1]'
                            : 'border-[#DCDCDC] hover:border-[#299E60]/40 hover:bg-[#F8F9FB]',
                        uploading && 'pointer-events-none opacity-60',
                    )}
                >
                    {uploading ? (
                        <Loader2 size={s.icon} className="animate-spin text-[#299E60]" />
                    ) : (
                        <>
                            <ImageIcon size={s.icon} className="text-[#AEAEAE]" />
                            <span className={cn('text-[#AEAEAE] font-medium', `text-[${s.text}]`)}>
                                {size === 'sm' ? 'Upload' : 'Click or drop image'}
                            </span>
                        </>
                    )}
                </div>
            )}

            {error && (
                <p className="text-[11px] text-[#E74C3C] font-medium mt-1.5">{error}</p>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}

// ─── Multi Image Upload ──────────────────────────────────────────────────

export function MultiImageUpload({
    values,
    onChange,
    folder = 'misc',
    label,
    max = 8,
}: MultiImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(async (files: FileList) => {
        const remaining = max - values.length;
        if (remaining <= 0) {
            setError(`Maximum ${max} images allowed`);
            return;
        }

        const toUpload = Array.from(files).slice(0, remaining);
        setUploading(true);
        setError('');

        try {
            const urls: string[] = [];
            for (const file of toUpload) {
                if (!file.type.startsWith('image/')) continue;
                if (file.size > 10 * 1024 * 1024) continue;
                const url = await uploadFile(file, folder);
                urls.push(url);
            }
            onChange([...values, ...urls]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    }, [folder, max, onChange, values]);

    const removeImage = (index: number) => {
        onChange(values.filter((_, i) => i !== index));
    };

    return (
        <div>
            {label && (
                <label className="block text-[12px] font-bold text-[#7C7C7C] uppercase tracking-wider mb-2">
                    {label}
                </label>
            )}

            <div className="flex flex-wrap gap-3">
                {values.map((url, idx) => (
                    <div key={idx} className="relative w-[80px] h-[80px] rounded-[10px] overflow-hidden border border-[#EEEEEE] group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 w-[20px] h-[20px] rounded-full bg-[#E74C3C] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {values.length < max && (
                    <div
                        onClick={() => !uploading && inputRef.current?.click()}
                        className={cn(
                            'w-[80px] h-[80px] rounded-[10px] border-2 border-dashed border-[#DCDCDC] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#299E60]/40 hover:bg-[#F8F9FB] transition-all',
                            uploading && 'pointer-events-none opacity-60',
                        )}
                    >
                        {uploading ? (
                            <Loader2 size={16} className="animate-spin text-[#299E60]" />
                        ) : (
                            <>
                                <Plus size={16} className="text-[#AEAEAE]" />
                                <span className="text-[10px] text-[#AEAEAE] font-medium">Add</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {error && (
                <p className="text-[11px] text-[#E74C3C] font-medium mt-1.5">{error}</p>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) handleFiles(e.target.files);
                    e.target.value = '';
                }}
            />
        </div>
    );
}
