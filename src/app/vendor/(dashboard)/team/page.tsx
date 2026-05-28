'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Plus, Trash2, Loader2, Crown, Shield, Edit3, Eye, AlertCircle, Settings2, Pencil, KeyRound } from 'lucide-react';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { TeamRolesEditor } from '@/components/features/team/TeamRolesEditor';
import { AddMemberWizard } from '@/components/features/team/AddMemberWizard';
import { EditMemberModal } from '@/components/features/team/EditMemberModal';
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
        scope: string;
        description: string | null;
    };
}

interface VendorRole {
    id: string;
    name: string;
    scope: string;
    description: string | null;
    isTemplate: boolean;
    permissions: Record<string, Record<string, boolean>>;
}

const ROLE_LOOK: Record<string, { color: string; bg: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    'Vendor Admin':   { color: '#F59E0B', bg: '#FFF7E6', Icon: Crown },
    'Vendor Manager': { color: '#3B82F6', bg: '#EFF6FF', Icon: Shield },
    'Vendor Editor':  { color: '#8B5CF6', bg: '#F3F0FF', Icon: Edit3 },
    'Vendor Viewer':  { color: '#6B7280', bg: '#F3F4F6', Icon: Eye },
};

function lookFor(roleName: string) {
    return ROLE_LOOK[roleName] ?? ROLE_LOOK['Vendor Viewer'];
}

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function VendorTeamPage() {
    const { data: session, status: sessionStatus } = useSession();
    const currentUserId = (session?.user as { id?: string })?.id;
    const sessionPerms = (session?.user as { permissions?: string[] })?.permissions ?? [];
    const canInvite = sessionPerms.includes('users.create');
    const canEdit = sessionPerms.includes('users.edit');
    const canDelete = sessionPerms.includes('users.delete');
    const canView = sessionPerms.includes('users.view');
    const canManage = canInvite || canEdit || canDelete || canView;
    const confirm = useConfirm();

    const [team, setTeam] = useState<TeamMember[]>([]);
    const [roles, setRoles] = useState<VendorRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [showRolesEditor, setShowRolesEditor] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [passwordMember, setPasswordMember] = useState<TeamMember | null>(null);

    const fetchTeam = useCallback(async () => {
        try {
            setLoading(true);
            const [teamRes, rolesRes] = await Promise.all([
                fetch('/api/v1/vendor/team').then(r => r.json()),
                fetch('/api/v1/vendor/roles').then(r => r.json()),
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
            message: `${member.user.fullName} will lose access to this vendor portal. They can be re-added later.`,
            confirmText: 'Remove',
            tone: 'danger',
        });
        if (!ok) return;
        try {
            const res = await fetch(`/api/v1/vendor/team/${member.id}`, { method: 'DELETE' });
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
                <Loader2 size={28} className="animate-spin text-[#299E60]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10 max-w-[900px] animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-bold text-[#181725] leading-none mb-1">Team</h1>
                    <p className="text-[#7C7C7C] text-[14px] font-medium">Manage your vendor team members and their permissions</p>
                </div>
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <button onClick={() => setShowRolesEditor(true)}
                            className="h-[44px] px-4 bg-white border border-[#EEEEEE] text-[#181725] rounded-[12px] text-[14px] font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                            <Settings2 size={16} /> Manage Roles
                        </button>
                    )}
                    {canInvite && (
                        <button onClick={() => setShowInvite(true)}
                            className="h-[44px] px-5 bg-[#299E60] text-white rounded-[12px] text-[14px] font-bold hover:bg-[#238a54] transition-colors flex items-center gap-2 shadow-sm">
                            <Plus size={16} /> Add Member
                        </button>
                    )}
                </div>
            </div>

            {roles.some(r => r.isTemplate && !r.name.startsWith('Storefront')) && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {roles.filter(r => r.isTemplate && !r.name.startsWith('Storefront')).map((role) => {
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
                    <Users size={18} className="text-[#299E60]" />
                    <h2 className="text-[16px] font-bold text-[#181725]">Team Members</h2>
                    <span className="text-[13px] text-[#AEAEAE]">({team.length})</span>
                </div>

                {loading ? (
                    <div className="p-8 flex justify-center"><Loader2 size={28} className="animate-spin text-[#299E60]" /></div>
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
                                <li key={member.id} className="px-5 py-4 flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-[13px] font-[900] shrink-0"
                                        style={{ backgroundColor: look.bg, color: look.color }}>
                                        {initials(member.user.fullName)}
                                    </div>

                                    {/* Name + email */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-[13px] font-bold text-[#181725] truncate">{member.user.fullName}</p>
                                            {isOwnerRow && (
                                                <span className="text-[10px] font-bold text-[#F59E0B] bg-[#FFF7E6] px-1.5 py-0.5 rounded-[4px] shrink-0">Primary</span>
                                            )}
                                            {!member.user.isActive && (
                                                <span className="text-[10px] font-bold text-[#AEAEAE] bg-[#F5F5F5] px-1.5 py-0.5 rounded-[4px] shrink-0">Inactive</span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-[#AEAEAE] truncate">
                                            {member.user.email ?? member.user.phone ?? '—'}
                                            {member.user.hcidDisplay && <span className="ml-2 font-mono">{member.user.hcidDisplay}</span>}
                                        </p>
                                    </div>

                                    {/* Role badge */}
                                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] shrink-0"
                                        style={{ backgroundColor: look.bg, color: look.color }}>
                                        <look.Icon size={13} />
                                        <span className="text-[12px] font-bold">{member.role.name}</span>
                                    </div>

                                    {/* Joined date */}
                                    <span className="text-[11px] text-[#AEAEAE] hidden lg:block shrink-0 w-[80px] text-right">
                                        {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                    </span>

                                    {/* Actions */}
                                    <div className="shrink-0 flex items-center gap-1 ml-1">
                                        {isOwnerRow ? (
                                            <span className="text-[11px] text-[#AEAEAE] px-2">Owner</span>
                                        ) : isSelf ? (
                                            <span className="text-[11px] text-[#AEAEAE] px-2">You</span>
                                        ) : (
                                            <>
                                                {canEdit && (
                                                    <button onClick={() => setEditingMember(member)}
                                                        className="p-2 rounded-[8px] hover:bg-amber-50 transition-colors" title="Edit permissions & outlets">
                                                        <Pencil size={14} className="text-[#F59E0B]" />
                                                    </button>
                                                )}
                                                {canEdit && (
                                                    <button onClick={() => setPasswordMember(member)}
                                                        className="p-2 rounded-[8px] hover:bg-gray-100 transition-colors" title="Reset password">
                                                        <KeyRound size={14} className="text-[#AEAEAE]" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button onClick={() => handleRemove(member)}
                                                        className="p-2 rounded-[8px] hover:bg-red-50 transition-colors" title="Remove member">
                                                        <Trash2 size={14} className="text-[#E74C3C]" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
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
                        Ask an owner (Vendor Admin) for the access you need.
                    </p>
                </div>
            )}

            {showInvite && (
                <AddMemberWizard
                    roles={roles}
                    onClose={() => setShowInvite(false)}
                    onInvited={(newMember) => {
                        setTeam((prev) => [...prev, newMember]);
                        setShowInvite(false);
                        toast.success(`${newMember.user.fullName} added to team`);
                    }}
                />
            )}

            {editingMember && (
                <EditMemberModal
                    memberId={editingMember.id}
                    memberName={editingMember.user.fullName}
                    roles={roles}
                    onClose={() => setEditingMember(null)}
                    onSaved={() => {
                        setEditingMember(null);
                        toast.success('Member access updated');
                        fetchTeam();
                    }}
                />
            )}

            {passwordMember && (
                <ResetPasswordModal
                    member={passwordMember}
                    passwordEndpoint={`/api/v1/vendor/team/${passwordMember.id}/password`}
                    accent="#299E60"
                    onClose={() => setPasswordMember(null)}
                />
            )}

            <TeamRolesEditor
                isOpen={showRolesEditor}
                onClose={() => setShowRolesEditor(false)}
                endpointBase="/api/v1/vendor/roles"
                accent="#299E60"
                onRolesChanged={fetchTeam}
            />
        </div>
    );
}

