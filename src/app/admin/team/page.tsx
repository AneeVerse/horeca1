'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    Users, Plus, Trash2, Loader2, Crown, Shield, Edit3, Eye, AlertCircle, X, UserPlus, Settings2, KeyRound, Pencil, Check,
} from 'lucide-react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { TeamRolesEditor } from '@/components/features/team/TeamRolesEditor';
import { ResetPasswordModal } from '@/components/features/team/ResetPasswordModal';
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
    permissions: Record<string, Record<string, boolean>>;
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
    const { data: session, status: sessionStatus } = useSession();
    const currentUserId = (session?.user as { id?: string })?.id;
    const perms = useAdminPermissions();
    const canManage = perms.canManageTeam;
    const confirm = useConfirm();

    const [team, setTeam] = useState<TeamMember[]>([]);
    const [roles, setRoles] = useState<AdminRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [showRolesEditor, setShowRolesEditor] = useState(false);
    const [passwordMember, setPasswordMember] = useState<TeamMember | null>(null);
    const [editingRole, setEditingRole] = useState<TeamMember | null>(null);

    const fetchTeam = useCallback(async () => {
        try {
            setLoading(true);
            const [teamRes, rolesRes] = await Promise.all([
                fetch('/api/v1/admin/team').then(r => r.json()),
                fetch('/api/v1/admin/roles').then(r => r.json()),
            ]);
            if (teamRes.success) setTeam(teamRes.data);
            if (rolesRes.success) setRoles(rolesRes.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

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

                                    {/* Role badge */}
                                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] shrink-0"
                                        style={{ backgroundColor: look.bg, color: look.color }}>
                                        <look.Icon size={13} />
                                        <span className="text-[12px] font-bold">{member.role.name}</span>
                                    </div>

                                    <span className="text-[12px] text-[#AEAEAE] hidden md:block shrink-0 w-[90px] text-right">
                                        {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                    </span>

                                    <div className="shrink-0 flex items-center gap-1">
                                        {isOwnerRow ? (
                                            <>
                                                <span className="text-[11px] text-[#AEAEAE] px-1">Owner</span>
                                                <button onClick={() => setPasswordMember(member)}
                                                    className="p-2 rounded-[8px] hover:bg-gray-100 transition-colors" title="Reset password">
                                                    <KeyRound size={14} className="text-[#AEAEAE]" />
                                                </button>
                                            </>
                                        ) : isSelf ? (
                                            <>
                                                <span className="text-[11px] text-[#AEAEAE] px-1">You</span>
                                                <button onClick={() => setPasswordMember(member)}
                                                    className="p-2 rounded-[8px] hover:bg-gray-100 transition-colors" title="Reset password">
                                                    <KeyRound size={14} className="text-[#AEAEAE]" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setEditingRole(member)}
                                                    className="p-2 rounded-[8px] hover:bg-amber-50 transition-colors" title="Change role">
                                                    <Pencil size={14} className="text-[#F59E0B]" />
                                                </button>
                                                <button onClick={() => setPasswordMember(member)}
                                                    className="p-2 rounded-[8px] hover:bg-gray-100 transition-colors" title="Reset password">
                                                    <KeyRound size={14} className="text-[#AEAEAE]" />
                                                </button>
                                                <button onClick={() => handleRemove(member)}
                                                    className="p-2 rounded-[8px] hover:bg-red-50 transition-colors" title="Remove">
                                                    <Trash2 size={14} className="text-[#E74C3C]" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#FFF7E6] border border-amber-200 rounded-[12px]">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-[13px] font-bold text-amber-800">How RBAC works</p>
                    <p className="text-[12px] text-amber-600 mt-0.5">
                        Each role grants a specific set of permissions (e.g. <code>orders.edit</code>, <code>users.create</code>).
                        Permission changes apply automatically within 60 seconds — no re-login required.
                    </p>
                </div>
            </div>

            {showInvite && (
                <InviteModal
                    roles={roles}
                    onClose={() => setShowInvite(false)}
                    onInvited={() => { fetchTeam(); setShowInvite(false); }}
                />
            )}

            {editingRole && (
                <EditRoleModal
                    member={editingRole}
                    roles={roles}
                    onClose={() => setEditingRole(null)}
                    onSaved={(newRoleId) => {
                        const nextRole = roles.find(r => r.id === newRoleId);
                        setTeam(prev => prev.map(m => m.user.id === editingRole.user.id && nextRole
                            ? { ...m, role: { id: nextRole.id, name: nextRole.name, scope: nextRole.scope, description: nextRole.description } }
                            : m));
                    }}
                />
            )}

            {passwordMember && (
                <ResetPasswordModal
                    member={passwordMember}
                    passwordEndpoint={`/api/v1/admin/team/${passwordMember.user.id}/password`}
                    accent="#E74C3C"
                    onClose={() => setPasswordMember(null)}
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

// ─── Invite Modal ──────────────────────────────────────────────────────────────

const PERM_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'] as const;

function InviteModal({ roles, onClose, onInvited }: { roles: AdminRole[]; onClose: () => void; onInvited: () => void }) {
    const [step, setStep] = useState<1 | 2>(1);
    const [identifier, setIdentifier] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
    const [customPerms, setCustomPerms] = useState<Record<string, Record<string, boolean>>>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedRole = roles.find(r => r.id === roleId);

    const handleRoleSelect = (id: string) => {
        const r = roles.find(x => x.id === id);
        setRoleId(id);
        setCustomPerms(r ? JSON.parse(JSON.stringify(r.permissions)) : {});
    };

    const goToStep2 = () => {
        if (!identifier.trim()) { setError('Email or phone is required'); return; }
        setError(null);
        if (Object.keys(customPerms).length === 0) {
            const r = roles.find(x => x.id === roleId);
            setCustomPerms(r ? JSON.parse(JSON.stringify(r.permissions)) : {});
        }
        setStep(2);
    };

    const togglePerm = (mod: string, action: string) => {
        setCustomPerms(prev => ({
            ...prev,
            [mod]: { ...prev[mod], [action]: !prev[mod]?.[action] },
        }));
    };

    const isDirty = selectedRole && JSON.stringify(customPerms) !== JSON.stringify(selectedRole.permissions);

    const handleSubmit = async () => {
        try {
            setSubmitting(true); setError(null);
            const body: Record<string, unknown> = {
                identifier: identifier.trim(),
                fullName: fullName.trim() || undefined,
                password: password || undefined,
            };
            if (isDirty) body.permissions = customPerms;
            else body.roleId = roleId;

            const res = await fetch('/api/v1/admin/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to invite');
            onInvited();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to invite');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-[15000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] w-full max-w-[520px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <UserPlus size={18} className="text-[#E74C3C]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Add Admin Team Member</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#AEAEAE]">Step {step} of 2</span>
                        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-[#7C7C7C]" /></button>
                    </div>
                </div>
                <div className="flex gap-1.5 px-6 pb-4 shrink-0">
                    {[1, 2].map(s => (
                        <div key={s} className="h-1 rounded-full transition-all flex-1" style={{ backgroundColor: s <= step ? '#E74C3C' : '#EEEEEE' }} />
                    ))}
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Email or Phone *</label>
                                <input type="text" autoComplete="off" value={identifier} onChange={e => setIdentifier(e.target.value)}
                                    placeholder="admin@horeca1.com or 9876543210"
                                    className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white transition-colors" />
                                <p className="text-[11px] text-[#AEAEAE] mt-1">Existing accounts get promoted to admin. For new accounts fill the fields below.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Full Name</label>
                                    <input type="text" autoComplete="off" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="New accounts only"
                                        className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Password</label>
                                    <input type="password" name="newPassword" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New accounts only"
                                        className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#E74C3C]/40 bg-[#FAFAFA] focus:bg-white transition-colors" />
                                </div>
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-[8px] p-2.5">
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button onClick={goToStep2} disabled={!identifier.trim()}
                                    className="flex-1 h-[44px] bg-[#E74C3C] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#c0392b] disabled:opacity-50 transition-colors">
                                    Next →
                                </button>
                                <button onClick={onClose} className="h-[44px] px-6 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-2">Role</label>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map(r => {
                                        const look = lookFor(r.name);
                                        const active = r.id === roleId;
                                        return (
                                            <button key={r.id} type="button" onClick={() => handleRoleSelect(r.id)}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-bold border-2 transition-all hover:shadow-sm"
                                                style={active
                                                    ? { background: look.bg, borderColor: look.color, color: look.color }
                                                    : { background: 'white', borderColor: '#EEEEEE', color: '#7C7C7C' }}>
                                                <look.Icon size={13} /> {r.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedRole?.description && (
                                    <p className="text-[11px] text-[#7C7C7C] mt-1.5">{selectedRole.description}</p>
                                )}
                            </div>

                            {Object.keys(customPerms).length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">
                                            Permissions {isDirty && <span className="text-[#E74C3C] normal-case font-normal">(customized)</span>}
                                        </label>
                                        {isDirty && (
                                            <button onClick={() => handleRoleSelect(roleId)} className="text-[10px] text-[#AEAEAE] hover:text-[#E74C3C] underline transition-colors">
                                                Reset defaults
                                            </button>
                                        )}
                                    </div>
                                    <div className="border border-[#EEEEEE] rounded-[12px] overflow-hidden overflow-y-auto max-h-[300px]">
                                        <table className="w-full text-[11px] min-w-[400px]">
                                            <thead className="sticky top-0 bg-[#FAFAFA] z-10">
                                                <tr>
                                                    <th className="text-left px-4 py-2.5 font-bold text-[#7C7C7C] uppercase tracking-wider text-[10px]">Module</th>
                                                    {PERM_ACTIONS.map(a => (
                                                        <th key={a} className="text-center px-1 py-2.5 font-bold text-[#7C7C7C] uppercase tracking-wider text-[10px] w-[54px] capitalize">{a}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(customPerms).map(([mod, actions]) => (
                                                    <tr key={mod} className="border-t border-[#F5F5F5]">
                                                        <td className="px-4 py-2 font-bold text-[#181725] text-[12px] capitalize">{mod}</td>
                                                        {PERM_ACTIONS.map(a => (
                                                            <td key={a} className="text-center px-1 py-2">
                                                                <button type="button" onClick={() => togglePerm(mod, a)}
                                                                    title={`Toggle ${mod}.${a}`}
                                                                    className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center mx-auto transition-all hover:scale-110 hover:opacity-80"
                                                                    style={{ backgroundColor: actions[a] ? '#E74C3C' : '#F0F0F0' }}>
                                                                    {actions[a]
                                                                        ? <Check size={12} className="text-white" />
                                                                        : <span className="text-[#BBBBBB] text-[10px] leading-none">—</span>}
                                                                </button>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-[10px] text-[#AEAEAE] mt-1.5">Tap any cell to toggle. Changes override the selected role.</p>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-[8px] p-2.5">
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => { setStep(1); setError(null); }}
                                    className="h-[44px] px-5 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors">
                                    ← Back
                                </button>
                                <button onClick={handleSubmit} disabled={submitting || !roleId}
                                    className="flex-1 h-[44px] bg-[#E74C3C] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#c0392b] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                    {submitting ? 'Inviting…' : 'Invite Admin'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Edit Role Modal ───────────────────────────────────────────────────────────

function EditRoleModal({ member, roles, onClose, onSaved }: {
    member: TeamMember;
    roles: AdminRole[];
    onClose: () => void;
    onSaved: (newRoleId: string) => void;
}) {
    const [selectedRoleId, setSelectedRoleId] = useState(member.role.id ?? roles[0]?.id ?? '');
    const [customPerms, setCustomPerms] = useState<Record<string, Record<string, boolean>>>(() => {
        const r = roles.find(x => x.id === (member.role.id ?? ''));
        return r ? JSON.parse(JSON.stringify(r.permissions)) : {};
    });
    const [saving, setSaving] = useState(false);

    const selectedRole = roles.find(r => r.id === selectedRoleId);
    const isDirty = selectedRole && JSON.stringify(customPerms) !== JSON.stringify(selectedRole.permissions);
    const hasChanged = selectedRoleId !== member.role.id || isDirty;

    const handleRoleSelect = (id: string) => {
        const r = roles.find(x => x.id === id);
        setSelectedRoleId(id);
        setCustomPerms(r ? JSON.parse(JSON.stringify(r.permissions)) : {});
    };

    const togglePerm = (mod: string, action: string) => {
        setCustomPerms(prev => ({ ...prev, [mod]: { ...prev[mod], [action]: !prev[mod]?.[action] } }));
    };

    const handleSave = async () => {
        if (!hasChanged) { onClose(); return; }
        setSaving(true);
        try {
            const body: Record<string, unknown> = isDirty
                ? { permissions: customPerms }
                : { roleId: selectedRoleId };
            const res = await fetch(`/api/v1/admin/team/${member.user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            onSaved(selectedRoleId);
            toast.success('Role updated');
            onClose();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update role');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[15000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] w-full max-w-[520px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
                <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <Shield size={18} className="text-[#E74C3C]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Change Role — {member.user.fullName}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-[#7C7C7C]" /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {roles.map(role => {
                            const look = lookFor(role.name);
                            const active = role.id === selectedRoleId;
                            return (
                                <button key={role.id} onClick={() => handleRoleSelect(role.id)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-bold border-2 transition-all hover:shadow-sm"
                                    style={active
                                        ? { background: look.bg, borderColor: look.color, color: look.color }
                                        : { background: 'white', borderColor: '#EEEEEE', color: '#7C7C7C' }}>
                                    <look.Icon size={12} /> {role.name}
                                </button>
                            );
                        })}
                    </div>
                    {selectedRole?.description && (
                        <p className="text-[11px] text-[#7C7C7C]">{selectedRole.description}</p>
                    )}

                    {Object.keys(customPerms).length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">
                                    Permissions {isDirty && <span className="text-[#E74C3C] normal-case font-normal">(customized)</span>}
                                </label>
                                {isDirty && (
                                    <button onClick={() => handleRoleSelect(selectedRoleId)} className="text-[10px] text-[#AEAEAE] hover:text-[#E74C3C] underline transition-colors">
                                        Reset defaults
                                    </button>
                                )}
                            </div>
                            <div className="border border-[#EEEEEE] rounded-[12px] overflow-hidden overflow-y-auto max-h-[300px]">
                                <table className="w-full text-[11px] min-w-[400px]">
                                    <thead className="sticky top-0 bg-[#FAFAFA] z-10">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 font-bold text-[#7C7C7C] uppercase tracking-wider text-[10px]">Module</th>
                                            {PERM_ACTIONS.map(a => (
                                                <th key={a} className="text-center px-1 py-2.5 font-bold text-[#7C7C7C] uppercase tracking-wider text-[10px] w-[54px] capitalize">{a}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(customPerms).map(([mod, actions]) => (
                                            <tr key={mod} className="border-t border-[#F5F5F5]">
                                                <td className="px-4 py-2 font-bold text-[#181725] text-[12px] capitalize">{mod}</td>
                                                {PERM_ACTIONS.map(a => (
                                                    <td key={a} className="text-center px-1 py-2">
                                                        <button type="button" onClick={() => togglePerm(mod, a)}
                                                            title={`Toggle ${mod}.${a}`}
                                                            className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center mx-auto transition-all hover:scale-110 hover:opacity-80"
                                                            style={{ backgroundColor: actions[a] ? '#E74C3C' : '#F0F0F0' }}>
                                                            {actions[a]
                                                                ? <Check size={12} className="text-white" />
                                                                : <span className="text-[#BBBBBB] text-[10px] leading-none">—</span>}
                                                        </button>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[10px] text-[#AEAEAE] mt-1.5">Tap any cell to toggle. Changes override the selected role.</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button onClick={handleSave} disabled={saving || !hasChanged}
                            className="flex-1 h-[42px] bg-[#E74C3C] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#c0392b] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            Save Changes
                        </button>
                        <button onClick={onClose} className="h-[42px] px-5 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

