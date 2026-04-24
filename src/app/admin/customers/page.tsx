'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

    useEffect(() => {
        fetch('/api/v1/admin/users?limit=50')
            .then(res => res.json())
            .then(json => { if (json.success) setUsers(json.data.users); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filteredUsers = users.filter(u =>
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone || '').includes(searchQuery) ||
        (u.businessName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        </div>
    );
}
