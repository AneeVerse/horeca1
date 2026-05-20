'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

/**
 * V2.2 — Multi-account + multi-outlet switcher hook.
 *
 * Reads the available BusinessAccounts from /api/v1/account, looks up
 * outlets for the active account when needed, and switches by calling
 * /api/v1/auth/switch-{business-account,outlet} followed by
 * useSession().update(...) which triggers a JWT refresh through the
 * auth.ts jwt callback (loadActiveContext re-runs).
 */

export interface AccountSummary {
  id: string;
  legalName: string;
  displayName: string | null;
  isCustomer: boolean;
  isVendor: boolean;
  isBrand: boolean;
  status: 'active' | 'suspended' | 'deactivated';
  isPrimary: boolean;
  primaryOutletId: string | null;
  outlets: Array<{ id: string; name: string; pincode: string | null; requiresAddressUpdate: boolean }>;
}

export interface OutletSummary {
  id: string;
  name: string;
  pincode: string | null;
  requiresAddressUpdate: boolean;
}

export function useBusinessAccountSwitcher() {
  const { data: session, update } = useSession();
  const { clearCart } = useCart();
  const { clearWishlist } = useWishlist();

  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const userId = session?.user?.id ?? null;
  const u = (session?.user ?? {}) as Record<string, unknown>;
  const hcidDisplay = (u.hcidDisplay as string | undefined) ?? null;
  const activeBusinessAccountId = (u.activeBusinessAccountId as string | undefined) ?? null;
  const activeOutletId = (u.activeOutletId as string | undefined) ?? null;
  const totalAccountCount = (u.totalAccountCount as number | undefined) ?? 0;
  const availableAccountsTruncated = (u.availableAccountsTruncated as boolean | undefined) ?? false;

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/account');
      const json = await res.json();
      if (json.success) setAccounts(json.data as AccountSummary[]);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (userId) fetchAccounts();
  }, [userId, fetchAccounts]);

  const currentAccount = accounts.find((a) => a.id === activeBusinessAccountId) ?? null;
  const currentOutlet = currentAccount?.outlets.find((o) => o.id === activeOutletId) ?? null;

  const switchAccount = useCallback(
    async (businessAccountId: string, outletId?: string) => {
      if (switching || businessAccountId === activeBusinessAccountId) return;
      setSwitching(true);
      try {
        const res = await fetch('/api/v1/auth/switch-business-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessAccountId, outletId }),
        });
        if (!res.ok) { setSwitching(false); return; }
        // Clear cart cache (a new cart is loaded for the new (account, outlet))
        clearCart();
        clearWishlist();
        // Trigger jwt callback with target ids; session refreshes in place.
        await update({ activeBusinessAccountId: businessAccountId, activeOutletId: outletId ?? undefined });
      } finally {
        setSwitching(false);
      }
    },
    [switching, activeBusinessAccountId, clearCart, clearWishlist, update],
  );

  const switchOutlet = useCallback(
    async (outletId: string) => {
      if (switching || outletId === activeOutletId) return;
      setSwitching(true);
      try {
        const res = await fetch('/api/v1/auth/switch-outlet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outletId }),
        });
        if (!res.ok) { setSwitching(false); return; }
        clearCart();
        await update({ activeOutletId: outletId });
      } finally {
        setSwitching(false);
      }
    },
    [switching, activeOutletId, clearCart, update],
  );

  const handleSignOut = useCallback(async () => {
    clearCart();
    clearWishlist();
    try {
      localStorage.removeItem('horeca_order_lists_all');
      localStorage.removeItem('horeca_orders');
      localStorage.removeItem('horeca_recently_viewed');
    } catch { /* ignore */ }
    await signOut({ callbackUrl: '/' });
  }, [clearCart, clearWishlist]);

  return {
    loading,
    switching,
    hcidDisplay,
    accounts,
    currentAccount,
    currentOutlet,
    activeBusinessAccountId,
    activeOutletId,
    totalAccountCount,
    availableAccountsTruncated,
    switchAccount,
    switchOutlet,
    refresh: fetchAccounts,
    signOut: handleSignOut,
  };
}
