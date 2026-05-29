'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useBusinessAccountSwitcher } from '@/hooks/useBusinessAccountSwitcher';
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

// Five vendor types per the platform spec. Keep keys stable — they're stored
// on Vendor.vendorType and read by downstream filters (search, segmentation,
// settlement rules). Any future addition must also update the API enums in
// /api/v1/account and /api/v1/vendor/onboarding/submit.
const VENDOR_TYPES = [
  { id: 'distributor',  label: 'Standard Distributor', desc: 'Stocks inventory and sells directly to B2B customers.' },
  { id: 'wholesaler',   label: 'Wholesaler',           desc: 'Large SKU catalog, regional pricing, bulk logistics.' },
  { id: 'brand_store',  label: 'Brand Store',          desc: 'Brand-controlled storefront. Maps products to distributors; may not fulfill directly.' },
  { id: 'manufacturer', label: 'Manufacturer',         desc: 'Direct sales, distributor-assisted sales, and institutional sales.' },
  { id: 'dark_store',   label: 'Dark Store / Fulfillment', desc: 'Inventory holding node, delivery-driven operations.' },
];

const PHONE_RE = /^\d{10}$/;
const PINCODE_RE = /^\d{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// ─── Per-field validators ─────────────────────────────────────────────────
// Returns an error message for an invalid value, or '' for valid.
// `optional` skips validation when the value is blank; required fields use
// `mustExist` to surface the "is required" error on blur.
const V = {
  required: (v: string, label: string) => v.trim() ? '' : `${label} is required`,
  minLen:   (v: string, label: string, n: number) => v.trim().length < n ? `${label} must be at least ${n} characters` : '',
  email:    (v: string) => !v.trim() ? '' : EMAIL_RE.test(v.trim()) ? '' : 'Enter a valid email address',
  phone10:  (v: string) => PHONE_RE.test(v) ? '' : 'Enter a valid 10-digit number',
  pincode:  (v: string) => PINCODE_RE.test(v) ? '' : 'Pincode must be 6 digits',
  gst:      (v: string) => GST_RE.test(v.toUpperCase()) ? '' : 'Format: 22ABCDE1234F1Z5',
  pan:      (v: string) => PAN_RE.test(v.toUpperCase()) ? '' : 'Format: ABCDE1234F',
  ifsc:     (v: string) => IFSC_RE.test(v.toUpperCase()) ? '' : 'Format: HDFC0001234',
  password: (v: string) => !v ? '' : v.length < 6 ? 'Password must be at least 6 characters' : '',
};

type Address = { addressLine: string; city: string; state: string; pincode: string };

const blankAddress = (): Address => ({ addressLine: '', city: '', state: '', pincode: '' });

const RESEND_COOLDOWN = 60;

export default function VendorRegisterPage() {
  const router = useRouter();
  // Auth-aware mode: when a user is already signed in, the wizard runs in
  // "add a vendor under my existing HCID" mode instead of "new public
  // signup" mode. This skips step 1 (OTP — the user is already
  // authenticated) and routes the final submit to /api/v1/account so the
  // new vendor lives under their existing User record. Session is read once
  // when the wizard mounts; we don't react to mid-flow auth changes.
  const { data: session, status: sessionStatus } = useSession();
  const isAuthMode = sessionStatus === 'authenticated';
  const { switchAccount } = useBusinessAccountSwitcher();

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

  // ─── Auth-mode seeding ──────────────────────────────────────────────────
  // When the user is already logged in we fetch their existing phone +
  // fullName from /api/v1/auth/me (the session payload doesn't carry phone),
  // mark the OTP step as already done, and jump straight to step 2. Runs
  // exactly once when sessionStatus flips to 'authenticated'.
  const authSeedDone = useRef(false);
  useEffect(() => {
    if (!isAuthMode || authSeedDone.current) return;
    authSeedDone.current = true;
    let cancelled = false;
    fetch('/api/v1/auth/me').then(r => r.json()).then(j => {
      if (cancelled || !j.success) return;
      const me = j.data ?? {};
      if (me.phone) setPhone(String(me.phone));
      if (me.fullName) setFullName(String(me.fullName));
      if (me.email) setEmail(String(me.email));
      setPhoneVerified(true);
      setOtpSent(true);
      setStep(2);
    }).catch(() => { /* fall back to manual entry */ });
    return () => { cancelled = true; };
  }, [isAuthMode]);

  // ─── Inline field errors ────────────────────────────────────────────────
  // Set by onBlur on each input. Continue button reads these to block
  // forward navigation when the current step has any active error.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const setFE = useCallback((key: string, msg: string) => {
    setFieldErrors(prev => {
      if (msg && prev[key] === msg) return prev;
      if (!msg && !prev[key]) return prev;
      const next = { ...prev };
      if (msg) next[key] = msg; else delete next[key];
      return next;
    });
  }, []);

  // Run all validators for the active step. Returns true if any field in the
  // step is invalid OR a required field hasn't been touched yet.
  const validateAllForStep = useCallback((s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 3) {
      const x = V.minLen(fullName, 'Full name', 2); if (x) e.fullName = x;
      const x2 = V.minLen(businessName, 'Business name', 2); if (x2) e.businessName = x2;
      const x3 = V.minLen(tradeName, 'Trade name', 2); if (x3) e.tradeName = x3;
      if (email) { const x4 = V.email(email); if (x4) e.email = x4; }
      if (password) { const x5 = V.password(password); if (x5) e.password = x5; }
      const x6 = V.minLen(authorizedPersonName, 'Name', 2); if (x6) e.authorizedPersonName = x6;
      const x7 = V.phone10(authorizedPersonPhone); if (x7) e.authorizedPersonPhone = x7;
      if (authorizedPersonEmail) { const x8 = V.email(authorizedPersonEmail); if (x8) e.authorizedPersonEmail = x8; }
    } else if (s === 4) {
      const x = V.gst(gstNumber); if (x) e.gstNumber = x;
      const x2 = V.pan(panNumber); if (x2) e.panNumber = x2;
    } else if (s === 5) {
      const x = V.minLen(bankAccountName, 'Account holder name', 2); if (x) e.bankAccountName = x;
      if (bankAccountNumber.trim().length < 8) e.bankAccountNumber = 'Enter a valid account number';
      const x3 = V.ifsc(bankIfsc); if (x3) e.bankIfsc = x3;
      const x4 = V.minLen(bankName, 'Bank name', 2); if (x4) e.bankName = x4;
    } else if (s === 6) {
      const check = (a: Address, prefix: string) => {
        if (a.addressLine.trim().length < 5) e[`${prefix}AddressLine`] = 'Enter the full address';
        if (!a.city.trim()) e[`${prefix}City`] = 'City is required';
        if (!a.state.trim()) e[`${prefix}State`] = 'State is required';
        const p = V.pincode(a.pincode); if (p) e[`${prefix}Pincode`] = p;
      };
      check(billingAddress, 'billing');
      check(pickupAddress, 'pickup');
    }
    return e;
  }, [fullName, businessName, tradeName, email, password, authorizedPersonName, authorizedPersonPhone, authorizedPersonEmail, gstNumber, panNumber, bankAccountName, bankAccountNumber, bankIfsc, bankName, billingAddress, pickupAddress]);

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
      // Pre-check: refuse if this phone already belongs to ANY user account.
      // Vendors must be brand-new accounts; existing customers should use the
      // "Become Vendor" flow on their account instead.
      const checkRes = await fetch('/api/v1/auth/check-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const checkData = await checkRes.json();
      if (checkData.success && checkData.data?.exists) {
        const t = checkData.data.accountType as string;
        const msg =
          t === 'vendor'         ? 'This number is already an active vendor. Please log in.'
          : t === 'vendor_pending' ? 'This number has a vendor application pending review. Please log in to check the status.'
          : t === 'admin'        ? 'This number belongs to an admin account. Please log in instead.'
          : t === 'brand'        ? 'This number belongs to a brand account. Please log in instead.'
          :                        'This number already has an account. Please log in — you can apply to become a vendor from your profile.';
        setError(msg);
        return;
      }

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
  // Each input also runs validators on blur via setFE() so the user sees
  // errors inline as they go. This function is the final gate Continue
  // calls — it re-runs the validators for the active step, flushes any
  // missed errors into fieldErrors, and returns a single banner-level
  // message when the step can't advance.
  const validateStep = (s: number): string | null => {
    if (s === 1) return phoneVerified ? null : 'Please verify your mobile number first';
    if (s === 2) return vendorType ? null : 'Select your business type';
    if (s === 7) {
      if (pincodes.length === 0) return 'Add at least one serviceable pincode';
      if (!deliveryCapability) return 'Select your delivery capability';
      return null;
    }
    const stepErrors = validateAllForStep(s);
    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...stepErrors }));
      return 'Please fix the highlighted fields before continuing';
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
    // In auth mode the OTP step is bypassed entirely — clamping at step 2
    // keeps the user from accidentally falling onto a Verify Mobile screen
    // that doesn't apply to them.
    const floor = isAuthMode ? 2 : 1;
    if (step > floor) setStep(step - 1);
  };

  // ─── Final submit ───────────────────────────────────────────────────────
  // Two branches:
  //   • Public mode (no session)   → POST /api/v1/vendor/onboarding/submit,
  //                                  sign out, redirect to /login?phone=
  //   • Auth mode (logged in user) → POST /api/v1/account with vendorDetails
  //                                  block, switch session to the new
  //                                  business account, redirect to dashboard
  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      if (isAuthMode) {
        // ── AUTH MODE: add a vendor under existing HCID ───────────────────
        const body = {
          legalName: businessName.trim(),
          displayName: tradeName.trim(),
          gstin: gstNumber.toUpperCase().trim(),
          pan: panNumber.toUpperCase().trim(),
          businessType: 'vendor',
          isCustomer: true,
          isVendor: true,
          isBrand: false,
          primaryOutlet: {
            name: tradeName.trim() || businessName.trim(),
            addressLine: pickupAddress.addressLine,
            city: pickupAddress.city,
            state: pickupAddress.state,
            pincode: pickupAddress.pincode,
          },
          vendorDetails: {
            vendorType,
            panNumber: panNumber.toUpperCase().trim(),
            authorizedPersonName: authorizedPersonName.trim(),
            authorizedPersonPhone,
            authorizedPersonEmail: authorizedPersonEmail.trim().toLowerCase(),
            billingAddress,
            bankAccountName: bankAccountName.trim(),
            bankAccountNumber: bankAccountNumber.trim(),
            bankIfsc: bankIfsc.toUpperCase().trim(),
            bankName: bankName.trim(),
            bankAccountType,
            serviceablePincodes: pincodes,
            deliveryCapability,
            fssaiNumber: fssaiNumber.trim(),
            udyamNumber: udyamNumber.trim(),
            cinNumber: cinNumber.trim(),
          },
        };
        const res = await fetch('/api/v1/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error?.message || data.error || 'Failed to create vendor');
          return;
        }
        // Switch session context to the new business account so the vendor
        // dashboard resolves to THIS vendor and not the user's old one.
        try {
          await switchAccount(data.data.account.id, data.data.outlet.id);
        } catch { /* non-fatal — user can switch manually */ }
        setSubmitted({ hcid: '' });
        // Redirect after a brief moment so the success screen is visible.
        setTimeout(() => { window.location.assign('/vendor/dashboard'); }, 1200);
        return;
      }

      // ── PUBLIC MODE: brand-new user signup ──────────────────────────────
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
      // Sign out whatever session was active before the user opened the
      // wizard — otherwise /profile and the navbar still show the OLD
      // account they were logged into. Also clears any leftover admin
      // impersonation cookies for good measure.
      try {
        await Promise.all([
          fetch('/api/v1/admin/impersonate', { method: 'DELETE' }).catch(() => {}),
          fetch('/api/v1/admin/impersonate/brand', { method: 'DELETE' }).catch(() => {}),
        ]);
        await signOut({ redirect: false });
      } catch { /* non-fatal */ }
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
            {isAuthMode
              ? 'Your new vendor business is created and under review. Switching you to the new account now…'
              : 'Thank you for applying! Your vendor account is under review. Log in below to track your application status — our team will verify your KYC documents and contact you shortly.'}
          </p>
          {submitted.hcid && !isAuthMode && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6">
              <p className="text-[12px] text-gray-400 mb-1">Your HCID</p>
              <p className="text-[16px] font-bold text-gray-800 tracking-wider">{submitted.hcid}</p>
            </div>
          )}
          {isAuthMode ? (
            <div className="flex items-center justify-center gap-2 text-[13px] text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Redirecting to your vendor dashboard…
            </div>
          ) : (
            <>
              <button
                onClick={() => router.push(`/login?phone=${encodeURIComponent(phone)}`)}
                className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3 rounded-lg transition-colors"
              >
                Continue to log in
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full mt-2 text-[13px] text-gray-400 font-bold hover:text-gray-600 transition-colors py-2"
              >
                Back to home
              </button>
            </>
          )}
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
            <p className="text-[11px] md:text-[12px] font-bold uppercase tracking-[0.18em] text-white/70 mb-1">
              {isAuthMode ? 'Add Vendor Business' : 'Vendor Application'}
            </p>
            <h1 className="text-[20px] md:text-[26px] font-[900] text-white leading-tight">
              {isAuthMode ? 'Register a new vendor under your HCID' : 'Become a Horeca1 Vendor'}
            </h1>
            <p className="text-[12px] md:text-[13px] text-white/80 mt-1">
              {isAuthMode
                ? 'Complete the KYC below — our team reviews within 24 hours.'
                : 'Complete 7 quick steps — our team reviews within 24 hours.'}
            </p>
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
                    value={phone}
                    onChange={e => {
                      const next = e.target.value.replace(/\D/g, '').slice(0, 10);
                      // Editing the phone after Send OTP / Verify must invalidate
                      // the OTP state — otherwise the wizard would carry a "Verified"
                      // marker for a number the user no longer typed.
                      if (next !== phone && (otpSent || phoneVerified)) {
                        setOtpSent(false);
                        setPhoneVerified(false);
                        setOtpDigits(['', '', '', '']);
                      }
                      setPhone(next);
                      setError('');
                    }}
                    placeholder="10 digit mobile number"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175]" />
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
                    {/* Always available — user may circle back from a later step
                        to fix the phone. Resets step-1 state only; everything
                        the user filled in steps 2-7 stays in component state. */}
                    <button
                      onClick={() => {
                        setOtpSent(false);
                        setPhoneVerified(false);
                        setOtpDigits(['', '', '', '']);
                        setError('');
                      }}
                      className="text-gray-500 hover:underline">
                      Change number
                    </button>
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
                <Field label="Your full name" required error={fieldErrors.fullName}>
                  <Input value={fullName} onChange={v => { setFullName(v); if (fieldErrors.fullName) setFE('fullName', V.minLen(v, 'Full name', 2)); }}
                    onBlur={() => setFE('fullName', V.minLen(fullName, 'Full name', 2))}
                    hasError={!!fieldErrors.fullName}
                    placeholder="John Doe" />
                </Field>
                <Field label="Business (legal) name" required error={fieldErrors.businessName}>
                  <Input value={businessName} onChange={v => { setBusinessName(v); if (fieldErrors.businessName) setFE('businessName', V.minLen(v, 'Business name', 2)); }}
                    onBlur={() => setFE('businessName', V.minLen(businessName, 'Business name', 2))}
                    hasError={!!fieldErrors.businessName}
                    placeholder="Acme Foods Pvt Ltd" />
                </Field>
                <Field label="Trade name (storefront)" required className="md:col-span-2" error={fieldErrors.tradeName}>
                  <Input value={tradeName} onChange={v => { setTradeName(v); if (fieldErrors.tradeName) setFE('tradeName', V.minLen(v, 'Trade name', 2)); }}
                    onBlur={() => setFE('tradeName', V.minLen(tradeName, 'Trade name', 2))}
                    hasError={!!fieldErrors.tradeName}
                    placeholder="Acme Foods" />
                </Field>
                <Field label="Email (optional)" error={fieldErrors.email}>
                  <Input value={email} onChange={v => { setEmail(v); if (fieldErrors.email) setFE('email', V.email(v)); }}
                    onBlur={() => setFE('email', V.email(email))}
                    hasError={!!fieldErrors.email}
                    type="email" placeholder="you@example.com" />
                </Field>
                <Field label="Password (optional — skip OTP next time)" error={fieldErrors.password}>
                  <Input value={password} onChange={v => { setPassword(v); if (fieldErrors.password) setFE('password', V.password(v)); }}
                    onBlur={() => setFE('password', V.password(password))}
                    hasError={!!fieldErrors.password}
                    type="password" placeholder="At least 6 characters" />
                </Field>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="font-bold text-[15px] text-gray-800 mb-1">Authorized Person</h3>
                <p className="text-[12px] text-gray-500 mb-4">The person we should contact for KYC and approvals.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Name" required error={fieldErrors.authorizedPersonName}>
                    <Input value={authorizedPersonName} onChange={v => { setAuthorizedPersonName(v); if (fieldErrors.authorizedPersonName) setFE('authorizedPersonName', V.minLen(v, 'Name', 2)); }}
                      onBlur={() => setFE('authorizedPersonName', V.minLen(authorizedPersonName, 'Name', 2))}
                      hasError={!!fieldErrors.authorizedPersonName}
                      placeholder="Full name" />
                  </Field>
                  <Field label="Phone" required error={fieldErrors.authorizedPersonPhone}>
                    <Input value={authorizedPersonPhone} onChange={v => { const n = v.replace(/\D/g, '').slice(0, 10); setAuthorizedPersonPhone(n); if (fieldErrors.authorizedPersonPhone) setFE('authorizedPersonPhone', V.phone10(n)); }}
                      onBlur={() => setFE('authorizedPersonPhone', V.phone10(authorizedPersonPhone))}
                      hasError={!!fieldErrors.authorizedPersonPhone}
                      type="tel" placeholder="10-digit number" />
                  </Field>
                  <Field label="Email (optional)" className="md:col-span-2" error={fieldErrors.authorizedPersonEmail}>
                    <Input value={authorizedPersonEmail} onChange={v => { setAuthorizedPersonEmail(v); if (fieldErrors.authorizedPersonEmail) setFE('authorizedPersonEmail', V.email(v)); }}
                      onBlur={() => setFE('authorizedPersonEmail', V.email(authorizedPersonEmail))}
                      hasError={!!fieldErrors.authorizedPersonEmail}
                      type="email" placeholder="you@example.com" />
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
                <Field label="GSTIN" required error={fieldErrors.gstNumber}>
                  <Input value={gstNumber} onChange={v => { const n = v.toUpperCase().slice(0, 15); setGstNumber(n); if (fieldErrors.gstNumber) setFE('gstNumber', V.gst(n)); }}
                    onBlur={() => setFE('gstNumber', V.gst(gstNumber))}
                    hasError={!!fieldErrors.gstNumber}
                    placeholder="22ABCDE1234F1Z5" />
                </Field>
                <Field label="PAN" required error={fieldErrors.panNumber}>
                  <Input value={panNumber} onChange={v => { const n = v.toUpperCase().slice(0, 10); setPanNumber(n); if (fieldErrors.panNumber) setFE('panNumber', V.pan(n)); }}
                    onBlur={() => setFE('panNumber', V.pan(panNumber))}
                    hasError={!!fieldErrors.panNumber}
                    placeholder="ABCDE1234F" />
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
                <Field label="Account holder name" required className="md:col-span-2" error={fieldErrors.bankAccountName}>
                  <Input value={bankAccountName} onChange={v => { setBankAccountName(v); if (fieldErrors.bankAccountName) setFE('bankAccountName', V.minLen(v, 'Account holder name', 2)); }}
                    onBlur={() => setFE('bankAccountName', V.minLen(bankAccountName, 'Account holder name', 2))}
                    hasError={!!fieldErrors.bankAccountName}
                    placeholder="As per bank records" />
                </Field>
                <Field label="Account number" required error={fieldErrors.bankAccountNumber}>
                  <Input value={bankAccountNumber} onChange={v => { const n = v.replace(/\D/g, '').slice(0, 18); setBankAccountNumber(n); if (fieldErrors.bankAccountNumber) setFE('bankAccountNumber', n.length < 8 ? 'Enter a valid account number' : ''); }}
                    onBlur={() => setFE('bankAccountNumber', bankAccountNumber.length < 8 ? 'Enter a valid account number' : '')}
                    hasError={!!fieldErrors.bankAccountNumber}
                    placeholder="123456789012" />
                </Field>
                <Field label="IFSC code" required error={fieldErrors.bankIfsc}>
                  <Input value={bankIfsc} onChange={v => { const n = v.toUpperCase().slice(0, 11); setBankIfsc(n); if (fieldErrors.bankIfsc) setFE('bankIfsc', V.ifsc(n)); }}
                    onBlur={() => setFE('bankIfsc', V.ifsc(bankIfsc))}
                    hasError={!!fieldErrors.bankIfsc}
                    placeholder="HDFC0001234" />
                </Field>
                <Field label="Bank name" required error={fieldErrors.bankName}>
                  <Input value={bankName} onChange={v => { setBankName(v); if (fieldErrors.bankName) setFE('bankName', V.minLen(v, 'Bank name', 2)); }}
                    onBlur={() => setFE('bankName', V.minLen(bankName, 'Bank name', 2))}
                    hasError={!!fieldErrors.bankName}
                    placeholder="HDFC Bank" />
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
                  <Field label="Address line" required error={fieldErrors.billingAddressLine}>
                    <Input value={billingAddress.addressLine}
                      onChange={v => { setBillingAddress({ ...billingAddress, addressLine: v }); if (fieldErrors.billingAddressLine) setFE('billingAddressLine', v.trim().length < 5 ? 'Enter the full address' : ''); }}
                      onBlur={() => setFE('billingAddressLine', billingAddress.addressLine.trim().length < 5 ? 'Enter the full address' : '')}
                      hasError={!!fieldErrors.billingAddressLine}
                      placeholder="Building, street, area" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" required error={fieldErrors.billingCity}>
                      <Input value={billingAddress.city}
                        onChange={v => { setBillingAddress({ ...billingAddress, city: v }); if (fieldErrors.billingCity) setFE('billingCity', v.trim() ? '' : 'City is required'); }}
                        onBlur={() => setFE('billingCity', billingAddress.city.trim() ? '' : 'City is required')}
                        hasError={!!fieldErrors.billingCity} />
                    </Field>
                    <Field label="State" required error={fieldErrors.billingState}>
                      <Input value={billingAddress.state}
                        onChange={v => { setBillingAddress({ ...billingAddress, state: v }); if (fieldErrors.billingState) setFE('billingState', v.trim() ? '' : 'State is required'); }}
                        onBlur={() => setFE('billingState', billingAddress.state.trim() ? '' : 'State is required')}
                        hasError={!!fieldErrors.billingState} />
                    </Field>
                  </div>
                  <Field label="Pincode" required error={fieldErrors.billingPincode}>
                    <Input value={billingAddress.pincode}
                      onChange={v => { const n = v.replace(/\D/g, '').slice(0, 6); setBillingAddress({ ...billingAddress, pincode: n }); if (fieldErrors.billingPincode) setFE('billingPincode', V.pincode(n)); }}
                      onBlur={() => setFE('billingPincode', V.pincode(billingAddress.pincode))}
                      hasError={!!fieldErrors.billingPincode}
                      placeholder="6-digit pincode" />
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
                  <Field label="Address line" required error={!pickupSameAsBilling ? fieldErrors.pickupAddressLine : undefined}>
                    <Input value={pickupAddress.addressLine} disabled={pickupSameAsBilling}
                      onChange={v => { setPickupAddress({ ...pickupAddress, addressLine: v }); if (fieldErrors.pickupAddressLine) setFE('pickupAddressLine', v.trim().length < 5 ? 'Enter the full address' : ''); }}
                      onBlur={() => setFE('pickupAddressLine', pickupAddress.addressLine.trim().length < 5 ? 'Enter the full address' : '')}
                      hasError={!pickupSameAsBilling && !!fieldErrors.pickupAddressLine}
                      placeholder="Warehouse / godown address" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" required error={!pickupSameAsBilling ? fieldErrors.pickupCity : undefined}>
                      <Input value={pickupAddress.city} disabled={pickupSameAsBilling}
                        onChange={v => { setPickupAddress({ ...pickupAddress, city: v }); if (fieldErrors.pickupCity) setFE('pickupCity', v.trim() ? '' : 'City is required'); }}
                        onBlur={() => setFE('pickupCity', pickupAddress.city.trim() ? '' : 'City is required')}
                        hasError={!pickupSameAsBilling && !!fieldErrors.pickupCity} />
                    </Field>
                    <Field label="State" required error={!pickupSameAsBilling ? fieldErrors.pickupState : undefined}>
                      <Input value={pickupAddress.state} disabled={pickupSameAsBilling}
                        onChange={v => { setPickupAddress({ ...pickupAddress, state: v }); if (fieldErrors.pickupState) setFE('pickupState', v.trim() ? '' : 'State is required'); }}
                        onBlur={() => setFE('pickupState', pickupAddress.state.trim() ? '' : 'State is required')}
                        hasError={!pickupSameAsBilling && !!fieldErrors.pickupState} />
                    </Field>
                  </div>
                  <Field label="Pincode" required error={!pickupSameAsBilling ? fieldErrors.pickupPincode : undefined}>
                    <Input value={pickupAddress.pincode} disabled={pickupSameAsBilling}
                      onChange={v => { const n = v.replace(/\D/g, '').slice(0, 6); setPickupAddress({ ...pickupAddress, pincode: n }); if (fieldErrors.pickupPincode) setFE('pickupPincode', V.pincode(n)); }}
                      onBlur={() => setFE('pickupPincode', V.pincode(pickupAddress.pincode))}
                      hasError={!pickupSameAsBilling && !!fieldErrors.pickupPincode}
                      placeholder="6-digit pincode" />
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
          <button onClick={handleBack} disabled={step <= (isAuthMode ? 2 : 1) || submitting}
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
function Field({
  label, required, children, className, error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-[12px] font-bold text-gray-700 ml-0.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-600 font-medium ml-0.5">{error}</p>
      )}
    </div>
  );
}

function Input({
  value, onChange, type = 'text', placeholder, disabled, onBlur, hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  onBlur?: () => void;
  hasError?: boolean;
}) {
  return (
    <input type={type} value={value} disabled={disabled}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={cn(
        'w-full px-4 py-3 bg-white border rounded-lg text-[14px] outline-none transition-colors',
        hasError ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#53B175]',
        disabled && 'bg-gray-50 text-gray-500',
      )}
    />
  );
}
