'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, UserPlus, X, Trash2 } from 'lucide-react';

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

export default function UsersPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = async () => {
    setLoading(true);
    const [m, r, o] = await Promise.all([
      fetch(`/api/v1/account/${id}/users`).then((r) => r.json()),
      fetch(`/api/v1/account/${id}/roles?templates=true`).then((r) => r.json()),
      fetch(`/api/v1/account/${id}/outlets`).then((r) => r.json()),
    ]);
    if (m.success) setMembers(m.data);
    if (r.success) setRoles(r.data);
    if (o.success) setOutlets(o.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this user from the account?')) return;
    const res = await fetch(`/api/v1/account/${id}/users/${userId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) {
      alert(json.error?.message ?? 'Could not remove user');
      return;
    }
    load();
  };

  return (
    <section className="bg-white rounded-2xl border border-[#F0F0F0] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold text-[#181725]">Members ({members.length})</h2>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[#181725] text-white text-[12px] font-bold rounded-lg hover:bg-black"
        >
          <UserPlus size={14} />
          Invite member
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-[#299E60]" /></div>
      ) : (
        <ul className="divide-y divide-[#F0F0F0]">
          {members.map((m) => (
            <li key={m.id} className="py-3 flex items-start gap-3">
              <div className="w-[36px] h-[36px] rounded-full bg-[#F5F5F5] flex items-center justify-center font-bold text-[12px] text-[#666] shrink-0">
                {(m.user.fullName || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-bold text-[#181725]">{m.user.fullName || '(no name)'}</p>
                  {m.isPrimary && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-green-100 text-green-700">Primary</span>
                  )}
                  {m.user.hcidDisplay && (
                    <span className="text-[11px] text-[#AEAEAE] font-mono">{m.user.hcidDisplay}</span>
                  )}
                </div>
                <p className="text-[12px] text-[#666]">{m.user.email ?? m.user.phone ?? ''}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {m.user.userRoles.length === 0 ? (
                    <span className="text-[11px] text-[#AEAEAE]">No role assigned</span>
                  ) : (
                    m.user.userRoles.map((r) => {
                      const outletName = r.outletId ? outlets.find((o) => o.id === r.outletId)?.name : null;
                      return (
                        <span key={r.id} className="px-2 py-0.5 rounded-full text-[11px] bg-[#F5F5F5] text-[#181725]">
                          {r.role.name}{outletName ? ` · ${outletName}` : ''}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(m.user.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"
                title="Remove from account"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showInvite && (
        <InviteModal
          accountId={id}
          roles={roles}
          outlets={outlets}
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); load(); }}
        />
      )}
    </section>
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
        outletId: outletId || null,
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.success) onInvited();
    else setError(json.error?.message ?? 'Could not invite user');
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[480px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-[#181725]">Invite Member</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Email or phone</span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="invitee@example.com or 9876543210"
              className="mt-1 w-full px-3 py-2 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Role</span>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.isTemplate ? ` (template · ${r.scope})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Outlet (optional)</span>
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50"
            >
              <option value="">All outlets</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting || !identifier || !roleId}
            className="w-full py-2.5 bg-[#181725] text-white text-[13px] font-bold rounded-xl hover:bg-black disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send Invite'}
          </button>
          <p className="text-[11px] text-[#AEAEAE]">
            Invitee must already have a HoReCa Hub account. Self-serve sign-up via invite link is V2.3.
          </p>
        </div>
      </div>
    </div>
  );
}
