'use client';

// Customer "Account Team" page — mirrors admin/vendor/brand team pages.
// Lets owners and admins of a BusinessAccount invite users, change roles,
// reset passwords, and remove members.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Loader2, Crown, Shield, Edit3, Eye, AlertCircle, X,
} from 'lucide-react';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ResetPasswordModal } from '@/components/features/team/ResetPasswordModal';
import { TeamPageHeader } from '@/components/features/team/TeamPageHeader';
import { RoleCardsGrid } from '@/components/features/team/RoleCardsGrid';
import { TeamMemberList } from '@/components/features/team/TeamMemberList';
import { TeamRolesEditor } from '@/components/features/team/TeamRolesEditor';
import { AddMemberWizard, type RoleItem } from '@/components/features/team/AddMemberWizard';
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
                    <AddMemberWizard
                        roles={roles as unknown as RoleItem[]}
                        onClose={() => setShowInvite(false)}
                        onInvited={() => { fetchTeam(); setShowInvite(false); }}
                        config={{
                            scope: 'account',
                            accountId,
                            accent: ACCENT,
                            businessAccountLabel: 'Customer Account',
                        }}
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
