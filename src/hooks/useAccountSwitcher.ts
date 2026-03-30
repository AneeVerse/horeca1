'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

export interface LinkedAccount {
  linkId: string;
  id: string;
  email: string;
  name: string;
  role: string;
  image: string | null;
}

export function useAccountSwitcher() {
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const { clearWishlist } = useWishlist();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const currentEmail = session?.user?.email || null;
  const currentRole = (session?.user as { role?: string })?.role || 'customer';

  // Fetch linked accounts from server
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/linked-accounts');
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchAccounts();
    }
  }, [session, fetchAccounts]);

  // Link a new account (verify credentials server-side, no signIn)
  const linkAccount = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/v1/auth/link-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();

        if (json.success) {
          await fetchAccounts();
          return { success: true };
        }
        return { success: false, error: json.error || 'Failed to link account' };
      } catch {
        return { success: false, error: 'Network error' };
      }
    },
    [fetchAccounts]
  );

  // Switch to a linked account using server-generated switch token
  const switchAccount = useCallback(
    async (linkedUserId: string) => {
      if (switching) return;
      setSwitching(true);

      try {
        // 1. Get a one-time switch token from the server
        const res = await fetch('/api/v1/auth/switch-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkedUserId }),
        });
        const json = await res.json();

        if (!json.success) {
          setSwitching(false);
          return;
        }

        // 2. Clear user-specific state before switching
        clearCart();
        clearWishlist();

        // 3. Use signIn with redirect — NextAuth handles navigation
        //    after the cookie is fully set (no race condition)
        const targetRole = json.data.role;
        let callbackUrl = '/';
        if (targetRole === 'admin') callbackUrl = '/admin/dashboard';
        else if (targetRole === 'vendor') callbackUrl = '/vendor/dashboard';

        await signIn('credentials', {
          switchToken: json.data.switchToken,
          callbackUrl,
        });
        // signIn with redirect:true never returns — browser navigates
      } catch {
        setSwitching(false);
      }
    },
    [switching, clearCart, clearWishlist]
  );

  // Remove a linked account
  const unlinkAccount = useCallback(
    async (linkId: string) => {
      try {
        await fetch(`/api/v1/auth/link-account/${linkId}`, { method: 'DELETE' });
        await fetchAccounts();
      } catch {
        // silently fail
      }
    },
    [fetchAccounts]
  );

  // Sign out — switch to next linked account or go home
  const handleSignOut = useCallback(
    async () => {
      if (accounts.length > 0) {
        // Switch to the first linked account instead of logging out
        const next = accounts[0];
        await switchAccount(next.id);
        return;
      }

      // No linked accounts — full sign out
      clearCart();
      clearWishlist();
      await signOut({ callbackUrl: '/' });
    },
    [accounts, switchAccount, clearCart, clearWishlist]
  );

  return {
    accounts,
    loading,
    currentEmail,
    currentRole,
    switching,
    linkAccount,
    switchAccount,
    unlinkAccount,
    signOutCurrent: handleSignOut,
    refreshAccounts: fetchAccounts,
  };
}
