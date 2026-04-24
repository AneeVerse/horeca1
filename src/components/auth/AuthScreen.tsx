'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Phone, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, Store, User } from 'lucide-react';
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
type Step = 'form' | 'otp' | 'admin' | 'success';

const RESEND_COOLDOWN = 60;

export function AuthScreen({ isOpen, onClose, onLoginSuccess, initialMode = 'customer' }: AuthScreenProps) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<Step>('form');
  const [userRole, setUserRole] = useState<'customer' | 'vendor'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Phone / OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Register fields
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');

  // Admin fields
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPwd, setShowAdminPwd] = useState(false);

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
      setResendTimer(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }, 300);
  };

  const handleRoleSwitch = () => setUserRole(r => r === 'customer' ? 'vendor' : 'customer');

  // ── Send OTP ──────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setApiError('');
    if (!/^\d{10}$/.test(phone)) { setApiError('Enter a valid 10-digit mobile number'); return; }
    if (authMode === 'register' && !fullName.trim()) { setApiError('Full name is required'); return; }
    if (authMode === 'register' && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setApiError('Enter a valid email address'); return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mode: authMode }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.code === 'NO_ACCOUNT') {
          // Switch to register so they can create an account
          setAuthMode('register');
          setApiError('No account found for this number. Please register below.');
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
      const result = await signIn('otp', {
        phone, code,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
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

  // ── Admin login ───────────────────────────────────────────────────────
  const handleAdminLogin = async () => {
    setApiError('');
    if (!adminEmail || !adminPassword) { setApiError('Email and password are required'); return; }
    setIsLoading(true);
    try {
      const result = await signIn('credentials', { email: adminEmail, password: adminPassword, redirect: false });
      if (result?.error) setApiError('Invalid credentials. Please try again.');
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
              Code sent to <span className="font-bold text-gray-700">+91 {phone.slice(0, 5)} {phone.slice(5)}</span>
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

  // ── ADMIN LOGIN SCREEN ────────────────────────────────────────────────
  if (step === 'admin') {
    return (
      <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-white md:bg-black/50 md:backdrop-blur-sm animate-in fade-in duration-300"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="relative w-full h-full flex flex-col bg-white md:w-auto md:h-auto md:max-w-[460px] md:rounded-[20px] md:shadow-2xl md:mx-4 md:max-h-[92vh] animate-in slide-in-from-bottom duration-300">

          <div className="flex flex-col items-center pt-20 pb-8 md:pt-6 md:pb-3 shrink-0">
            <h1 className="text-[34px] md:text-[28px] font-[900] tracking-tight flex items-center justify-center">
              <span className="text-[#ee2c2c]">Horeca</span><span className="text-[#1a237e]">1</span>
            </h1>
          </div>

          <div className="flex-1 flex flex-col px-6 mx-auto w-full overflow-y-auto pb-6 md:px-8 md:pb-6 max-w-sm">
            <button onClick={() => { setStep('form'); setApiError(''); }}
              className="flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-600 mb-4 -ml-1 self-start">
              <ArrowLeft size={15} /> Back
            </button>

            <h2 className="text-[22px] md:text-[20px] font-bold text-gray-800 mb-4 md:mb-3">Admin Login</h2>

            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-[13px] text-red-600 font-medium">
                {apiError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#53B175]" />
                  <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                    placeholder="admin@horeca1.com" autoFocus
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-[#53B175] transition-colors" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#53B175]" />
                  <input type={showAdminPwd ? 'text' : 'password'} value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                    placeholder="Enter password"
                    className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-[#53B175] transition-colors" />
                  <button type="button" onClick={() => setShowAdminPwd(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {showAdminPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button onClick={handleAdminLogin} disabled={isLoading}
              className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-4 md:py-3 rounded-lg shadow-lg shadow-green-100 mt-8 md:mt-5 active:scale-[0.98] transition-all text-base tracking-wide disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              Login
            </button>
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
              <button key={m} onClick={() => { setAuthMode(m); setApiError(''); }}
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
              /* ── LOGIN: just phone number ── */
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-400 ml-1 tracking-tight">Mobile Number</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[14px] font-bold text-gray-500 select-none z-10">+91</span>
                  <input type="tel" inputMode="numeric" maxLength={10}
                    value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setApiError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    placeholder="10-digit mobile number" autoFocus
                    className="w-full pl-14 pr-4 py-4 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-[#53B175] transition-colors" />
                  <Phone size={18} className="absolute right-4 text-gray-300 pointer-events-none" />
                </div>
              </div>
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
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button onClick={handleSendOtp} disabled={isLoading}
            className="w-full bg-[#53B175] hover:bg-[#48a068] text-white font-bold py-4 md:py-3 rounded-lg shadow-lg shadow-green-100 mt-8 md:mt-5 active:scale-[0.98] transition-all text-base tracking-wide disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            Send OTP
          </button>

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
