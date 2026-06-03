'use client';

// Admin → Vendors → Add Vendor wizard.
//
// Replaces the old short-form modal that only collected 7 fields and
// created a half-built vendor that the new user then had to complete via
// /vendor/settings. This wizard mirrors the public /vendor/register flow
// (minus OTP) so the vendor is fully onboarded the moment admin clicks
// "Create vendor": legal name, trade name, vendor type, GST, PAN, full
// bank details, authorized person, billing address, pickup outlet,
// serviceable pincodes, delivery capability, FSSAI/Udyam/CIN.
//
// Backend contract: POST /api/v1/admin/vendors with the body shape
// validated against src/lib/validators/vendor-kyc.ts schemas.

import { useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Loader2, AlertCircle, Check,
  Info, UserPlus, Building2, IndianRupee, MapPin, Truck, Eye, EyeOff, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  GST_RE, PAN_RE, IFSC_RE, PHONE_RE, PINCODE_RE,
  VENDOR_TYPES, DELIVERY_CAPABILITIES,
  type VendorType, type DeliveryCapability,
} from '@/lib/validators/vendor-kyc';

interface Props {
  onClose: () => void;
  onCreated: (vendor: { id: string; businessName: string; slug: string; user: { id: string; fullName: string; email: string } }) => void;
}

const STEP_LABELS = ['Owner & Business', 'KYC & Bank', 'Address & Operations'];

interface AddressInput { addressLine: string; city: string; state: string; pincode: string }
const blankAddress = (): AddressInput => ({ addressLine: '', city: '', state: '', pincode: '' });

const VENDOR_TYPE_LABEL: Record<VendorType, string> = {
  distributor:  'Distributor',
  wholesaler:   'Wholesaler',
  brand_store:  'Brand Store',
  manufacturer: 'Manufacturer',
  dark_store:   'Dark Store',
};

const DELIVERY_LABEL: Record<DeliveryCapability, string> = {
  own_fleet:   'Own fleet',
  third_party: 'Third-party (e.g. Dunzo/Porter)',
  both:        'Both — own + third-party',
};

export function AddVendorWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Owner + Business basics
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [vendorType, setVendorType] = useState<VendorType | ''>('');
  const [gstin, setGstin] = useState('');

  // Step 2 — KYC + Bank
  const [panNumber, setPanNumber] = useState('');
  const [authorizedPersonName, setAuthorizedPersonName] = useState('');
  const [authorizedPersonPhone, setAuthorizedPersonPhone] = useState('');
  const [authorizedPersonEmail, setAuthorizedPersonEmail] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountType, setBankAccountType] = useState<'savings' | 'current'>('current');
  const [billingAddress, setBillingAddress] = useState<AddressInput>(blankAddress());

  // Step 3 — Address & Operations
  const [pickupSameAsBilling, setPickupSameAsBilling] = useState(true);
  const [pickupAddress, setPickupAddress] = useState<AddressInput>(blankAddress());
  const [outletName, setOutletName] = useState('');
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [pincodeInput, setPincodeInput] = useState('');
  const [deliveryCapability, setDeliveryCapability] = useState<DeliveryCapability | ''>('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [udyamNumber, setUdyamNumber] = useState('');
  const [cinNumber, setCinNumber] = useState('');
  const [description, setDescription] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');

  const effectivePickup = pickupSameAsBilling ? billingAddress : pickupAddress;

  // ── Step validation. Allow user to navigate; if a required field is
  //    missing the Next/Submit button disables instead of silently failing.
  const step1Ok =
    fullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 6 &&
    PHONE_RE.test(phone) &&
    businessName.trim().length >= 2 &&
    !!vendorType &&
    (!gstin.trim() || GST_RE.test(gstin.trim()));

  const step2Ok =
    PAN_RE.test(panNumber.trim()) &&
    authorizedPersonName.trim().length >= 2 &&
    PHONE_RE.test(authorizedPersonPhone) &&
    (!authorizedPersonEmail.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorizedPersonEmail.trim())) &&
    bankAccountName.trim().length >= 2 &&
    bankAccountNumber.trim().length >= 8 &&
    IFSC_RE.test(bankIfsc.trim()) &&
    bankName.trim().length >= 2 &&
    billingAddress.addressLine.trim().length >= 5 &&
    billingAddress.city.trim() &&
    billingAddress.state.trim() &&
    PINCODE_RE.test(billingAddress.pincode);

  const step3Ok =
    outletName.trim().length >= 1 &&
    effectivePickup.addressLine.trim().length >= 1 &&
    pincodes.length > 0 &&
    !!deliveryCapability;

  const handleAddPincode = () => {
    const value = pincodeInput.trim();
    if (!PINCODE_RE.test(value)) {
      toast.error('Enter a valid 6-digit pincode');
      return;
    }
    if (pincodes.includes(value)) {
      setPincodeInput('');
      return;
    }
    setPincodes((prev) => [...prev, value]);
    setPincodeInput('');
  };

  const handleRemovePincode = (p: string) => {
    setPincodes((prev) => prev.filter((x) => x !== p));
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!step1Ok) { setError('Please complete the required fields'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!step2Ok) { setError('Please complete the required fields'); return; }
      setStep(3);
    }
  };
  const handleBack = () => { setError(null); setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s)); };

  const handleSubmit = async () => {
    setError(null);
    if (!step1Ok || !step2Ok || !step3Ok) {
      setError('Some fields are incomplete or invalid');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        businessName: businessName.trim(),
        tradeName: tradeName.trim() || undefined,
        gstin: gstin.trim() || undefined,
        description: description.trim() || undefined,
        minOrderValue: minOrderValue ? Number(minOrderValue) : undefined,
        primaryOutlet: {
          name: outletName.trim(),
          addressLine: effectivePickup.addressLine.trim(),
          city: effectivePickup.city.trim() || undefined,
          state: effectivePickup.state.trim() || undefined,
          pincode: effectivePickup.pincode.trim() || undefined,
        },
        vendorDetails: {
          vendorType,
          panNumber: panNumber.trim().toUpperCase(),
          authorizedPersonName: authorizedPersonName.trim(),
          authorizedPersonPhone: authorizedPersonPhone.trim(),
          authorizedPersonEmail: authorizedPersonEmail.trim() || undefined,
          billingAddress: {
            addressLine: billingAddress.addressLine.trim(),
            city: billingAddress.city.trim(),
            state: billingAddress.state.trim(),
            pincode: billingAddress.pincode.trim(),
          },
          bankAccountName: bankAccountName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankIfsc: bankIfsc.trim().toUpperCase(),
          bankName: bankName.trim(),
          bankAccountType,
          serviceablePincodes: pincodes,
          deliveryCapability,
          fssaiNumber: fssaiNumber.trim() || undefined,
          udyamNumber: udyamNumber.trim() || undefined,
          cinNumber: cinNumber.trim() || undefined,
        },
      };
      const res = await fetch('/api/v1/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || json.error || 'Failed to create vendor');
        return;
      }
      toast.success(`${json.data.businessName} created`);
      onCreated(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[15000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[20px] w-full max-w-[820px] shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ECFDF5] rounded-[10px] flex items-center justify-center">
              <UserPlus size={18} className="text-[#299E60]" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#181725]">Add Vendor</h3>
              <p className="text-[11px] text-[#AEAEAE] font-medium">
                Step {step} of 3 — {STEP_LABELS[step - 1]}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-gray-100">
            <X size={16} className="text-[#7C7C7C]" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center">
            {([1, 2, 3] as const).map((s, i) => (
              <Step key={s} num={s} label={STEP_LABELS[s - 1]} current={step} showConnector={i < 2} />
            ))}
          </div>
        </div>

        {/* Body — autoComplete handled per-input (autoComplete on the outer
            <div> isn't a valid React prop and TS bails). */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {/* Disclaimer always visible at the top */}
          {step === 1 && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-blue-50 border border-blue-100 rounded-[10px]">
              <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[11.5px] text-blue-800 leading-relaxed">
                Creates a <strong>new HCID</strong> — a fresh User, BusinessAccount, and Vendor profile.
                The vendor signs in with the email + password you set here. Use the vendor&apos;s own credentials, not yours.
              </p>
            </div>
          )}

          {/* Step 1 — Owner + Business */}
          {step === 1 && (
            <div className="space-y-4">
              <SectionLabel>Owner Account</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Owner Full Name" required>
                  <Input name="vendor-owner-name" value={fullName} onChange={setFullName} placeholder="Rajesh Kumar" />
                </Field>
                <Field label="Owner Phone (10-digit)" required>
                  <Input
                    name="vendor-owner-phone" value={phone}
                    onChange={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210" inputMode="tel"
                  />
                </Field>
              </div>
              <Field label="Owner Email" required>
                <Input name="vendor-owner-email" type="email" value={email} onChange={setEmail} placeholder="rajesh@dailyfreshfoods.com" />
              </Field>
              <Field label="Owner Password" required>
                <div className="relative">
                  <Input
                    name="vendor-owner-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={setPassword}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEAE]">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>

              <div className="pt-2 border-t border-[#EEEEEE]" />
              <SectionLabel>Business</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Legal Business Name" required>
                  <Input name="vendor-legal-name" value={businessName} onChange={setBusinessName} placeholder="Daily Fresh Foods Pvt Ltd" />
                </Field>
                <Field label="Trade Name / Display Name">
                  <Input name="vendor-trade-name" value={tradeName} onChange={setTradeName} placeholder="Daily Fresh" />
                </Field>
              </div>
              <Field label="Vendor Type" required>
                <select
                  value={vendorType}
                  onChange={(e) => setVendorType(e.target.value as VendorType)}
                  className="w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/40 bg-[#FAFAFA] focus:bg-white"
                >
                  <option value="">Select vendor type…</option>
                  {VENDOR_TYPES.map((t) => <option key={t} value={t}>{VENDOR_TYPE_LABEL[t]}</option>)}
                </select>
              </Field>
              <Field label="GSTIN (15-character)" hint="Optional, e.g. for unregistered small vendors">
                <Input
                  name="vendor-gstin" value={gstin}
                  onChange={(v) => setGstin(v.toUpperCase().slice(0, 15))}
                  placeholder="22ABCDE1234F1Z5"
                />
              </Field>
            </div>
          )}

          {/* Step 2 — KYC + Bank */}
          {step === 2 && (
            <div className="space-y-4">
              <SectionLabel>Identity</SectionLabel>
              <Field label="PAN" required>
                <Input
                  name="vendor-pan" value={panNumber}
                  onChange={(v) => setPanNumber(v.toUpperCase().slice(0, 10))}
                  placeholder="ABCDE1234F"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Authorized Person Name" required>
                  <Input name="vendor-ap-name" value={authorizedPersonName} onChange={setAuthorizedPersonName} placeholder="Rajesh Kumar" />
                </Field>
                <Field label="Authorized Person Phone" required>
                  <Input
                    name="vendor-ap-phone" value={authorizedPersonPhone}
                    onChange={(v) => setAuthorizedPersonPhone(v.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210" inputMode="tel"
                  />
                </Field>
              </div>
              <Field label="Authorized Person Email">
                <Input name="vendor-ap-email" type="email" value={authorizedPersonEmail} onChange={setAuthorizedPersonEmail} placeholder="rajesh@dailyfresh.com" />
              </Field>

              <div className="pt-2 border-t border-[#EEEEEE]" />
              <SectionLabel><IndianRupee size={12} className="inline mr-1" />Bank Details</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account Holder Name" required>
                  <Input name="vendor-bank-name" value={bankAccountName} onChange={setBankAccountName} placeholder="Daily Fresh Foods Pvt Ltd" />
                </Field>
                <Field label="Account Number" required>
                  <Input
                    name="vendor-bank-acc" value={bankAccountNumber}
                    onChange={(v) => setBankAccountNumber(v.replace(/\D/g, '').slice(0, 30))}
                    placeholder="50100123456789"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="IFSC" required>
                  <Input
                    name="vendor-ifsc" value={bankIfsc}
                    onChange={(v) => setBankIfsc(v.toUpperCase().slice(0, 11))}
                    placeholder="HDFC0001234"
                  />
                </Field>
                <Field label="Bank Name" required>
                  <Input name="vendor-bank" value={bankName} onChange={setBankName} placeholder="HDFC Bank" />
                </Field>
              </div>
              <Field label="Account Type" required>
                <div className="flex items-center gap-2">
                  {(['savings', 'current'] as const).map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => setBankAccountType(t)}
                      className={`flex-1 h-[40px] rounded-[10px] text-[12.5px] font-bold border-2 capitalize transition-all
                        ${bankAccountType === t ? 'border-[#299E60] bg-[#ECFDF5] text-[#299E60]' : 'border-[#EEEEEE] bg-white text-[#7C7C7C]'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="pt-2 border-t border-[#EEEEEE]" />
              <SectionLabel><MapPin size={12} className="inline mr-1" />Billing Address (Bill From on invoices)</SectionLabel>
              <AddressFields
                value={billingAddress}
                onChange={setBillingAddress}
                fieldPrefix="vendor-billing"
              />
            </div>
          )}

          {/* Step 3 — Address & Operations */}
          {step === 3 && (
            <div className="space-y-4">
              <SectionLabel><MapPin size={12} className="inline mr-1" />Pickup / Warehouse Outlet</SectionLabel>
              <Field label="Outlet name" required hint="e.g. 'Mumbai Warehouse', 'Main Store'">
                <Input name="vendor-outlet-name" value={outletName} onChange={setOutletName} placeholder="Main Warehouse" />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={pickupSameAsBilling}
                  onChange={(e) => setPickupSameAsBilling(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-[12.5px] text-[#181725]">Pickup address is same as billing address</span>
              </label>
              {!pickupSameAsBilling && (
                <AddressFields
                  value={pickupAddress}
                  onChange={setPickupAddress}
                  fieldPrefix="vendor-pickup"
                />
              )}

              <div className="pt-2 border-t border-[#EEEEEE]" />
              <SectionLabel><Truck size={12} className="inline mr-1" />Operations</SectionLabel>
              <Field label="Serviceable Pincodes" required hint="Press Enter or click + after each 6-digit pincode">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text" inputMode="numeric"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPincode(); } }}
                    placeholder="400001"
                    className="flex-1 h-[40px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/40 bg-[#FAFAFA] focus:bg-white"
                  />
                  <button
                    type="button" onClick={handleAddPincode}
                    disabled={!PINCODE_RE.test(pincodeInput)}
                    className="h-[40px] px-3 bg-[#299E60] hover:bg-[#238a54] disabled:bg-gray-300 text-white rounded-[10px] text-[12.5px] font-bold flex items-center gap-1"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pincodes.length === 0 ? (
                    <p className="text-[11.5px] text-[#AEAEAE] italic">No pincodes added yet</p>
                  ) : pincodes.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 text-[11.5px] font-mono font-bold bg-[#ECFDF5] text-[#299E60] px-2 py-1 rounded-full">
                      {p}
                      <button type="button" onClick={() => handleRemovePincode(p)} className="hover:text-[#181725]">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </Field>

              <Field label="Delivery Capability" required>
                <div className="grid grid-cols-3 gap-2">
                  {DELIVERY_CAPABILITIES.map((d) => (
                    <button
                      key={d} type="button"
                      onClick={() => setDeliveryCapability(d)}
                      className={`p-3 rounded-[10px] text-[12px] font-bold border-2 text-left transition-all
                        ${deliveryCapability === d ? 'border-[#299E60] bg-[#ECFDF5] text-[#299E60]' : 'border-[#EEEEEE] bg-white text-[#7C7C7C]'}`}
                    >
                      {DELIVERY_LABEL[d]}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="FSSAI">
                  <Input name="vendor-fssai" value={fssaiNumber} onChange={setFssaiNumber} placeholder="14-digit license" />
                </Field>
                <Field label="Udyam">
                  <Input name="vendor-udyam" value={udyamNumber} onChange={setUdyamNumber} placeholder="UDYAM-XX-00-0000000" />
                </Field>
                <Field label="CIN">
                  <Input name="vendor-cin" value={cinNumber} onChange={setCinNumber} placeholder="CIN" />
                </Field>
              </div>

              <div className="pt-2 border-t border-[#EEEEEE]" />
              <SectionLabel><Building2 size={12} className="inline mr-1" />Storefront (optional)</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min Order Value (₹)">
                  <Input
                    name="vendor-mov" value={minOrderValue}
                    onChange={(v) => setMinOrderValue(v.replace(/\D/g, '').slice(0, 7))}
                    placeholder="500" inputMode="numeric"
                  />
                </Field>
              </div>
              <Field label="Description" hint="Shown on the storefront header">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the vendor…"
                  rows={2}
                  className="w-full border border-[#EEEEEE] rounded-[10px] px-3 py-2 text-[13px] outline-none focus:border-[#299E60]/40 bg-[#FAFAFA] focus:bg-white transition-all resize-none"
                />
              </Field>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-[10px] p-3">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F0F0F0] flex items-center justify-between shrink-0 bg-[#FAFAFA] rounded-b-[20px]">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="h-[40px] px-4 flex items-center gap-1.5 text-[13px] font-bold text-[#7C7C7C] hover:text-[#181725] transition-colors"
            >
              <ChevronLeft size={15} /> Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={(step === 1 && !step1Ok) || (step === 2 && !step2Ok)}
              className="h-[42px] px-6 bg-[#299E60] hover:bg-[#238a54] disabled:bg-gray-300 text-white rounded-[10px] text-[13px] font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !step3Ok}
              className="h-[42px] px-6 bg-[#299E60] hover:bg-[#238a54] disabled:bg-gray-300 text-white rounded-[10px] text-[13px] font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {submitting ? 'Creating vendor…' : 'Create Vendor'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step indicator ──────────────────────────────────────────────────────
function Step({ num, label, current, showConnector }: { num: 1 | 2 | 3; label: string; current: number; showConnector: boolean }) {
  return (
    <>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all shrink-0 ${
          num < current ? 'bg-[#299E60] text-white' :
          num === current ? 'bg-[#299E60] text-white ring-4 ring-[#299E60]/20' :
                            'bg-[#F0F0F0] text-[#AEAEAE]'
        }`}
      >
        {num < current ? <Check size={14} /> : num}
      </div>
      {showConnector && (
        <div className="flex-1 flex items-center gap-1 mx-2">
          <div className={`flex-1 h-[2px] rounded transition-colors ${num < current ? 'bg-[#299E60]' : 'bg-[#F0F0F0]'}`} />
          <span className={`text-[10px] font-bold whitespace-nowrap ${num < current ? 'text-[#299E60]' : 'text-[#AEAEAE]'}`}>
            {label}
          </span>
          <div className={`flex-1 h-[2px] rounded transition-colors ${num < current ? 'bg-[#299E60]' : 'bg-[#F0F0F0]'}`} />
        </div>
      )}
    </>
  );
}

// ── Address sub-block ───────────────────────────────────────────────────
function AddressFields({
  value, onChange, fieldPrefix,
}: {
  value: AddressInput;
  onChange: (v: AddressInput) => void;
  fieldPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <Field label="Address line" required>
        <Input
          name={`${fieldPrefix}-line`} value={value.addressLine}
          onChange={(v) => onChange({ ...value, addressLine: v })}
          placeholder="Plot 22, MIDC Phase II"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="City" required>
          <Input
            name={`${fieldPrefix}-city`} value={value.city}
            onChange={(v) => onChange({ ...value, city: v })}
            placeholder="Mumbai"
          />
        </Field>
        <Field label="State" required>
          <Input
            name={`${fieldPrefix}-state`} value={value.state}
            onChange={(v) => onChange({ ...value, state: v })}
            placeholder="Maharashtra"
          />
        </Field>
        <Field label="Pincode" required>
          <Input
            name={`${fieldPrefix}-pin`} value={value.pincode}
            onChange={(v) => onChange({ ...value, pincode: v.replace(/\D/g, '').slice(0, 6) })}
            placeholder="400001" inputMode="numeric"
          />
        </Field>
      </div>
    </div>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider">{children}</p>;
}

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400 normal-case">*</span>}
        {hint && <span className="ml-1 text-[10px] text-[#AEAEAE] normal-case font-normal">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, type = 'text', placeholder, name, inputMode, autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  name?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  autoComplete?: string;
}) {
  return (
    <input
      type={type} value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      name={name}
      autoComplete={autoComplete ?? 'off'}
      inputMode={inputMode}
      className="w-full h-[42px] border border-[#EEEEEE] rounded-[10px] px-3 text-[13px] outline-none focus:border-[#299E60]/40 focus:ring-2 focus:ring-[#299E60]/10 bg-[#FAFAFA] focus:bg-white transition-all"
    />
  );
}
