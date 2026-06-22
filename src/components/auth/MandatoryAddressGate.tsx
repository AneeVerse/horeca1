'use client';

/**
 * Forces a logged-in customer who has no *usable* delivery address to set one
 * before using the storefront. Mounted in the root layout next to
 * PostLoginAccountSelector.
 *
 * Trigger: authenticated + active account is a pure customer (not a vendor /
 * brand account, which also carry isCustomer=true) + no saved address with a
 * real location. A brand-new OTP-signup customer is provisioned with a
 * PLACEHOLDER outlet ("Address pending…", no pincode/coords) that GET
 * /api/v1/addresses still returns — so we cannot test length===0; we test for
 * a usable address (valid 6-digit pincode OR non-zero coordinates).
 *
 * The overlay is non-dismissible (mandatory). It stays shut while the
 * post-login account picker is still pending (force-picker cookie) so the two
 * modals never stack, and on the auth screens / non-customer portals it never
 * fires.
 *
 * Pairs with the phone-OTP passwordless signup in auth.ts: a brand-new
 * customer created on first login lands here with only a placeholder address
 * and is walked straight into the map picker before they can browse or
 * checkout.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAddress, type Address } from '@/context/AddressContext';
import { readForcePickerCookie } from '@/lib/postLoginPicker';
import { AddNewAddressOverlay } from '@/components/layout/AddNewAddressOverlay';

// Auth screens + non-customer portals never get the gate.
const EXCLUDED_PREFIXES = ['/login', '/register', '/admin', '/vendor', '/brand'];

export function MandatoryAddressGate() {
  const { data: session, status } = useSession();
  const { savedAddresses, isLoadingAddresses, addAddress, setSelectedAddress } = useAddress();
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  // Remember a real DB fetch happened, so we never open during the brief
  // pre-fetch window where savedAddresses is still its empty initial value.
  const seenLoading = useRef(false);

  const u = (session?.user ?? {}) as Record<string, unknown>;
  const acctType = u.activeBusinessAccountType as
    | { isCustomer?: boolean; isVendor?: boolean; isBrand?: boolean }
    | undefined;
  // A pure customer account only — vendor/brand accounts also carry
  // isCustomer=true and must never be gated for a delivery address.
  const isCustomerContext = acctType
    ? acctType.isCustomer === true && acctType.isVendor !== true && acctType.isBrand !== true
    : u.role === 'customer';
  const onExcludedRoute = EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // An address counts as usable when it has a real location to deliver to:
  // a valid 6-digit pincode or non-zero coordinates. The auto-provisioned
  // placeholder outlet has neither, so it never satisfies this.
  const hasUsableAddress = savedAddresses.some(
    (a) =>
      (!!a.pincode && /^\d{6}$/.test(a.pincode)) ||
      (a.latitude !== 0 && a.longitude !== 0),
  );

  useEffect(() => {
    if (isLoadingAddresses) seenLoading.current = true;
  }, [isLoadingAddresses]);

  useEffect(() => {
    const eligible =
      status === 'authenticated' &&
      isCustomerContext &&
      !onExcludedRoute &&
      !readForcePickerCookie(); // let the account picker resolve first

    if (!eligible) {
      Promise.resolve().then(() => setOpen(false));
      return;
    }
    // Wait for a genuine address fetch to complete before deciding.
    if (isLoadingAddresses || !seenLoading.current) return;

    Promise.resolve().then(() => setOpen(!hasUsableAddress));
  }, [status, isCustomerContext, onExcludedRoute, isLoadingAddresses, hasUsableAddress]);

  if (!open) return null;

  const handleSave = async (addr: Omit<Address, 'id'>) => {
    const saved = await addAddress({ ...addr, isDefault: true });
    if (saved) {
      setSelectedAddress(saved);
      setOpen(false);
    }
    // On failure addAddress surfaces a toast; the gate stays open for a retry.
  };

  return (
    <AddNewAddressOverlay
      isOpen={open}
      onClose={() => { /* mandatory — dismissal disabled */ }}
      onSave={handleSave}
      defaultMode="map"
      dismissible={false}
    />
  );
}
