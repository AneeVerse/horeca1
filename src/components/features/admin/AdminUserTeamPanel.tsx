'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { PermissionKey } from '@/lib/permissions/registry';
import { TeamMemberList } from '@/components/features/team/TeamMemberList';
import { ResetPasswordModal } from '@/components/features/team/ResetPasswordModal';
import type { TeamMemberItem } from '@/components/features/team/TeamMemberList';
import type { RoleStyle } from '@/components/features/team/RoleCardsGrid';
import { Users } from 'lucide-react';

interface Props {
  teamEndpoint: string;
  editPermission: PermissionKey;
  accent: string;
  title?: string;
  manageHref?: string;
  manageLabel?: string;
  getRoleStyle?: (roleName: string) => RoleStyle;
}

const DEFAULT_ROLE_STYLE: RoleStyle = {
  color: '#6B7280',
  bg: '#F3F4F6',
  Icon: Users,
};

function hasPermission(perms: readonly string[] | undefined, key: PermissionKey): boolean {
  return !!perms && perms.includes(key);
}

export function AdminUserTeamPanel({
  teamEndpoint,
  editPermission,
  accent,
  title = 'Team Members',
  manageHref,
  manageLabel = 'Manage team →',
  getRoleStyle,
}: Props) {
  const { data: session } = useSession();
  const perms = (session?.user as { permissions?: string[] } | undefined)?.permissions;
  const canEdit = hasPermission(perms, editPermission);

  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordMember, setPasswordMember] = useState<TeamMemberItem | null>(null);

  const roleStyle = getRoleStyle ?? (() => DEFAULT_ROLE_STYLE);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(teamEndpoint);
      const json = await res.json();
      if (json.success) setMembers(json.data ?? []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [teamEndpoint]);

  useEffect(() => {
    void fetchTeam();
  }, [fetchTeam]);

  return (
    <div className="space-y-3">
      {manageHref && canEdit && (
        <div className="flex justify-end">
          <a href={manageHref} className="text-[12px] font-bold hover:underline" style={{ color: accent }}>
            {manageLabel}
          </a>
        </div>
      )}
      <TeamMemberList
        title={title}
        members={members}
        loading={loading}
        accent={accent}
        currentUserId={undefined}
        getRoleStyle={roleStyle}
        canEdit={canEdit}
        canDelete={false}
        allowOwnerPasswordReset
        onResetPassword={(m) => setPasswordMember(m)}
      />
      {passwordMember && (
        <ResetPasswordModal
          member={passwordMember}
          passwordEndpoint={`/api/v1/admin/users/${passwordMember.user.id}/password`}
          accent={accent}
          showGenerate
          onClose={() => setPasswordMember(null)}
        />
      )}
    </div>
  );
}
