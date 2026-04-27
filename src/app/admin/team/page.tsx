'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Plus, Trash2, Loader2, Crown, Shield, Edit3, Eye, AlertCircle } from 'lucide-react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

interface AdminTeamMember {
    id: string;
    role: 'owner' | 'manager' | 'editor' | 'viewer';
    isOwner: boolean;
    createdAt: string;
    user: { id: string; fullName: string; email: string; isActive: boolean };
}

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_CONFIG = {
    owner:   { label: 'Owner',   color: '#F59E0B', bg: '#FFF7E6', Icon: Crown,  desc: 'Full access + team management' },
    manager: { label: 'Manager', color: '#3B82F6', bg: '#EFF6FF', Icon: Shield, desc: 'Full admin access, no team management' },
    editor:  { label: 'Editor',  color: '#8B5CF6', bg: '#F3F0FF', Icon: Edit3,  desc: 'Product & content moderation only' },
    viewer:  { label: 'Viewer',  color: '#6B7280', bg: '#F3F4F6', Icon: Eye,    desc: 'Read-only access' },
};

export default function AdminTeamPage() {
    const { data: session, status: sessionStatus, update: updateSession } = useSession();
    const currentUserId = (session?.user as { id?: string })?.id;
    const perms = useAdminPermissions();
    const canManage = perms.canManageTeam;
    const confirm = useConfirm();
    const [team, setTeam] = useState<AdminTeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [memberForm, setMemberForm] = useState({ fullName: '', email: '', password: '', role: 'viewer' as 'manager' | 'editor' | 'viewer' });
    const [addingMember, setAddingMember] = useState(false);
    const [memberError, setMemberError] = useState<string | null>(null);

    const fetchTeam = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/admin/team');
            const json = await res.json();
            if (json.success) {
                setTeam(json.data);
                // "isOwner" here is used only for UI — keep it in sync with the currently
                // logged-in user's entry, not just the first row (order isn't stable).
                const me = json.data.find((m: AdminTeamMember) => m.user.id === currentUserId);
                setIsOwner(me?.isOwner ?? false);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const handleAddMember = async () => {
        if (!memberForm.fullName.trim() || !memberForm.email.trim() || !memberForm.password.trim()) {
            setMemberError('All fields are required'); return;
        }
        try {
            setAddingMember(true); setMemberError(null);
            const res = await fetch('/api/v1/admin/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memberForm),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to add member');
            setTeam(prev => [...prev, json.data]);
            setShowAddMember(false);
            setMemberForm({ fullName: '', email: '', password: '', role: 'viewer' });
        } catch (err: unknown) {
            setMemberError(err instanceof Error ? err.message : 'Failed');
        } finally { setAddingMember(false); }
    };

    const handleRemoveMember = async (member: AdminTeamMember) => {
        const ok = await confirm({
            title: 'Remove team member?',
            message: `${member.user.fullName} will lose admin access. They can be re-added later.`,
            confirmText: 'Remove',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            const res = await fetch(`/api/v1/admin/team/${member.user.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            setTeam(prev => prev.filter(m => m.id !== member.id));
            toast.success(`${member.user.fullName} removed from team`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove');
        }
    };

    const handleChangeRole = async (member: AdminTeamMember, newRole: 'manager' | 'editor' | 'viewer') => {
        try {
            const res = await fetch(`/api/v1/admin/team/${member.user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            setTeam(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
            // If the changed member is the logged-in user, refresh the JWT so the
            // new adminTeamRole flows into session/ctx immediately (otherwise the
            // user keeps their cached role until next sign-in and RBAC is stale).
            if (member.user.id === currentUserId) {
                await updateSession();
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update role');
        }
    };

    if (sessionStatus !== 'loading' && !canManage) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center max-w-md">
                    <div className="mx-auto w-12 h-12 rounded-full bg-[#FFF0F0] flex items-center justify-center mb-4">
                        <AlertCircle size={22} className="text-[#E74C3C]" />
                    </div>
                    <h2 className="text-[18px] font-bold text-[#181725] mb-1">Access restricted</h2>
                    <p className="text-[#7C7C7C] text-[14px]">Only owners can manage the admin team. Ask an owner to grant you the right role.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-bold text-[#181725] leading-none mb-1">Admin Team</h1>
                    <p className="text-[#7C7C7C] text-[14px] font-medium">Manage who has access to the admin dashboard</p>
                </div>
                {isOwner && (
                    <button onClick={() => { setShowAddMember(true); setMemberError(null); }}
                        className="h-[44px] px-5 bg-[#E74C3C] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#c0392b] transition-colors flex items-center gap-2 shadow-sm">
                        <Plus size={16} /> Add Admin
                    </button>
                )}
            </div>

            {/* Permission matrix */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="bg-white rounded-[14px] border border-[#EEEEEE] p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                <cfg.Icon size={15} />
                            </div>
                            <span className="text-[13px] font-bold text-[#181725]">{cfg.label}</span>
                        </div>
                        <p className="text-[12px] text-[#7C7C7C] leading-relaxed">{cfg.desc}</p>
                    </div>
                ))}
            </div>

            {/* Add Member Form */}
            {showAddMember && (
                <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm p-6">
                    <h3 className="text-[16px] font-bold text-[#181725] mb-4">Add Admin Team Member</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Full Name</label>
                            <input type="text" name="fullName" autoComplete="off" value={memberForm.fullName} onChange={e => setMemberForm(f => ({ ...f, fullName: e.target.value }))}
                                placeholder="e.g. Amit Singh"
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white" />
                        </div>
                        <div>
                            <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Email</label>
                            <input type="email" value={memberForm.email} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="amit@company.com"
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white" />
                        </div>
                        <div>
                            <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Password</label>
                            <input type="password" name="newPassword" autoComplete="new-password" value={memberForm.password} onChange={e => setMemberForm(f => ({ ...f, password: e.target.value }))}
                                placeholder="Min. 6 characters"
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white" />
                        </div>
                        <div>
                            <label className="block text-[12px] font-bold text-[#7C7C7C] mb-1">Access Level</label>
                            <select value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value as 'manager' | 'editor' | 'viewer' }))}
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white">
                                <option value="manager">Manager — Full admin access</option>
                                <option value="editor">Editor — Moderation only</option>
                                <option value="viewer">Viewer — Read only</option>
                            </select>
                        </div>
                    </div>
                    {memberError && (
                        <div className="mt-3 flex items-center gap-2 text-[13px] text-[#E74C3C] font-bold">
                            <AlertCircle size={14} /> {memberError}
                        </div>
                    )}
                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={handleAddMember} disabled={addingMember}
                            className="h-[44px] px-6 bg-[#E74C3C] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#c0392b] transition-colors flex items-center gap-2 disabled:opacity-50">
                            {addingMember ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {addingMember ? 'Creating...' : 'Create Admin Account'}
                        </button>
                        <button onClick={() => setShowAddMember(false)}
                            className="h-[44px] px-6 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Team Table */}
            <div className="bg-white rounded-[14px] border border-[#EEEEEE] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#EEEEEE] flex items-center gap-2">
                    <Users size={18} className="text-[#E74C3C]" />
                    <h2 className="text-[16px] font-bold text-[#181725]">Team Members</h2>
                    <span className="text-[13px] text-[#AEAEAE]">({team.length})</span>
                </div>

                {loading ? (
                    <div className="p-8 flex justify-center"><Loader2 size={28} className="animate-spin text-[#E74C3C]" /></div>
                ) : team.length === 0 ? (
                    <div className="p-8 text-center">
                        <Users size={32} className="text-[#EEEEEE] mx-auto mb-2" />
                        <p className="text-[14px] font-bold text-[#AEAEAE]">No team members yet</p>
                    </div>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 bg-[#FAFAFA] border-b border-[#EEEEEE] text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">
                            <span>Member</span>
                            <span>Role</span>
                            <span className="hidden md:block">Joined</span>
                            {isOwner && <span>Actions</span>}
                        </div>

                        <div className="divide-y divide-[#F5F5F5]">
                            {team.map(member => {
                                const cfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.viewer;
                                return (
                                    <div key={member.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-4">
                                        {/* Member info */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-[13px] font-[900] shrink-0"
                                                style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                                {getInitials(member.user.fullName)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[14px] font-bold text-[#181725] truncate">{member.user.fullName}</p>
                                                <p className="text-[12px] text-[#7C7C7C] truncate">{member.user.email}</p>
                                            </div>
                                        </div>

                                        {/* Role */}
                                        <span className="text-[11px] font-[900] px-2.5 py-1 rounded-[6px] whitespace-nowrap"
                                            style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                                            {cfg.label}
                                        </span>

                                        {/* Joined */}
                                        <span className="text-[12px] text-[#AEAEAE] whitespace-nowrap hidden md:block">
                                            {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>

                                        {/* Actions */}
                                        {isOwner ? (
                                            member.isOwner ? (
                                                <span className="text-[11px] text-[#AEAEAE]">You</span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <select value={member.role}
                                                        onChange={e => handleChangeRole(member, e.target.value as 'manager' | 'editor' | 'viewer')}
                                                        className="h-[32px] text-[12px] border border-[#EEEEEE] rounded-[8px] px-2 outline-none bg-white">
                                                        <option value="manager">Manager</option>
                                                        <option value="editor">Editor</option>
                                                        <option value="viewer">Viewer</option>
                                                    </select>
                                                    <button onClick={() => handleRemoveMember(member)}
                                                        className="p-1.5 rounded-[6px] hover:bg-red-50 transition-colors">
                                                        <Trash2 size={14} className="text-[#E74C3C]" />
                                                    </button>
                                                </div>
                                            )
                                        ) : <span />}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-[#FFF7E6] border border-amber-200 rounded-[12px]">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-[13px] font-bold text-amber-800">Security Note</p>
                    <p className="text-[12px] text-amber-600 mt-0.5">
                        Removed team members lose admin access but their accounts remain. Only the original admin owner can manage the team.
                    </p>
                </div>
            </div>
        </div>
    );
}
