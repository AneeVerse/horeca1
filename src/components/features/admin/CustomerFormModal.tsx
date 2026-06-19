'use client';

/**
 * CustomerFormModal — Zoho-style admin create/edit shell over shared CustomerProfileForm sections.
 */

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FORM } from '@/components/ui/form';
import {
  CustomerProfileForm,
  type CustomerProfileValues,
  type ContactPerson,
} from '@/components/features/customer/CustomerProfileForm';
import { EMPTY_CUSTOMER_PROFILE } from '@/components/features/customer/customerProfileDefaults';
import {
  validateCustomerProfile,
  derivedFullName,
  primaryPhoneDigits,
} from '@/lib/validators/customer-profile';
import { buildCompanyProfile, mapToUserFields } from '@/lib/customerProfileMapper';

export interface CustomerFormInitial extends CustomerProfileValues {
  contactPersons?: ContactPerson[];
}

interface Props {
  mode: 'create' | 'edit';
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
  const [profile, setProfile] = useState<CustomerProfileValues>({
    ...EMPTY_CUSTOMER_PROFILE,
    ...initial,
  });
  const [contacts, setContacts] = useState<ContactPerson[]>(initial?.contactPersons ?? []);

  const derivedName = derivedFullName(profile);
  const primaryPhone = primaryPhoneDigits(profile);

  const handleSubmit = async () => {
    setError(null);
    const validation = validateCustomerProfile(
      { ...profile, password: mode === 'create' ? password : undefined },
      mode === 'create' ? 'adminCreate' : 'adminCreate',
    );
    if (!validation.success) {
      setError(validation.message ?? 'Please fix the highlighted fields');
      if (validation.errors.legalName || validation.errors.firstName || validation.errors.phone) setTab('overview');
      return;
    }
    if (!derivedName) { setTab('overview'); setError('Enter a display name, company name, or contact name'); return; }
    if (mode === 'create' && (!primaryPhone || primaryPhone.length !== 10)) {
      setTab('overview'); setError('Enter a valid 10-digit mobile or work phone'); return;
    }

    setSubmitting(true);
    try {
      const companyProfile = buildCompanyProfile({ ...profile, contactPersons: contacts });
      let res: Response;
      if (mode === 'create') {
        const userFields = mapToUserFields({ ...profile, password });
        res = await fetch('/api/v1/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: userFields.fullName,
            phone: userFields.phone,
            email: userFields.email || undefined,
            businessName: userFields.businessName || undefined,
            password: password || undefined,
            role: 'customer',
            companyProfile,
          }),
        });
      } else {
        res = await fetch(`/api/v1/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyProfile }),
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

  const TABS: Array<{ k: Tab; label: string }> = [
    { k: 'overview', label: 'Overview' },
    { k: 'other', label: 'Other Details' },
    { k: 'address', label: 'Address' },
    { k: 'contacts', label: `Contact Persons${contacts.length ? ` (${contacts.length})` : ''}` },
    { k: 'remarks', label: 'Remarks' },
  ];

  const tabSections: Record<Tab, Parameters<typeof CustomerProfileForm>[0]['visibleSections']> = {
    overview: { contact: true, business: true, auth: mode === 'create' },
    other: { tax: true, admin: true },
    address: { address: true },
    contacts: { contacts: true },
    remarks: { remarks: true },
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-[18px] shadow-2xl w-full max-w-[820px] max-h-[94vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-7 py-4 border-b border-[#EEEEEE] flex items-center justify-between shrink-0 bg-[#FAFAFA] rounded-t-[18px]">
          <h2 className="text-[18px] font-[800] text-[#181725] tracking-tight">{mode === 'create' ? 'New Customer' : 'Edit Customer'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X size={18} /></button>
        </div>

        <div className="px-7 pt-2 border-b border-[#EEEEEE] flex gap-2 overflow-x-auto shrink-0 bg-[#FAFAFA]/50">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={cn('px-4 py-3 text-[13.5px] font-bold whitespace-nowrap border-b-2 -mb-px transition-all duration-200',
                tab === t.k ? 'border-[#299E60] text-[#299E60] font-extrabold' : 'border-transparent text-gray-400 hover:text-[#181725]')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-[13px] text-red-600 font-medium">{error}</div>}

          <CustomerProfileForm
            value={profile}
            onChange={patch => setProfile(prev => ({ ...prev, ...patch }))}
            visibleSections={tabSections[tab]}
            showPassword={mode === 'create' && tab === 'overview'}
            password={password}
            onPasswordChange={setPassword}
            showPasswordToggle
            passwordVisible={showPwd}
            onTogglePassword={() => setShowPwd(v => !v)}
            contactPersons={contacts}
            onContactPersonsChange={setContacts}
          />

          {tab === 'address' && (
            <p className="text-[12px] text-gray-500 mt-4">
              Billing address. Delivery outlets are managed on the customer detail page.
            </p>
          )}
        </div>

        <div className="px-7 py-4 border-t border-[#EEEEEE] flex justify-end gap-3 shrink-0 bg-[#FAFAFA] rounded-b-[18px]">
          <button onClick={onClose} disabled={submitting} className="px-4.5 py-2.5 text-[13px] font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100/60 rounded-xl transition-all duration-200">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className={cn(FORM.primaryBtn, 'px-6 py-2.5 text-[13px] shadow-green-100')}>
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {mode === 'create' ? 'Create Customer' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
