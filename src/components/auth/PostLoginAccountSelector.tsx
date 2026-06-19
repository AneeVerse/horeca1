'use client';

/**
 * Shown after every fresh login when a user must pick a BusinessAccount
 * (2+ accounts) or an outlet (1 account, multiple outlets).
 *
 * Wired in via the root layout. Honors a short-lived force-pick cookie set on
 * sign-in so the dismiss flag in sessionStorage cannot bypass account selection
 * across logout/login in the same tab.
 *
 * V2 — adds an outlet-selection step for accounts with multiple outlets.
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useBusinessAccountSwitcher, type AccountSummary } from '@/hooks/useBusinessAccountSwitcher';
import {
  DISMISS_KEY,
  readForcePickerCookie,
  completePostLoginPicker,
  clearForcePickerCookie,
} from '@/lib/postLoginPicker';
import { ShieldCheck, Store, Sparkles, User, MapPin, Loader2, X, ChevronLeft, Check } from 'lucide-react';

type Kind = 'customer' | 'vendor' | 'brand';
const STYLE: Record<Kind, { label: string; color: string; bg: string; icon: typeof Store }> = {
  customer: { label: 'Customer', color: '#2563EB', bg: '#DBEAFE', icon: User },
  vendor:   { label: 'Vendor',   color: '#299E60', bg: '#DCFCE7', icon: Store },
  brand:    { label: 'Brand',    color: '#7C3AED', bg: '#EDE9FE', icon: Sparkles },
};

function classify(a: AccountSummary): Kind {
  if (a.isVendor) return 'vendor';
  if (a.isBrand) return 'brand';
  return 'customer';
}

export function PostLoginAccountSelector() {
  const { data: session, status, update } = useSession();
  const { accounts, currentAccount, switchAccount, switchOutlet, activeOutletId, switching } = useBusinessAccountSwitcher();
  const [open, setOpen] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [outletStep, setOutletStep] = useState<AccountSummary | null>(null);
  const [mandatoryPick, setMandatoryPick] = useState(false);

  const u = (session?.user ?? {}) as Record<string, unknown>;
  const accessibleOutletIds = Array.isArray(u.accessibleOutletIds) ? (u.accessibleOutletIds as string[]) : [];

  function filterOutlets(a: AccountSummary) {
    if (accessibleOutletIds.length === 0) return a.outlets;
    return a.outlets.filter((o) => accessibleOutletIds.includes(o.id));
  }

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (accounts.length === 0) return;

    const hasForceCookie = readForcePickerCookie();
    const forcePick = hasForceCookie || u.forceAccountPicker === true;
    const totalCount = (u.totalAccountCount as number | undefined) ?? accounts.length;
    const mustPick = hasForceCookie && totalCount > 1;
    Promise.resolve().then(() => setMandatoryPick(mustPick));

    let dismissed = false;
    if (!mustPick) {
      try { dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { /* ignore */ }
      if (dismissed) return;
    }

    const visibleOutlets = filterOutlets(accounts[0]);
    // 1 account, 0-1 accessible outlets → nothing to pick
    if (accounts.length === 1 && visibleOutlets.length <= 1) {
      if (forcePick) {
        void update({ accountPickerCompleted: true }).then(() => completePostLoginPicker());
      }
      return;
    }
    // 1 account, multiple accessible outlets → outlet step
    if (accounts.length === 1 && visibleOutlets.length > 1) {
      Promise.resolve().then(() => {
        setOutletStep(accounts[0]);
        setOpen(true);
      });
      return;
    }
    // 2+ accounts → account picker
    Promise.resolve().then(() => setOpen(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, accounts, session?.user?.id, accessibleOutletIds.join(',')]);

  if (!open) return null;

  const finishPicker = async () => {
    setOpen(false);
    setOutletStep(null);
    setPickingId(null);
    await update({ accountPickerCompleted: true });
    completePostLoginPicker();
  };

  const handlePick = async (a: AccountSummary) => {
    setPickingId(a.id);
    if (!mandatoryPick) {
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    }
    if (a.id !== currentAccount?.id) {
      await switchAccount(a.id);
    }
    if (filterOutlets(a).length > 1) {
      setOutletStep(a);
      setPickingId(null);
    } else {
      await finishPicker();
    }
  };

  const handleDismiss = async () => {
    if (mandatoryPick) return;
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    clearForcePickerCookie();
    await update({ accountPickerCompleted: true });
    setOpen(false);
    setOutletStep(null);
  };

  // Outlet step view
  if (outletStep !== null) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[10010] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col">
          <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!mandatoryPick && (
                <button
                  onClick={() => setOutletStep(null)}
                  className="p-1 rounded hover:bg-gray-100"
                  aria-label="Back to account selection"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <div>
                <h2 className="text-[16px] font-bold text-[#181725]">Select your outlet</h2>
                <p className="text-[12px] text-[#666] mt-0.5">
                  Choose which outlet to operate from.
                </p>
              </div>
            </div>
            {!mandatoryPick && (
              <button
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <ul className="p-2 overflow-y-auto flex-1">
            {filterOutlets(outletStep).map((o) => {
              const isCurrent = o.id === activeOutletId;
              const isPicking = pickingId === o.id;
              return (
                <li key={o.id}>
                  <button
                    onClick={async () => {
                      setPickingId(o.id);
                      await switchOutlet(o.id);
                      await finishPicker();
                    }}
                    disabled={switching || isPicking}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F8F8F8] transition-colors text-left disabled:opacity-60"
                  >
                    <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0 bg-[#DCFCE7]">
                      {isPicking ? (
                        <Loader2 size={18} className="animate-spin text-[#299E60]" />
                      ) : (
                        <MapPin size={18} className="text-[#299E60]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#181725] truncate">{o.name}</p>
                      <p className="text-[11px] text-[#AEAEAE]">{o.pincode ?? '—'}</p>
                    </div>
                    {isCurrent && (
                      <Check size={16} className="text-[#299E60] shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="p-3 border-t border-[#F0F0F0] flex items-center justify-between gap-2">
            <p className="text-[11px] text-[#AEAEAE] flex items-center gap-1">
              <ShieldCheck size={11} /> Delivery and inventory are scoped to your outlet.
            </p>
            {!mandatoryPick && (
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-[12px] font-semibold text-[#666] hover:bg-[#F5F5F5] rounded-lg"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Account list view (default)
  return (
    <div className="fixed inset-0 bg-black/40 z-[10010] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-[#181725]">Welcome back</h2>
            <p className="text-[12px] text-[#666] mt-0.5">
              {mandatoryPick
                ? 'Select a business account to continue.'
                : `You belong to ${accounts.length} business accounts. Pick one to continue.`}
            </p>
          </div>
          {!mandatoryPick && (
            <button
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-gray-100"
              aria-label="Continue with current account"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <ul className="p-2 overflow-y-auto flex-1">
          {accounts.map((a) => {
            const kind = classify(a);
            const conf = STYLE[kind];
            const Icon = conf.icon;
            const isCurrent = a.id === currentAccount?.id;
            const isPicking = pickingId === a.id;
            return (
              <li key={a.id}>
                <button
                  onClick={() => handlePick(a)}
                  disabled={switching || isPicking}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F8F8F8] transition-colors text-left disabled:opacity-60"
                >
                  <div
                    className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: conf.bg }}
                  >
                    {isPicking ? (
                      <Loader2 size={18} className="animate-spin" style={{ color: conf.color }} />
                    ) : (
                      <Icon size={18} style={{ color: conf.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-bold text-[#181725] truncate">
                        {a.displayName ?? a.legalName}
                      </p>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-100 text-green-700">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#AEAEAE] flex items-center gap-1">
                      <MapPin size={10} />
                      {filterOutlets(a).length} outlet{filterOutlets(a).length === 1 ? '' : 's'}
                      {filterOutlets(a).some((o) => o.requiresAddressUpdate) && (
                        <span className="ml-1 text-amber-600 font-semibold">· address needed</span>
                      )}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
                    style={{ color: conf.color, backgroundColor: conf.bg }}
                  >
                    {conf.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="p-3 border-t border-[#F0F0F0] flex items-center justify-between gap-2">
          <p className="text-[11px] text-[#AEAEAE] flex items-center gap-1">
            <ShieldCheck size={11} /> Permissions update automatically when you switch.
          </p>
          {!mandatoryPick && (
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-[12px] font-semibold text-[#666] hover:bg-[#F5F5F5] rounded-lg"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
