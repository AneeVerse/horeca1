'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, Loader2, UserPlus, X, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  isPrimary: boolean;
  acceptedAt: string | null;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    hcidDisplay: string | null;
    userRoles: Array<{ id: string; outletId: string | null; role: { id: string; name: string } }>;
  };
}

interface Role { id: string; name: string; scope: string; isTemplate: boolean }
interface Outlet { id: string; name: string }

interface TeamMembersOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
}

export function TeamMembersOverlay({ isOpen, onClose, accountId }: TeamMembersOverlayProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = () => {
    if (!accountId) return;
    Promise.resolve().then(() => setLoading(true));
    Promise.all([
      fetch(`/api/v1/account/${accountId}/users`).then((r) => r.json()),
      fetch(`/api/v1/account/${accountId}/roles?templates=true`).then((r) => r.json()),
      fetch(`/api/v1/account/${accountId}/outlets`).then((r) => r.json()),
    ]).then(([m, r, o]) => {
      if (m.success) setMembers(m.data);
      if (r.success) setRoles(r.data);
      if (o.success) setOutlets(o.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this user from the account?')) return;
    const res = await fetch(`/api/v1/account/${accountId}/users/${userId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) {
      alert(json.error?.message ?? 'Could not remove user');
      return;
    }
    load();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[14000] flex items-start justify-center animate-in fade-in duration-200">
      <div className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:w-[600px] md:mt-[5vh] md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 bg-[#F2F3F2] md:bg-white flex flex-col animate-in slide-in-from-right md:slide-in-from-bottom md:zoom-in-95 duration-300 relative z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-4 md:px-6 py-3 md:py-4 shrink-0 relative bg-white border-b border-gray-100">
          <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-full transition-colors absolute left-4 md:hidden z-10">
            <ChevronLeft size={20} className="text-[#181725]" />
          </button>
          <h2 className="w-full text-center md:text-left text-[17px] md:text-[20px] font-[700] text-[#181725]">Team Members</h2>
          <button onClick={onClose} className="hidden md:flex p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 z-10">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 md:pt-5 pb-28 md:pb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#181725]">Account Members ({members.length})</h3>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#53B175] text-white text-[12px] font-bold rounded-lg hover:bg-[#48a068] transition-colors"
            >
              <UserPlus size={14} />
              Invite Member
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-[#53B175]" /></div>
          ) : members.length === 0 ? (
            <p className="text-[13px] text-[#666] py-12 text-center bg-white rounded-xl border border-gray-100">No members configured.</p>
          ) : (
            <ul className="space-y-3">
              {members.map((m) => (
                <li key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start gap-3 relative">
                  <div className="w-[36px] h-[36px] rounded-full bg-[#E8F5E9] flex items-center justify-center font-black text-[12px] text-[#53B175] shrink-0">
                    {(m.user.fullName || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 pr-10">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-[700] text-[#181725]">{m.user.fullName || '(no name)'}</p>
                      {m.isPrimary && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-green-100 text-green-700">Primary</span>
                      )}
                      {m.user.hcidDisplay && (
                        <span className="text-[11px] text-[#AEAEAE] font-mono">{m.user.hcidDisplay}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#7C7C7C] mt-0.5">{m.user.email ?? m.user.phone ?? ''}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.user.userRoles.length === 0 ? (
                        <span className="text-[11px] text-[#AEAEAE]">No role assigned</span>
                      ) : (
                        m.user.userRoles.map((r) => {
                          const outletName = r.outletId ? outlets.find((o) => o.id === r.outletId)?.name : null;
                          return (
                            <span key={r.id} className="px-2.5 py-0.5 rounded-full text-[11px] bg-gray-100 text-[#181725] font-[500]">
                              {r.role.name}{outletName ? ` · ${outletName}` : ''}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                  {!m.isPrimary && (
                    <div className="absolute right-4 top-4">
                      <button
                        onClick={() => handleRemove(m.user.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        title="Remove from account"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showInvite && (
        <InviteModal
          accountId={accountId}
          roles={roles}
          outlets={outlets}
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); load(); }}
        />
      )}
    </div>
  );
}

function InviteModal({ accountId, roles, outlets, onClose, onInvited }: {
  accountId: string;
  roles: Role[];
  outlets: Outlet[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [outletId, setOutletId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/v1/account/${accountId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier,
        roleId,
        outletIds: outletId ? [outletId] : [],
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.success) onInvited();
    else setError(json.error?.message ?? 'Could not invite user');
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[15000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[450px] p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-[#181725]">Invite Member</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          {/* Helper note moved above the form so the disabled-looking submit
              button doesn't read as "permanently broken". */}
          <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5 leading-snug">
            The invitee must already have a HoReCa Hub account. Ask them to sign up at horeca1.com first, then enter their phone or email below.
          </p>
          <label className="block">
            <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Email or phone</span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="invitee@example.com or 9876543210"
              className="mt-1.5 w-full px-3.5 py-2.5 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 text-gray-700 bg-[#FAFAFA] focus:bg-white transition-all"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Role</span>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-1.5 w-full px-3.5 py-2.5 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 text-gray-700 bg-white transition-all"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.isTemplate ? ` (${r.scope})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Outlet (optional)</span>
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              className="mt-1.5 w-full px-3.5 py-2.5 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#53B175] focus:ring-2 focus:ring-[#53B175]/10 text-gray-700 bg-white transition-all"
            >
              <option value="">All outlets</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          {error && <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg p-2.5">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting || !identifier || !roleId}
            className="w-full py-3 bg-[#53B175] text-white text-[13.5px] font-[700] rounded-xl hover:bg-[#48a068] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 transition-colors"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {submitting ? 'Sending…' : !identifier ? 'Enter email or phone' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
