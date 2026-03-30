'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import {
  saveAccount,
  getAccounts,
  getCredentials,
  removeAccount as removeFromStore,
  updateAccountRole,
  clearAllAccounts,
  type SavedAccount,
} from '@/lib/account-store';

export function useAccountSwitcher() {
  const { data: session } = useSession();
  const router = useRouter();
  const { clearCart } = useCart();
  const { clearWishlist } = useWishlist();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [switching, setSwitching] = useState(false);

  const currentEmail = session?.user?.email || null;
  const currentRole = (session?.user as { role?: string })?.role || 'customer';

  // Load accounts on mount & keep role in sync
  useEffect(() => {
    const stored = getAccounts();
    setAccounts(stored);

    // Update stored role if it changed (e.g. vendor approval)
    if (currentEmail && currentRole) {
      const match = stored.find((a) => a.email === currentEmail);
      if (match && match.role !== currentRole) {
        updateAccountRole(currentEmail, currentRole);
        setAccounts(getAccounts());
      }
    }
  }, [currentEmail, currentRole]);

  const refreshAccounts = useCallback(() => {
    setAccounts(getAccounts());
  }, []);

  const addAccount = useCallback(
    async (data: { email: string; password: string; name: string; role: string; id: string }) => {
      await saveAccount(data);
      refreshAccounts();
    },
    [refreshAccounts]
  );

  const switchAccount = useCallback(
    async (email: string) => {
      if (email === currentEmail || switching) return;

      setSwitching(true);
      try {
        const creds = await getCredentials(email);
        if (!creds) {
          setSwitching(false);
          return;
        }

        const result = await signIn('credentials', {
          email: creds.email,
          password: creds.password,
          redirect: false,
        });

        if (result?.error) {
          // Credentials no longer valid — remove the stale account
          removeFromStore(email);
          refreshAccounts();
          setSwitching(false);
          return;
        }

        // Clear user-specific state
        clearCart();
        clearWishlist();

        // Full page reload to ensure NextAuth session cache is refreshed
        const account = accounts.find((a) => a.email === email);
        const targetRole = account?.role || 'customer';

        if (targetRole === 'admin') {
          window.location.href = '/admin/dashboard';
        } else if (targetRole === 'vendor') {
          window.location.href = '/vendor/dashboard';
        } else {
          window.location.href = '/';
        }
      } catch {
        setSwitching(false);
      }
    },
    [currentEmail, switching, accounts, clearCart, clearWishlist, router, refreshAccounts]
  );

  const removeAccountById = useCallback(
    (email: string) => {
      removeFromStore(email);
      refreshAccounts();
    },
    [refreshAccounts]
  );

  const handleSignOut = useCallback(
    async (removeFromSaved = false) => {
      if (removeFromSaved && currentEmail) {
        removeFromStore(currentEmail);
      }
      clearCart();
      clearWishlist();
      clearAllAccounts();
      await signOut({ callbackUrl: '/' });
    },
    [currentEmail, clearCart, clearWishlist]
  );

  return {
    accounts,
    currentEmail,
    currentRole,
    switching,
    addAccount,
    switchAccount,
    removeAccount: removeAccountById,
    signOutAll: handleSignOut,
    refreshAccounts,
  };
}
