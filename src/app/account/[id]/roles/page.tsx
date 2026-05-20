'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Plus, Copy, Trash2, X, Check } from 'lucide-react';

type PermissionsJson = Record<string, Record<string, boolean>>;

interface Role {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  isTemplate: boolean;
  permissions: PermissionsJson;
}

export default function RolesPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [modules, setModules] = useState<Record<string, readonly string[]>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleFromTemplate, setNewRoleFromTemplate] = useState<Role | null>(null);

  const load = async () => {
    setLoading(true);
    const [m, r] = await Promise.all([
      fetch('/api/v1/permissions/registry').then((r) => r.json()),
      fetch(`/api/v1/account/${id}/roles?templates=true`).then((r) => r.json()),
    ]);
    if (m.success) setModules(m.data.modules);
    if (r.success) setRoles(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const customRoles = useMemo(() => roles.filter((r) => !r.isTemplate), [roles]);
  const templates   = useMemo(() => roles.filter((r) =>  r.isTemplate), [roles]);

  return (
    <div className="space-y-4">
      {/* Custom roles */}
      <section className="bg-white rounded-2xl border border-[#F0F0F0] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-bold text-[#181725]">Custom Roles ({customRoles.length})</h2>
            <p className="text-[12px] text-[#666] mt-0.5">Edit these or duplicate a template below.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-[#299E60]" /></div>
        ) : customRoles.length === 0 ? (
          <p className="text-[13px] text-[#666] py-6 text-center">
            No custom roles yet. Duplicate a template below to create one.
          </p>
        ) : (
          <ul className="divide-y divide-[#F0F0F0]">
            {customRoles.map((r) => (
              <li key={r.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#181725]">{r.name}</p>
                  {r.description && <p className="text-[12px] text-[#666]">{r.description}</p>}
                  <p className="text-[11px] text-[#AEAEAE] mt-1">
                    {countPermissions(r.permissions)} permission(s) · {r.scope}
                  </p>
                </div>
                <button
                  onClick={() => setEditingRole(r)}
                  className="px-3 py-1.5 text-[12px] font-bold text-[#181725] hover:bg-[#F5F5F5] rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete role "${r.name}"?`)) return;
                    const res = await fetch(`/api/v1/account/${id}/roles/${r.id}`, { method: 'DELETE' });
                    const json = await res.json();
                    if (!json.success) { alert(json.error?.message ?? 'Could not delete'); return; }
                    load();
                  }}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Templates */}
      <section className="bg-white rounded-2xl border border-[#F0F0F0] p-5">
        <h2 className="text-[15px] font-bold text-[#181725] mb-1">System Templates</h2>
        <p className="text-[12px] text-[#666] mb-4">
          Start from a template, click <strong>Duplicate</strong> to copy it into your account, then edit freely.
        </p>
        <ul className="divide-y divide-[#F0F0F0]">
          {templates.map((t) => (
            <li key={t.id} className="py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-bold text-[#181725]">{t.name}</p>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700">
                    {t.scope}
                  </span>
                </div>
                {t.description && <p className="text-[12px] text-[#666]">{t.description}</p>}
                <p className="text-[11px] text-[#AEAEAE] mt-1">{countPermissions(t.permissions)} permissions</p>
              </div>
              <button
                onClick={() => setNewRoleFromTemplate(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[#181725] hover:bg-[#F5F5F5] rounded-lg"
              >
                <Copy size={12} />
                Duplicate
              </button>
            </li>
          ))}
        </ul>
      </section>

      {(editingRole || newRoleFromTemplate) && (
        <RoleEditorModal
          accountId={id}
          modules={modules}
          existing={editingRole}
          template={newRoleFromTemplate}
          onClose={() => { setEditingRole(null); setNewRoleFromTemplate(null); }}
          onSaved={() => { setEditingRole(null); setNewRoleFromTemplate(null); load(); }}
        />
      )}
    </div>
  );
}

function countPermissions(p: PermissionsJson): number {
  return Object.values(p).reduce((sum, actions) => sum + Object.values(actions).filter((v) => v === true).length, 0);
}

// ─── permission matrix editor ──────────────────────────────────────────

function RoleEditorModal({
  accountId, modules, existing, template, onClose, onSaved,
}: {
  accountId: string;
  modules: Record<string, readonly string[]>;
  existing: Role | null;
  template: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const seed = existing ?? template;
  const [name, setName] = useState(existing ? existing.name : template ? `${template.name} (copy)` : '');
  const [description, setDescription] = useState(seed?.description ?? '');
  const [scope, setScope] = useState<string>(seed?.scope ?? 'account');
  const [permissions, setPermissions] = useState<PermissionsJson>(() => structuredClone(seed?.permissions ?? {}));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (m: string, a: string) => {
    setPermissions((prev) => {
      const next = { ...prev, [m]: { ...(prev[m] ?? {}) } };
      next[m][a] = !next[m]?.[a];
      if (!next[m][a]) delete next[m][a];
      if (Object.keys(next[m]).length === 0) delete next[m];
      return next;
    });
  };

  const allActions = ['view', 'create', 'edit', 'delete', 'approve'] as const;
  const moduleEntries = Object.entries(modules);

  const submit = async () => {
    setSubmitting(true); setError(null);
    const url = existing
      ? `/api/v1/account/${accountId}/roles/${existing.id}`
      : `/api/v1/account/${accountId}/roles`;
    const method = existing ? 'PATCH' : 'POST';
    const body = existing
      ? { name, description, permissions }
      : { name, description, scope, permissions };
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.success) onSaved();
    else setError(json.error?.message ?? 'Could not save role');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[840px] max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-bold text-[#181725]">
              {existing ? `Edit Role: ${existing.name}` : 'New Custom Role'}
            </h3>
            {template && (
              <p className="text-[12px] text-[#666] mt-0.5">Duplicated from template &quot;{template.name}&quot;</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Role name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Scope</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                disabled={!!existing}
                className="mt-1 w-full px-3 py-2 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50 disabled:bg-gray-50"
              >
                <option value="account">Account</option>
                <option value="vendor">Vendor</option>
                <option value="brand">Brand</option>
                <option value="admin">Admin</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
            <label className="block sm:col-span-3">
              <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Description</span>
              <input
                type="text"
                value={description ?? ''}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this role do?"
                className="mt-1 w-full px-3 py-2 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50"
              />
            </label>
          </div>

          {/* Permission matrix */}
          <h4 className="text-[13px] font-bold text-[#181725] mb-2">Permissions</h4>
          <p className="text-[12px] text-[#666] mb-3">
            Check the boxes for what this role should be allowed to do. Permissions are additive — a user with this role plus another role gets the union.
          </p>
          <div className="border border-[#F0F0F0] rounded-xl overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-[#FAFAFA] text-[#666]">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Module</th>
                  {allActions.map((a) => (
                    <th key={a} className="text-center px-2 py-2 font-semibold capitalize w-[80px]">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moduleEntries.map(([m, actions]) => (
                  <tr key={m} className="border-t border-[#F0F0F0]">
                    <td className="px-3 py-2 font-semibold text-[#181725]">{m}</td>
                    {allActions.map((a) => {
                      const allowed = (actions as readonly string[]).includes(a);
                      const on = !!permissions[m]?.[a];
                      return (
                        <td key={a} className="text-center px-2 py-2">
                          {allowed ? (
                            <button
                              onClick={() => toggle(m, a)}
                              className={`w-[26px] h-[26px] rounded-md border-2 flex items-center justify-center transition-colors ${
                                on
                                  ? 'border-[#299E60] bg-[#299E60] text-white'
                                  : 'border-[#E5E5E5] bg-white hover:border-[#181725]'
                              }`}
                            >
                              {on && <Check size={14} />}
                            </button>
                          ) : (
                            <span className="text-[#E5E5E5]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 border-t border-[#F0F0F0] flex items-center justify-between">
          <p className="text-[11px] text-[#AEAEAE]">
            {countPermissions(permissions)} permission(s) selected
          </p>
          <div className="flex gap-2">
            {error && <p className="text-[12px] text-red-500 self-center mr-2">{error}</p>}
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-[#666] hover:bg-[#F5F5F5] rounded-xl">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || !name}
              className="px-4 py-2 bg-[#181725] text-white text-[13px] font-bold rounded-xl hover:bg-black disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {existing ? 'Save changes' : 'Create role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
