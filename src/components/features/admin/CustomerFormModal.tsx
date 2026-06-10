'use client';

/**
 * CustomerFormModal — the full Zoho-style "New / Edit Customer" form.
 *
 * One component, used for both create (POST /api/v1/admin/users) and edit
 * (PATCH /api/v1/admin/users/:id with companyProfile). It carries the complete
 * field set the client asked to match Zoho: customer type, primary contact
 * (salutation/first/last), company + display name, work + mobile phone, email,
 * language, GST treatment/GSTIN/PAN/FSSAI, tax preference, place of supply,
 * currency, credit limit, payment terms, portal toggle, billing address,
 * multiple contact persons, and remarks — grouped into tabs.
 */

import React, { useState } from 'react';
import { X, Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SALUTATIONS = ['', 'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const GST_TREATMENTS = [
  { v: '', label: 'Select treatment' },
  { v: 'registered_business_regular', label: 'Registered Business — Regular' },
  { v: 'registered_business_composition', label: 'Registered Business — Composition' },
  { v: 'unregistered_business', label: 'Unregistered Business' },
  { v: 'consumer', label: 'Consumer' },
  { v: 'overseas', label: 'Overseas' },
  { v: 'sez', label: 'SEZ' },
];
const PAYMENT_TERMS = [
  { v: 'due_on_receipt', label: 'Due on Receipt' },
  { v: 'net15', label: 'Net 15' },
  { v: 'net30', label: 'Net 30' },
  { v: 'net45', label: 'Net 45' },
  { v: 'net60', label: 'Net 60' },
];
const LANGUAGES = [
  { v: 'en', label: 'English' },
  { v: 'hi', label: 'Hindi' },
  { v: 'mr', label: 'Marathi' },
];
const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

interface ContactPerson {
  salutation?: string; firstName?: string; lastName?: string;
  email?: string; workPhone?: string; mobile?: string; designation?: string; isPrimary?: boolean;
}

export interface CustomerFormInitial {
  customerType?: string;
  salutation?: string; firstName?: string; lastName?: string;
  companyName?: string; displayName?: string; legalName?: string;
  email?: string; workPhone?: string; mobilePhone?: string;
  customerLanguage?: string;
  gstTreatment?: string; gstin?: string; pan?: string; fssaiNumber?: string;
  taxPreference?: string; placeOfSupply?: string; currency?: string;
  creditLimit?: string | number | null; paymentTerms?: string; enablePortal?: boolean;
  billingAddressLine?: string; billingCity?: string; billingState?: string; billingPincode?: string;
  businessType?: string; remarks?: string;
  contactPersons?: ContactPerson[];
}

interface Props {
  mode: 'create' | 'edit';
  /** edit mode: the user id to PATCH. */
  userId?: string;
  initial?: CustomerFormInitial;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = 'overview' | 'other' | 'address' | 'contacts' | 'remarks';

export default function CustomerFormModal({ mode, userId, initial, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [password, setPassword] = useState('');

  const [f, setF] = useState<CustomerFormInitial>({
    customerType: 'business',
    customerLanguage: 'en',
    taxPreference: 'taxable',
    currency: 'INR',
    paymentTerms: 'due_on_receipt',
    enablePortal: false,
    ...initial,
  });
  const [contacts, setContacts] = useState<ContactPerson[]>(initial?.contactPersons ?? []);

  const set = <K extends keyof CustomerFormInitial>(k: K, v: CustomerFormInitial[K]) => {
    setF(prev => ({ ...prev, [k]: v }));
    setError(null);
  };

  // Display name fallback the API requires (fullName) — derived from the
  // primary contact / company / display name.
  const derivedName = (f.displayName || f.companyName || [f.firstName, f.lastName].filter(Boolean).join(' ') || '').trim();
  const mobileDigits = (f.mobilePhone || '').replace(/\D/g, '').slice(-10);
  const workDigits = (f.workPhone || '').replace(/\D/g, '').slice(-10);
  const primaryPhone = mobileDigits.length === 10 ? mobileDigits : workDigits;

  const buildCompanyProfile = () => ({
    customerType: f.customerType,
    salutation: f.salutation, firstName: f.firstName, lastName: f.lastName,
    companyName: f.companyName,
    displayName: derivedName,
    legalName: f.companyName || derivedName,
    email: f.email,
    workPhone: f.workPhone, mobilePhone: f.mobilePhone,
    customerLanguage: f.customerLanguage,
    gstTreatment: f.gstTreatment, gstin: f.gstin, pan: f.pan, fssaiNumber: f.fssaiNumber,
    taxPreference: f.taxPreference, placeOfSupply: f.placeOfSupply, currency: f.currency,
    creditLimit: f.creditLimit === '' || f.creditLimit == null ? null : f.creditLimit,
    paymentTerms: f.paymentTerms, enablePortal: f.enablePortal,
    billingAddressLine: f.billingAddressLine, billingCity: f.billingCity,
    billingState: f.billingState, billingPincode: f.billingPincode,
    businessType: f.businessType, remarks: f.remarks,
    contactPersons: contacts,
  });

  const handleSubmit = async () => {
    setError(null);
    if (!derivedName) { setTab('overview'); setError('Enter a display name, company name, or contact name'); return; }
    if (mode === 'create') {
      if (!primaryPhone || primaryPhone.length !== 10) { setTab('overview'); setError('Enter a valid 10-digit mobile or work phone'); return; }
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setTab('overview'); setError('Enter a valid email'); return; }
      if (password && password.length < 6) { setError('Password must be at least 6 characters'); return; }
    }
    setSubmitting(true);
    try {
      let res: Response;
      if (mode === 'create') {
        res = await fetch('/api/v1/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: derivedName,
            phone: primaryPhone,
            email: f.email?.trim() || undefined,
            businessName: f.companyName?.trim() || undefined,
            password: password || undefined,
            role: 'customer',
            companyProfile: buildCompanyProfile(),
          }),
        });
      } else {
        res = await fetch(`/api/v1/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyProfile: buildCompanyProfile() }),
        });
      }
      const json = await res.json();
      if (!json.success) { setError(json.error?.message || json.error || 'Failed to save customer'); return; }
      toast.success(mode === 'create' ? 'Customer created' : 'Customer updated');
      onSaved();
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const addContact = () => setContacts(prev => [...prev, { isPrimary: prev.length === 0 }]);
  const updateContact = (i: number, patch: Partial<ContactPerson>) =>
    setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const removeContact = (i: number) => setContacts(prev => prev.filter((_, idx) => idx !== i));

  const TABS: Array<{ k: Tab; label: string }> = [
    { k: 'overview', label: 'Overview' },
    { k: 'other', label: 'Other Details' },
    { k: 'address', label: 'Address' },
    { k: 'contacts', label: `Contact Persons${contacts.length ? ` (${contacts.length})` : ''}` },
    { k: 'remarks', label: 'Remarks' },
  ];

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-[820px] max-h-[94vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-7 py-4 border-b border-[#EEEEEE] flex items-center justify-between shrink-0">
          <h2 className="text-[19px] font-[800] text-[#181725]">{mode === 'create' ? 'New Customer' : 'Edit Customer'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="px-7 pt-3 border-b border-[#EEEEEE] flex gap-1 overflow-x-auto shrink-0">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={cn('px-3.5 py-2.5 text-[13px] font-bold whitespace-nowrap border-b-2 -mb-px transition-colors',
                tab === t.k ? 'border-[#299E60] text-[#299E60]' : 'border-transparent text-gray-500 hover:text-[#181725]')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-7 overflow-y-auto flex-1 min-h-0">
          {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-[13px] text-red-600 font-medium">{error}</div>}

          {tab === 'overview' && (
            <div className="space-y-5">
              <Row label="Customer Type">
                <div className="flex gap-5">
                  {['business', 'individual'].map(t => (
                    <label key={t} className="flex items-center gap-2 text-[14px] font-medium text-[#181725] cursor-pointer">
                      <input type="radio" checked={f.customerType === t} onChange={() => set('customerType', t)} className="accent-[#299E60]" />
                      {t === 'business' ? 'Business' : 'Individual'}
                    </label>
                  ))}
                </div>
              </Row>

              <Row label="Primary Contact">
                <div className="grid grid-cols-[110px_1fr_1fr] gap-2">
                  <select value={f.salutation ?? ''} onChange={e => set('salutation', e.target.value)} className={inp}>
                    {SALUTATIONS.map(s => <option key={s} value={s}>{s || 'Salutation'}</option>)}
                  </select>
                  <input value={f.firstName ?? ''} onChange={e => set('firstName', e.target.value)} placeholder="First Name" className={inp} />
                  <input value={f.lastName ?? ''} onChange={e => set('lastName', e.target.value)} placeholder="Last Name" className={inp} />
                </div>
              </Row>

              <Row label="Company Name"><input value={f.companyName ?? ''} onChange={e => set('companyName', e.target.value)} placeholder="Restaurant / hotel / company" className={inp} /></Row>
              <Row label="Display Name *" hint="Shown on invoices & lists">
                <input value={f.displayName ?? ''} onChange={e => set('displayName', e.target.value)} placeholder={derivedName || 'Display name'} className={inp} />
              </Row>
              <Row label="Email"><input type="email" value={f.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="you@example.com" className={inp} /></Row>
              <Row label="Phone">
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative flex items-center"><span className="absolute left-3 text-[13px] font-bold text-gray-400">+91</span>
                    <input value={f.workPhone ?? ''} onChange={e => set('workPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Work Phone" className={cn(inp, 'pl-11')} /></div>
                  <div className="relative flex items-center"><span className="absolute left-3 text-[13px] font-bold text-gray-400">+91</span>
                    <input value={f.mobilePhone ?? ''} onChange={e => set('mobilePhone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Mobile" className={cn(inp, 'pl-11')} /></div>
                </div>
              </Row>
              <Row label="Customer Language">
                <select value={f.customerLanguage ?? 'en'} onChange={e => set('customerLanguage', e.target.value)} className={inp}>
                  {LANGUAGES.map(l => <option key={l.v} value={l.v}>{l.label}</option>)}
                </select>
              </Row>

              {mode === 'create' && (
                <Row label="Password" hint="Optional — lets them skip OTP">
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" className={cn(inp, 'pr-10')} />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPwd ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  </div>
                </Row>
              )}
            </div>
          )}

          {tab === 'other' && (
            <div className="space-y-5">
              <Row label="GST Treatment">
                <select value={f.gstTreatment ?? ''} onChange={e => set('gstTreatment', e.target.value)} className={inp}>
                  {GST_TREATMENTS.map(g => <option key={g.v} value={g.v}>{g.label}</option>)}
                </select>
              </Row>
              <Row label="GSTIN"><input value={f.gstin ?? ''} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} className={inp} /></Row>
              <Row label="PAN"><input value={f.pan ?? ''} onChange={e => set('pan', e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} className={inp} /></Row>
              <Row label="FSSAI"><input value={f.fssaiNumber ?? ''} onChange={e => set('fssaiNumber', e.target.value)} placeholder="14-digit FSSAI" className={inp} /></Row>
              <Row label="Tax Preference">
                <div className="flex gap-5">
                  {[['taxable', 'Taxable'], ['exempt', 'Tax Exempt']].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 text-[14px] font-medium text-[#181725] cursor-pointer">
                      <input type="radio" checked={f.taxPreference === v} onChange={() => set('taxPreference', v)} className="accent-[#299E60]" />{l}
                    </label>
                  ))}
                </div>
              </Row>
              <Row label="Place of Supply">
                <select value={f.placeOfSupply ?? ''} onChange={e => set('placeOfSupply', e.target.value)} className={inp}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Row>
              <Row label="Currency"><input value={f.currency ?? 'INR'} onChange={e => set('currency', e.target.value.toUpperCase())} className={inp} /></Row>
              <Row label="Credit Limit">
                <div className="relative flex items-center"><span className="absolute left-3 text-[13px] font-bold text-gray-400">₹</span>
                  <input type="number" value={f.creditLimit ?? ''} onChange={e => set('creditLimit', e.target.value)} placeholder="0.00" className={cn(inp, 'pl-8')} /></div>
              </Row>
              <Row label="Payment Terms">
                <select value={f.paymentTerms ?? 'due_on_receipt'} onChange={e => set('paymentTerms', e.target.value)} className={inp}>
                  {PAYMENT_TERMS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
                </select>
              </Row>
              <Row label="Portal Access">
                <label className="flex items-center gap-2 text-[14px] font-medium text-[#181725] cursor-pointer">
                  <input type="checkbox" checked={!!f.enablePortal} onChange={e => set('enablePortal', e.target.checked)} className="accent-[#299E60] w-4 h-4" />
                  Allow portal access for this customer
                </label>
              </Row>
            </div>
          )}

          {tab === 'address' && (
            <div className="space-y-5">
              <p className="text-[12px] text-gray-500">Billing address. Delivery outlets/shipping addresses are managed on the customer&apos;s detail page (multiple outlets supported).</p>
              <Row label="Address"><textarea value={f.billingAddressLine ?? ''} onChange={e => set('billingAddressLine', e.target.value)} rows={2} placeholder="Street, building, area" className={cn(inp, 'resize-none')} /></Row>
              <Row label="City"><input value={f.billingCity ?? ''} onChange={e => set('billingCity', e.target.value)} placeholder="e.g. Mumbai" className={inp} /></Row>
              <Row label="State">
                <select value={f.billingState ?? ''} onChange={e => set('billingState', e.target.value)} className={inp}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Row>
              <Row label="Pincode"><input value={f.billingPincode ?? ''} onChange={e => set('billingPincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit pincode" className={inp} /></Row>
            </div>
          )}

          {tab === 'contacts' && (
            <div className="space-y-4">
              {contacts.length === 0 && <p className="text-[13px] text-gray-400">No additional contact persons. Add the people you coordinate with at this business.</p>}
              {contacts.map((c, i) => (
                <div key={i} className="border border-[#EEEEEE] rounded-[12px] p-4 space-y-3 relative">
                  <button onClick={() => removeContact(i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                  <div className="grid grid-cols-[100px_1fr_1fr] gap-2">
                    <select value={c.salutation ?? ''} onChange={e => updateContact(i, { salutation: e.target.value })} className={inp}>
                      {SALUTATIONS.map(s => <option key={s} value={s}>{s || 'Title'}</option>)}
                    </select>
                    <input value={c.firstName ?? ''} onChange={e => updateContact(i, { firstName: e.target.value })} placeholder="First Name" className={inp} />
                    <input value={c.lastName ?? ''} onChange={e => updateContact(i, { lastName: e.target.value })} placeholder="Last Name" className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={c.email ?? ''} onChange={e => updateContact(i, { email: e.target.value })} placeholder="Email" className={inp} />
                    <input value={c.designation ?? ''} onChange={e => updateContact(i, { designation: e.target.value })} placeholder="Designation" className={inp} />
                    <input value={c.workPhone ?? ''} onChange={e => updateContact(i, { workPhone: e.target.value })} placeholder="Work Phone" className={inp} />
                    <input value={c.mobile ?? ''} onChange={e => updateContact(i, { mobile: e.target.value })} placeholder="Mobile" className={inp} />
                  </div>
                  <label className="flex items-center gap-2 text-[12px] font-medium text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={!!c.isPrimary} onChange={e => updateContact(i, { isPrimary: e.target.checked })} className="accent-[#299E60]" /> Primary contact
                  </label>
                </div>
              ))}
              <button onClick={addContact} className="flex items-center gap-2 text-[13px] font-bold text-[#299E60] hover:underline"><Plus size={15} /> Add contact person</button>
            </div>
          )}

          {tab === 'remarks' && (
            <Row label="Remarks" hint="Internal — not shown to the customer">
              <textarea value={f.remarks ?? ''} onChange={e => set('remarks', e.target.value)} rows={5} placeholder="Notes about this customer…" className={cn(inp, 'resize-none')} />
            </Row>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-[#EEEEEE] flex justify-end gap-2 shrink-0">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 text-[13px] font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 bg-[#299E60] hover:bg-[#238a53] text-white text-[13px] font-bold rounded-lg flex items-center gap-2 disabled:opacity-60 transition-colors">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {mode === 'create' ? 'Create Customer' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#299E60] transition-colors';

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] sm:items-start gap-1.5 sm:gap-4">
      <label className="text-[13px] font-semibold text-gray-600 sm:pt-2.5">
        {label}{hint && <span className="block text-[11px] font-normal text-gray-400 mt-0.5">{hint}</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}
