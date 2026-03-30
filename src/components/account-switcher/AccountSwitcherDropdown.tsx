'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, LogOut, Loader2, Trash2, ShieldCheck, Store, User } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useAccountSwitcher } from '@/hooks/useAccountSwitcher';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { getCredentials } from '@/lib/account-store';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Store }> = {
  admin: { label: 'Admin', color: '#DC2626', bg: '#FEE2E2', icon: ShieldCheck },
  vendor: { label: 'Vendor', color: '#299E60', bg: '#DCFCE7', icon: Store },
  customer: { label: 'Customer', color: '#2563EB', bg: '#DBEAFE', icon: User },
};

export function AccountSwitcherDropdown() {
  const {
    accounts,
    currentEmail,
    currentRole,
    switching,
    addAccount,
    switchAccount,
    removeAccount,
    signOutAll,
  } = useAccountSwitcher();

  const [isOpen, setIsOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentAccount = accounts.find((a) => a.email === currentEmail);
  const otherAccounts = accounts.filter((a) => a.email !== currentEmail);
  const roleConf = ROLE_CONFIG[currentRole] || ROLE_CONFIG.customer;
  const RoleIcon = roleConf.icon;

  const handleSwitch = async (email: string) => {
    setSwitchingEmail(email);
    setIsOpen(false);
    await switchAccount(email);
    setSwitchingEmail(null);
  };

  const initials = (currentAccount?.name || currentEmail || 'U')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger — matches existing avatar + name design */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 cursor-pointer group"
          disabled={switching}
        >
          <div className="w-[42px] h-[42px] relative flex items-center justify-center shrink-0">
            <img
              src="/images/admin/Ellipse 2.svg"
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
            />
            <span className="relative z-10 text-white font-bold text-[13px]">
              {switching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                initials
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-[#181725]">
              {currentAccount?.name || currentEmail || 'Account'}
            </span>
            <ChevronDown
              size={16}
              className={`text-[#AEAEAE] group-hover:text-[#181725] transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#F0F0F0] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Current Account */}
            <div className="p-4 border-b border-[#F0F0F0]">
              <div className="flex items-center gap-3">
                <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: roleConf.bg }}>
                  <RoleIcon size={20} style={{ color: roleConf.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#181725] truncate">
                    {currentAccount?.name || currentEmail}
                  </p>
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

            {/* Other Accounts */}
            {otherAccounts.length > 0 && (
              <div className="py-2">
                <p className="px-4 py-1.5 text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">
                  Switch Account
                </p>
                {otherAccounts.map((account) => {
                  const conf = ROLE_CONFIG[account.role] || ROLE_CONFIG.customer;
                  const Icon = conf.icon;
                  const isSwitching = switchingEmail === account.email;

                  return (
                    <div
                      key={account.email}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8F8F8] transition-colors group/item"
                    >
                      <button
                        onClick={() => handleSwitch(account.email)}
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
                          <p className="text-[13px] font-semibold text-[#181725] truncate">
                            {account.name}
                          </p>
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
                          removeAccount(account.email);
                        }}
                        className="p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 hover:bg-red-50 transition-all"
                        title="Remove account"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-[#F0F0F0] py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowAuth(true);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#F8F8F8] transition-colors text-left"
              >
                <div className="w-[36px] h-[36px] rounded-full bg-[#F5F5F5] flex items-center justify-center">
                  <Plus size={16} className="text-[#181725]" />
                </div>
                <span className="text-[13px] font-semibold text-[#181725]">Add Account</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOutAll(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-[36px] h-[36px] rounded-full bg-red-50 flex items-center justify-center">
                  <LogOut size={16} className="text-red-500" />
                </div>
                <span className="text-[13px] font-semibold text-red-500">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal for adding account */}
      <AuthScreen
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onLoginSuccess={() => {}}
        onLoginSuccessWithCredentials={async (data) => {
          // Save the new account credentials
          await addAccount(data);

          // Re-sign-in as the ORIGINAL account to restore the session
          // (signIn in AuthScreen replaced it with the new account)
          if (currentEmail && currentEmail !== data.email) {
            const originalCreds = await getCredentials(currentEmail);
            if (originalCreds) {
              await signIn('credentials', {
                email: originalCreds.email,
                password: originalCreds.password,
                redirect: false,
              });
            }
          }

          setShowAuth(false);
          // Refresh the page to ensure session is in sync
          window.location.reload();
        }}
      />
    </>
  );
}
