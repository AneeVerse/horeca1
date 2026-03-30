'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, LogOut, Loader2, Trash2, ShieldCheck, Store, User, Mail, Lock, Eye, EyeOff, ArrowLeft, X } from 'lucide-react';
import { useAccountSwitcher } from '@/hooks/useAccountSwitcher';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Store }> = {
  admin: { label: 'Admin', color: '#DC2626', bg: '#FEE2E2', icon: ShieldCheck },
  vendor: { label: 'Vendor', color: '#299E60', bg: '#DCFCE7', icon: Store },
  customer: { label: 'Customer', color: '#2563EB', bg: '#DBEAFE', icon: User },
};

export function AccountSwitcherDropdown({ allowAdd = false }: { allowAdd?: boolean }) {
  const {
    accounts,
    currentEmail,
    currentRole,
    switching,
    linkAccount,
    switchAccount,
    unlinkAccount,
    signOutCurrent,
  } = useAccountSwitcher();

  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const otherAccounts = accounts;
  const roleConf = ROLE_CONFIG[currentRole] || ROLE_CONFIG.customer;
  const RoleIcon = roleConf.icon;

  const handleSwitch = async (userId: string) => {
    setSwitchingId(userId);
    setIsOpen(false);
    await switchAccount(userId);
    setSwitchingId(null);
  };

  const handleAddAccount = async () => {
    setAddError('');
    if (!addEmail || !addPassword) {
      setAddError('Email and password are required');
      return;
    }

    setAddLoading(true);
    const result = await linkAccount(addEmail, addPassword);
    setAddLoading(false);

    if (result.success) {
      setAddEmail('');
      setAddPassword('');
      setShowAddForm(false);
    } else {
      setAddError(result.error || 'Failed to link account');
    }
  };

  const currentName = (accounts.find(a => a.email === currentEmail)?.name) || currentEmail || 'Account';
  const initials = currentName.substring(0, 2).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => { setIsOpen(!isOpen); setShowAddForm(false); }}
        className="flex items-center gap-3 cursor-pointer group"
        disabled={switching}
      >
        <div className="w-[42px] h-[42px] relative flex items-center justify-center shrink-0">
          <img src="/images/admin/Ellipse 2.svg" alt="" className="absolute inset-0 w-full h-full object-contain" />
          <span className="relative z-10 text-white font-bold text-[13px]">
            {switching ? <Loader2 size={16} className="animate-spin" /> : initials}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-bold text-[#181725]">{currentName}</span>
          <ChevronDown
            size={16}
            className={`text-[#AEAEAE] group-hover:text-[#181725] transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#F0F0F0] z-50 overflow-hidden">

          {/* ── Add Account Form ── */}
          {showAddForm ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => { setShowAddForm(false); setAddError(''); }} className="p-1 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft size={16} className="text-[#181725]" />
                </button>
                <h3 className="text-[14px] font-bold text-[#181725]">Add Account</h3>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEAE]" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                  />
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEAE]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-[13px] border border-[#EEEEEE] rounded-xl outline-none focus:border-[#299E60]/50 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEAE] hover:text-[#181725]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {addError && (
                  <p className="text-[12px] text-red-500 font-medium">{addError}</p>
                )}

                <button
                  onClick={handleAddAccount}
                  disabled={addLoading}
                  className="w-full py-2.5 bg-[#299E60] text-white text-[13px] font-bold rounded-xl hover:bg-[#238a54] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {addLoading ? 'Verifying...' : 'Link Account'}
                </button>
              </div>

              <p className="text-[11px] text-[#AEAEAE] mt-3 text-center leading-tight">
                Credentials are verified server-side and never stored on your device.
              </p>
            </div>
          ) : (
            <>
              {/* ── Current Account ── */}
              <div className="p-4 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-3">
                  <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: roleConf.bg }}>
                    <RoleIcon size={20} style={{ color: roleConf.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#181725] truncate">{currentName}</p>
                    <p className="text-[12px] text-[#AEAEAE] truncate">{currentEmail}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: roleConf.color, backgroundColor: roleConf.bg }}
                    >
                      {roleConf.label}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#299E60] shrink-0" title="Active" />
                  </div>
                </div>
              </div>

              {/* ── Other Accounts ── */}
              {otherAccounts.length > 0 && (
                <div className="py-2">
                  <p className="px-4 py-1.5 text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">
                    Switch Account
                  </p>
                  {otherAccounts.map((account) => {
                    const conf = ROLE_CONFIG[account.role] || ROLE_CONFIG.customer;
                    const Icon = conf.icon;
                    const isSwitching = switchingId === account.id;

                    return (
                      <div
                        key={account.linkId}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8F8F8] transition-colors group/item"
                      >
                        <button
                          onClick={() => handleSwitch(account.id)}
                          disabled={switching}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div
                            className="w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: conf.bg }}
                          >
                            {isSwitching ? (
                              <Loader2 size={16} className="animate-spin" style={{ color: conf.color }} />
                            ) : (
                              <Icon size={16} style={{ color: conf.color }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#181725] truncate">{account.name}</p>
                            <p className="text-[11px] text-[#AEAEAE] truncate">{account.email}</p>
                          </div>
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: conf.color, backgroundColor: conf.bg }}
                          >
                            {conf.label}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            unlinkAccount(account.linkId);
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 hover:bg-red-50 transition-all"
                          title="Remove linked account"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Actions ── */}
              <div className="border-t border-[#F0F0F0] py-2">
                {allowAdd && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#F8F8F8] transition-colors text-left"
                  >
                    <div className="w-[36px] h-[36px] rounded-full bg-[#F5F5F5] flex items-center justify-center">
                      <Plus size={16} className="text-[#181725]" />
                    </div>
                    <span className="text-[13px] font-semibold text-[#181725]">Add Account</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOutCurrent();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
                >
                  <div className="w-[36px] h-[36px] rounded-full bg-red-50 flex items-center justify-center">
                    <LogOut size={16} className="text-red-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-red-500">Sign Out</span>
                    {otherAccounts.length > 0 && (
                      <span className="text-[10px] text-[#AEAEAE]">Switches to next account</span>
                    )}
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
