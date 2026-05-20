'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, LogOut, Loader2, ShieldCheck, Store, User,
  Sparkles, MapPin, Check, ChevronRight, AlertCircle,
} from 'lucide-react';
import { useBusinessAccountSwitcher, type AccountSummary } from '@/hooks/useBusinessAccountSwitcher';

type AccountKind = 'customer' | 'vendor' | 'brand';

const KIND_STYLE: Record<AccountKind, { label: string; color: string; bg: string; icon: typeof Store }> = {
  customer: { label: 'Customer', color: '#2563EB', bg: '#DBEAFE', icon: User },
  vendor:   { label: 'Vendor',   color: '#299E60', bg: '#DCFCE7', icon: Store },
  brand:    { label: 'Brand',    color: '#7C3AED', bg: '#EDE9FE', icon: Sparkles },
};

function classifyAccount(a: { isVendor: boolean; isBrand: boolean; isCustomer: boolean }): AccountKind {
  if (a.isVendor) return 'vendor';
  if (a.isBrand) return 'brand';
  return 'customer';
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || name.slice(0, 2).toUpperCase();
}

export function BusinessAccountSwitcherDropdown() {
  const {
    loading, switching,
    accounts, currentAccount, currentOutlet,
    hcidDisplay, totalAccountCount, availableAccountsTruncated,
    switchAccount, switchOutlet, signOut,
  } = useBusinessAccountSwitcher();

  const [isOpen, setIsOpen] = useState(false);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowOutletPicker(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', onMouseDown);
      return () => document.removeEventListener('mousedown', onMouseDown);
    }
  }, [isOpen]);

  // While the session is hydrating just render the trigger silently
  if (!loading && accounts.length === 0) {
    return (
      <button
        onClick={signOut}
        className="px-3 py-1.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        Sign out
      </button>
    );
  }

  const displayName = currentAccount?.displayName ?? currentAccount?.legalName ?? 'Account';
  const kind = currentAccount ? classifyAccount(currentAccount) : 'customer';
  const conf = KIND_STYLE[kind];
  const Icon = conf.icon;
  const initials = initialsOf(displayName);

  const otherAccounts: AccountSummary[] = accounts.filter((a) => a.id !== currentAccount?.id);

  const handleAccountClick = async (a: AccountSummary) => {
    setSwitchingId(a.id);
    setIsOpen(false);
    await switchAccount(a.id);
    setSwitchingId(null);
  };

  const handleOutletClick = async (outletId: string) => {
    setShowOutletPicker(false);
    setIsOpen(false);
    await switchOutlet(outletId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setIsOpen((v) => !v); setShowOutletPicker(false); }}
        disabled={switching}
        className="flex items-center gap-3 cursor-pointer group disabled:opacity-50"
      >
        <div
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm"
          style={{ backgroundColor: conf.bg }}
        >
          {switching ? (
            <Loader2 size={16} className="animate-spin" style={{ color: conf.color }} />
          ) : (
            <span className="text-[12px] font-bold" style={{ color: conf.color }}>{initials}</span>
          )}
        </div>
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[14px] font-bold text-[#181725] truncate max-w-[180px]">{displayName}</span>
          {currentOutlet ? (
            <span className="text-[11px] text-[#666] flex items-center gap-1 truncate max-w-[180px]">
              <MapPin size={10} />
              {currentOutlet.name}
              {currentOutlet.requiresAddressUpdate && (
                <AlertCircle size={10} className="text-amber-500 shrink-0" />
              )}
            </span>
          ) : (
            <span className="text-[11px] text-[#AEAEAE]">{hcidDisplay ?? ''}</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-[#AEAEAE] group-hover:text-[#181725] transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[340px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#F0F0F0] z-50 overflow-hidden">
          {/* ── Current account header ── */}
          <div className="p-4 border-b border-[#F0F0F0]">
            <div className="flex items-center gap-3">
              <div
                className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: conf.bg }}
              >
                <Icon size={20} style={{ color: conf.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#181725] truncate">{displayName}</p>
                {hcidDisplay && (
                  <p className="text-[11px] text-[#AEAEAE] font-mono">{hcidDisplay}</p>
                )}
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ color: conf.color, backgroundColor: conf.bg }}
              >
                {conf.label}
              </span>
            </div>
          </div>

          {/* ── Outlet sub-section ── */}
          {currentAccount && currentAccount.outlets.length > 0 && !showOutletPicker && (
            <button
              onClick={() => setShowOutletPicker(true)}
              className="w-full px-4 py-3 border-b border-[#F0F0F0] hover:bg-[#F8F8F8] flex items-center gap-3 text-left transition-colors"
            >
              <div className="w-[32px] h-[32px] rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
                <MapPin size={14} className="text-[#666]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Active Outlet</p>
                <p className="text-[13px] font-semibold text-[#181725] truncate">
                  {currentOutlet?.name ?? 'No outlet selected'}
                </p>
              </div>
              <ChevronRight size={14} className="text-[#AEAEAE] shrink-0" />
            </button>
          )}

          {/* ── Outlet picker ── */}
          {showOutletPicker && currentAccount && (
            <div className="border-b border-[#F0F0F0]">
              <div className="px-4 py-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Select Outlet</p>
                <button
                  onClick={() => setShowOutletPicker(false)}
                  className="text-[11px] text-[#666] hover:text-[#181725]"
                >
                  Back
                </button>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {currentAccount.outlets.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => handleOutletClick(o.id)}
                    disabled={switching}
                    className="w-full px-4 py-2.5 hover:bg-[#F8F8F8] flex items-center gap-3 text-left transition-colors"
                  >
                    <MapPin size={14} className="text-[#666] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#181725] truncate">{o.name}</p>
                      {o.pincode && <p className="text-[11px] text-[#AEAEAE]">{o.pincode}</p>}
                    </div>
                    {o.requiresAddressUpdate && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                        Address needed
                      </span>
                    )}
                    {o.id === currentOutlet?.id && <Check size={14} className="text-[#299E60] shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Other accounts ── */}
          {otherAccounts.length > 0 && !showOutletPicker && (
            <div className="py-2">
              <div className="px-4 py-1.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[#AEAEAE] uppercase tracking-wider">Switch Account</p>
                {availableAccountsTruncated && (
                  <span className="text-[10px] text-[#AEAEAE]">
                    Showing {accounts.length} of {totalAccountCount}
                  </span>
                )}
              </div>
              <div className="max-h-[240px] overflow-y-auto">
                {otherAccounts.map((a) => {
                  const k = classifyAccount(a);
                  const c = KIND_STYLE[k];
                  const KIcon = c.icon;
                  const isSwitching = switchingId === a.id;
                  const name = a.displayName ?? a.legalName;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleAccountClick(a)}
                      disabled={switching}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8F8F8] transition-colors text-left"
                    >
                      <div
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: c.bg }}
                      >
                        {isSwitching ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: c.color }} />
                        ) : (
                          <KIcon size={16} style={{ color: c.color }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#181725] truncate">{name}</p>
                        {a.outlets.length > 0 && (
                          <p className="text-[11px] text-[#AEAEAE] truncate">
                            {a.outlets.length} outlet{a.outlets.length === 1 ? '' : 's'}
                          </p>
                        )}
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                        style={{ color: c.color, backgroundColor: c.bg }}
                      >
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {availableAccountsTruncated && (
                <Link
                  href="/account"
                  className="block px-4 py-2 text-[12px] text-center text-[#299E60] hover:bg-[#F8F8F8] font-semibold border-t border-[#F0F0F0]"
                  onClick={() => setIsOpen(false)}
                >
                  View all {totalAccountCount} accounts
                </Link>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          {!showOutletPicker && (
            <div className="border-t border-[#F0F0F0] py-2">
              {currentAccount && (
                <Link
                  href={`/account/${currentAccount.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#F8F8F8] transition-colors"
                >
                  <div className="w-[36px] h-[36px] rounded-full bg-[#F5F5F5] flex items-center justify-center">
                    <ShieldCheck size={16} className="text-[#666]" />
                  </div>
                  <span className="text-[13px] font-semibold text-[#181725]">Manage account</span>
                </Link>
              )}
              <button
                onClick={() => { setIsOpen(false); signOut(); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-[36px] h-[36px] rounded-full bg-red-50 flex items-center justify-center">
                  <LogOut size={16} className="text-red-500" />
                </div>
                <span className="text-[13px] font-semibold text-red-500">Sign out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
