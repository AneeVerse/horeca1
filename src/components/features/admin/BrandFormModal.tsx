'use client';

/**
 * BrandFormModal — Zoho-style admin create shell over BrandProfileForm.
 */

import { useState } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FORM, TextField } from '@/components/ui/form';
import {
  BrandProfileForm,
  type BrandProfileValues,
} from '@/components/features/brand/BrandProfileForm';
import { EMPTY_BRAND_PROFILE } from '@/components/features/brand/brandProfileDefaults';
import {
  validateBrandProfile,
  validateFieldBlur,
  derivedFullName,
} from '@/lib/validators/brand-profile';
import { buildAdminBrandPayload } from '@/lib/brandProfileMapper';

interface Props {
  onClose: () => void;
  onCreated: (brand: { id: string; name: string; slug: string }) => void;
}

type Tab = 'overview' | 'market' | 'location' | 'marketing' | 'admin';

function tabForBrandErrors(errors: Record<string, string>): Tab {
  const keys = Object.keys(errors);
  if (keys.some(k => ['brandTier', 'marketplaceVisibility', 'leadStatus', 'creditSupport', 'remarks'].includes(k))) {
    return 'admin';
  }
  if (keys.some(k => ['website', 'tagline', 'description'].includes(k))) return 'marketing';
  if (keys.some(k => ['gstin', 'pincode', 'addressLine', 'outletName', 'city', 'state'].includes(k))) {
    return 'location';
  }
  if (keys.some(k => ['businessSize', 'distributionPresence', 'targetSegments', 'horecaFocused', 'retailFocused'].includes(k))) {
    return 'market';
  }
  return 'overview';
}

export default function BrandFormModal({ onClose, onCreated }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<BrandProfileValues>({
    ...EMPTY_BRAND_PROFILE,
    leadStatus: 'Lead',
  });

  const handleSubmit = async () => {
    setError(null);
    const validation = validateBrandProfile({ ...profile, password }, 'adminCreate');
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(validation.message ?? 'Please fix the highlighted fields');
      setTab(tabForBrandErrors(validation.errors));
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      setTab('overview');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildAdminBrandPayload(
        { ...profile, password },
        {
          fullName: derivedFullName(profile),
          email: profile.email?.trim() ?? '',
          password,
        },
      );
      const res = await fetch('/api/v1/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || 'Failed to create brand');
        return;
      }
      toast.success('Brand created');
      onCreated(json.data);
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const TABS: Array<{ k: Tab; label: string }> = [
    { k: 'overview', label: 'Overview' },
    { k: 'market', label: 'Market Fit' },
    { k: 'location', label: 'Location & Tax' },
    { k: 'marketing', label: 'Marketing' },
    { k: 'admin', label: 'Admin Ops' },
  ];

  const tabSections: Record<Tab, Parameters<typeof BrandProfileForm>[0]['visibleSections']> = {
    overview: { contact: true, identity: true, auth: true, contactEmail: false },
    market: { market: true },
    location: { tax: true, address: true },
    marketing: { marketing: true },
    admin: { ops: true },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-full max-w-[720px] shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE] shrink-0">
          <div>
            <h3 className="text-[18px] font-[900] text-[#181725]">Add Brand</h3>
            <p className="text-[12px] text-[#AEAEAE] font-medium mt-0.5">Create an approved brand account directly</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] text-[#AEAEAE]">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4 border-b border-[#EEEEEE] shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.k} type="button" onClick={() => setTab(t.k)}
              className={cn(
                'px-4 py-2 text-[12px] font-bold rounded-t-lg whitespace-nowrap transition-colors',
                tab === t.k ? 'bg-[#EEF8F1] text-[#299E60]' : 'text-gray-400 hover:text-gray-600',
              )}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {tab === 'overview' && (
            <>
              <TextField label="Owner Email" required type="email" value={profile.email ?? ''}
                error={fieldErrors.email}
                onChange={v => setProfile(p => ({ ...p, email: v }))}
                placeholder="brand@company.com" />
            </>
          )}
          <BrandProfileForm
            value={profile}
            onChange={patch => setProfile(p => ({ ...p, ...patch }))}
            errors={fieldErrors}
            onFieldBlur={(field, value) => {
              const msg = validateFieldBlur(field, value);
              setFieldErrors(prev => {
                const next = { ...prev };
                if (msg) next[field] = msg; else delete next[field];
                return next;
              });
            }}
            visibleSections={tabSections[tab]}
            showPassword={tab === 'overview'}
            password={password}
            onPasswordChange={setPassword}
            showPasswordToggle
            passwordVisible={showPwd}
            onTogglePassword={() => setShowPwd(v => !v)}
            layout="wide"
          />
          {error && (
            <p className="text-[13px] text-[#E74C3C] font-medium bg-[#FEF2F2] px-3 py-2 rounded-[8px]">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#EEEEEE] flex items-center justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="h-[42px] px-5 bg-[#F5F5F5] text-[#7C7C7C] rounded-[10px] text-[13px] font-bold hover:bg-[#EEEEEE]">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className={cn(FORM.primaryBtn, 'h-[42px] px-6 text-[13px]')}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            Create Brand
          </button>
        </div>
      </div>
    </div>
  );
}
