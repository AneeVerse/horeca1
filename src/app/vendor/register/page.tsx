'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Loader2, CheckCircle2, Phone, Building2, FileText, Landmark,
  MapPin, Truck, ShieldCheck, X, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_TITLES = [
  { id: 1, label: 'Verify Mobile', icon: Phone },
  { id: 2, label: 'Business Type', icon: Building2 },
  { id: 3, label: 'Basic Details', icon: FileText },
  { id: 4, label: 'GST & PAN', icon: FileText },
  { id: 5, label: 'Bank Details', icon: Landmark },
  { id: 6, label: 'Addresses', icon: MapPin },
  { id: 7, label: 'Service & KYC', icon: ShieldCheck },
];

const VENDOR_TYPES = [
  { id: 'distributor', label: 'Distributor', desc: 'Resell to retailers / HORECA buyers' },
  { id: 'wholesaler', label: 'Wholesaler', desc: 'Bulk sale to businesses' },
  { id: 'manufacturer', label: 'Manufacturer', desc: 'Produce and sell own brand goods' },
  { id: 'importer', label: 'Importer', desc: 'Import and distribute foreign goods' },
  { id: 'producer', label: 'Producer / Farm', desc: 'Fresh produce or farm goods' },
];

const PHONE_RE = /^\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE_RE = /^\d{6}$/;

type Address = { addressLine: string; city: string; state: string; pincode: string };

const blankAddress = (): Address => ({ addressLine: '', city: '', state: '', pincode: '' });

const RESEND_COOLDOWN = 60;

export default function VendorRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{ hcid: string } | null>(null);

  // Step 1 — phone verify
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Step 2
  const [vendorType, setVendorType] = useState<string>('');

  // Step 3
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authorizedPersonName, setAuthorizedPersonName] = useState('');
  const [authorizedPersonPhone, setAuthorizedPersonPhone] = useState('');
  const [authorizedPersonEmail, setAuthorizedPersonEmail] = useState('');

  // Step 4
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Step 5
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountType, setBankAccountType] = useState<'savings' | 'current'>('current');

  // Step 6
  const [billingAddress, setBillingAddress] = useState<Address>(blankAddress());
  const [pickupAddress, setPickupAddress] = useState<Address>(blankAddress());
  const [pickupSameAsBilling, setPickupSameAsBilling] = useState(false);

  // Step 7
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [pincodeInput, setPincodeInput] = useState('');
  const [deliveryCapability, setDeliveryCapability] = useState<'own_fleet' | 'third_party' | 'both' | ''>('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [udyamNumber, setUdyamNumber] = useState('');
  const [cinNumber, setCinNumber] = useState('');

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startResendTimer = useCallback(() => {
    setResendTimer(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => { if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; } return prev - 1; });
    }, 1000);
  }, []);

  // ─── Step 1: Phone OTP ─────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setError('');
    if (!PHONE_RE.test(phone)) { setError('Enter a valid 10-digit mobile number'); return; }
    setOtpLoading(true);
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mode: 'register' }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Failed to send OTP'); return; }
      setOtpSent(true);
      startResendTimer();
      setTimeout(() => otpRefs[0].current?.focus(), 80);
    } catch { setError('Failed to send OTP. Please try again.'); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 4) return;
    setError('');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Invalid or expired OTP');
        setOtpDigits(['', '', '', '']);
        setTimeout(() => otpRefs[0].current?.focus(), 50);
        return;
      }
      setPhoneVerified(true);
      setStep(2);
    } catch { setError('Verification failed. Please try again.'); }
    finally { setOtpLoading(false); }
  };

  const handleOtpInput = (i: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 4);
      const next = ['', '', '', ''];
      for (let j = 0; j < digits.length; j++) next[j] = digits[j];
      setOtpDigits(next);
      otpRefs[Math.min(digits.length, 3)]?.current?.focus();
      if (digits.length === 4) handleVerifyOtp(digits);
      return;
    }
    const digit = value.replace(/\D/g, '');
    const next = [...otpDigits];
    next[i] = digit;
    setOtpDigits(next);
    if (digit && i < 3) otpRefs[i + 1].current?.focus();
    if (digit && next.every(d => d)) handleVerifyOtp(next.join(''));
  };

  // ─── Pincode chip input ─────────────────────────────────────────────────
  const addPincode = () => {
    const p = pincodeInput.trim();
    if (!PINCODE_RE.test(p)) { setError('Pincode must be 6 digits'); return; }
    if (pincodes.includes(p)) { setPincodeInput(''); return; }
    setPincodes([...pincodes, p]);
    setPincodeInput('');
    setError('');
  };
  const removePincode = (p: string) => setPincodes(pincodes.filter(x => x !== p));

  // ─── Pickup same as billing ─────────────────────────────────────────────
  useEffect(() => {
    if (pickupSameAsBilling) setPickupAddress({ ...billingAddress });
  }, [pickupSameAsBilling, billingAddress]);

  // ─── Validation per step ────────────────────────────────────────────────
  const validateStep = (s: number): string | null => {
    switch (s) {
      case 1:
        if (!phoneVerified) return 'Please verify your mobile number first';
        return null;
      case 2:
        if (!vendorType) return 'Select your business type';
        return null;
      case 3:
        if (fullName.trim().length < 2) return 'Enter your full name';
        if (businessName.trim().length < 2) return 'Enter business name';
        if (tradeName.trim().length < 2) return 'Enter trade name';
        if (email && !EMAIL_RE.test(email)) return 'Enter a valid email';
        if (password && password.length < 6) return 'Password must be at least 6 characters';
        if (authorizedPersonName.trim().length < 2) return 'Enter authorized person name';
        if (!PHONE_RE.test(authorizedPersonPhone)) return 'Authorized person phone must be 10 digits';
        if (authorizedPersonEmail && !EMAIL_RE.test(authorizedPersonEmail)) return 'Invalid authorized person email';
        return null;
      case 4:
        if (!GST_RE.test(gstNumber.toUpperCase())) return 'Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)';
        if (!PAN_RE.test(panNumber.toUpperCase())) return 'Invalid PAN format (e.g. ABCDE1234F)';
        return null;
      case 5:
        if (bankAccountName.trim().length < 2) return 'Enter account holder name';
        if (bankAccountNumber.trim().length < 8) return 'Enter a valid account number';
        if (!IFSC_RE.test(bankIfsc.toUpperCase())) return 'Invalid IFSC (e.g. HDFC0001234)';
        if (bankName.trim().length < 2) return 'Enter bank name';
        return null;
      case 6: {
        const check = (a: Address, label: string) => {
          if (a.addressLine.trim().length < 5) return `Enter ${label} address line`;
          if (a.city.trim().length < 1) return `Enter ${label} city`;
          if (a.state.trim().length < 1) return `Enter ${label} state`;
          if (!PINCODE_RE.test(a.pincode)) return `Invalid ${label} pincode`;
          return null;
        };
        return check(billingAddress, 'billing') ?? check(pickupAddress, 'pickup');
      }
      case 7:
        if (pincodes.length === 0) return 'Add at least one serviceable pincode';
        if (!deliveryCapability) return 'Select your delivery capability';
        return null;
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    if (step < 7) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  // ─── Final submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const body = {
        phone,
        vendorType,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        tradeName: tradeName.trim(),
        email: email.trim().toLowerCase(),
        password,
        authorizedPersonName: authorizedPersonName.trim(),
        authorizedPersonPhone,
        authorizedPersonEmail: authorizedPersonEmail.trim().toLowerCase(),
        gstNumber: gstNumber.toUpperCase().trim(),
        panNumber: panNumber.toUpperCase().trim(),
        bankAccountName: bankAccountName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfsc: bankIfsc.toUpperCase().trim(),
        bankName: bankName.trim(),
        bankAccountType,
        billingAddress,
        pickupAddress,
        serviceablePincodes: pincodes,
        deliveryCapability,
        fssaiNumber: fssaiNumber.trim(),
        udyamNumber: udyamNumber.trim(),
        cinNumber: cinNumber.trim(),
      };
      const res = await fetch('/api/v1/vendor/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || data.error || 'Failed to submit application');
        return;
      }
      setSubmitted({ hcid: data.data?.hcidDisplay ?? '' });
    } catch { setError('Submission failed. Please try again.'); }
    finally { setSubmitting(false); }
  };

  // ─── SUCCESS SCREEN ─────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} className="text-[#53B175]" />
          </div>
          <h1 className="text-[24px] font-[800] text-gray-800 mb-3">Application Submitted</h1>
          <p className="text-[14px] text-gray-500 mb-6 leading-relaxed">
            Thank you for applying! Your vendor account is under review. Our team will verify your KYC documents and contact you shortly.
          </p>
          {submitted.hcid && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6">
              <p className="text-[12px] text-gray-400 mb-1">Your HCID</p>
              <p className="text-[16px] font-bold text-gray-800 tracking-wider">{submitted.hcid}</p>
            </div>
          )}
          <button
            onClick={() => router.push('/')}
            className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ─── WIZARD ─────────────────────────────────────────────────────────────
  const progress = ((step - 1) / 6) * 100;

  return (
    <div className="flex flex-col">
      {/* Header — strong, branded onboarding banner */}
      <div className="bg-gradient-to-r from-[#53B175] to-[#48a068] px-4 md:px-10 py-5 md:py-7 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] md:text-[12px] font-bold uppercase tracking-[0.18em] text-white/70 mb-1">Vendor Application</p>
            <h1 className="text-[20px] md:text-[26px] font-[900] text-white leading-tight">Become a Horeca1 Vendor</h1>
            <p className="text-[12px] md:text-[13px] text-white/80 mt-1">Complete 7 quick steps — our team reviews within 24 hours.</p>
          </div>
          <button onClick={() => router.push('/')}
            className="shrink-0 flex items-center gap-1.5 text-[12px] font-bold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 transition-colors">
            Exit <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white px-4 md:px-8 pt-4 pb-3 border-b border-gray-100 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-gray-600">Step {step} of 7</span>
            <span className="text-[12px] font-bold text-[#53B175]">{Math.round(progress)}% complete</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#53B175] transition-all duration-300" style={{ width: `${progress + (100 / 7)}%` }} />
          </div>
          <div className="mt-3 hidden md:flex items-center justify-between">
            {STEP_TITLES.map((s) => {
              const done = s.id < step;
              const active = s.id === step;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex flex-col items-center text-center flex-1">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors',
                    done ? 'bg-[#53B175] text-white' :
                    active ? 'bg-[#53B175]/10 text-[#53B175] ring-2 ring-[#53B175]' :
                    'bg-gray-100 text-gray-400',
                  )}>
                    {done ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                  </div>
                  <span className={cn('mt-1.5 text-[10px]', active ? 'text-[#53B175] font-bold' : 'text-gray-400')}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <main className="px-4 md:px-8 py-6 md:py-8 pb-28 md:pb-24">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-[13px] text-red-600 font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <section>
              <h2 className="text-[22px] font-[800] text-gray-800 mb-1">Verify your mobile number</h2>
              <p className="text-[13px] text-gray-500 mb-6">We&apos;ll send a 4-digit OTP to confirm.</p>

              <Field label="Mobile number" required>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[13px] font-bold text-gray-500 z-10">+91</span>
                  <input type="tel" inputMode="numeric" maxLength={10}
                    disabled={otpSent}
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                    placeholder="10 digit mobile number"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175] disabled:bg-gray-50 disabled:text-gray-500" />
                </div>
              </Field>

              {!otpSent ? (
                <button onClick={handleSendOtp} disabled={otpLoading || !PHONE_RE.test(phone)}
                  className="mt-4 bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {otpLoading && <Loader2 size={16} className="animate-spin" />} Send OTP
                </button>
              ) : (
                <div className="mt-6">
                  <Field label={`Enter the 4-digit OTP sent to +91 ${phone}`} required>
                    <div className="flex gap-3">
                      {otpDigits.map((d, i) => (
                        <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={4}
                          value={d} onChange={e => handleOtpInput(i, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Backspace' && !otpDigits[i] && i > 0) otpRefs[i - 1].current?.focus(); }}
                          disabled={otpLoading || phoneVerified}
                          className={cn(
                            'w-[56px] h-[56px] text-center text-[22px] font-[800] border-2 rounded-xl outline-none transition-all',
                            d ? 'border-[#53B175] bg-green-50 text-[#53B175]' : 'border-gray-200 bg-white',
                            'focus:border-[#53B175]',
                          )}
                        />
                      ))}
                    </div>
                  </Field>
                  <div className="mt-3 flex items-center gap-4 text-[13px]">
                    {phoneVerified ? (
                      <span className="text-[#53B175] font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Verified</span>
                    ) : resendTimer > 0 ? (
                      <span className="text-gray-400">Resend OTP in <strong>{resendTimer}s</strong></span>
                    ) : (
                      <button onClick={handleSendOtp} disabled={otpLoading} className="text-[#53B175] font-bold hover:underline">Resend OTP</button>
                    )}
                    {!phoneVerified && (
                      <button onClick={() => { setOtpSent(false); setOtpDigits(['', '', '', '']); }} className="text-gray-500 hover:underline">
                        Change number
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="text-[22px] font-[800] text-gray-800 mb-1">What kind of business are you?</h2>
              <p className="text-[13px] text-gray-500 mb-6">Select the option that best describes your business.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {VENDOR_TYPES.map(t => (
                  <button key={t.id} onClick={() => { setVendorType(t.id); setError(''); }}
                    className={cn(
                      'text-left p-4 border-2 rounded-xl transition-all',
                      vendorType === t.id
                        ? 'border-[#53B175] bg-green-50/50 ring-1 ring-[#53B175]'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    )}>
                    <div className="font-bold text-[15px] text-gray-800 mb-0.5">{t.label}</div>
                    <div className="text-[12px] text-gray-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="text-[22px] font-[800] text-gray-800 mb-1">Basic Details</h2>
              <p className="text-[13px] text-gray-500 mb-6">Tell us about your business and the person we&apos;ll be in touch with.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Your full name" required>
                  <Input value={fullName} onChange={setFullName} placeholder="John Doe" />
                </Field>
                <Field label="Business (legal) name" required>
                  <Input value={businessName} onChange={setBusinessName} placeholder="Acme Foods Pvt Ltd" />
                </Field>
                <Field label="Trade name (storefront)" required className="md:col-span-2">
                  <Input value={tradeName} onChange={setTradeName} placeholder="Acme Foods" />
                </Field>
                <Field label="Email (optional)">
                  <Input value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
                </Field>
                <Field label="Password (optional — skip OTP next time)">
                  <Input value={password} onChange={setPassword} type="password" placeholder="At least 6 characters" />
                </Field>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="font-bold text-[15px] text-gray-800 mb-1">Authorized Person</h3>
                <p className="text-[12px] text-gray-500 mb-4">The person we should contact for KYC and approvals.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Name" required>
                    <Input value={authorizedPersonName} onChange={setAuthorizedPersonName} placeholder="Full name" />
                  </Field>
                  <Field label="Phone" required>
                    <Input value={authorizedPersonPhone} onChange={v => setAuthorizedPersonPhone(v.replace(/\D/g, '').slice(0, 10))} type="tel" placeholder="10-digit number" />
                  </Field>
                  <Field label="Email (optional)" className="md:col-span-2">
                    <Input value={authorizedPersonEmail} onChange={setAuthorizedPersonEmail} type="email" placeholder="you@example.com" />
                  </Field>
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2 className="text-[22px] font-[800] text-gray-800 mb-1">GST & PAN</h2>
              <p className="text-[13px] text-gray-500 mb-6">Required by law for B2B invoicing.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="GSTIN" required>
                  <Input value={gstNumber} onChange={v => setGstNumber(v.toUpperCase().slice(0, 15))} placeholder="27ABCDE1234F1Z5" />
                </Field>
                <Field label="PAN" required>
                  <Input value={panNumber} onChange={v => setPanNumber(v.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" />
                </Field>
              </div>
              <p className="text-[12px] text-gray-400 mt-4">
                Your GSTIN must match the legal name. Our team will verify these against the GST portal.
              </p>
            </section>
          )}

          {step === 5 && (
            <section>
              <h2 className="text-[22px] font-[800] text-gray-800 mb-1">Bank Details</h2>
              <p className="text-[13px] text-gray-500 mb-6">For settlement of your orders. Your account will be verified via a ₹1 penny-drop.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Account holder name" required className="md:col-span-2">
                  <Input value={bankAccountName} onChange={setBankAccountName} placeholder="As per bank records" />
                </Field>
                <Field label="Account number" required>
                  <Input value={bankAccountNumber} onChange={v => setBankAccountNumber(v.replace(/\D/g, '').slice(0, 18))} placeholder="123456789012" />
                </Field>
                <Field label="IFSC code" required>
                  <Input value={bankIfsc} onChange={v => setBankIfsc(v.toUpperCase().slice(0, 11))} placeholder="HDFC0001234" />
                </Field>
                <Field label="Bank name" required>
                  <Input value={bankName} onChange={setBankName} placeholder="HDFC Bank" />
                </Field>
                <Field label="Account type" required>
                  <select value={bankAccountType} onChange={e => setBankAccountType(e.target.value as 'savings' | 'current')}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175]">
                    <option value="current">Current</option>
                    <option value="savings">Savings</option>
                  </select>
                </Field>
              </div>
            </section>
          )}

          {step === 6 && (
            <section>
              <h2 className="text-[22px] font-[800] text-gray-800 mb-1">Addresses</h2>
              <p className="text-[13px] text-gray-500 mb-6">Billing address goes on invoices. Pickup address is where our delivery partner collects orders.</p>

              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
                <h3 className="font-bold text-[15px] text-gray-800 mb-3">Billing Address</h3>
                <div className="space-y-3">
                  <Field label="Address line" required>
                    <Input value={billingAddress.addressLine} onChange={v => setBillingAddress({ ...billingAddress, addressLine: v })} placeholder="Building, street, area" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" required>
                      <Input value={billingAddress.city} onChange={v => setBillingAddress({ ...billingAddress, city: v })} />
                    </Field>
                    <Field label="State" required>
                      <Input value={billingAddress.state} onChange={v => setBillingAddress({ ...billingAddress, state: v })} />
                    </Field>
                  </div>
                  <Field label="Pincode" required>
                    <Input value={billingAddress.pincode} onChange={v => setBillingAddress({ ...billingAddress, pincode: v.replace(/\D/g, '').slice(0, 6) })} placeholder="6-digit pincode" />
                  </Field>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[15px] text-gray-800">Pickup / Warehouse Address</h3>
                  <label className="flex items-center gap-2 text-[12px] text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={pickupSameAsBilling} onChange={e => setPickupSameAsBilling(e.target.checked)}
                      className="accent-[#53B175]" />
                    Same as billing
                  </label>
                </div>
                <div className="space-y-3">
                  <Field label="Address line" required>
                    <Input value={pickupAddress.addressLine} disabled={pickupSameAsBilling}
                      onChange={v => setPickupAddress({ ...pickupAddress, addressLine: v })} placeholder="Warehouse / godown address" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" required>
                      <Input value={pickupAddress.city} disabled={pickupSameAsBilling}
                        onChange={v => setPickupAddress({ ...pickupAddress, city: v })} />
                    </Field>
                    <Field label="State" required>
                      <Input value={pickupAddress.state} disabled={pickupSameAsBilling}
                        onChange={v => setPickupAddress({ ...pickupAddress, state: v })} />
                    </Field>
                  </div>
                  <Field label="Pincode" required>
                    <Input value={pickupAddress.pincode} disabled={pickupSameAsBilling}
                      onChange={v => setPickupAddress({ ...pickupAddress, pincode: v.replace(/\D/g, '').slice(0, 6) })} placeholder="6-digit pincode" />
                  </Field>
                </div>
              </div>
            </section>
          )}

          {step === 7 && (
            <section>
              <h2 className="text-[22px] font-[800] text-gray-800 mb-1">Service Area & KYC</h2>
              <p className="text-[13px] text-gray-500 mb-6">Where can you deliver, and any additional certifications.</p>

              <Field label="Serviceable pincodes" required>
                <div className="flex gap-2">
                  <input value={pincodeInput}
                    onChange={e => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPincode(); } }}
                    placeholder="Add 6-digit pincode"
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175]" />
                  <button onClick={addPincode} className="px-4 py-3 bg-[#53B175] text-white rounded-lg font-bold flex items-center gap-1">
                    <Plus size={16} /> Add
                  </button>
                </div>
                {pincodes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pincodes.map(p => (
                      <span key={p} className="inline-flex items-center gap-1.5 bg-green-50 text-[#53B175] px-3 py-1.5 rounded-full text-[13px] font-bold">
                        {p}
                        <button onClick={() => removePincode(p)} className="hover:bg-[#53B175]/10 rounded-full p-0.5">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <span className="text-[12px] text-gray-400 self-center ml-2">{pincodes.length} pincode{pincodes.length !== 1 ? 's' : ''} added</span>
                  </div>
                )}
              </Field>

              <div className="mt-6">
                <Field label="Delivery capability" required>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {([
                      { id: 'own_fleet', label: 'Own fleet', desc: 'I deliver using my own vehicles' },
                      { id: 'third_party', label: '3rd party', desc: 'I use external logistics' },
                      { id: 'both', label: 'Both', desc: 'Mix of own + 3PL' },
                    ] as const).map(o => (
                      <button key={o.id} onClick={() => setDeliveryCapability(o.id)}
                        className={cn(
                          'p-3 border-2 rounded-lg text-left transition-all',
                          deliveryCapability === o.id ? 'border-[#53B175] bg-green-50/50' : 'border-gray-200 hover:border-gray-300',
                        )}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Truck size={14} className="text-[#53B175]" />
                          <span className="font-bold text-[13px] text-gray-800">{o.label}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">{o.desc}</div>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="font-bold text-[15px] text-gray-800 mb-1">Additional KYC (optional)</h3>
                <p className="text-[12px] text-gray-500 mb-4">Speed up approval by providing applicable certificates.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="FSSAI">
                    <Input value={fssaiNumber} onChange={setFssaiNumber} placeholder="14-digit license" />
                  </Field>
                  <Field label="Udyam">
                    <Input value={udyamNumber} onChange={setUdyamNumber} placeholder="UDYAM-XX-00-0000000" />
                  </Field>
                  <Field label="CIN">
                    <Input value={cinNumber} onChange={setCinNumber} placeholder="Company Identification No." />
                  </Field>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer action bar — pinned to viewport bottom */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 md:px-8 py-3 md:py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button onClick={handleBack} disabled={step === 1 || submitting}
            className="px-5 py-3 text-gray-600 font-bold rounded-lg hover:bg-gray-50 disabled:opacity-30 flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>

          {step === 1 && !phoneVerified ? (
            <span className="text-[12px] text-gray-400">Verify your number to continue</span>
          ) : (
            <button onClick={handleNext} disabled={submitting}
              className="px-6 py-3 bg-[#53B175] hover:bg-[#48a068] text-white font-bold rounded-lg flex items-center gap-2 shadow-md shadow-green-100 disabled:opacity-60">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {step === 7 ? 'Submit Application' : 'Continue'}
              {!submitting && step < 7 && <ArrowRight size={16} />}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

// ─── Tiny UI helpers ──────────────────────────────────────────────────────
function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-[12px] font-bold text-gray-700 ml-0.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, type = 'text', placeholder, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input type={type} value={value} disabled={disabled}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175] transition-colors',
        disabled && 'bg-gray-50 text-gray-500',
      )}
    />
  );
}
