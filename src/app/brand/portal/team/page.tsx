'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Plus, Trash2, Loader2, Crown, Shield, Edit3, Eye, AlertCircle, X, UserPlus, Settings2 } from 'lucide-react';
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

interface BrandRole {
    id: string;
    name: string;
    scope: 'admin' | 'vendor' | 'brand';
    description: string | null;
}

const ROLE_LOOK: Record<string, { color: string; bg: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    'Brand Admin':   { color: '#F59E0B', bg: '#FFF7E6', Icon: Crown },
    'Brand Manager': { color: '#3B82F6', bg: '#EFF6FF', Icon: Shield },
    'Brand Editor':  { color: '#8B5CF6', bg: '#F3F0FF', Icon: Edit3 },
    'Brand Viewer':  { color: '#6B7280', bg: '#F3F4F6', Icon: Eye },
};

function lookFor(roleName: string) {
    return ROLE_LOOK[roleName] ?? ROLE_LOOK['Brand Viewer'];
}

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function BrandTeamPage() {
    const { data: session, status: sessionStatus, update: updateSession } = useSession();
    const currentUserId = (session?.user as { id?: string })?.id;
    const sessionPerms = (session?.user as { permissions?: string[] })?.permissions ?? [];
    const canManage = sessionPerms.includes('users.create');
    const confirm = useConfirm();

    const [team, setTeam] = useState<TeamMember[]>([]);
    const [roles, setRoles] = useState<BrandRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [showRolesEditor, setShowRolesEditor] = useState(false);

    const fetchTeam = useCallback(async () => {
        try {
            setLoading(true);
            const [teamRes, rolesRes] = await Promise.all([
                fetch('/api/v1/brand/team').then(r => r.json()),
                fetch('/api/v1/brand/roles').then(r => r.json()),
            ]);
            if (teamRes.success) setTeam(teamRes.data);
            if (rolesRes.success) setRoles(rolesRes.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const handleRoleChange = async (member: TeamMember, newRoleId: string) => {
        try {
            const res = await fetch(`/api/v1/brand/team/${member.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleId: newRoleId }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to update role');
            const nextRole = roles.find(r => r.id === newRoleId);
            setTeam(prev => prev.map(m => m.id === member.id && nextRole
                ? { ...m, role: { id: nextRole.id, name: nextRole.name, scope: nextRole.scope, description: nextRole.description } }
                : m));
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
            message: `${member.user.fullName} will lose access to this brand portal. They can be re-added later.`,
            confirmText: 'Remove',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            const res = await fetch(`/api/v1/brand/team/${member.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            setTeam(prev => prev.filter(m => m.id !== member.id));
            toast.success(`${member.user.fullName} removed from team`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove');
        }
    };

    if (sessionStatus === 'loading') {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={28} className="animate-spin text-[#53B175]" />
            </div>
        );
    }

    return (
        <div className="max-w-[900px] mx-auto space-y-6 pb-10 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[26px] font-[900] text-[#181725] tracking-tight">Team</h1>
                    <p className="text-[#7C7C7C] font-medium mt-0.5 text-[14px]">Manage your brand team members and their permissions</p>
                </div>
                {canManage && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowRolesEditor(true)}
                            className="h-[40px] px-3.5 bg-white border border-[#EEEEEE] text-[#181725] rounded-[10px] text-[13px] font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-sm">
                            <Settings2 size={15} /> Manage Roles
                        </button>
                        <button onClick={() => setShowInvite(true)}
                            className="h-[40px] px-4 bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#3d9e41] transition-colors flex items-center gap-1.5 shadow-sm">
                            <Plus size={16} /> Add Member
                        </button>
                    </div>
                )}
            </div>

            {roles.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

            <div className="bg-white rounded-[20px] border border-[#EEEEEE] overflow-hidden">
                <div className="p-5 border-b border-[#EEEEEE] flex items-center gap-2">
                    <Users size={18} className="text-[#53B175]" />
                    <h2 className="text-[16px] font-bold text-[#181725]">Team Members</h2>
                    <span className="text-[13px] text-[#AEAEAE]">({team.length})</span>
                </div>

                {loading ? (
                    <div className="p-8 flex justify-center"><Loader2 size={28} className="animate-spin text-[#53B175]" /></div>
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
                                    {!canManage ? <span className="shrink-0" /> : isOwnerRow ? (
                                        <span className="text-[11px] text-[#AEAEAE] shrink-0">Owner</span>
                                    ) : isSelf ? (
                                        <span className="text-[11px] text-[#AEAEAE] shrink-0">You</span>
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

            {!canManage && team.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-[12px]">
                    <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-blue-700">
                        Your role doesn&apos;t include team management — you can view team members but cannot invite or change roles.
                        Ask an owner (Brand Admin) for the access you need.
                    </p>
                </div>
            )}

            {showInvite && (
                <InviteModal
                    roles={roles}
                    onClose={() => setShowInvite(false)}
                    onInvited={(newMember) => {
                        setTeam((prev) => [...prev, newMember]);
                        setShowInvite(false);
                    }}
                />
            )}

            <TeamRolesEditor
                isOpen={showRolesEditor}
                onClose={() => setShowRolesEditor(false)}
                endpointBase="/api/v1/brand/roles"
                accent="#53B175"
                onRolesChanged={fetchTeam}
            />
        </div>
    );
}

function InviteModal({ roles, onClose, onInvited }: { roles: BrandRole[]; onClose: () => void; onInvited: (m: TeamMember) => void }) {
    const [identifier, setIdentifier] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!identifier.trim() || !roleId) { setError('Identifier and role are required'); return; }
        try {
            setSubmitting(true); setError(null);
            const res = await fetch('/api/v1/brand/team', {
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
            onInvited(json.data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to invite');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-[15000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] w-full max-w-[480px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <UserPlus size={18} className="text-[#53B175]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Add Team Member</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-[#7C7C7C]" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Email or phone</label>
                        <input type="text" autoComplete="off" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="priya@brand.com or 9876543210"
                            className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#53B175]/40 bg-[#FAFAFA] focus:bg-white transition-colors" />
                        <p className="text-[11px] text-[#AEAEAE] mt-1">Existing accounts get added to this brand. For new accounts (email only), fill in the fields below.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Full Name (new accounts)</label>
                            <input type="text" autoComplete="off" value={fullName} onChange={(e) => setFullName(e.target.value)}
                                placeholder="e.g. Priya Sharma"
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#53B175]/40 bg-[#FAFAFA] focus:bg-white transition-colors" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Password (new accounts)</label>
                            <input type="password" name="newPassword" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#53B175]/40 bg-[#FAFAFA] focus:bg-white transition-colors" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Role</label>
                        <select value={roleId} onChange={(e) => setRoleId(e.target.value)}
                            className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#53B175]/40 bg-white transition-colors">
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                            ))}
                        </select>
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-[8px] p-2.5">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSubmit} disabled={submitting || !identifier.trim() || !roleId}
                            className="flex-1 h-[44px] bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#3d9e41] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {submitting ? 'Inviting…' : 'Invite Member'}
                        </button>
                        <button onClick={onClose} className="h-[44px] px-6 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
