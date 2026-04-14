'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Plus,
    Search,
    Loader2,
    Tag,
    CheckCircle,
    Clock,
    XCircle,
    Edit2,
    Trash2,
    Upload,
    Download,
    FileSpreadsheet,
    FileText,
    ChevronRight,
    ChevronDown,
    ImageIcon,
    X,
    AlertTriangle,
    FolderTree,
    Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    approvalNote: string | null;
    suggestedBy: string | null;
    createdAt: string;
    children?: Category[];
    _count?: { products: number };
}

interface CategoryFormData {
    name: string;
    slug: string;
    parentId: string | null;
    imageUrl: string;
    sortOrder: number;
    isActive: boolean;
}

interface ImportResult {
    created: number;
    errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const INITIAL_FORM: CategoryFormData = {
    name: '',
    slug: '',
    parentId: null,
    imageUrl: '',
    sortOrder: 0,
    isActive: true,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CategoriesPage() {
    const perms = useAdminPermissions();
    // Data state
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Search & filter
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CategoryFormData>(INITIAL_FORM);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // Toggle loading tracker
    const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

    // Expanded parents
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const fileInputRef = useRef<HTMLInputElement>(null);

    // -----------------------------------------------------------------------
    // Fetch
    // -----------------------------------------------------------------------

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/admin/categories');
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch categories');
            setCategories(json.data ?? json.categories ?? []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
            setError(err instanceof Error ? err.message : 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // -----------------------------------------------------------------------
    // Hierarchy helpers
    // -----------------------------------------------------------------------

    const hierarchicalCategories = useMemo(() => {
        const topLevel = categories
            .filter((c) => !c.parentId)
            .sort((a, b) => a.sortOrder - b.sortOrder);

        return topLevel.map((parent) => ({
            ...parent,
            children: categories
                .filter((c) => c.parentId === parent.id)
                .sort((a, b) => a.sortOrder - b.sortOrder),
        }));
    }, [categories]);

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return hierarchicalCategories;

        const q = searchQuery.toLowerCase();
        return hierarchicalCategories
            .map((parent) => {
                const parentMatches =
                    parent.name.toLowerCase().includes(q) ||
                    parent.slug.toLowerCase().includes(q);
                const matchingChildren = (parent.children || []).filter(
                    (child) =>
                        child.name.toLowerCase().includes(q) ||
                        child.slug.toLowerCase().includes(q)
                );
                if (parentMatches) return parent;
                if (matchingChildren.length > 0) return { ...parent, children: matchingChildren };
                return null;
            })
            .filter(Boolean) as Category[];
    }, [hierarchicalCategories, searchQuery]);

    // -----------------------------------------------------------------------
    // Stats
    // -----------------------------------------------------------------------

    const stats = useMemo(() => {
        const total = categories.length;
        const active = categories.filter((c) => c.isActive && c.approvalStatus === 'approved').length;
        const pending = categories.filter((c) => c.approvalStatus === 'pending').length;
        const inactive = categories.filter((c) => !c.isActive || c.approvalStatus === 'rejected').length;
        return { total, active, pending, inactive };
    }, [categories]);

    // -----------------------------------------------------------------------
    // Expand / Collapse
    // -----------------------------------------------------------------------

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Auto-expand parents that have children on initial load
    useEffect(() => {
        const withChildren = hierarchicalCategories
            .filter((c) => c.children && c.children.length > 0)
            .map((c) => c.id);
        setExpandedIds(new Set(withChildren));
    }, [hierarchicalCategories]);

    // -----------------------------------------------------------------------
    // Form modal
    // -----------------------------------------------------------------------

    const openCreateModal = () => {
        setEditingCategory(null);
        setFormData(INITIAL_FORM);
        setSlugManuallyEdited(false);
        setFormError(null);
        setShowFormModal(true);
    };

    const openEditModal = (cat: Category) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            slug: cat.slug,
            parentId: cat.parentId,
            imageUrl: cat.imageUrl || '',
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
        });
        setSlugManuallyEdited(true);
        setFormError(null);
        setShowFormModal(true);
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setEditingCategory(null);
        setFormData(INITIAL_FORM);
        setFormError(null);
    };

    const handleNameChange = (name: string) => {
        setFormData((prev) => ({
            ...prev,
            name,
            slug: slugManuallyEdited ? prev.slug : slugify(name),
        }));
    };

    const handleSlugChange = (slug: string) => {
        setSlugManuallyEdited(true);
        setFormData((prev) => ({ ...prev, slug: slugify(slug) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.slug.trim()) {
            setFormError('Name and slug are required.');
            return;
        }

        setFormLoading(true);
        setFormError(null);

        const body = {
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            parentId: formData.parentId || null,
            imageUrl: formData.imageUrl.trim() || null,
            sortOrder: formData.sortOrder,
            isActive: formData.isActive,
        };

        try {
            const url = editingCategory
                ? `/api/v1/admin/categories/${editingCategory.id}`
                : '/api/v1/admin/categories';

            const res = await fetch(url, {
                method: editingCategory ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || json.error || json.message || 'Operation failed');

            closeFormModal();
            fetchCategories();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setFormLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // Delete
    // -----------------------------------------------------------------------

    const openDeleteModal = (cat: Category) => {
        setDeletingCategory(cat);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setDeletingCategory(null);
    };

    const handleDelete = async () => {
        if (!deletingCategory) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/v1/admin/categories/${deletingCategory.id}`, {
                method: 'DELETE',
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Delete failed');
            closeDeleteModal();
            fetchCategories();
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeleteLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // Toggle active
    // -----------------------------------------------------------------------

    const handleToggleActive = async (cat: Category) => {
        setToggleLoadingId(cat.id);
        try {
            const res = await fetch(`/api/v1/admin/categories/${cat.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !cat.isActive }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Toggle failed');
            setCategories((prev) =>
                prev.map((c) => (c.id === cat.id ? { ...c, isActive: !c.isActive } : c))
            );
        } catch (err) {
            console.error('Toggle active failed:', err);
        } finally {
            setToggleLoadingId(null);
        }
    };

    // -----------------------------------------------------------------------
    // Import
    // -----------------------------------------------------------------------

    const openImportModal = () => {
        setImportFile(null);
        setImportResult(null);
        setShowImportModal(true);
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportResult(null);
    };

    const handleImport = async () => {
        if (!importFile) return;
        setImportLoading(true);
        setImportResult(null);
        try {
            const fd = new FormData();
            fd.append('file', importFile);

            const res = await fetch('/api/v1/admin/categories/import', {
                method: 'POST',
                body: fd,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Import failed');

            setImportResult({
                created: json.data?.created ?? json.created ?? 0,
                errors: json.data?.errors ?? json.errors ?? [],
            });
            fetchCategories();
        } catch (err) {
            setImportResult({
                created: 0,
                errors: [err instanceof Error ? err.message : 'Import failed'],
            });
        } finally {
            setImportLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // Export
    // -----------------------------------------------------------------------

    const handleExport = (format: 'csv' | 'xlsx') => {
        window.open(`/api/v1/admin/categories/export?format=${format}`, '_blank');
    };

    // -----------------------------------------------------------------------
    // Possible parents for dropdown (exclude self and own children on edit)
    // -----------------------------------------------------------------------

    const parentOptions = useMemo(() => {
        const topLevel = categories.filter((c) => !c.parentId);
        if (!editingCategory) return topLevel;
        // Exclude the category itself and its children
        const excludeIds = new Set([
            editingCategory.id,
            ...categories.filter((c) => c.parentId === editingCategory.id).map((c) => c.id),
        ]);
        return topLevel.filter((c) => !excludeIds.has(c.id));
    }, [categories, editingCategory]);

    // -----------------------------------------------------------------------
    // Status badge
    // -----------------------------------------------------------------------

    const StatusBadge = ({ status }: { status: Category['approvalStatus'] }) => {
        const config = {
            approved: {
                label: 'Approved',
                bg: 'bg-[#EEF8F1]',
                text: 'text-[#299E60]',
                border: 'border-[#299E60]/10',
                dot: 'bg-[#299E60]',
            },
            pending: {
                label: 'Pending',
                bg: 'bg-[#FFF7E6]',
                text: 'text-[#F59E0B]',
                border: 'border-[#F59E0B]/10',
                dot: 'bg-[#F59E0B]',
            },
            rejected: {
                label: 'Rejected',
                bg: 'bg-[#FFF0F0]',
                text: 'text-[#E74C3C]',
                border: 'border-[#E74C3C]/10',
                dot: 'bg-[#E74C3C]',
            },
        }[status];

        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1.5 text-[11px] font-[900] px-3 py-1.5 rounded-[8px] uppercase tracking-wider border',
                    config.bg,
                    config.text,
                    config.border
                )}
            >
                <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
                {config.label}
            </span>
        );
    };

    // -----------------------------------------------------------------------
    // Category row renderer
    // -----------------------------------------------------------------------

    const CategoryRow = ({
        cat,
        isChild = false,
        hasChildren = false,
        isExpanded = false,
    }: {
        cat: Category;
        isChild?: boolean;
        hasChildren?: boolean;
        isExpanded?: boolean;
    }) => (
        <tr
            className={cn(
                'hover:bg-[#F8F9FB] transition-colors group',
                isChild && 'bg-[#FAFBFC]'
            )}
        >
            {/* Name + Image */}
            <td className="px-8 py-4">
                <div className={cn('flex items-center gap-3', isChild && 'pl-8')}>
                    {/* Expand/collapse or indent indicator */}
                    {!isChild && hasChildren ? (
                        <button
                            onClick={() => toggleExpand(cat.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#EEEEEE] transition-colors shrink-0"
                        >
                            {isExpanded ? (
                                <ChevronDown size={16} className="text-[#7C7C7C]" />
                            ) : (
                                <ChevronRight size={16} className="text-[#7C7C7C]" />
                            )}
                        </button>
                    ) : !isChild ? (
                        <div className="w-6 h-6 shrink-0" />
                    ) : (
                        <div className="w-[2px] h-6 bg-[#299E60]/20 rounded-full -ml-4 mr-2 shrink-0" />
                    )}

                    {/* Thumbnail */}
                    {cat.imageUrl ? (
                        <img
                            src={cat.imageUrl}
                            alt={cat.name}
                            className="w-10 h-10 rounded-[10px] object-cover border border-[#EEEEEE] shrink-0"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-[10px] bg-[#F1F4F9] flex items-center justify-center shrink-0">
                            <Tag size={16} className="text-[#AEAEAE]" />
                        </div>
                    )}

                    <div className="min-w-0">
                        <p className="text-[15px] font-extrabold text-[#181725] truncate">
                            {cat.name}
                        </p>
                        {isChild && (
                            <p className="text-[11px] text-[#AEAEAE] font-medium">Subcategory</p>
                        )}
                    </div>
                </div>
            </td>

            {/* Slug */}
            <td className="px-6 py-4">
                <code className="text-[13px] font-mono text-[#7C7C7C] bg-[#F8F9FB] px-2 py-1 rounded-md">
                    {cat.slug}
                </code>
            </td>

            {/* Products */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-1.5">
                    <Package size={14} className="text-[#AEAEAE]" />
                    <span className="text-[14px] font-bold text-[#181725]">
                        {cat._count?.products ?? 0}
                    </span>
                </div>
            </td>

            {/* Status */}
            <td className="px-6 py-4">
                <StatusBadge status={cat.approvalStatus} />
            </td>

            {/* Active toggle */}
            <td className="px-6 py-4">
                <button
                    onClick={() => handleToggleActive(cat)}
                    disabled={toggleLoadingId === cat.id}
                    className="flex items-center gap-2 disabled:opacity-50"
                    title={cat.isActive ? 'Click to deactivate' : 'Click to activate'}
                >
                    {toggleLoadingId === cat.id ? (
                        <Loader2 size={20} className="animate-spin text-[#AEAEAE]" />
                    ) : (
                        <div
                            className="relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors duration-200"
                            style={{ backgroundColor: cat.isActive ? '#299E60' : '#D1D5DB' }}
                        >
                            <span className="inline-block h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: cat.isActive ? 'translateX(20px)' : 'translateX(3px)' }} />
                        </div>
                    )}
                    <span
                        className={cn(
                            'text-[12px] font-bold',
                            cat.isActive ? 'text-[#299E60]' : 'text-[#AEAEAE]'
                        )}
                    >
                        {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                </button>
            </td>

            {/* Actions */}
            <td className="px-8 py-4">
                <div className="flex items-center gap-2">
                    {perms.canWriteProducts && (
                        <button
                            onClick={() => openEditModal(cat)}
                            className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-[#F1F4F9] text-[#7C7C7C] hover:bg-[#299E60] hover:text-white transition-all"
                            title="Edit category"
                        >
                            <Edit2 size={15} />
                        </button>
                    )}
                    {perms.canWriteProducts && (
                        <button
                            onClick={() => openDeleteModal(cat)}
                            className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-[#F1F4F9] text-[#7C7C7C] hover:bg-[#E74C3C] hover:text-white transition-all"
                            title="Delete category"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-[#299E60]" />
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* ============================================================= */}
            {/* Header */}
            {/* ============================================================= */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-[900] text-[#181725] tracking-tight">
                        Category Management
                    </h1>
                    <p className="text-[#7C7C7C] font-medium mt-1">
                        Organize and manage your product categories
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Import */}
                    <button
                        onClick={openImportModal}
                        className="h-[44px] px-5 flex items-center gap-2 bg-white border border-[#EEEEEE] rounded-[12px] text-[14px] font-bold text-[#181725] hover:border-[#299E60]/40 hover:shadow-sm transition-all"
                    >
                        <Upload size={16} />
                        Import
                    </button>

                    {/* Export dropdown */}
                    <div className="relative group">
                        <button className="h-[44px] px-5 flex items-center gap-2 bg-white border border-[#EEEEEE] rounded-[12px] text-[14px] font-bold text-[#181725] hover:border-[#299E60]/40 hover:shadow-sm transition-all">
                            <Download size={16} />
                            Export
                            <ChevronDown size={14} className="text-[#AEAEAE]" />
                        </button>
                        <div className="absolute right-0 top-full mt-2 bg-white border border-[#EEEEEE] rounded-[12px] shadow-lg py-2 w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                            <button
                                onClick={() => handleExport('csv')}
                                className="w-full px-4 py-2.5 text-left text-[14px] font-medium text-[#181725] hover:bg-[#F8F9FB] flex items-center gap-2.5 transition-colors"
                            >
                                <FileText size={16} className="text-[#299E60]" />
                                Export CSV
                            </button>
                            <button
                                onClick={() => handleExport('xlsx')}
                                className="w-full px-4 py-2.5 text-left text-[14px] font-medium text-[#181725] hover:bg-[#F8F9FB] flex items-center gap-2.5 transition-colors"
                            >
                                <FileSpreadsheet size={16} className="text-[#299E60]" />
                                Export Excel
                            </button>
                        </div>
                    </div>

                    {/* Add Category */}
                    {perms.canWriteProducts && (
                        <button
                            onClick={openCreateModal}
                            className="h-[44px] px-6 flex items-center gap-2 bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] shadow-sm shadow-[#299E60]/20 transition-all active:scale-[0.98]"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            Add Category
                        </button>
                    )}
                </div>
            </div>

            {/* ============================================================= */}
            {/* Stats */}
            {/* ============================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        label: 'Total Categories',
                        value: stats.total,
                        icon: FolderTree,
                        color: '#3B82F6',
                        bgColor: '#EFF6FF',
                    },
                    {
                        label: 'Active',
                        value: stats.active,
                        icon: CheckCircle,
                        color: '#299E60',
                        bgColor: '#EEF8F1',
                    },
                    {
                        label: 'Pending Approval',
                        value: stats.pending,
                        icon: Clock,
                        color: '#F59E0B',
                        bgColor: '#FFF7E6',
                    },
                    {
                        label: 'Inactive',
                        value: stats.inactive,
                        icon: XCircle,
                        color: '#9CA3AF',
                        bgColor: '#F3F4F6',
                    },
                ].map((stat, idx) => (
                    <div
                        key={idx}
                        className="bg-white p-6 rounded-[14px] border border-[#EEEEEE] shadow-sm flex items-center gap-5"
                    >
                        <div
                            className="w-[56px] h-[56px] rounded-[14px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: stat.bgColor, color: stat.color }}
                        >
                            <stat.icon size={26} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-[#AEAEAE] mb-1 uppercase tracking-wider">
                                {stat.label}
                            </p>
                            <h3 className="text-[28px] font-[900] text-[#181725] leading-none">
                                {stat.value}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* ============================================================= */}
            {/* Error banner */}
            {/* ============================================================= */}
            {error && (
                <div className="bg-[#FFF0F0] border border-[#E74C3C]/20 rounded-[14px] p-5 flex items-center gap-3">
                    <AlertTriangle size={20} className="text-[#E74C3C] shrink-0" />
                    <p className="text-[14px] font-medium text-[#E74C3C]">{error}</p>
                    <button
                        onClick={fetchCategories}
                        className="ml-auto text-[13px] font-bold text-[#E74C3C] underline hover:no-underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ============================================================= */}
            {/* Category Table */}
            {/* ============================================================= */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                {/* Search bar inside card */}
                <div className="p-6 border-b border-[#EEEEEE] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-[20px] font-[900] text-[#181725]">All Categories</h2>
                    <div className="relative w-full md:w-[320px]">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AEAEAE]"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#F8F9FB] border border-[#EEEEEE] rounded-[12px] py-3 pl-11 pr-4 text-[14px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F8F9FB]">
                                <th className="px-8 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Slug
                                </th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Products
                                </th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Active
                                </th>
                                <th className="px-8 py-5 text-[13px] font-bold text-[#7C7C7C] uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {filteredCategories.map((parent) => {
                                const children = parent.children || [];
                                const hasChildren = children.length > 0;
                                const isExpanded = expandedIds.has(parent.id);

                                return (
                                    <React.Fragment key={parent.id}>
                                        <CategoryRow
                                            cat={parent}
                                            hasChildren={hasChildren}
                                            isExpanded={isExpanded}
                                        />
                                        {hasChildren &&
                                            isExpanded &&
                                            children.map((child) => (
                                                <CategoryRow
                                                    key={child.id}
                                                    cat={child}
                                                    isChild
                                                />
                                            ))}
                                    </React.Fragment>
                                );
                            })}

                            {filteredCategories.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-[#F8F9FB] rounded-full flex items-center justify-center text-[#AEAEAE]">
                                                <FolderTree size={32} />
                                            </div>
                                            <p className="text-[#AEAEAE] font-bold">
                                                {searchQuery
                                                    ? `No categories found matching "${searchQuery}"`
                                                    : 'No categories yet. Click "Add Category" to create one.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-6 bg-[#FDFDFD] border-t border-[#EEEEEE]">
                    <p className="text-[13px] text-[#AEAEAE] font-bold uppercase tracking-wider">
                        Showing{' '}
                        <span className="text-[#181725]">{categories.length}</span> categor
                        {categories.length !== 1 ? 'ies' : 'y'} ({stats.active} active)
                    </p>
                </div>
            </div>

            {/* ============================================================= */}
            {/* Add / Edit Modal */}
            {/* ============================================================= */}
            {showFormModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={closeFormModal}
                >
                    <div
                        className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-2xl w-full max-w-[540px] mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between p-6 border-b border-[#EEEEEE]">
                            <h2 className="text-[20px] font-[900] text-[#181725]">
                                {editingCategory ? 'Edit Category' : 'Add New Category'}
                            </h2>
                            <button
                                onClick={closeFormModal}
                                className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-[#F1F4F9] text-[#7C7C7C] hover:bg-[#EEEEEE] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {formError && (
                                <div className="bg-[#FFF0F0] border border-[#E74C3C]/20 rounded-[10px] p-3 flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-[#E74C3C] shrink-0" />
                                    <p className="text-[13px] font-medium text-[#E74C3C]">
                                        {formError}
                                    </p>
                                </div>
                            )}

                            {/* Name */}
                            <div>
                                <label className="block text-[13px] font-bold text-[#181725] mb-2">
                                    Name <span className="text-[#E74C3C]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="e.g. Dairy & Milk Products"
                                    className="w-full h-[46px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                    autoFocus
                                />
                            </div>

                            {/* Slug */}
                            <div>
                                <label className="block text-[13px] font-bold text-[#181725] mb-2">
                                    Slug <span className="text-[#E74C3C]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                    placeholder="auto-generated-from-name"
                                    className="w-full h-[46px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] font-mono font-medium outline-none transition-all placeholder:text-[#AEAEAE] focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                />
                                <p className="text-[11px] text-[#AEAEAE] mt-1.5 font-medium">
                                    Auto-generated from name. Edit manually if needed.
                                </p>
                            </div>

                            {/* Parent Category */}
                            <div>
                                <label className="block text-[13px] font-bold text-[#181725] mb-2">
                                    Parent Category
                                </label>
                                <select
                                    value={formData.parentId || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            parentId: e.target.value || null,
                                        }))
                                    }
                                    className="w-full h-[46px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] font-medium outline-none transition-all focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm appearance-none cursor-pointer"
                                >
                                    <option value="">None (Top-level category)</option>
                                    {parentOptions.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Image */}
                            <div>
                                <ImageUpload
                                    value={formData.imageUrl}
                                    onChange={(url) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            imageUrl: url,
                                        }))
                                    }
                                    folder="categories"
                                    label="Category Image"
                                    size="md"
                                />
                            </div>

                            {/* Sort Order + Is Active row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-[#181725] mb-2">
                                        Sort Order
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={formData.sortOrder}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                sortOrder: parseInt(e.target.value, 10) || 0,
                                            }))
                                        }
                                        className="w-full h-[46px] bg-[#F8F9FB] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] font-medium outline-none transition-all focus:border-[#299E60]/40 focus:bg-white focus:shadow-sm"
                                    />
                                </div>
                                <div className="flex items-end pb-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                isActive: !prev.isActive,
                                            }))
                                        }
                                        className="flex items-center gap-3 select-none"
                                    >
                                        <div
                                            className={cn(
                                                'relative w-[44px] h-[24px] rounded-full transition-colors',
                                                formData.isActive ? 'bg-[#299E60]' : 'bg-[#EEEEEE]'
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform',
                                                    formData.isActive && 'translate-x-[20px]'
                                                )}
                                            />
                                        </div>
                                        <span className="text-[13px] font-bold text-[#181725]">
                                            Is Active
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Submit button */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeFormModal}
                                    className="flex-1 h-[46px] bg-[#F8F9FB] border border-[#EEEEEE] text-[#7C7C7C] rounded-[10px] text-[14px] font-bold hover:bg-[#EEEEEE] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 h-[46px] bg-[#299E60] text-white rounded-[10px] text-[14px] font-bold hover:bg-[#238a54] shadow-sm shadow-[#299E60]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {formLoading && <Loader2 size={16} className="animate-spin" />}
                                    {editingCategory ? 'Update Category' : 'Create Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* Delete Confirmation Modal */}
            {/* ============================================================= */}
            {showDeleteModal && deletingCategory && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={closeDeleteModal}
                >
                    <div
                        className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-2xl w-full max-w-[440px] mx-4 animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-8 text-center">
                            <div className="w-[64px] h-[64px] mx-auto mb-5 rounded-full bg-[#FFF0F0] flex items-center justify-center">
                                <AlertTriangle size={32} className="text-[#E74C3C]" />
                            </div>
                            <h3 className="text-[20px] font-[900] text-[#181725] mb-2">
                                Delete Category?
                            </h3>
                            <p className="text-[14px] text-[#7C7C7C] font-medium leading-relaxed">
                                Are you sure you want to delete{' '}
                                <strong className="text-[#181725]">
                                    {deletingCategory.name}
                                </strong>
                                ? This will deactivate the category and remove it from the storefront.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 p-6 border-t border-[#EEEEEE]">
                            <button
                                onClick={closeDeleteModal}
                                className="flex-1 h-[46px] bg-[#F8F9FB] border border-[#EEEEEE] text-[#7C7C7C] rounded-[10px] text-[14px] font-bold hover:bg-[#EEEEEE] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 h-[46px] bg-[#E74C3C] text-white rounded-[10px] text-[14px] font-bold hover:bg-[#cf4436] shadow-sm shadow-[#E74C3C]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deleteLoading && (
                                    <Loader2 size={16} className="animate-spin" />
                                )}
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* Import Modal */}
            {/* ============================================================= */}
            {showImportModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={closeImportModal}
                >
                    <div
                        className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-2xl w-full max-w-[500px] mx-4 animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between p-6 border-b border-[#EEEEEE]">
                            <h2 className="text-[20px] font-[900] text-[#181725]">
                                Import Categories
                            </h2>
                            <button
                                onClick={closeImportModal}
                                className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-[#F1F4F9] text-[#7C7C7C] hover:bg-[#EEEEEE] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-6 space-y-5">
                            {/* Info */}
                            <div className="bg-[#EFF6FF] border border-[#3B82F6]/10 rounded-[10px] p-4">
                                <p className="text-[13px] font-medium text-[#3B82F6] leading-relaxed">
                                    Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file
                                    with the following columns:{' '}
                                    <code className="bg-white/60 px-1.5 py-0.5 rounded text-[12px] font-mono">
                                        name, slug, parentSlug, imageUrl, sortOrder
                                    </code>
                                </p>
                            </div>

                            {/* File upload area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    'border-2 border-dashed rounded-[12px] p-8 text-center cursor-pointer transition-all',
                                    importFile
                                        ? 'border-[#299E60] bg-[#EEF8F1]'
                                        : 'border-[#EEEEEE] hover:border-[#299E60]/40 hover:bg-[#F8F9FB]'
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                    onChange={(e) => {
                                        setImportFile(e.target.files?.[0] || null);
                                        setImportResult(null);
                                    }}
                                />
                                {importFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <FileSpreadsheet
                                            size={32}
                                            className="text-[#299E60]"
                                        />
                                        <p className="text-[14px] font-bold text-[#181725]">
                                            {importFile.name}
                                        </p>
                                        <p className="text-[12px] text-[#7C7C7C]">
                                            {(importFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload size={32} className="text-[#AEAEAE]" />
                                        <p className="text-[14px] font-bold text-[#7C7C7C]">
                                            Click to select a file
                                        </p>
                                        <p className="text-[12px] text-[#AEAEAE]">
                                            Accepted: .csv, .xlsx
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Import results */}
                            {importResult && (
                                <div className="space-y-3">
                                    {importResult.created > 0 && (
                                        <div className="bg-[#EEF8F1] border border-[#299E60]/10 rounded-[10px] p-4 flex items-center gap-3">
                                            <CheckCircle
                                                size={20}
                                                className="text-[#299E60] shrink-0"
                                            />
                                            <p className="text-[14px] font-bold text-[#299E60]">
                                                Successfully created {importResult.created}{' '}
                                                categor{importResult.created !== 1 ? 'ies' : 'y'}
                                            </p>
                                        </div>
                                    )}
                                    {importResult.errors.length > 0 && (
                                        <div className="bg-[#FFF0F0] border border-[#E74C3C]/10 rounded-[10px] p-4 space-y-2">
                                            <p className="text-[13px] font-bold text-[#E74C3C]">
                                                {importResult.errors.length} error
                                                {importResult.errors.length !== 1 ? 's' : ''}:
                                            </p>
                                            <ul className="text-[12px] text-[#E74C3C] space-y-1 max-h-[120px] overflow-y-auto">
                                                {importResult.errors.map((err, i) => (
                                                    <li key={i} className="flex items-start gap-1.5">
                                                        <span className="mt-0.5 shrink-0">-</span>
                                                        {err}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeImportModal}
                                    className="flex-1 h-[46px] bg-[#F8F9FB] border border-[#EEEEEE] text-[#7C7C7C] rounded-[10px] text-[14px] font-bold hover:bg-[#EEEEEE] transition-all"
                                >
                                    {importResult ? 'Close' : 'Cancel'}
                                </button>
                                {!importResult && (
                                    <button
                                        onClick={handleImport}
                                        disabled={!importFile || importLoading}
                                        className="flex-1 h-[46px] bg-[#299E60] text-white rounded-[10px] text-[14px] font-bold hover:bg-[#238a54] shadow-sm shadow-[#299E60]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {importLoading && (
                                            <Loader2 size={16} className="animate-spin" />
                                        )}
                                        Upload & Import
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
