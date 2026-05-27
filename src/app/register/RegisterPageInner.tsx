'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import {
  User, Store, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const RESEND_COOLDOWN = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'form' | 'otp' | 'success';

export default function RegisterPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params?.get('redirect') || null;

  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    if (redirectTo) { router.replace(redirectTo); setTimeout(() => window.location.reload(), 150); return; }
    router.replace('/');
    setTimeout(() => window.location.reload(), 150);
  }, [redirectTo, router]);

  const handleSendOtp = async () => {
    setApiError('');
    if (!/^\d{10}$/.test(phone)) { setApiError('Enter a valid 10-digit mobile number'); return; }
    if (!fullName.trim()) { setApiError('Full name is required'); return; }
    if (email.trim() && !EMAIL_RE.test(email.trim())) { setApiError('Enter a valid email address'); return; }
    if (password && password.length < 6) { setApiError('Password must be at least 6 characters'); return; }

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
    try {
      const result = await signIn('otp', {
        phone,
        code,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
        password,
        role: 'customer',
        isRegister: 'true',
        redirect: false,
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
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#53B175]">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <h1 className="text-[24px] font-[800] text-gray-800 mb-3">Welcome to Horeca1!</h1>
          <p className="text-[14px] text-gray-500">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <main className="flex items-center justify-center px-4 py-8 md:py-10">
        <div className="w-full max-w-[480px] bg-white md:rounded-2xl md:shadow-xl md:p-8 p-2">
          {step === 'otp' ? (
            <>
              <button onClick={() => { setStep('form'); setOtp(['', '', '', '']); setApiError(''); }}
                className="flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-600 mb-4 -ml-1">
                <ArrowLeft size={15} /> Back
              </button>
              <h1 className="text-[22px] font-bold text-gray-800 mb-1">Enter OTP</h1>
              <p className="text-[13px] text-gray-400 mb-6">
                Code sent to <span className="font-bold text-gray-700">+91 {phone.slice(0, 5)} {phone.slice(5)}</span>
              </p>

              {apiError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-[13px] text-red-600 font-medium">
                  {apiError}
                </div>
              )}

              <div className="flex gap-3 justify-center my-6">
                {otp.map((digit, i) => (
                  <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={4}
                    value={digit} onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus(); }}
                    disabled={isLoading}
                    className={cn(
                      'w-[60px] h-[60px] text-center text-[24px] font-[800] border-2 rounded-xl outline-none transition-all',
                      digit ? 'border-[#53B175] bg-green-50 text-[#53B175]' : 'border-gray-200 bg-white',
                      'focus:border-[#53B175]',
                      isLoading && 'opacity-60 cursor-not-allowed',
                    )}
                  />
                ))}
              </div>

              <button onClick={() => handleVerifyOtp(otp.join(''))} disabled={isLoading || otp.join('').length !== 4}
                className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3 rounded-lg shadow-md shadow-green-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isLoading && <Loader2 size={18} className="animate-spin" />}
                Create Account
              </button>

              <div className="text-center mt-5">
                {resendTimer > 0 ? (
                  <p className="text-[13px] text-gray-400">Resend OTP in <span className="font-bold text-gray-600">{resendTimer}s</span></p>
                ) : (
                  <button onClick={handleSendOtp} disabled={isLoading} className="text-[13px] text-[#53B175] font-bold hover:underline disabled:opacity-50">
                    Resend OTP
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-[24px] font-[800] text-gray-800 mb-2">Create your Account</h1>
              <p className="text-[13px] text-gray-500 mb-6">Sign up to start ordering for your business.</p>

              {apiError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-[13px] text-red-600 font-medium">
                  {apiError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Full name" required>
                  <IconInput icon={User} value={fullName} onChange={setFullName} placeholder="Enter your name" />
                </Field>
                <Field label="Business name">
                  <IconInput icon={Store} value={businessName} onChange={setBusinessName} placeholder="Restaurant / hotel / cafe" />
                </Field>
                <Field label="Email (optional)" className="md:col-span-2">
                  <IconInput icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                </Field>
                <Field label="Phone number" required className="md:col-span-2">
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-[13px] font-bold text-gray-500 select-none z-10">+91</span>
                    <input type="tel" inputMode="numeric" maxLength={10}
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setApiError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                      placeholder="10 digit mobile number"
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175]" />
                  </div>
                </Field>
                <Field label="Password (optional — skip OTP next time)" className="md:col-span-2">
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#53B175]" />
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setApiError(''); }}
                      placeholder="At least 6 characters" autoComplete="new-password"
                      className="w-full pl-11 pr-11 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175]" />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </Field>
              </div>

              <button onClick={handleSendOtp} disabled={isLoading}
                className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3.5 rounded-lg shadow-md shadow-green-100 mt-6 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {isLoading && <Loader2 size={18} className="animate-spin" />}
                Send OTP
              </button>

              {/* Vendor onboarding CTA */}
              <Link
                href="/vendor/register"
                className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#53B175]/30 bg-green-50/40 p-4 hover:bg-green-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#53B175]/10 flex items-center justify-center shrink-0">
                    <Store size={16} className="text-[#53B175]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[13px] text-gray-800">Onboard as a Vendor</p>
                    <p className="text-[11px] text-gray-500 truncate">Sell on Horeca1 — full KYC wizard, ~5 min</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[#53B175] shrink-0" />
              </Link>

              <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                <p className="text-[13px] text-gray-500">
                  Already have an account?{' '}
                  <Link
                    href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                    className="text-[#53B175] font-[800] hover:underline"
                  >
                    Login
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-[12px] font-bold text-gray-700 ml-0.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function IconInput({
  icon: Icon, value, onChange, type = 'text', placeholder,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#53B175]" />
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175] transition-colors" />
    </div>
  );
}
