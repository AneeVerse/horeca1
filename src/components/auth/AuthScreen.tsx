'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, Store, User, AtSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { signIn } from 'next-auth/react';

interface AuthScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  initialMode?: 'customer' | 'vendor';
}

type AuthMode = 'login' | 'register';
type Step = 'form' | 'otp' | 'success';

const RESEND_COOLDOWN = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function looksLikeEmail(s: string) {
  return s.includes('@') || /[a-zA-Z]/.test(s);
}

export function AuthScreen({ isOpen, onClose, onLoginSuccess, initialMode = 'customer' }: AuthScreenProps) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<Step>('form');
  const [userRole, setUserRole] = useState<'customer' | 'vendor'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Login: single identifier (phone OR email)
  const [identifier, setIdentifier] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone / OTP shared state (register form uses `phone`; login uses `identifier`)
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Register fields
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

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

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep('form');
      setAuthMode('login');
      setApiError('');
      setPhone('');
      setOtp(['', '', '', '']);
      setFullName('');
      setBusinessName('');
      setEmail('');
      setRegisterPassword('');
      setShowRegisterPassword(false);
      setIdentifier('');
      setUsePassword(false);
      setPassword('');
      setShowPassword(false);
      setResendTimer(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }, 300);
  };

  const handleRoleSwitch = () => setUserRole(r => r === 'customer' ? 'vendor' : 'customer');

  const trimmedId = identifier.trim();
  const loginIsEmail = authMode === 'login' && looksLikeEmail(trimmedId);
  const loginPhoneDigits = trimmedId.replace(/\D/g, '').replace(/^91/, '').slice(0, 10);

  // ── Send OTP ──────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setApiError('');

    if (authMode === 'login') {
      if (!trimmedId) { setApiError('Enter your mobile number or email'); return; }
      if (loginIsEmail) {
        if (!EMAIL_RE.test(trimmedId.toLowerCase())) { setApiError('Enter a valid email address'); return; }
      } else {
        if (!/^\d{10}$/.test(loginPhoneDigits)) { setApiError('Enter a valid 10-digit mobile number'); return; }
      }
    } else {
      if (!/^\d{10}$/.test(phone)) { setApiError('Enter a valid 10-digit mobile number'); return; }
      if (!fullName.trim()) { setApiError('Full name is required'); return; }
      if (email.trim() && !EMAIL_RE.test(email.trim())) {
        setApiError('Enter a valid email address'); return;
      }
      if (registerPassword && registerPassword.length < 6) {
        setApiError('Password must be at least 6 characters'); return;
      }
    }

    setIsLoading(true);
    try {
      const body = authMode === 'login'
        ? (loginIsEmail
            ? { email: trimmedId.toLowerCase(), mode: 'login' }
            : { phone: loginPhoneDigits, mode: 'login' })
        : { phone, mode: 'register' };
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.code === 'NO_ACCOUNT' && !loginIsEmail) {
          setAuthMode('register');
          if (loginPhoneDigits) setPhone(loginPhoneDigits);
          setApiError('No account found for this number. Please register below.');
        } else if (data.code === 'NO_ACCOUNT') {
          setApiError('No account found for this email.');
        } else {
          setApiError(data.error || 'Failed to send OTP');
        }
        return;
      }
      setStep('otp');
      startResendTimer();
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch {
      setApiError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP box handlers ──────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 4);
      const next = ['', '', '', ''];
      for (let i = 0; i < digits.length; i++) next[i] = digits[i];
      setOtp(next);
      setApiError('');
      otpRefs[Math.min(digits.length, 3)]?.current?.focus();
      if (digits.length === 4) handleVerifyOtp(digits);
      return;
    }
    const digit = value.replace(/\D/g, '');
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setApiError('');
    if (digit && index < 3) otpRefs[index + 1].current?.focus();
    if (digit && next.every(d => d)) handleVerifyOtp(next.join(''));
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs[index - 1].current?.focus();
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 4 || isLoading) return;
    setIsLoading(true);
    setApiError('');
    try {
      const useEmailPath = authMode === 'login' && loginIsEmail;
      const phoneToSend = authMode === 'register' ? phone : (useEmailPath ? '' : loginPhoneDigits);
      const result = await signIn('otp', {
        phone: phoneToSend,
        loginEmail: useEmailPath ? trimmedId.toLowerCase() : '',
        code,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
        password: registerPassword,
        role: userRole,
        isRegister: authMode === 'register' ? 'true' : 'false',
        redirect: false,
      });
      if (result?.error) {
        setApiError('Invalid or expired OTP. Please try again.');
        setOtp(['', '', '', '']);
        setTimeout(() => otpRefs[0].current?.focus(), 50);
      } else {
        router.refresh();
        if (authMode === 'register' && userRole === 'vendor') {
          setStep('success');
        } else {
          if (onLoginSuccess) onLoginSuccess();
          handleClose();
        }
      }
    } catch {
      setApiError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Phone-or-email + password ─────────────────────────────────────────
  const handlePasswordLogin = async () => {
    setApiError('');
    if (!trimmedId) { setApiError('Enter your phone or email'); return; }
    if (loginIsEmail) {
      if (!EMAIL_RE.test(trimmedId.toLowerCase())) { setApiError('Enter a valid email address'); return; }
    } else if (!/^\d{10}$/.test(loginPhoneDigits)) {
      setApiError('Enter a valid 10-digit mobile number'); return;
    }
    if (!password) { setApiError('Enter your password'); return; }
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: loginIsEmail ? trimmedId.toLowerCase() : loginPhoneDigits,
        password,
        redirect: false,
      });
      if (result?.error) setApiError('Invalid credentials');
      else { router.refresh(); if (onLoginSuccess) onLoginSuccess(); handleClose(); }
    } catch { setApiError('Something went wrong.'); }
    finally { setIsLoading(false); }
  };

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-white md:bg-black/50 md:backdrop-blur-sm animate-in fade-in duration-300"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="relative w-full h-full flex flex-col bg-white md:w-auto md:h-auto md:max-w-[460px] md:rounded-[20px] md:shadow-2xl md:mx-4 animate-in zoom-in duration-300">
          <button onClick={handleClose} className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-full transition-colors z-10">
            <X size={24} className="text-gray-800" />
          </button>
          <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32 md:py-12 md:pb-12">
            <div className="mb-8">
              <img src="/images/login/check%20icon.png" alt="Success" className="w-32 h-32 object-contain" />
            </div>
            <h2 className="text-[28px] font-[800] text-gray-800 mb-4 text-center">Register Successful</h2>
            <p className="text-[15px] text-gray-400 text-center leading-relaxed">
              Thank you for choosing us. Our onboarding partner will contact you shortly.
            </p>
            <button onClick={handleClose} className="mt-8 bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-3 px-8 rounded-xl transition-all">
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── OTP ENTRY SCREEN ──────────────────────────────────────────────────
  if (step === 'otp') {
    let sentTo: React.ReactNode;
    if (authMode === 'register') {
      sentTo = <span className="font-bold text-gray-700">+91 {phone.slice(0, 5)} {phone.slice(5)}</span>;
    } else if (loginIsEmail) {
      sentTo = <span className="font-bold text-gray-700">{trimmedId.toLowerCase()}</span>;
    } else {
      sentTo = <span className="font-bold text-gray-700">+91 {loginPhoneDigits.slice(0, 5)} {loginPhoneDigits.slice(5)}</span>;
    }

    return (
      <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-white md:bg-black/50 md:backdrop-blur-sm animate-in fade-in duration-300"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="relative w-full h-full flex flex-col bg-white md:w-auto md:h-auto md:max-w-[460px] md:rounded-[20px] md:shadow-2xl md:mx-4 md:max-h-[92vh] animate-in slide-in-from-bottom duration-300">

          {/* Header / Logo */}
          <div className="flex flex-col items-center pt-20 pb-8 md:pt-6 md:pb-3 shrink-0">
            <h1 className="text-[34px] md:text-[28px] font-[900] tracking-tight flex items-center justify-center">
              <span className="text-[#ee2c2c]">Horeca</span><span className="text-[#1a237e]">1</span>
            </h1>
          </div>

          <div className="flex-1 flex flex-col px-6 mx-auto w-full overflow-y-auto pb-6 md:px-8 md:pb-6 max-w-sm">
            <button onClick={() => { setStep('form'); setOtp(['', '', '', '']); setApiError(''); }}
              className="flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-600 mb-4 -ml-1 self-start">
              <ArrowLeft size={15} /> Back
            </button>

            <h2 className="text-[22px] md:text-[20px] font-bold text-gray-800 mb-1">Enter OTP</h2>
            <p className="text-[13px] text-gray-400 mb-6">
              Code sent to {sentTo}
            </p>

            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-[13px] text-red-600 font-medium">
                {apiError}
              </div>
            )}

            {/* 4-digit OTP boxes */}
            <div className="flex gap-3 justify-center my-6">
              {otp.map((digit, i) => (
                <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={4}
                  value={digit} onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)} disabled={isLoading}
                  className={cn(
                    'w-[60px] h-[60px] text-center text-[24px] font-[800] border-2 rounded-xl outline-none transition-all',
                    digit ? 'border-[#53B175] bg-green-50/50 text-[#53B175]' : 'border-gray-200 bg-white text-gray-800',
                    'focus:border-[#53B175] focus:bg-green-50/30',
                    isLoading && 'opacity-60 cursor-not-allowed',
                  )}
                />
              ))}
            </div>

            <button onClick={() => handleVerifyOtp(otp.join(''))} disabled={isLoading || otp.join('').length !== 4}
              className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-4 md:py-3 rounded-lg shadow-lg shadow-green-100 mt-2 md:mt-2 active:scale-[0.98] transition-all text-base tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {authMode === 'register' ? 'Create Account' : 'Verify & Sign In'}
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
          </div>

          <button onClick={handleClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN FORM ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-white md:bg-black/50 md:backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={cn(
        'relative w-full h-full flex flex-col bg-white md:w-auto md:h-auto md:rounded-[20px] md:shadow-2xl md:mx-4 md:max-h-[92vh] animate-in slide-in-from-bottom duration-300',
        authMode === 'register' ? 'md:max-w-[560px]' : 'md:max-w-[460px]',
      )}>
        {/* Header / Logo */}
        <div className="flex flex-col items-center pt-20 pb-8 md:pt-6 md:pb-3 shrink-0">
          <h1 className="text-[34px] md:text-[28px] font-[900] tracking-tight flex items-center justify-center">
            <span className="text-[#ee2c2c]">Horeca</span><span className="text-[#1a237e]">1</span>
          </h1>
        </div>

        <div className={cn(
          'flex-1 flex flex-col px-6 mx-auto w-full overflow-y-auto pb-6 md:px-8 md:pb-6',
          authMode === 'register' ? 'max-w-sm md:max-w-none' : 'max-w-sm',
        )}>
          <h2 className="text-[22px] md:text-[20px] font-bold text-gray-800 mb-4 md:mb-3 shrink-0">
            {authMode === 'login' ? 'Login to your Account' : 'Create your Account'}
          </h2>

          {/* Login / Register Toggle */}
          <div className="flex p-0.5 bg-[#f8f9fa] rounded-lg border border-gray-100 mb-4 md:mb-3 overflow-hidden shrink-0">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setAuthMode(m); setApiError(''); setUsePassword(false); }}
                className={cn(
                  'flex-1 py-2.5 md:py-2 text-sm font-bold rounded-lg transition-all capitalize',
                  authMode === m ? 'bg-[#53B175] text-white shadow-md' : 'text-gray-400 hover:text-gray-600',
                )}>
                {m}
              </button>
            ))}
          </div>

          {/* API Error */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-[13px] text-red-600 font-medium">
              {apiError}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {authMode === 'login' ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">
                    Mobile Number or Email
                  </label>
                  <div className="relative flex items-center">
                    {loginIsEmail ? (
                      <Mail size={18} className="absolute left-4 text-[#53B175] pointer-events-none" />
                    ) : trimmedId.length > 0 ? (
                      <span className="absolute left-4 text-[14px] font-bold text-gray-500 select-none z-10">+91</span>
                    ) : (
                      <AtSign size={18} className="absolute left-4 text-gray-300 pointer-events-none" />
                    )}
                    <input type="text" inputMode={loginIsEmail ? 'email' : 'text'} autoComplete="username"
                      value={identifier}
                      onChange={e => { setIdentifier(e.target.value); setApiError(''); }}
                      onKeyDown={e => e.key === 'Enter' && (usePassword ? handlePasswordLogin() : handleSendOtp())}
                      placeholder="Phone or email" autoFocus
                      className={cn(
                        'w-full pr-4 py-4 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-[#53B175] transition-colors',
                        loginIsEmail || trimmedId.length > 0 ? 'pl-14' : 'pl-12',
                      )}
                    />
                  </div>
                </div>

                {usePassword && (
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#53B175]" />
                      <input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={e => { setPassword(e.target.value); setApiError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                        placeholder="Enter password" autoComplete="current-password"
                        className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-[#53B175] transition-colors" />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ── REGISTER: name + business + phone in 2-col grid ── */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-4 md:gap-y-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-gray-800 ml-1">Full name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#53B175]" />
                    <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setApiError(''); }}
                      placeholder="Enter your name"
                      className="w-full pl-9 pr-4 py-2.5 md:py-2 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175] transition-colors" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-gray-800 ml-1">Business name</label>
                  <div className="relative">
                    <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#53B175]" />
                    <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                      placeholder={userRole === 'vendor' ? 'Distributor / supplier name' : 'Restaurant / hotel / cafe'}
                      className="w-full pl-9 pr-4 py-2.5 md:py-2 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175] transition-colors" />
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[12px] font-bold text-gray-800 ml-1">
                    Email <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#53B175]" />
                    <input type="email" value={email}
                      onChange={e => { setEmail(e.target.value); setApiError(''); }}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-4 py-2.5 md:py-2 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175] transition-colors" />
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[12px] font-bold text-gray-800 ml-1">Phone number</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-[13px] font-bold text-gray-500 select-none z-10">+91</span>
                    <input type="tel" inputMode="numeric" maxLength={10}
                      value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setApiError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                      placeholder="10 digit mobile number"
                      className="w-full pl-12 pr-4 py-2.5 md:py-2 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175] transition-colors" />
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[12px] font-bold text-gray-800 ml-1">
                    Password <span className="font-normal text-gray-400">(optional — skip OTP next time)</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#53B175]" />
                    <input type={showRegisterPassword ? 'text' : 'password'} value={registerPassword}
                      onChange={e => { setRegisterPassword(e.target.value); setApiError(''); }}
                      placeholder="At least 6 characters" autoComplete="new-password"
                      className="w-full pl-9 pr-10 py-2.5 md:py-2 bg-white border border-gray-200 rounded-lg text-[14px] outline-none focus:border-[#53B175] transition-colors" />
                    <button type="button" onClick={() => setShowRegisterPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showRegisterPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={authMode === 'login' && usePassword ? handlePasswordLogin : handleSendOtp}
            disabled={isLoading}
            className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-4 md:py-3 rounded-lg shadow-lg shadow-green-100 mt-8 md:mt-5 active:scale-[0.98] transition-all text-base tracking-wide disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {authMode === 'login' && usePassword ? 'Sign in' : 'Send OTP'}
          </button>

          {/* Password fallback — works for phone or email */}
          {authMode === 'login' && (
            <button
              type="button"
              onClick={() => { setUsePassword(v => !v); setApiError(''); setPassword(''); }}
              className="mt-4 text-[13px] text-[#53B175] font-bold hover:underline mx-auto block">
              {usePassword ? 'Use OTP instead' : 'Have a password? Sign in with password'}
            </button>
          )}

          {/* Role Switcher (register) */}
          {authMode === 'register' && (
            <div className="mt-6 md:mt-3 shrink-0 pb-10 md:pb-2 text-center">
              <p className="text-[14px] md:text-[13px] text-gray-500">
                Onboard as{' '}
                <button onClick={handleRoleSwitch} className="text-[#53B175] font-[800] underline ml-1">
                  {userRole === 'customer' ? 'Vendor.' : 'Customer.'}
                </button>
              </p>
            </div>
          )}

        </div>

        {/* Close button */}
        <button onClick={handleClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={24} />
        </button>
      </div>
    </div>
  );
}
