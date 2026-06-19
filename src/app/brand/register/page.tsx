'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Loader2, CheckCircle2, Phone, Building2, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FORM } from '@/components/ui/form';
import {
  BrandProfileForm,
  type BrandProfileValues,
} from '@/components/features/brand/BrandProfileForm';
import { EMPTY_BRAND_PROFILE } from '@/components/features/brand/brandProfileDefaults';
import {
  validateBrandProfile,
  validateFieldBlur,
} from '@/lib/validators/brand-profile';
import { buildBrandProfile } from '@/lib/brandProfileMapper';
import { ExistingPhoneModal } from '@/components/auth/ExistingPhoneModal';
import { accountLabelFromCheck } from '@/lib/auth/phoneCheckLabels';
import type { PhoneCheckResult } from '@/lib/auth/checkPhoneLookup';

const STEP_TITLES = [
  { id: 1, label: 'Verify Mobile', icon: Phone },
  { id: 2, label: 'Brand Profile', icon: Building2 },
];

const PHONE_RE = /^\d{10}$/;
const RESEND_COOLDOWN = 60;

export default function BrandRegisterPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{ hcid: string } | null>(null);

  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [profile, setProfile] = useState<BrandProfileValues>({ ...EMPTY_BRAND_PROFILE });
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [existingPhoneModal, setExistingPhoneModal] = useState<{
    phone: string;
    hcidDisplay?: string;
    accountLabel: string;
    suggestedAction: 'login_to_link' | 'login_only';
  } | null>(null);

  const startResendTimer = useCallback(() => {
    setResendTimer(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!PHONE_RE.test(digits)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setOtpLoading(true);
    setError('');
    try {
      const checkRes = await fetch('/api/v1/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, intent: 'brand' }),
      });
      const checkData = await checkRes.json();
      if (checkData.success && checkData.data?.exists) {
        const data = checkData.data as PhoneCheckResult;
        setExistingPhoneModal({
          phone: digits,
          hcidDisplay: data.hcidDisplay,
          accountLabel: accountLabelFromCheck(data),
          suggestedAction: data.suggestedAction === 'login_only' ? 'login_only' : 'login_to_link',
        });
        return;
      }

      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, mode: 'register' }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to send OTP');
        return;
      }
      setOtpSent(true);
      startResendTimer();
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    const digits = phone.replace(/\D/g, '').slice(-10);
    setOtpLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, code }),
      });
      const data = await res.json();
      if (!data.success) {
        setError('Invalid or expired OTP');
        setOtpDigits(['', '', '', '']);
        otpRefs[0].current?.focus();
        return;
      }
      setPhoneVerified(true);
      setProfile(prev => ({ ...prev, phone: digits, mobilePhone: digits }));
      setStep(2);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpInput = (i: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 4);
      const next = ['', '', '', ''];
      for (let j = 0; j < digits.length; j++) next[j] = digits[j];
      setOtpDigits(next);
      setError('');
      otpRefs[Math.min(digits.length, 3)]?.current?.focus();
      if (digits.length === 4) verifyOtp(digits);
      return;
    }
    const digit = value.replace(/\D/g, '');
    const next = [...otpDigits];
    next[i] = digit;
    setOtpDigits(next);
    setError('');
    if (digit && i < 3) otpRefs[i + 1].current?.focus();
    if (digit && next.every(d => d)) verifyOtp(next.join(''));
  };

  const handleSubmit = async () => {
    const validation = validateBrandProfile({ ...profile, password }, 'publicRegister');
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(validation.message ?? 'Please fix the highlighted fields');
      return;
    }

    setSubmitting(true);
    setError('');
    setFieldErrors({});

    const phoneDigits = phone.replace(/\D/g, '').slice(-10);
    const payload = {
      ...buildBrandProfile({ ...profile, password }),
      phone: phoneDigits,
      password: password || undefined,
    };

    try {
      const res = await fetch('/api/v1/brand/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? 'Submission failed');
        setSubmitting(false);
        return;
      }
      setSubmitted({ hcid: json.data.hcidDisplay });
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="bg-white rounded-[24px] border border-[#EEEEEE] p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-[#299E60]" />
          </div>
          <h1 className="text-[22px] font-[800] text-[#181725] mb-2">Application Submitted</h1>
          <p className="text-[14px] text-gray-500 mb-4">
            Your brand onboarding request has been received. Our team will review your profile and contact you shortly.
          </p>
          <p className="text-[12px] text-gray-400 mb-6">HCID: <span className="font-bold text-gray-600">{submitted.hcid}</span></p>
          <Link href="/" className={cn(FORM.primaryBtn, 'inline-flex px-6 py-3 text-[13px]')}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[720px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/register" className="p-2 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-[22px] font-[800] text-[#181725] flex items-center gap-2">
              Brand Registration
              <Sparkles size={18} className="text-amber-500" />
            </h1>
            <p className="text-[13px] text-gray-500">Register your brand on the HoReCa1 marketplace</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {STEP_TITLES.map(s => (
            <div key={s.id}
              className={cn(
                'flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-[12px] font-bold transition-colors',
                step === s.id ? 'border-[#299E60] bg-[#EEF8F1]/50 text-[#299E60]' : 'border-[#EEEEEE] bg-white text-gray-400',
                step > s.id && 'border-emerald-200 text-emerald-700',
              )}>
              <s.icon size={16} />
              {s.label}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[20px] border border-[#EEEEEE] p-6 shadow-sm">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-[14px] text-gray-600">Verify your mobile number to start brand onboarding.</p>
              <div>
                <label className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-1.5 block">Mobile Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile"
                  className="w-full h-[48px] px-4 border border-[#EEEEEE] rounded-xl text-[15px] outline-none focus:border-[#299E60]/40"
                  disabled={phoneVerified}
                />
              </div>

              {otpSent && !phoneVerified && (
                <div>
                  <label className="text-[11px] font-bold text-[#AEAEAE] uppercase tracking-wider mb-2 block">Enter OTP</label>
                  <div className="flex gap-3 justify-center">
                    {otpDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={otpRefs[i]}
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={d}
                        onChange={e => handleOtpInput(i, e.target.value)}
                        className="w-14 h-14 text-center text-[20px] font-bold border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/40"
                      />
                    ))}
                  </div>
                  <p className="text-center text-[12px] text-gray-400 mt-3">
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : (
                      <button type="button" onClick={sendOtp} className="text-[#299E60] font-bold">Resend OTP</button>
                    )}
                  </p>
                </div>
              )}

              {!otpSent && (
                <button type="button" onClick={sendOtp} disabled={otpLoading}
                  className={cn(FORM.primaryBtn, 'w-full h-[48px] text-[14px]')}>
                  {otpLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send OTP'}
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <BrandProfileForm
                value={profile}
                onChange={patch => setProfile(prev => ({ ...prev, ...patch }))}
                errors={fieldErrors}
                onFieldBlur={(field, value) => {
                  const msg = validateFieldBlur(field, value);
                  setFieldErrors(prev => {
                    const next = { ...prev };
                    if (msg) next[field] = msg; else delete next[field];
                    return next;
                  });
                }}
                visibleSections={{
                  contact: true,
                  identity: true,
                  market: true,
                  auth: true,
                  tax: true,
                  address: true,
                  marketing: true,
                }}
                showPassword
                password={password}
                onPasswordChange={setPassword}
              />

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="h-[48px] px-5 rounded-xl border border-[#EEEEEE] text-[13px] font-bold text-gray-500 hover:bg-gray-50">
                  Back
                </button>
                <button type="button" onClick={handleSubmit} disabled={submitting}
                  className={cn(FORM.primaryBtn, 'flex-1 h-[48px] text-[14px]')}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                  {submitting ? 'Submitting…' : 'Submit Application'}
                  {!submitting && <ArrowRight size={16} className="ml-1" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ExistingPhoneModal
        isOpen={!!existingPhoneModal}
        phone={existingPhoneModal?.phone ?? ''}
        hcidDisplay={existingPhoneModal?.hcidDisplay}
        accountLabel={existingPhoneModal?.accountLabel ?? 'Customer'}
        intent="brand"
        redirectTo="/brand/register"
        suggestedAction={existingPhoneModal?.suggestedAction ?? 'login_to_link'}
        onClose={() => setExistingPhoneModal(null)}
        onUseDifferentNumber={() => {
          setExistingPhoneModal(null);
          setPhone('');
          setOtpSent(false);
          setPhoneVerified(false);
          setOtpDigits(['', '', '', '']);
          setError('');
        }}
      />
    </div>
  );
}
