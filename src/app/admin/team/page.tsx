'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    Users, Plus, Trash2, Loader2, Crown, Shield, Edit3, Eye, AlertCircle, X, UserPlus, Settings2, KeyRound,
} from 'lucide-react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { TeamRolesEditor } from '@/components/features/team/TeamRolesEditor';
import { toast } from 'sonner';

interface TeamMember {
    id: string;
    isOwner: boolean;
    createdAt: string;
    user: {
        id: string;
        fullName: string;
        email: string | null;
        phone: string | null;
        hcidDisplay: string | null;
        isActive: boolean;
    };
    role: {
        id: string | null;
        name: string;
        scope: 'admin' | 'vendor' | 'brand';
        description: string | null;
    };
}

interface AdminRole {
    id: string;
    name: string;
    scope: 'admin' | 'vendor' | 'brand';
    description: string | null;
}

const ROLE_LOOK: Record<string, { color: string; bg: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    'Super Admin':   { color: '#F59E0B', bg: '#FFF7E6', Icon: Crown },
    'Ops Admin':     { color: '#3B82F6', bg: '#EFF6FF', Icon: Shield },
    'Finance Admin': { color: '#10B981', bg: '#ECFDF5', Icon: Shield },
    'Support Agent': { color: '#8B5CF6', bg: '#F3F0FF', Icon: Edit3 },
    Editor:          { color: '#8B5CF6', bg: '#F3F0FF', Icon: Edit3 },
    Viewer:          { color: '#6B7280', bg: '#F3F4F6', Icon: Eye },
};

function lookFor(roleName: string) {
    return ROLE_LOOK[roleName] ?? ROLE_LOOK.Viewer;
}

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminTeamPage() {
    const { data: session, status: sessionStatus, update: updateSession } = useSession();
    const currentUserId = (session?.user as { id?: string })?.id;
    const perms = useAdminPermissions();
    const canManage = perms.canManageTeam;
    const confirm = useConfirm();

    const [team, setTeam] = useState<TeamMember[]>([]);
    const [roles, setRoles] = useState<AdminRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [showRolesEditor, setShowRolesEditor] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    const fetchTeam = useCallback(async () => {
        try {
            setLoading(true);
            const [teamRes, rolesRes] = await Promise.all([
                fetch('/api/v1/admin/team').then(r => r.json()),
                fetch('/api/v1/admin/roles').then(r => r.json()),
            ]);
            if (teamRes.success) setTeam(teamRes.data);
            if (rolesRes.success) setRoles(rolesRes.data);
        } catch { /* silent — banner state handles network failure */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const handleRoleChange = async (member: TeamMember, newRoleId: string) => {
        try {
            const res = await fetch(`/api/v1/admin/team/${member.user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleId: newRoleId }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to update role');
            const nextRole = roles.find(r => r.id === newRoleId);
            setTeam(prev => prev.map(m => m.user.id === member.user.id && nextRole
                ? { ...m, role: { id: nextRole.id, name: nextRole.name, scope: nextRole.scope, description: nextRole.description } }
                : m));
            // If the changed role is the logged-in user, refresh the JWT so their
            // permission set reloads without requiring a re-login.
            if (member.user.id === currentUserId) {
                await updateSession();
            }
            toast.success(`Role updated to ${nextRole?.name ?? 'new role'}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update role');
        }
    };

    const handleRemove = async (member: TeamMember) => {
        const ok = await confirm({
            title: 'Remove team member?',
            message: `${member.user.fullName} will lose admin access. Their account remains and they can be re-added later.`,
            confirmText: 'Remove',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            const res = await fetch(`/api/v1/admin/team/${member.user.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            setTeam(prev => prev.filter(m => m.user.id !== member.user.id));
            toast.success(`${member.user.fullName} removed from team`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove');
        }
    };

    // ── render guards ───────────────────────────────────────────────────
    if (sessionStatus === 'loading' || perms.loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={28} className="animate-spin text-[#E74C3C]" />
            </div>
        );
    }
    if (!canManage) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center max-w-md">
                    <div className="mx-auto w-12 h-12 rounded-full bg-[#FFF0F0] flex items-center justify-center mb-4">
                        <AlertCircle size={22} className="text-[#E74C3C]" />
                    </div>
                    <h2 className="text-[18px] font-bold text-[#181725] mb-1">Access restricted</h2>
                    <p className="text-[#7C7C7C] text-[14px]">You need the <code>users.create</code> permission to manage the admin team. Ask a Super Admin to grant you the Super Admin role.</p>
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
                    <p className="text-[#7C7C7C] text-[14px] font-medium">Manage who has access to the admin dashboard, and what they can do</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowRolesEditor(true)}
                        className="h-[44px] px-4 bg-white border border-[#EEEEEE] text-[#181725] rounded-[12px] text-[14px] font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                        <Settings2 size={16} /> Manage Roles
                    </button>
                    <button onClick={() => setShowInvite(true)}
                        className="h-[44px] px-5 bg-[#E74C3C] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#c0392b] transition-colors flex items-center gap-2 shadow-sm">
                        <Plus size={16} /> Add Admin
                    </button>
                </div>
            </div>

            {/* Role template legend */}
            {roles.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {roles.map((role) => {
                        const look = lookFor(role.name);
                        return (
                            <div key={role.id} className="bg-white rounded-[14px] border border-[#EEEEEE] p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: look.bg, color: look.color }}>
                                        <look.Icon size={15} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#181725]">{role.name}</span>
                                </div>
                                <p className="text-[12px] text-[#7C7C7C] leading-relaxed">{role.description ?? '—'}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Member list */}
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
                    <ul className="divide-y divide-[#F5F5F5]">
                        {team.map((member) => {
                            const look = lookFor(member.role.name);
                            const isSelf = member.user.id === currentUserId;
                            const isOwnerRow = member.isOwner;
                            return (
                                <li key={member.id} className="px-6 py-4 flex items-center gap-4">
                                    <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-[13px] font-[900] shrink-0"
                                        style={{ backgroundColor: look.bg, color: look.color }}>
                                        {initials(member.user.fullName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[14px] font-bold text-[#181725] truncate">{member.user.fullName}</p>
                                            <span className="text-[11px] font-[900] px-2 py-0.5 rounded-[5px] inline-flex items-center gap-1"
                                                style={{ color: look.color, backgroundColor: look.bg }}>
                                                <look.Icon size={11} /> {member.role.name}
                                            </span>
                                            {isOwnerRow && (
                                                <span className="text-[11px] font-bold text-[#F59E0B] bg-[#FFF7E6] px-2 py-0.5 rounded-[5px]">Primary</span>
                                            )}
                                            {!member.user.isActive && (
                                                <span className="text-[11px] font-bold text-[#AEAEAE] bg-[#F5F5F5] px-2 py-0.5 rounded-[5px]">Inactive</span>
                                            )}
                                            {member.user.hcidDisplay && (
                                                <span className="text-[11px] text-[#AEAEAE] font-mono">{member.user.hcidDisplay}</span>
                                            )}
                                        </div>
                                        <p className="text-[12px] text-[#7C7C7C] truncate">
                                            {member.user.email ?? member.user.phone ?? '—'}
                                        </p>
                                    </div>
                                    <span className="text-[12px] text-[#AEAEAE] hidden md:block shrink-0">
                                        {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    {/* Per-row controls — never on the seeded owner or on yourself */}
                                                    {isOwnerRow ? (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] text-[#AEAEAE]">Owner</span>
                                            <button onClick={() => setEditingMember(member)}
                                                className="p-1.5 rounded-[6px] hover:bg-gray-100 transition-colors" title="Reset password">
                                                <KeyRound size={14} className="text-[#AEAEAE]" />
                                            </button>
                                            {!isSelf && (
                                                <button onClick={() => handleRemove(member)}
                                                    className="p-1.5 rounded-[6px] hover:bg-red-50 transition-colors" title="Remove">
                                                    <Trash2 size={14} className="text-[#E74C3C]" />
                                                </button>
                                            )}
                                        </div>
                                    ) : isSelf ? (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] text-[#AEAEAE]">You</span>
                                            <button onClick={() => setEditingMember(member)}
                                                className="p-1.5 rounded-[6px] hover:bg-gray-100 transition-colors" title="Reset password">
                                                <KeyRound size={14} className="text-[#AEAEAE]" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <select
                                                value={member.role.id ?? ''}
                                                onChange={(e) => handleRoleChange(member, e.target.value)}
                                                disabled={!member.role.id}
                                                className="h-[32px] text-[12px] border border-[#EEEEEE] rounded-[8px] px-2 outline-none bg-white"
                                            >
                                                {!member.role.id && <option value="">{member.role.name}</option>}
                                                {roles.map((r) => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => setEditingMember(member)}
                                                className="p-1.5 rounded-[6px] hover:bg-gray-100 transition-colors" title="Reset password">
                                                <KeyRound size={14} className="text-[#AEAEAE]" />
                                            </button>
                                            <button onClick={() => handleRemove(member)}
                                                className="p-1.5 rounded-[6px] hover:bg-red-50 transition-colors" title="Remove">
                                                <Trash2 size={14} className="text-[#E74C3C]" />
                                            </button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-[#FFF7E6] border border-amber-200 rounded-[12px]">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-[13px] font-bold text-amber-800">How RBAC works</p>
                    <p className="text-[12px] text-amber-600 mt-0.5">
                        Each role grants a specific set of permissions (e.g. <code>orders.edit</code>, <code>users.create</code>).
                        Changes apply on the next JWT refresh — the user may need to re-login if their permissions don&apos;t update immediately.
                    </p>
                </div>
            </div>

            {showInvite && (
                <InviteModal
                    roles={roles}
                    onClose={() => setShowInvite(false)}
                    onInvited={() => {
                        fetchTeam();
                        setShowInvite(false);
                    }}
                />
            )}

            {editingMember && (
                <ResetPasswordModal
                    member={editingMember}
                    onClose={() => setEditingMember(null)}
                />
            )}

            <TeamRolesEditor
                isOpen={showRolesEditor}
                onClose={() => setShowRolesEditor(false)}
                endpointBase="/api/v1/admin/roles"
                accent="#E74C3C"
                onRolesChanged={fetchTeam}
            />
        </div>
    );
}

// ─── Invite Modal ──────────────────────────────────────────────────────

function InviteModal({
    roles,
    onClose,
    onInvited,
}: {
    roles: AdminRole[];
    onClose: () => void;
    onInvited: () => void;
}) {
    const [identifier, setIdentifier] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!identifier.trim() || !roleId) {
            setError('Identifier and role are required');
            return;
        }
        try {
            setSubmitting(true);
            setError(null);
            const res = await fetch('/api/v1/admin/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: identifier.trim(),
                    fullName: fullName.trim() || undefined,
                    password: password || undefined,
                    roleId,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to invite');
            onInvited();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to invite');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[15000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] w-full max-w-[480px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <UserPlus size={18} className="text-[#E74C3C]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Add Admin Team Member</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
                        <X size={16} className="text-[#7C7C7C]" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Email or phone</label>
                        <input
                            type="text"
                            autoComplete="off"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="admin@horeca1.com or 9876543210"
                            className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white transition-colors"
                        />
                        <p className="text-[11px] text-[#AEAEAE] mt-1">
                            Existing accounts get promoted to admin. For new accounts (email only), also fill in the fields below.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Full Name (new accounts)</label>
                            <input
                                type="text"
                                autoComplete="off"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. Amit Singh"
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Password (new accounts)</label>
                            <input
                                type="password"
                                name="newPassword"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Role</label>
                        <select
                            value={roleId}
                            onChange={(e) => setRoleId(e.target.value)}
                            className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-white transition-colors"
                        >
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}{r.description ? ` — ${r.description}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-[8px] p-2.5">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !identifier.trim() || !roleId}
                            className="flex-1 h-[44px] bg-[#E74C3C] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#c0392b] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {submitting ? 'Inviting…' : 'Invite Admin'}
                        </button>
                        <button onClick={onClose}
                            className="h-[44px] px-6 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Reset Password Modal ──────────────────────────────────────────────────

function ResetPasswordModal({
    member,
    onClose,
}: {
    member: TeamMember;
    onClose: () => void;
}) {
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleSubmit = async () => {
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
        try {
            setSubmitting(true);
            setError(null);
            const res = await fetch(`/api/v1/admin/team/${member.user.id}/password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            setDone(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[15000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] w-full max-w-[400px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <KeyRound size={18} className="text-[#E74C3C]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Reset Password</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
                        <X size={16} className="text-[#7C7C7C]" />
                    </button>
                </div>
                {done ? (
                    <div className="text-center py-4">
                        <p className="text-[14px] font-bold text-green-700 mb-1">Password updated</p>
                        <p className="text-[12px] text-[#7C7C7C] mb-4">{member.user.fullName} can now log in with the new password.</p>
                        <button onClick={onClose} className="px-6 py-2 bg-[#E74C3C] text-white rounded-[10px] text-[13px] font-bold">Done</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-[13px] text-[#7C7C7C]">
                            Setting a new password for <span className="font-bold text-[#181725]">{member.user.fullName}</span>{' '}
                            ({member.user.email ?? member.user.phone}).
                        </p>
                        <div>
                            <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">New Password</label>
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white transition-colors"
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-[8px] p-2.5">
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || password.length < 6}
                                className="flex-1 h-[44px] bg-[#E74C3C] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#c0392b] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {submitting ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                                {submitting ? 'Saving…' : 'Set Password'}
                            </button>
                            <button onClick={onClose} className="h-[44px] px-6 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
