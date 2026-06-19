'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import {
  Store, Loader2, ArrowLeft, ArrowRight, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FORM } from '@/components/ui/form';
import {
  CustomerProfileForm,
  type CustomerProfileValues,
} from '@/components/features/customer/CustomerProfileForm';
import { EMPTY_CUSTOMER_PROFILE } from '@/components/features/customer/customerProfileDefaults';
import {
  validateCustomerProfile,
  validateFieldBlur,
  derivedFullName,
  derivedLegalName,
} from '@/lib/validators/customer-profile';

const RESEND_COOLDOWN = 60;

type Step = 'form' | 'otp' | 'success';

export default function RegisterPageInner() {
  const params = useSearchParams();
  const redirectTo = params?.get('redirect') || null;
  const { status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    window.location.href = redirectTo || '/';
  }, [sessionStatus, redirectTo]);

  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [profile, setProfile] = useState<CustomerProfileValues>({ ...EMPTY_CUSTOMER_PROFILE });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFE = useCallback((key: string, msg: string) => {
    setFieldErrors(prev => {
      if (!msg && !prev[key]) return prev;
      if (msg && prev[key] === msg) return prev;
      const next = { ...prev };
      if (msg) next[key] = msg; else delete next[key];
      return next;
    });
  }, []);

  const handleFieldBlur = useCallback((field: string, value: string) => {
    const msg = validateFieldBlur(field, value);
    setFE(field, msg);
  }, [setFE]);

  const patchProfile = useCallback((patch: Partial<CustomerProfileValues>) => {
    setProfile(prev => ({ ...prev, ...patch }));
    setApiError('');
  }, []);

  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendTimer = useCallback(() => {
    setResendTimer(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const goPostLogin = useCallback(() => {
    window.location.href = redirectTo || '/';
  }, [redirectTo]);

  const handleSendOtp = async () => {
    setApiError('');
    const validation = validateCustomerProfile({ ...profile, password }, 'selfRegister');
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setApiError(validation.message ?? 'Please fix the highlighted fields');
      return;
    }
    setFieldErrors({});

    const phone = (profile.phone ?? profile.mobilePhone ?? '').replace(/\D/g, '').slice(-10);
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mode: 'register' }),
      });
      const data = await res.json();
      if (!data.success) { setApiError(data.error || 'Failed to send OTP'); return; }
      setStep('otp');
      startResendTimer();
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch { setApiError('Failed to send OTP. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 4 || isLoading) return;
    setIsLoading(true);
    setApiError('');
    const phone = (profile.phone ?? profile.mobilePhone ?? '').replace(/\D/g, '').slice(-10);
    const fullName = derivedFullName(profile);
    const businessName = derivedLegalName(profile);

    try {
      const result = await signIn('otp', {
        phone,
        code,
        fullName,
        businessName,
        email: profile.email?.trim() ?? '',
        password,
        role: 'customer',
        isRegister: 'true',
        redirect: false,
        salutation: profile.salutation ?? '',
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        designation: profile.designation ?? '',
        displayName: profile.displayName ?? '',
        tradeName: profile.displayName ?? '',
        businessType: profile.businessType ?? '',
        subType: profile.subType ?? '',
        cuisine: profile.cuisine ?? '',
        gstNumber: (profile.gstin ?? '').toUpperCase().trim(),
        panNumber: (profile.pan ?? '').toUpperCase().trim(),
        fssaiNumber: profile.fssaiNumber ?? '',
        gstTreatment: profile.gstTreatment ?? '',
        placeOfSupply: profile.placeOfSupply ?? '',
        addressLine: profile.addressLine ?? profile.billingAddressLine ?? '',
        flatInfo: profile.flatInfo ?? '',
        city: profile.city ?? profile.billingCity ?? '',
        state: profile.state ?? profile.billingState ?? '',
        pincode: profile.pincode ?? profile.billingPincode ?? '',
        outletName: profile.outletName ?? '',
        latitude: profile.latitude != null ? String(profile.latitude) : '',
        longitude: profile.longitude != null ? String(profile.longitude) : '',
        placeId: profile.placeId ?? '',
      });
      if (result?.error) {
        setApiError('Invalid or expired OTP. Please try again.');
        setOtp(['', '', '', '']);
        setTimeout(() => otpRefs[0].current?.focus(), 50);
      } else {
        setStep('success');
        setTimeout(() => goPostLogin(), 1200);
      }
    } catch { setApiError('Something went wrong. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handleOtpInput = (i: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 4);
      const next = ['', '', '', ''];
      for (let j = 0; j < digits.length; j++) next[j] = digits[j];
      setOtp(next);
      setApiError('');
      otpRefs[Math.min(digits.length, 3)]?.current?.focus();
      if (digits.length === 4) handleVerifyOtp(digits);
      return;
    }
    const digit = value.replace(/\D/g, '');
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setApiError('');
    if (digit && i < 3) otpRefs[i + 1].current?.focus();
    if (digit && next.every(d => d)) handleVerifyOtp(next.join(''));
  };

  if (step === 'success') {
    return (
      <CenteredCard>
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={42} className="text-[#299E60]" strokeWidth={2.5} />
          </div>
          <h1 className="text-[24px] font-[800] text-gray-800 mb-2">Welcome to Horeca1!</h1>
          <p className="text-[14px] text-gray-500 flex items-center justify-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Signing you in…
          </p>
        </div>
      </CenteredCard>
    );
  }

  if (step === 'otp') {
    const phone = (profile.phone ?? profile.mobilePhone ?? '').replace(/\D/g, '').slice(-10);
    return (
      <CenteredCard>
        <div className="p-6 sm:p-8">
          <button onClick={() => { setStep('form'); setOtp(['', '', '', '']); setApiError(''); }}
            className="flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-[#299E60] transition-colors mb-5 -ml-1">
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-[22px] font-[800] text-gray-800 mb-1 leading-tight">Enter verification code</h1>
          <p className="text-[13px] text-gray-400 mb-6">
            We sent a 4-digit code to <span className="font-bold text-gray-700">+91 {phone.slice(0, 5)} {phone.slice(5)}</span>
          </p>
          {apiError && <ErrorBanner>{apiError}</ErrorBanner>}
          <div className="flex gap-3 justify-center my-6">
            {otp.map((digit, i) => (
              <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={4}
                value={digit} onChange={e => handleOtpInput(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus(); }}
                disabled={isLoading}
                className={cn(
                  'w-[58px] h-[58px] text-center text-[22px] font-[800] border-2 rounded-2xl outline-none transition-all',
                  digit ? 'border-[#299E60] bg-green-50/40 text-[#299E60] ring-2 ring-[#299E60]/10' : 'border-gray-200 bg-[#FAFAFA] focus:bg-white',
                  'focus:border-[#299E60] focus:ring-4 focus:ring-[#299E60]/10',
                  isLoading && 'opacity-60 cursor-not-allowed',
                )}
              />
            ))}
          </div>
          <button onClick={() => handleVerifyOtp(otp.join(''))} disabled={isLoading || otp.join('').length !== 4}
            className={cn(FORM.primaryBtn, 'w-full py-3.5')}>
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            Verify &amp; Create Account
          </button>
          <div className="text-center mt-5">
            {resendTimer > 0 ? (
              <p className="text-[13px] text-gray-400">Resend code in <span className="font-bold text-gray-600">{resendTimer}s</span></p>
            ) : (
              <button onClick={handleSendOtp} disabled={isLoading} className="text-[13px] text-[#299E60] font-bold hover:underline disabled:opacity-50">
                Resend Code
              </button>
            )}
          </div>
        </div>
      </CenteredCard>
    );
  }

  return (
    <div className="flex items-start justify-center px-4 py-5 min-h-[calc(100vh-150px)]">
      <div className="w-full max-w-[1080px] rounded-[20px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#EEEEEE]">
        <div className="px-5 sm:px-7 pt-6 sm:pt-7 pb-5 border-b border-[#F5F5F5]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#299E60] mb-1">Customer signup</p>
              <h1 className="text-[clamp(1.25rem,2vw+0.5rem,1.5rem)] font-[800] text-[#181725] leading-tight">
                Create your account
              </h1>
              <p className="text-[13px] text-gray-500 mt-1">Sign up to start ordering for your business.</p>
            </div>
            <p className="text-[13px] text-gray-500 lg:text-right shrink-0">
              Already have an account?{' '}
              <Link href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="text-[#299E60] font-[800] hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <VendorOnboardBanner className="mb-5" />

          {apiError && <ErrorBanner>{apiError}</ErrorBanner>}

          <CustomerProfileForm
            value={profile}
            onChange={patchProfile}
            errors={fieldErrors}
            onFieldBlur={handleFieldBlur}
            layout="wide"
            visibleSections={{ contact: true, business: true, auth: true, tax: true, address: true }}
            collapsedSections={['tax', 'address']}
            showPassword
            password={password}
            onPasswordChange={setPassword}
            showPasswordToggle
            passwordVisible={showPassword}
            onTogglePassword={() => setShowPassword(v => !v)}
          />

          <div className="mt-6 space-y-3">
            <button onClick={handleSendOtp} disabled={isLoading} className={cn(FORM.primaryBtn, 'w-full h-[46px]')}>
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              Send OTP
            </button>
            <VendorOnboardBanner />
          </div>
        </div>
      </div>
    </div>
  );
}

function VendorOnboardBanner({ className }: { className?: string }) {
  return (
    <Link href="/vendor/register"
      className={cn(
        'group flex items-center gap-3 rounded-[14px] border border-[#EEEEEE] bg-[#FAFAFA] px-4 py-3.5',
        'hover:border-[#299E60]/30 hover:bg-[#F7FBF8] transition-all duration-200',
        className,
      )}>
      <div className="w-10 h-10 rounded-xl bg-white border border-[#EEEEEE] flex items-center justify-center shrink-0 shadow-sm group-hover:border-[#299E60]/20 transition-colors">
        <Store size={16} className="text-[#299E60]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[13px] text-[#181725] leading-tight">Onboard as a Vendor</p>
        <p className="text-[11.5px] text-gray-500 mt-0.5">Sell on Horeca1 — full KYC wizard, about 5 minutes</p>
      </div>
      <span className="hidden sm:flex items-center gap-1 text-[12px] font-bold text-[#299E60] shrink-0 group-hover:gap-1.5 transition-all">
        Start <ArrowRight size={14} />
      </span>
    </Link>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-180px)]">
      <div className="w-full max-w-[460px] bg-white rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#EEEEEE] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-[13px] text-red-600 font-medium">
      {children}
    </div>
  );
}
