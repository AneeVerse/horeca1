'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, MapPin, Plus, AlertCircle, X, Trash2 } from 'lucide-react';

interface Outlet {
  id: string;
  name: string;
  code: string | null;
  addressLine: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  requiresAddressUpdate: boolean;
}

export default function OutletsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    const json = await fetch(`/api/v1/account/${id}/outlets`).then((r) => r.json());
    if (json.success) setOutlets(json.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async (outletId: string) => {
    if (!confirm('Deactivate this outlet?')) return;
    await fetch(`/api/v1/account/${id}/outlets/${outletId}`, { method: 'DELETE' });
    load();
  };

  return (
    <section className="bg-white rounded-2xl border border-[#F0F0F0] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold text-[#181725]">Outlets ({outlets.length})</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[#181725] text-white text-[12px] font-bold rounded-lg hover:bg-black transition-colors"
        >
          <Plus size={14} />
          Add Outlet
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-[#299E60]" /></div>
      ) : outlets.length === 0 ? (
        <p className="text-[13px] text-[#666] py-6 text-center">No outlets yet.</p>
      ) : (
        <ul className="divide-y divide-[#F0F0F0]">
          {outlets.map((o) => (
            <li key={o.id} className="py-3 flex items-start gap-3">
              <div className="w-[36px] h-[36px] rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={14} className="text-[#666]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-[#181725]">{o.name}</p>
                  {o.code && <span className="text-[11px] text-[#AEAEAE] font-mono">{o.code}</span>}
                  {!o.isActive && <span className="text-[10px] uppercase font-bold text-[#AEAEAE]">inactive</span>}
                  {o.requiresAddressUpdate && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                      <AlertCircle size={10} />
                      Address needed
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#666] truncate">{o.addressLine}</p>
                <p className="text-[11px] text-[#AEAEAE]">
                  {[o.city, o.state, o.pincode].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                onClick={() => handleDelete(o.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                title="Deactivate"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateOutletModal
          accountId={id}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </section>
  );
}

function CreateOutletModal({ accountId, onClose, onCreated }: {
  accountId: string; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/v1/account/${accountId}/outlets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, addressLine, city, state, pincode }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.success) onCreated();
    else setError(json.error?.message ?? 'Could not create outlet');
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[480px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-[#181725]">Add Outlet</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <Field label="Name" value={name} onChange={setName} placeholder="e.g. Eve Powai" />
          <Field label="Address" value={addressLine} onChange={setAddressLine} placeholder="Full address" />
          <div className="grid grid-cols-3 gap-2">
            <Field label="City" value={city} onChange={setCity} />
            <Field label="State" value={state} onChange={setState} />
            <Field label="Pincode" value={pincode} onChange={setPincode} />
          </div>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting || !name || !addressLine}
            className="w-full py-2.5 bg-[#181725] text-white text-[13px] font-bold rounded-xl hover:bg-black disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Create Outlet'}
          </button>
          <p className="text-[11px] text-[#AEAEAE]">
            Location coordinates are added separately later — outlet will be flagged &quot;Address needed&quot; until completed.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50"
      />
    </label>
  );
}
