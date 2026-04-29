'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Users,
    Package,
    Eye,
    Search,
    MoreVertical,
    Loader2,
    UserCheck,
    UserX,
    Trash2,
    Plus,
    X,
    Eye as EyeIcon,
    EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminUser {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    businessName: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function CustomersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const refetch = useCallback(() => {
        setLoading(true);
        const url = new URL('/api/v1/admin/users', window.location.origin);
        url.searchParams.set('limit', '50');
        if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());
        fetch(url.toString())
            .then(res => res.json())
            .then(json => { if (json.success) setUsers(json.data.users); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [searchQuery]);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            if (cancelled) return;
            refetch();
        }, searchQuery ? 300 : 0);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [searchQuery, refetch]);

    const filteredUsers = users;

    const totalCustomers = users.filter(u => u.role === 'customer').length;
    const totalVendors = users.filter(u => u.role === 'vendor').length;
    const activeUsers = users.filter(u => u.isActive).length;
    const inactiveUsers = users.filter(u => !u.isActive).length;

    const stats = [
        { label: 'All Users', value: users.length.toString(), icon: Users, bgColor: 'bg-[#299E60]/10', iconColor: 'text-[#299E60]' },
        { label: 'Customers', value: totalCustomers.toString(), icon: UserCheck, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
        { label: 'Vendors', value: totalVendors.toString(), icon: Package, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
        { label: 'Inactive', value: inactiveUsers.toString(), icon: UserX, bgColor: 'bg-red-50', iconColor: 'text-red-500' },
    ];

    const deleteUser = async (userId: string, name: string) => {
        if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/v1/admin/users/${userId}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            console.error('Failed to delete user:', err);
        }
        setActiveMenu(null);
    };

    const toggleUserActive = async (userId: string, isActive: boolean) => {
        try {
            const res = await fetch(`/api/v1/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !isActive }),
            });
            const json = await res.json();
            if (json.success) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !isActive } : u));
            }
        } catch (err) {
            console.error('Failed to toggle user status:', err);
        }
        setActiveMenu(null);
    };

    // Close menu when clicking anywhere else
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        if (activeMenu !== null) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenu]);

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div>
                <h1 className="text-[28px] font-bold text-[#000000] leading-none mb-1">Customers</h1>
                <p className="text-[#000000] text-[13px] font-medium opacity-70">Whole data about your Customers</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-[#299E60]" size={32} />
                </div>
            ) : (
            <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[14px] border border-[#EEEEEE] shadow-sm hover:shadow-md transition-all h-[130px] flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", stat.bgColor)}>
                                <stat.icon size={20} className={stat.iconColor} />
                            </div>
                            <span className="text-[14px] font-bold text-[#4B4B4B]">{stat.label}</span>
                        </div>
                        <h4 className="text-[22px] font-[800] text-[#181725] leading-none">{stat.value}</h4>
                    </div>
                ))}
            </div>

            {/* Users Table Section */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#EEEEEE] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-[18px] font-bold text-[#181725]">All Users List</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative group w-full md:w-[240px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEAE]" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or email"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-[40px] w-full bg-white border border-[#DCDCDC] rounded-[10px] pl-10 pr-4 text-[13px] outline-none transition-all placeholder:text-[#AEAEAE] font-medium focus:border-[#299E60]/40 shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="h-[40px] px-4 bg-[#299E60] hover:bg-[#238a53] text-white rounded-[10px] text-[13px] font-bold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                        >
                            <Plus size={16} /> Add User
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white">
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Name</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Email</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Phone</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Role</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Business</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Status</th>
                                <th className="p-4 text-left text-[14px] font-[800] text-[#4B4B4B]">Joined</th>
                                <th className="p-4 text-center text-[14px] font-[800] text-[#4B4B4B]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE]">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <Link href={`/admin/customers/${user.id}`} className="flex items-center gap-3 group/name cursor-pointer w-fit">
                                                <div className="w-9 h-9 rounded-full overflow-hidden bg-[#53B175]/10 shrink-0 border border-transparent group-hover/name:border-[#299E60]/30 transition-all flex items-center justify-center">
                                                    <span className="text-[13px] font-black text-[#299E60]">
                                                        {(user.fullName || 'U').charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="text-[14px] font-[800] text-[#181725] tracking-tight">
                                                    {user.fullName}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="p-4 text-[13px] font-medium text-[#7C7C7C]">{user.email}</td>
                                        <td className="p-4 text-[13px] font-medium text-[#7C7C7C]">{user.phone || '—'}</td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold capitalize",
                                                user.role === 'admin' ? "bg-purple-50 text-purple-600" :
                                                user.role === 'vendor' ? "bg-blue-50 text-blue-600" :
                                                "bg-[#EEF8F1] text-[#299E60]"
                                            )}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[13px] font-medium text-[#7C7C7C]">{user.businessName || '—'}</td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold",
                                                user.isActive ? "bg-[#EEF8F1] text-[#299E60]" : "bg-[#FFF0F0] text-[#E74C3C]"
                                            )}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[13px] font-medium text-[#7C7C7C]">
                                            {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2 relative">
                                                <Link href={`/admin/customers/${user.id}`} className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] bg-[#EEF8F1] text-[#299E60] hover:bg-[#299E60] hover:text-white transition-all shadow-sm">
                                                    <Eye size={16} />
                                                </Link>

                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenu(activeMenu === user.id ? null : user.id);
                                                        }}
                                                        className={cn(
                                                            "w-[34px] h-[34px] flex items-center justify-center rounded-[10px] transition-all shadow-sm",
                                                            activeMenu === user.id ? "bg-gray-100 text-gray-900 border border-gray-200" : "bg-white border border-[#EEEEEE] text-[#7C7C7C] hover:bg-gray-50"
                                                        )}
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeMenu === user.id && (
                                                        <div className="absolute right-0 mt-2 w-44 bg-white rounded-[8px] shadow-xl border border-gray-100 z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-200">
                                                            <button
                                                                onClick={() => toggleUserActive(user.id, user.isActive)}
                                                                className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-semibold text-[#4B4B4B] hover:bg-gray-50 transition-colors"
                                                            >
                                                                {user.isActive ? <UserX size={14} className="text-red-400" /> : <UserCheck size={14} className="text-green-400" />}
                                                                {user.isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                            <button
                                                                onClick={() => deleteUser(user.id, user.fullName)}
                                                                className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                                Delete permanently
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center text-[#AEAEAE] font-medium">
                                        {searchQuery ? `No users found matching "${searchQuery}"` : 'No users yet'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </>
            )}

            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={() => { setShowAddModal(false); refetch(); }}
                />
            )}
        </div>
    );
}

interface AddUserForm {
    fullName: string;
    phone: string;
    email: string;
    businessName: string;
    password: string;
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState<AddUserForm>({ fullName: '', phone: '', email: '', businessName: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = <K extends keyof AddUserForm>(k: K, v: AddUserForm[K]) => {
        setForm(prev => ({ ...prev, [k]: v }));
        setError(null);
    };

    const handleSubmit = async () => {
        setError(null);
        if (!form.fullName.trim()) { setError('Full name is required'); return; }
        if (!/^\d{10}$/.test(form.phone)) { setError('Enter a valid 10-digit phone'); return; }
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Enter a valid email'); return; }
        if (form.password && form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
        setSubmitting(true);
        try {
            const res = await fetch('/api/v1/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: form.fullName.trim(),
                    phone: form.phone,
                    email: form.email.trim() || undefined,
                    businessName: form.businessName.trim() || undefined,
                    password: form.password || undefined,
                    role: 'customer',
                }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error?.message || json.error || 'Failed to create user');
                return;
            }
            toast.success('Customer created');
            onCreated();
        } catch {
            setError('Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[480px] max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
                    <h2 className="text-[18px] font-[800] text-[#181725]">Add new customer</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-[12px] text-gray-500 -mt-1">
                        Adding a vendor? Use <Link href="/admin/vendors" className="font-bold text-[#299E60] hover:underline">Vendors → Add Vendor</Link>.
                    </p>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-[13px] text-red-600 font-medium">
                            {error}
                        </div>
                    )}

                    <Field label="Full name *">
                        <input type="text" value={form.fullName} onChange={e => update('fullName', e.target.value)}
                            placeholder="Enter full name"
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#299E60] transition-colors" />
                    </Field>

                    <Field label="Business name" hint="(restaurant / hotel)">
                        <input type="text" value={form.businessName} onChange={e => update('businessName', e.target.value)}
                            placeholder="Restaurant / hotel"
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#299E60] transition-colors" />
                    </Field>

                    <Field label="Phone *" hint="10 digits, no +91">
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-[13px] font-bold text-gray-500 select-none">+91</span>
                            <input type="tel" inputMode="numeric" maxLength={10}
                                value={form.phone} onChange={e => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="10 digit mobile number"
                                className="w-full pl-11 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#299E60] transition-colors" />
                        </div>
                    </Field>

                    <Field label="Email" hint="(optional)">
                        <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#299E60] transition-colors" />
                    </Field>

                    <Field label="Password" hint="(optional — lets them skip OTP next time)">
                        <div className="relative">
                            <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                                placeholder="At least 6 characters" autoComplete="new-password"
                                className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#299E60] transition-colors" />
                            <button type="button" onClick={() => setShowPwd(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPwd ? <EyeOff size={15} /> : <EyeIcon size={15} />}
                            </button>
                        </div>
                    </Field>
                </div>

                <div className="px-6 py-4 border-t border-[#EEEEEE] flex justify-end gap-2">
                    <button onClick={onClose} disabled={submitting}
                        className="px-4 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                        className="px-5 py-2 bg-[#299E60] hover:bg-[#238a53] text-white text-[13px] font-bold rounded-lg flex items-center gap-2 disabled:opacity-60 transition-colors">
                        {submitting && <Loader2 size={14} className="animate-spin" />}
                        Create user
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-[12px] font-bold text-gray-700 ml-0.5">
                {label} {hint && <span className="font-normal text-gray-400">{hint}</span>}
            </label>
            {children}
        </div>
    );
}
