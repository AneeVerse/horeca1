'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { KeyRound } from 'lucide-react';
import type { PermissionKey } from '@/lib/permissions/registry';
import { ResetPasswordModal } from '@/components/features/team/ResetPasswordModal';

interface UserRef {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
}

interface Props {
  user: UserRef;
  permission: PermissionKey;
  accent?: string;
  disabled?: boolean;
  variant?: 'icon' | 'button';
  className?: string;
  showGenerate?: boolean;
}

function hasPermission(perms: readonly string[] | undefined, key: PermissionKey): boolean {
  return !!perms && perms.includes(key);
}

export function AdminPasswordResetButton({
  user,
  permission,
  accent = '#E74C3C',
  disabled = false,
  variant = 'button',
  className = '',
  showGenerate = true,
}: Props) {
  const { data: session } = useSession();
  const perms = (session?.user as { permissions?: string[] } | undefined)?.permissions;
  const [open, setOpen] = useState(false);

  if (!hasPermission(perms, permission)) return null;

  const member = {
    user: {
      fullName: user.fullName,
      email: user.email ?? null,
      phone: user.phone ?? null,
    },
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          title="Reset password"
          className={`p-2 rounded-[8px] hover:bg-gray-100 transition-colors disabled:opacity-50 ${className}`}
        >
          <KeyRound size={14} className="text-[#AEAEAE]" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-bold border border-[#EEEEEE] text-[#374151] hover:bg-gray-50 disabled:opacity-50 transition-colors ${className}`}
        >
          <KeyRound size={13} />
          Reset Password
        </button>
      )}
      {open && (
        <ResetPasswordModal
          member={member}
          passwordEndpoint={`/api/v1/admin/users/${user.id}/password`}
          accent={accent}
          showGenerate={showGenerate}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
