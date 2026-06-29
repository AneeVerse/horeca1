'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Search, X, Plus, Loader2, Check, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CatRow {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    parentCategoryIds?: string[];
    primaryParentCategoryId?: string | null;
    children?: CatRow[];
}

interface FlatSubCat {
    id: string;
    name: string;
    parentCategoryIds: string[];
    primaryParentCategoryId: string | null;
}

/**
 * Three-step category picker: Parent Category → Sub-Category (required) →
 * Additional Sub-Categories (optional). Outputs `categoryIds` where index 0
 * is the primary sub-category and the rest are additional M2M links.
 */
export function CategoryHierarchyPicker({
    value,
    onChange,
    maxAdditional = 4,
    endpoint = '/api/v1/brand/categories/suggest',
    label = 'Categories',
    helper = 'Pick a parent, then a sub-category. Optionally add more sub-categories.',
    disableSuggest = false,
    disabled = false,
}: {
    value: string[];
    onChange: (next: string[]) => void;
    maxAdditional?: number;
    endpoint?: string;
    label?: string;
    helper?: string;
    disableSuggest?: boolean;
    disabled?: boolean;
}) {
    const [parents, setParents] = useState<CatRow[]>([]);
    const [subCategories, setSubCategories] = useState<FlatSubCat[]>([]);
    const [loading, setLoading] = useState(true);
    const [parentId, setParentId] = useState('');
    const [primarySubId, setPrimarySubId] = useState('');
    const [additionalOpen, setAdditionalOpen] = useState(false);
    const [additionalQuery, setAdditionalQuery] = useState('');
    const [suggesting, setSuggesting] = useState(false);
    const additionalRef = useRef<HTMLDivElement>(null);
    // "Request new" affordances for the primary parent + sub-category levels.
    const [parentReqOpen, setParentReqOpen] = useState(false);
    const [parentReqName, setParentReqName] = useState('');
    const [suggestingParent, setSuggestingParent] = useState(false);
    const [subReqOpen, setSubReqOpen] = useState(false);
    const [subReqName, setSubReqName] = useState('');
    const [suggestingSub, setSuggestingSub] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/v1/categories')
            .then((r) => r.json())
            .then((j) => {
                if (cancelled) return;
                const list: CatRow[] = Array.isArray(j.data) ? j.data : (j.data ?? []);
                setParents(list.filter((c) => !c.parentId));

                const flat: FlatSubCat[] = [];
                for (const root of list) {
                    for (const child of root.children ?? []) {
                        flat.push({
                            id: child.id,
                            name: child.name,
                            parentCategoryIds: child.parentCategoryIds?.length
                                ? child.parentCategoryIds
                                : child.parentId
                                  ? [child.parentId]
                                  : [],
                            primaryParentCategoryId:
                                child.primaryParentCategoryId ?? child.parentId ?? null,
                        });
                    }
                }
                setSubCategories(flat);
            })
            .catch(() => {
                setParents([]);
                setSubCategories([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Sync internal state when value changes externally (e.g. edit / master fill).
    useEffect(() => {
        const primary = value[0] ?? '';
        setPrimarySubId(primary);
        if (!primary) return;
        const sub = subCategories.find((c) => c.id === primary);
        if (sub?.primaryParentCategoryId) {
            setParentId(sub.primaryParentCategoryId);
        } else if (sub?.parentCategoryIds[0]) {
            setParentId(sub.parentCategoryIds[0]);
        }
    }, [value, subCategories]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (additionalRef.current && !additionalRef.current.contains(e.target as Node)) {
                setAdditionalOpen(false);
            }
        };
        if (additionalOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [additionalOpen]);

    const subById = useMemo(() => new Map(subCategories.map((c) => [c.id, c])), [subCategories]);
    const parentById = useMemo(() => new Map(parents.map((c) => [c.id, c])), [parents]);

    const filteredSubs = useMemo(() => {
        if (!parentId) return [];
        return subCategories.filter((c) => c.parentCategoryIds.includes(parentId));
    }, [subCategories, parentId]);

    const additionalIds = useMemo(() => value.slice(1), [value]);

    const emitChange = (primary: string, additional: string[]) => {
        const uniqueAdditional = additional.filter((id) => id && id !== primary);
        onChange(primary ? [primary, ...uniqueAdditional] : []);
    };

    const handleParentChange = (nextParentId: string) => {
        setParentId(nextParentId);
        const primaryStillValid =
            primarySubId &&
            subCategories.some(
                (c) => c.id === primarySubId && c.parentCategoryIds.includes(nextParentId),
            );
        if (!primaryStillValid) {
            setPrimarySubId('');
            emitChange('', []);
        }
    };

    const handlePrimaryChange = (nextPrimary: string) => {
        setPrimarySubId(nextPrimary);
        const keptAdditional = additionalIds.filter((id) => id !== nextPrimary);
        emitChange(nextPrimary, keptAdditional);
    };

    const addAdditional = (id: string) => {
        if (!primarySubId) {
            toast.error('Pick a sub-category first');
            return;
        }
        if (id === primarySubId || additionalIds.includes(id)) return;
        if (additionalIds.length >= maxAdditional) {
            toast.error(`Max ${maxAdditional} additional sub-categories`);
            return;
        }
        emitChange(primarySubId, [...additionalIds, id]);
        setAdditionalQuery('');
    };

    const removeAdditional = (id: string) => {
        emitChange(primarySubId, additionalIds.filter((v) => v !== id));
    };

    const trimmedAdditionalQuery = additionalQuery.trim();
    const lcAdditionalQuery = trimmedAdditionalQuery.toLowerCase();

    const additionalCandidates = useMemo(() => {
        return subCategories.filter(
            (c) =>
                c.id !== primarySubId &&
                !additionalIds.includes(c.id) &&
                (!lcAdditionalQuery || c.name.toLowerCase().includes(lcAdditionalQuery)),
        );
    }, [subCategories, primarySubId, additionalIds, lcAdditionalQuery]);

    const exactAdditionalMatch = useMemo(
        () => subCategories.some((c) => c.name.toLowerCase() === lcAdditionalQuery),
        [subCategories, lcAdditionalQuery],
    );

    const canSuggestAdditional =
        !disableSuggest &&
        !!parentId &&
        !!primarySubId &&
        trimmedAdditionalQuery.length >= 2 &&
        !exactAdditionalMatch;

    const submitAdditionalSuggestion = async () => {
        if (!canSuggestAdditional || suggesting) return;
        setSuggesting(true);
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedAdditionalQuery, parentId }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Suggestion failed');
            const cat = json.data as CatRow;
            const row: FlatSubCat = {
                id: cat.id,
                name: cat.name,
                parentCategoryIds: parentId ? [parentId] : [],
                primaryParentCategoryId: parentId || null,
            };
            setSubCategories((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row]));
            addAdditional(cat.id);
            toast.success(
                json.alreadyExists
                    ? `Picked existing sub-category "${cat.name}"`
                    : `Sent "${trimmedAdditionalQuery}" to admin for review`,
            );
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Suggestion failed');
        } finally {
            setSuggesting(false);
        }
    };

    // Request a brand-new PARENT (root) category — POST with no parentId.
    const submitParentRequest = async () => {
        const name = parentReqName.trim();
        if (name.length < 2 || suggestingParent) return;
        setSuggestingParent(true);
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Request failed');
            const cat = json.data as CatRow;
            setParents((prev) =>
                prev.some((p) => p.id === cat.id)
                    ? prev
                    : [...prev, { id: cat.id, name: cat.name, slug: cat.slug, parentId: null }],
            );
            handleParentChange(cat.id);
            setParentReqOpen(false);
            setParentReqName('');
            toast.success(
                json.alreadyExists
                    ? `Using existing parent "${cat.name}"`
                    : `Sent "${name}" to admin for review`,
            );
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Request failed');
        } finally {
            setSuggestingParent(false);
        }
    };

    // Request a new SUB-category under the selected parent — POST with parentId.
    const submitSubRequest = async () => {
        const name = subReqName.trim();
        if (!parentId) {
            toast.error('Pick a parent category first');
            return;
        }
        if (name.length < 2 || suggestingSub) return;
        setSuggestingSub(true);
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parentId }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Request failed');
            const cat = json.data as CatRow;
            const row: FlatSubCat = {
                id: cat.id,
                name: cat.name,
                parentCategoryIds: [parentId],
                primaryParentCategoryId: parentId,
            };
            setSubCategories((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row]));
            handlePrimaryChange(cat.id);
            setSubReqOpen(false);
            setSubReqName('');
            toast.success(
                json.alreadyExists
                    ? `Using existing sub-category "${cat.name}"`
                    : `Sent "${name}" to admin for review`,
            );
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Request failed');
        } finally {
            setSuggestingSub(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-[13px] font-bold text-[#181725] mb-1">{label}</label>
                {helper && <p className="text-[11px] text-gray-400 mt-0.5">{helper}</p>}
            </div>

            {/* Step 1: Parent Category */}
            <div>
                <label className="block text-[12px] font-semibold text-[#181725] mb-1.5">
                    Parent Category <span className="text-[#E74C3C]">*</span>
                </label>
                <select
                    value={parentId}
                    onChange={(e) => handleParentChange(e.target.value)}
                    disabled={loading || disabled}
                    className="w-full h-[42px] bg-white border border-gray-200 rounded-xl px-3 text-[13px] outline-none focus:border-[#53B175]/50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                    <option value="">{loading ? 'Loading…' : 'Select parent category'}</option>
                    {parents.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>

                {!disableSuggest && !disabled && (
                    parentReqOpen ? (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="text"
                                autoFocus
                                value={parentReqName}
                                onChange={(e) => setParentReqName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submitParentRequest(); } }}
                                placeholder="New parent category name"
                                className="flex-1 h-[38px] border border-gray-200 rounded-lg px-3 text-[13px] outline-none focus:border-[#53B175]/50"
                            />
                            <button
                                type="button"
                                onClick={() => void submitParentRequest()}
                                disabled={suggestingParent || parentReqName.trim().length < 2}
                                className="h-[38px] px-3 rounded-lg bg-[#53B175] text-white text-[12px] font-bold disabled:opacity-50 flex items-center gap-1"
                            >
                                {suggestingParent ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Send
                            </button>
                            <button
                                type="button"
                                onClick={() => { setParentReqOpen(false); setParentReqName(''); }}
                                className="h-[38px] px-2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setParentReqOpen(true)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#2e7d46] hover:underline"
                        >
                            <Plus size={11} /> Request new parent category
                        </button>
                    )
                )}
            </div>

            {/* Step 2: Sub-Category — PRIMARY category this item maps to */}
            <div>
                <label className="block text-[12px] font-semibold text-[#181725] mb-1.5">
                    Sub-Category <span className="text-[#E74C3C]">*</span>
                    <span className="text-[11px] font-normal text-gray-400 ml-1">(primary)</span>
                </label>
                <select
                    value={primarySubId}
                    onChange={(e) => handlePrimaryChange(e.target.value)}
                    disabled={!parentId || loading || disabled}
                    className="w-full h-[42px] bg-white border border-gray-200 rounded-xl px-3 text-[13px] outline-none focus:border-[#53B175]/50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                    <option value="">
                        {!parentId ? 'Select a parent first' : 'Select sub-category'}
                    </option>
                    {filteredSubs.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                {!disableSuggest && !disabled && parentId && (
                    subReqOpen ? (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="text"
                                autoFocus
                                value={subReqName}
                                onChange={(e) => setSubReqName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submitSubRequest(); } }}
                                placeholder={`New sub-category under ${parentById.get(parentId)?.name ?? 'parent'}`}
                                className="flex-1 h-[38px] border border-gray-200 rounded-lg px-3 text-[13px] outline-none focus:border-[#53B175]/50"
                            />
                            <button
                                type="button"
                                onClick={() => void submitSubRequest()}
                                disabled={suggestingSub || subReqName.trim().length < 2}
                                className="h-[38px] px-3 rounded-lg bg-[#53B175] text-white text-[12px] font-bold disabled:opacity-50 flex items-center gap-1"
                            >
                                {suggestingSub ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Send
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSubReqOpen(false); setSubReqName(''); }}
                                className="h-[38px] px-2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setSubReqOpen(true)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#2e7d46] hover:underline"
                        >
                            <Plus size={11} /> Request new sub-category
                        </button>
                    )
                )}
                {parentId && filteredSubs.length === 0 && !loading && !subReqOpen && (
                    <p className="text-[11px] text-amber-600 mt-1">
                        No sub-categories under this parent yet{!disableSuggest ? ' — request one above.' : '.'}
                    </p>
                )}
            </div>

            {/* Step 3: Additional Sub-Categories */}
            <div ref={additionalRef}>
                <label className="block text-[12px] font-semibold text-[#181725] mb-1.5">
                    Additional Sub-Categories
                    <span className="text-[11px] font-normal text-gray-400 ml-1">(secondary · display/filter only)</span>
                </label>

                <div className={cn('relative', additionalOpen && 'z-[50]')}>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={additionalQuery}
                            onChange={(e) => {
                                setAdditionalQuery(e.target.value);
                                setAdditionalOpen(true);
                            }}
                            onFocus={() => setAdditionalOpen(true)}
                            placeholder={
                                !primarySubId
                                    ? 'Pick a sub-category first'
                                    : 'Search or request another sub-category…'
                            }
                            disabled={!primarySubId || disabled || additionalIds.length >= maxAdditional}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#53B175]/50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {additionalOpen && primarySubId && (
                        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[220px] overflow-y-auto">
                            {additionalCandidates.length > 0 && (
                                <div className="py-1">
                                    {additionalCandidates.slice(0, 40).map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                addAdditional(c.id);
                                                setAdditionalOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left transition-colors"
                                        >
                                            <Tag size={12} className="text-gray-400 shrink-0" />
                                            <span className="text-[13px] text-[#181725]">{c.name}</span>
                                            {c.primaryParentCategoryId && parentById.get(c.primaryParentCategoryId) && (
                                                <span className="text-[10px] text-gray-400">
                                                    in {parentById.get(c.primaryParentCategoryId)?.name}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {canSuggestAdditional && (
                                <div className="border-t border-gray-100 p-2">
                                    <button
                                        type="button"
                                        onClick={submitAdditionalSuggestion}
                                        disabled={suggesting}
                                        className={cn(
                                            'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors',
                                            'bg-[#EEF8F1] hover:bg-[#53B175] hover:text-white text-[#2e7d46]',
                                            suggesting && 'opacity-60',
                                        )}
                                    >
                                        <span className="flex items-center gap-2 text-[12px] font-bold">
                                            {suggesting ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Plus size={12} />
                                            )}
                                            Request &ldquo;{trimmedAdditionalQuery}&rdquo; under{' '}
                                            {parentById.get(parentId)?.name}
                                        </span>
                                        <Check size={12} className="opacity-60" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 mt-2 border border-gray-200 rounded-xl bg-gray-50">
                    {additionalIds.length === 0 && (
                        <span className="text-[12px] text-gray-400 italic px-1">None added</span>
                    )}
                    {additionalIds.map((id) => {
                        const row = subById.get(id);
                        return (
                            <span
                                key={id}
                                className="flex items-center gap-1 bg-[#e8f5e9] text-[#2e7d46] text-[12px] font-semibold rounded-full px-3 py-1"
                            >
                                {row?.name ?? id}
                                <button
                                    type="button"
                                    onClick={() => removeAdditional(id)}
                                    disabled={disabled}
                                    className="hover:text-red-500 transition-colors"
                                >
                                    <X size={11} />
                                </button>
                            </span>
                        );
                    })}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                    {additionalIds.length} / {maxAdditional} additional
                </p>
            </div>
        </div>
    );
}
