'use client';

// Customer "Account Team" page — mirrors admin/vendor/brand team pages.
// Lets owners and admins of a BusinessAccount invite users, change roles,
// reset passwords, and remove members.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Loader2, Crown, Shield, Edit3, Eye, AlertCircle, X, UserPlus, Check,
} from 'lucide-react';
import { modulesForScope, type Module, type Action } from '@/lib/permissions/registry';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ResetPasswordModal } from '@/components/features/team/ResetPasswordModal';
import { TeamPageHeader } from '@/components/features/team/TeamPageHeader';
import { RoleCardsGrid } from '@/components/features/team/RoleCardsGrid';
import { TeamMemberList } from '@/components/features/team/TeamMemberList';
import { TeamRolesEditor } from '@/components/features/team/TeamRolesEditor';
import { toast } from 'sonner';

const ACCENT = '#53B175';
const ACCENT_HOVER = '#469E66';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AccountRole {
    id: string;
    name: string;
    scope: string;
    description: string | null;
    isTemplate: boolean;
    permissions: Record<string, Record<string, boolean>>;
    businessAccountId: string | null;
}

interface Outlet {
    id: string;
    name: string;
}

// Shape returned by /api/v1/account/[id]/users — see route.ts
interface AccountMemberApiRow {
    id: string;
    isPrimary: boolean;
    createdAt: string;
    acceptedAt: string | null;
    user: {
        id: string;
        fullName: string;
        email: string | null;
        phone: string | null;
        image: string | null;
        hcidDisplay: string | null;
        isActive: boolean;
        userRoles: Array<{
            id: string;
            outletId: string | null;
            role: { id: string; name: string };
        }>;
    };
}

// Shape consumed by TeamMemberList
interface TeamMember {
    id: string;            // member-row id
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
    role: { id: string | null; name: string };
    userRoles: AccountMemberApiRow['user']['userRoles'];
}

// ─── Role look ─────────────────────────────────────────────────────────────────

const ROLE_LOOK: Record<string, { color: string; bg: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    Owner:    { color: '#F59E0B', bg: '#FFF7E6', Icon: Crown },
    Manager:  { color: '#3B82F6', bg: '#EFF6FF', Icon: Shield },
    Editor:   { color: '#8B5CF6', bg: '#F3F0FF', Icon: Edit3 },
    Viewer:   { color: '#6B7280', bg: '#F3F4F6', Icon: Eye },
};

function lookFor(roleName: string) {
    return ROLE_LOOK[roleName] ?? { color: '#53B175', bg: '#E8F4EC', Icon: Shield };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AccountTeamPage() {
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession();
    const sessionUser = session?.user as
        | { id?: string; activeBusinessAccountId?: string; permissions?: string[] }
        | undefined;
    const currentUserId = sessionUser?.id;
    const accountId = sessionUser?.activeBusinessAccountId;
    const sessionPerms = sessionUser?.permissions ?? [];
    const canInvite = sessionPerms.includes('users.create');
    const canEdit = sessionPerms.includes('users.edit');
    const canDelete = sessionPerms.includes('users.delete');
    const canView = sessionPerms.includes('users.view');
    const canManage = canInvite || canEdit || canDelete || canView;
    const confirm = useConfirm();

    const [team, setTeam] = useState<TeamMember[]>([]);
    const [roles, setRoles] = useState<AccountRole[]>([]);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [showRolesEditor, setShowRolesEditor] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [passwordMember, setPasswordMember] = useState<TeamMember | null>(null);

    // Auth guard — redirect anonymous users to /login. Wait until session resolves.
    useEffect(() => {
        if (sessionStatus === 'unauthenticated') router.replace('/login');
    }, [sessionStatus, router]);

    const fetchTeam = useCallback(async () => {
        if (!accountId) return;
        try {
            setLoading(true);
            const [teamRes, rolesRes, outletsRes] = await Promise.all([
                fetch(`/api/v1/account/${accountId}/users`).then(r => r.json()),
                fetch(`/api/v1/account/${accountId}/roles?templates=true`).then(r => r.json()),
                fetch(`/api/v1/account/${accountId}/outlets`).then(r => r.json()),
            ]);
            if (teamRes.success) {
                const mapped: TeamMember[] = (teamRes.data as AccountMemberApiRow[]).map((row) => {
                    const firstRole = row.user.userRoles[0]?.role ?? null;
                    return {
                        id: row.id,
                        isOwner: row.isPrimary,
                        createdAt: row.createdAt,
                        user: {
                            id: row.user.id,
                            fullName: row.user.fullName,
                            email: row.user.email,
                            phone: row.user.phone,
                            hcidDisplay: row.user.hcidDisplay,
                            isActive: row.user.isActive,
                        },
                        role: { id: firstRole?.id ?? null, name: firstRole?.name ?? 'No role' },
                        userRoles: row.user.userRoles,
                    };
                });
                setTeam(mapped);
            }
            if (rolesRes.success) {
                // Only show account-scope roles in the cards grid + invite picker
                const filtered = (rolesRes.data as AccountRole[]).filter(r => r.scope === 'account');
                setRoles(filtered);
            }
            if (outletsRes.success) setOutlets(outletsRes.data as Outlet[]);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [accountId]);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const handleRemove = async (member: TeamMember) => {
        if (!accountId) return;
        const ok = await confirm({
            title: 'Remove team member?',
            message: `${member.user.fullName} will lose access to this business account. They can be re-added later.`,
            confirmText: 'Remove',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            const res = await fetch(`/api/v1/account/${accountId}/users/${member.user.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            setTeam(prev => prev.filter(m => m.user.id !== member.user.id));
            toast.success(`${member.user.fullName} removed from team`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove');
        }
    };

    // Cards grid — only template roles in the account scope (Owner, etc.)
    const visibleRoles = useMemo(() => roles.filter(r => r.isTemplate), [roles]);

    if (sessionStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={28} className="animate-spin text-[#53B175]" />
            </div>
        );
    }

    if (!accountId) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <div className="mx-auto w-12 h-12 rounded-full bg-[#E8F4EC] flex items-center justify-center mb-4">
                        <AlertCircle size={22} className="text-[#53B175]" />
                    </div>
                    <h2 className="text-[18px] font-bold text-[#181725] mb-1">Select a business account first</h2>
                    <p className="text-[#7C7C7C] text-[14px] mb-4">
                        You don&apos;t have an active business account yet. Create one from your profile to manage team members.
                    </p>
                    <button onClick={() => router.push('/profile')}
                        className="px-5 h-[42px] bg-[#53B175] hover:bg-[#469E66] text-white rounded-[10px] text-[13px] font-bold transition-colors">
                        Back to profile
                    </button>
                </div>
            </div>
        );
    }

    if (!canManage) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <div className="mx-auto w-12 h-12 rounded-full bg-[#E8F4EC] flex items-center justify-center mb-4">
                        <AlertCircle size={22} className="text-[#53B175]" />
                    </div>
                    <h2 className="text-[18px] font-bold text-[#181725] mb-1">Access restricted</h2>
                    <p className="text-[#7C7C7C] text-[14px]">
                        You need at least one of <code>users.view</code>, <code>users.create</code>, <code>users.edit</code>,
                        or <code>users.delete</code> to manage the account team. Ask the account owner for access.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F2F3F2]">
            <div className="max-w-[var(--container-max)] mx-auto px-[var(--container-padding)] py-8 space-y-6 pb-16 animate-in fade-in duration-300">
                <TeamPageHeader
                    title="Account Team"
                    subtitle="Manage who can view orders, place repeat orders, settle invoices and act on behalf of your business."
                    accent={ACCENT}
                    accentHover={ACCENT_HOVER}
                    addLabel="Invite Member"
                    canEdit={canEdit}
                    canInvite={canInvite}
                    onManageRolesClick={() => setShowRolesEditor(true)}
                    onAddMemberClick={() => setShowInvite(true)}
                />

                <RoleCardsGrid roles={visibleRoles} getStyle={lookFor} />

                <TeamMemberList
                    members={team}
                    loading={loading}
                    accent={ACCENT}
                    currentUserId={currentUserId}
                    getRoleStyle={lookFor}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={(m) => setEditingMember(m as TeamMember)}
                    onResetPassword={(m) => setPasswordMember(m as TeamMember)}
                    onRemove={(m) => handleRemove(m as TeamMember)}
                />

                <div className="flex items-start gap-3 p-4 bg-[#E8F4EC] border border-[#53B175]/20 rounded-[12px]">
                    <AlertCircle size={16} className="text-[#53B175] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-bold text-[#1F6A3E]">How team access works</p>
                        <p className="text-[12px] text-[#2E7D52] mt-0.5">
                            Each role grants a specific set of permissions (e.g. <code>orders.edit</code>, <code>users.create</code>).
                            Use <strong>Manage Roles</strong> to create custom roles tailored to your business.
                        </p>
                    </div>
                </div>

                {showInvite && (
                    <InviteModal
                        accountId={accountId}
                        roles={roles}
                        outlets={outlets}
                        onClose={() => setShowInvite(false)}
                        onInvited={() => { fetchTeam(); setShowInvite(false); }}
                    />
                )}

                {editingMember && (
                    <EditRoleModal
                        accountId={accountId}
                        member={editingMember}
                        roles={roles}
                        outlets={outlets}
                        onClose={() => setEditingMember(null)}
                        onSaved={() => { setEditingMember(null); fetchTeam(); }}
                    />
                )}

                {passwordMember && (
                    <ResetPasswordModal
                        member={passwordMember}
                        passwordEndpoint={`/api/v1/account/${accountId}/users/${passwordMember.user.id}/password`}
                        accent={ACCENT}
                        onClose={() => setPasswordMember(null)}
                    />
                )}

                {accountId && (
                    <TeamRolesEditor
                        isOpen={showRolesEditor}
                        onClose={() => setShowRolesEditor(false)}
                        endpointBase={`/api/v1/account/${accountId}/roles`}
                        accent={ACCENT}
                        scope="account"
                        onRolesChanged={fetchTeam}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Invite Modal ──────────────────────────────────────────────────────────────

interface InviteModalProps {
    accountId: string;
    roles: AccountRole[];
    outlets: Outlet[];
    onClose: () => void;
    onInvited: () => void;
}

// Modules a customer-team role is allowed to grant — filters out vendor-only
// modules (GRN, dispatch, inventory, etc.) from the inline matrix.
const ACCOUNT_MODULES = modulesForScope('account');
const PERM_ACTIONS: readonly Action[] = ['view', 'create', 'edit', 'delete', 'approve'];

function InviteModal({ accountId, roles, outlets, onClose, onInvited }: InviteModalProps) {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const initialRoleId = roles[0]?.id ?? '';
    const [roleId, setRoleId] = useState(initialRoleId);
    const [customPerms, setCustomPerms] = useState<Record<string, Record<string, boolean>>>(() => {
        const r = roles[0];
        return r ? JSON.parse(JSON.stringify(r.permissions)) : {};
    });
    const [outletId, setOutletId] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // When the user picks a different role chip, snap the matrix back to that
    // role's permissions. After that, any cell toggle marks the matrix dirty
    // and we send `permissions` to the server (which creates a custom
    // scope='account' role) instead of `roleId`.
    const handleRoleSelect = (id: string) => {
        const r = roles.find(x => x.id === id);
        setRoleId(id);
        setCustomPerms(r ? JSON.parse(JSON.stringify(r.permissions)) : {});
    };

    const togglePerm = (mod: string, action: string) => {
        setCustomPerms(prev => ({
            ...prev,
            [mod]: { ...prev[mod], [action]: !prev[mod]?.[action] },
        }));
    };

    const selectedRole = roles.find(r => r.id === roleId);
    const isDirty = selectedRole
        ? JSON.stringify(customPerms) !== JSON.stringify(selectedRole.permissions)
        : Object.keys(customPerms).length > 0;

    const handleSubmit = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedName = fullName.trim();
        if (!trimmedEmail) { setError('Email is required'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError('Enter a valid email address'); return; }
        if (!trimmedName) { setError('Full name is required'); return; }
        if (password.length < 6 || password.length > 72) { setError('Password must be 6–72 characters'); return; }
        if (!roleId && !isDirty) { setError('Pick a role'); return; }

        try {
            setSubmitting(true); setError(null);
            const body: Record<string, unknown> = {
                identifier: trimmedEmail,
                fullName: trimmedName,
                password,
            };
            // Send custom permissions when the matrix has been edited away from
            // the picked role — the server then mints a new scope='account'
            // role for this invitee. Otherwise just send the picked roleId.
            if (isDirty) body.permissions = customPerms;
            else body.roleId = roleId;
            if (outletId) body.outletId = outletId;
            const res = await fetch(`/api/v1/account/${accountId}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed to invite');
            toast.success(`${trimmedName} added to the team`);
            onInvited();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to invite');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-[15000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] w-full max-w-[520px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <UserPlus size={18} className="text-[#53B175]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Invite Team Member</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-[#7C7C7C]" /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Email *</label>
                        <input
                            type="email"
                            autoComplete="off"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="member@business.com"
                            className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#53B175]/40 bg-[#FAFAFA] focus:bg-white transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Full name *</label>
                        <input
                            type="text"
                            autoComplete="off"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Their full name"
                            className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#53B175]/40 bg-[#FAFAFA] focus:bg-white transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Password *</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="newPassword"
                                autoComplete="new-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="6–72 characters"
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] pl-4 pr-12 text-[14px] outline-none focus:border-[#53B175]/40 bg-[#FAFAFA] focus:bg-white transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(s => !s)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#7C7C7C] hover:text-[#181725] px-2 py-1 rounded hover:bg-gray-100"
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <p className="text-[11px] text-[#AEAEAE] mt-1">This password will be emailed to them so they can sign in.</p>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-2">Role *</label>
                        {roles.length === 0 ? (
                            <p className="text-[12px] text-[#7C7C7C] bg-[#FAFAFA] border border-[#EEEEEE] rounded-[10px] p-3">
                                No roles available. Ask your admin to create roles first.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {roles.map(r => {
                                    const look = lookFor(r.name);
                                    const active = r.id === roleId;
                                    return (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => handleRoleSelect(r.id)}
                                            className="flex items-start gap-2 p-3 rounded-[10px] text-left border-2 transition-all hover:shadow-sm"
                                            style={active
                                                ? { background: look.bg, borderColor: look.color }
                                                : { background: 'white', borderColor: '#EEEEEE' }}
                                        >
                                            <div className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0"
                                                style={{ background: look.bg, color: look.color }}>
                                                <look.Icon size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-[#181725] leading-tight">{r.name}</p>
                                                {r.description && (
                                                    <p className="text-[11px] text-[#7C7C7C] mt-0.5 line-clamp-2">{r.description}</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Permission matrix — narrowed to account-scope modules so
                        customer-team admins don't see vendor-only modules like
                        GRN / dispatch / inventory. Tap any cell to toggle; once
                        the matrix differs from the picked role, the server
                        creates a custom scope='account' role for this invitee. */}
                    {roles.length > 0 && Object.keys(ACCOUNT_MODULES).length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">
                                    Permissions {isDirty && <span className="text-[#53B175] normal-case font-normal">(customized)</span>}
                                </label>
                                {isDirty && (
                                    <button onClick={() => handleRoleSelect(roleId)} className="text-[10px] text-[#AEAEAE] hover:text-[#53B175] underline transition-colors">
                                        Reset to role
                                    </button>
                                )}
                            </div>
                            <div className="border border-[#EEEEEE] rounded-[12px] overflow-hidden overflow-y-auto max-h-[280px]">
                                <table className="w-full text-[11px] min-w-[380px]">
                                    <thead className="sticky top-0 bg-[#FAFAFA] z-10">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 font-bold text-[#7C7C7C] uppercase tracking-wider text-[10px]">Module</th>
                                            {PERM_ACTIONS.map(a => (
                                                <th key={a} className="text-center px-1 py-2.5 font-bold text-[#7C7C7C] uppercase tracking-wider text-[10px] w-[54px] capitalize">{a}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(Object.entries(ACCOUNT_MODULES) as Array<[Module, readonly Action[]]>).map(([mod, allowedActions]) => (
                                            <tr key={mod} className="border-t border-[#F5F5F5]">
                                                <td className="px-4 py-2 font-bold text-[#181725] text-[12px] capitalize">{mod}</td>
                                                {PERM_ACTIONS.map(a => {
                                                    const supported = allowedActions.includes(a);
                                                    const checked = !!customPerms[mod]?.[a];
                                                    if (!supported) {
                                                        return (
                                                            <td key={a} className="text-center px-1 py-2">
                                                                <span className="inline-block w-[22px] h-[22px] rounded-[5px] bg-[#FAFAFA] text-[#DDDDDD] leading-[22px] cursor-not-allowed">·</span>
                                                            </td>
                                                        );
                                                    }
                                                    return (
                                                        <td key={a} className="text-center px-1 py-2">
                                                            <button type="button" onClick={() => togglePerm(mod, a)}
                                                                title={`Toggle ${mod}.${a}`}
                                                                className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center mx-auto transition-all hover:scale-110 hover:opacity-80"
                                                                style={{ backgroundColor: checked ? '#53B175' : '#F0F0F0' }}>
                                                                {checked
                                                                    ? <Check size={12} className="text-white" />
                                                                    : <span className="text-[#BBBBBB] text-[10px] leading-none">—</span>}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[10px] text-[#AEAEAE] mt-1.5">Tap any cell to toggle. Changes override the picked role.</p>
                        </div>
                    )}

                    {outlets.length > 0 && (
                        <div>
                            <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Limit to outlet (optional)</label>
                            <select
                                value={outletId}
                                onChange={e => setOutletId(e.target.value)}
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#53B175]/40 bg-[#FAFAFA] focus:bg-white transition-colors"
                            >
                                <option value="">All outlets</option>
                                {outlets.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-[8px] p-2.5">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !roleId}
                            className="flex-1 h-[44px] bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#469E66] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
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

// ─── Edit Role Modal ───────────────────────────────────────────────────────────

interface EditRoleModalProps {
    accountId: string;
    member: TeamMember;
    roles: AccountRole[];
    outlets: Outlet[];
    onClose: () => void;
    onSaved: () => void;
}

function EditRoleModal({ accountId, member, roles, outlets, onClose, onSaved }: EditRoleModalProps) {
    // Seed from the member's existing UserRole rows, falling back to their first role.
    const existing = member.userRoles[0];
    const [roleId, setRoleId] = useState(existing?.role.id ?? member.role.id ?? roles[0]?.id ?? '');
    const [outletId, setOutletId] = useState<string>(existing?.outletId ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!roleId) { setError('Pick a role'); return; }
        try {
            setSaving(true); setError(null);
            const res = await fetch(`/api/v1/account/${accountId}/users/${member.user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignments: [{ roleId, outletId: outletId || null }],
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error?.message || 'Failed');
            toast.success('Role updated');
            onSaved();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update role');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[15000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[16px] w-full max-w-[480px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Shield size={18} className="text-[#53B175]" />
                        <h3 className="text-[16px] font-bold text-[#181725]">Change Role — {member.user.fullName}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} className="text-[#7C7C7C]" /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-2">Role</label>
                        <div className="flex flex-wrap gap-2">
                            {roles.map(r => {
                                const look = lookFor(r.name);
                                const active = r.id === roleId;
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setRoleId(r.id)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-bold border-2 transition-all hover:shadow-sm"
                                        style={active
                                            ? { background: look.bg, borderColor: look.color, color: look.color }
                                            : { background: 'white', borderColor: '#EEEEEE', color: '#7C7C7C' }}
                                    >
                                        <look.Icon size={12} /> {r.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {outlets.length > 0 && (
                        <div>
                            <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">Limit to outlet</label>
                            <select
                                value={outletId}
                                onChange={e => setOutletId(e.target.value)}
                                className="w-full h-[44px] border border-[#EEEEEE] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#53B175]/40 bg-[#FAFAFA] focus:bg-white transition-colors"
                            >
                                <option value="">All outlets</option>
                                {outlets.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-[8px] p-2.5">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={handleSave}
                            disabled={saving || !roleId}
                            className="flex-1 h-[42px] bg-[#53B175] text-white rounded-[10px] text-[13px] font-bold hover:bg-[#469E66] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            Save Changes
                        </button>
                        <button onClick={onClose} className="h-[42px] px-5 bg-gray-100 text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
