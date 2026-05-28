'use client';

// Shared role-cards grid used by admin / vendor / brand team pages.
// Caller supplies a getStyle(roleName) -> { color, bg, Icon } so each scope
// keeps its own colour palette while the layout (4-col grid, card design,
// typography) is identical.

import type { ComponentType } from 'react';

export interface RoleCardItem {
  id: string;
  name: string;
  description: string | null;
}

export interface RoleStyle {
  color: string;
  bg: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

interface Props {
  roles: RoleCardItem[];
  getStyle: (roleName: string) => RoleStyle;
}

export function RoleCardsGrid({ roles, getStyle }: Props) {
  if (roles.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {roles.map((role) => {
        const look = getStyle(role.name);
        return (
          <div key={role.id} className="bg-white rounded-[14px] border border-[#EEEEEE] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: look.bg, color: look.color }}>
                <look.Icon size={15} />
              </div>
              <span className="text-[13px] font-bold text-[#181725]">{role.name}</span>
            </div>
            <p className="text-[12px] text-[#7C7C7C] leading-relaxed line-clamp-3">{role.description ?? '—'}</p>
          </div>
        );
      })}
    </div>
  );
}
