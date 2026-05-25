'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Loader2, Sparkles, AlertCircle, Check } from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { useAddress } from '@/context/AddressContext';
import { useBusinessAccountSwitcher } from '@/hooks/useBusinessAccountSwitcher';
import { toast } from 'sonner';

interface CreateBusinessAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateBusinessAccountModal({
  isOpen,
  onClose,
  onCreated,
}: CreateBusinessAccountModalProps) {
  const { switchAccount, refresh: refreshAccounts } = useBusinessAccountSwitcher();
  const { setSelectedAddress } = useAddress();

  // Business Account Fields
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [businessType, setBusinessType] = useState<'customer' | 'vendor' | 'brand'>('customer');

  // Primary Outlet Fields
  const [outletName, setOutletName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [flatInfo, setFlatInfo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill city & state when a valid 6-digit pincode is typed manually
  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) return;
    if (city.trim() && state.trim()) return; // already filled
    fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      .then((r) => r.json())
      .then((data) => {
        const po = data?.[0]?.PostOffice?.[0];
        if (!po) return;
        if (!city.trim()) setCity(po.District || po.Division || '');
        if (!state.trim()) setState(po.State || '');
      })
      .catch(() => {});
  }, [pincode]); // eslint-disable-line react-hooks/exhaustive-deps

  const pincodeValid = /^\d{6}$/.test(pincode);
  const hasCoords = latitude !== null && longitude !== null;

  const handlePickAddress = (place: import('@/components/ui/AddressAutocomplete').AddressPickPayload) => {
    setAddressLine(place.fullAddress);
    setCity(place.city);
    setState(place.state);
    setPincode(place.pincode);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    setPlaceId(place.placeId);
    if (!outletName.trim() && place.businessName) {
      setOutletName(`${place.businessName} Outlet`);
    }
  };

  const handleSubmit = async () => {
    if (!legalName.trim()) {
      setError('Business legal name is required.');
      return;
    }
    if (!outletName.trim()) {
      setError('Primary branch/outlet name is required.');
      return;
    }
    if (!addressLine.trim()) {
      setError('Address is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const isCustomer = businessType === 'customer' || businessType === 'vendor';
    const isVendor = businessType === 'vendor';
    const isBrand = businessType === 'brand';

    const payload = {
      legalName: legalName.trim(),
      displayName: displayName.trim() || undefined,
      gstin: gstin.trim() || undefined,
      pan: pan.trim() || undefined,
      businessType,
      isCustomer,
      isVendor,
      isBrand,
      primaryOutlet: {
        name: outletName.trim(),
        addressLine: addressLine.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        flatInfo: flatInfo.trim() || undefined,
        landmark: landmark.trim() || undefined,
        ...(latitude !== null && longitude !== null && { latitude, longitude }),
        ...(placeId !== null && { placeId }),
      },
    };

    try {
      const res = await fetch('/api/v1/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? 'Could not create business account.');
        setSubmitting(false);
        return;
      }

      toast.success('Business account created successfully!');
      
      const newAccount = json.data.account;
      const newOutlet = json.data.outlet;

      // Update address context if coordinates are present
      if (hasCoords && pincodeValid) {
        setSelectedAddress({
          id: `outlet_${newOutlet.id}`,
          label: outletName.trim(),
          businessName: legalName.trim(),
          fullAddress: addressLine.trim(),
          shortAddress: [city, state].filter(Boolean).join(', ') || addressLine.trim().split(',').slice(0, 2).join(','),
          latitude: latitude!,
          longitude: longitude!,
          flatInfo: flatInfo.trim() || undefined,
          landmark: landmark.trim() || undefined,
          pincode: pincode.trim(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          placeId: placeId ?? undefined,
          isDefault: false,
        });
      }

      // Refresh switcher's account list
      await refreshAccounts();

      // Switch context to newly created account & outlet
      await switchAccount(newAccount.id, newOutlet.id);

      onCreated?.();
      onClose();

      // Redirect vendor/brand accordingly, otherwise reload home
      if (isVendor) {
        window.location.assign('/vendor/dashboard');
      } else if (isBrand) {
        window.location.assign('/brand/portal/dashboard');
      } else {
        window.location.assign('/');
      }
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[14000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-[580px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-100">
            <Building2 size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-[#181725] flex items-center gap-1.5">
              Register New Business
              <Sparkles size={14} className="text-amber-500" />
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Create a new entity with its own outlets, team members, and permissions.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={16} className="text-gray-400 hover:text-gray-700" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          
          {/* Section 1: Business Profile */}
          <div className="space-y-3.5">
            <h4 className="text-[13px] font-bold text-[#181725] pb-1.5 border-b border-gray-50 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} className="text-gray-400" />
              1. Business Details
            </h4>

            <Field
              label="Legal business name"
              required
              value={legalName}
              onChange={setLegalName}
              placeholder="e.g. Rockville Hospitality Pvt Ltd"
            />

            <Field
              label="Trade name / Display name (optional)"
              value={displayName}
              onChange={setDisplayName}
              placeholder="e.g. Rockville Bar & Diner"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="GSTIN (optional)"
                value={gstin}
                onChange={(v) => setGstin(v.toUpperCase())}
                placeholder="27AAACZ8867B1Z7"
                maxLength={15}
              />
              <Field
                label="PAN (optional)"
                value={pan}
                onChange={(v) => setPan(v.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>

            <div>
              <span className="text-[11.5px] font-semibold text-[#181725] mb-1.5 block">Business Type</span>
              <div className="grid grid-cols-3 gap-2">
                {(['customer', 'vendor', 'brand'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBusinessType(t)}
                    className={`py-2 px-3 text-[12.5px] font-bold rounded-xl border text-center transition-all ${
                      businessType === t
                        ? 'border-[#299E60] bg-[#EEF8F1] text-[#299E60] shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-normal">
                {businessType === 'customer' && 'Buy ingredients/supplies from vendors.'}
                {businessType === 'vendor' && 'Sell your inventory & buy from other vendors.'}
                {businessType === 'brand' && 'Manage catalogs and brand mapping across platforms.'}
              </p>
            </div>
          </div>

          {/* Section 2: Primary Outlet */}
          <div className="space-y-3.5 pt-2">
            <h4 className="text-[13px] font-bold text-[#181725] pb-1.5 border-b border-gray-50 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" />
              2. Primary Branch / Outlet Location
            </h4>

            <AddressAutocomplete
              label="Search address or place name"
              placeholder="e.g. Vashi Rockville Diner..."
              businessMode
              hint="Selecting a place from maps auto-fills the coordinates, address, and city for you."
              onPick={handlePickAddress}
            />

            <Field
              label="Branch / Outlet name"
              required
              value={outletName}
              onChange={setOutletName}
              placeholder="e.g. Rockville Vashi Branch"
            />

            <Field
              label="Flat, suite, floor, street number"
              required
              value={addressLine}
              onChange={setAddressLine}
              placeholder="e.g. Ground Floor, Plot 10, Sector 30"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Flat / Suite / Landmark details"
                value={flatInfo}
                onChange={setFlatInfo}
                placeholder="e.g. Flat 12A, near metro station"
              />
              <Field
                label="Pincode (6 digits)"
                required
                value={pincode}
                onChange={(v) => setPincode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="400703"
                inputMode="numeric"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="City"
                value={city}
                onChange={setCity}
                placeholder="Navi Mumbai"
              />
              <Field
                label="State"
                value={state}
                onChange={setState}
                placeholder="Maharashtra"
              />
            </div>

            {hasCoords && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-emerald-700 font-black" />
                </div>
                <p className="text-[11.5px] text-emerald-900/80">
                  Precise GPS map coordinates captured successfully ({latitude!.toFixed(5)}, {longitude!.toFixed(5)})
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-600 font-medium leading-normal">{error}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0 bg-gray-50/50">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4.5 py-2 text-[13px] font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !legalName.trim() || !outletName.trim() || !addressLine.trim()}
            className="px-5 py-2 bg-[#299E60] text-white text-[13px] font-bold rounded-xl hover:bg-[#238a54] disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {submitting ? 'Registering…' : 'Create Business'}
          </button>
        </div>

      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
}) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold text-[#181725] mb-1 block uppercase tracking-wider text-[10px] opacity-75">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        type="text"
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-[#299E60] focus:ring-2 focus:ring-[#299E60]/10 bg-[#FAFAFA] focus:bg-white transition-all text-gray-700 placeholder:text-gray-400"
      />
    </label>
  );
}
