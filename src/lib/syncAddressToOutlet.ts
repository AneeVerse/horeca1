/**
 * Match a saved/detected address to an existing Outlet or create one, then
 * switch the session to it. Shared by LocationSelectionOverlay and
 * InitialPincodeOverlay so navbar location picks stamp activeOutletId.
 */

/**
 * Match a saved/detected address to an existing Outlet or create one, then
 * switch the session to it. Shared by LocationSelectionOverlay and
 * InitialPincodeOverlay so navbar location picks stamp activeOutletId.
 */

export interface OutletSyncAccount {
  id: string;
  isPrimary: boolean;
  primaryOutletId: string | null;
  outlets: Array<{ id: string }>;
}

/** Ensure the session has an active business account before outlet sync. */
export async function prepareAccountForOutletSync(
  accounts: OutletSyncAccount[],
  currentAccount: OutletSyncAccount | null,
  switchAccount: (businessAccountId: string, outletId?: string) => Promise<void>,
): Promise<string | null> {
  if (currentAccount) return currentAccount.id;
  const primary = accounts.find((a) => a.isPrimary) ?? accounts[0];
  if (!primary) return null;
  const defaultOutletId = primary.primaryOutletId ?? primary.outlets[0]?.id;
  await switchAccount(primary.id, defaultOutletId ?? undefined);
  return primary.id;
}

export interface SyncAddressToOutletParams {
  accountId: string;
  addr: {
    fullAddress: string;
    businessName?: string;
    label?: string;
    flatInfo?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
  };
  switchOutlet: (outletId: string) => Promise<void>;
  refreshAccounts?: () => Promise<void>;
}

export async function syncAddressToOutlet({
  accountId,
  addr,
  switchOutlet,
  refreshAccounts,
}: SyncAddressToOutletParams): Promise<string | null> {
  const res = await fetch(`/api/v1/account/${accountId}/outlets`);
  if (!res.ok) throw new Error('Failed to fetch account outlets');
  const json = await res.json();
  const dbOutlets = (json.data || []) as Array<{
    id: string;
    placeId: string | null;
    latitude: number | null;
    longitude: number | null;
    pincode: string | null;
    addressLine: string;
  }>;

  let matchingOutlet = dbOutlets.find((o) => o.placeId && o.placeId === addr.placeId);
  if (!matchingOutlet && addr.latitude != null && addr.longitude != null) {
    matchingOutlet = dbOutlets.find(
      (o) =>
        o.latitude &&
        o.longitude &&
        Math.abs(o.latitude - addr.latitude!) < 0.0001 &&
        Math.abs(o.longitude - addr.longitude!) < 0.0001,
    );
  }
  if (!matchingOutlet) {
    matchingOutlet = dbOutlets.find(
      (o) => o.addressLine === addr.fullAddress && o.pincode === addr.pincode,
    );
  }

  let targetOutletId = matchingOutlet?.id;

  if (!targetOutletId) {
    const createRes = await fetch(`/api/v1/account/${accountId}/outlets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addr.businessName || addr.label || 'Branch Outlet',
        addressLine: addr.fullAddress,
        flatInfo: addr.flatInfo || null,
        landmark: addr.landmark || null,
        city: addr.city || null,
        state: addr.state || null,
        pincode: addr.pincode || null,
        latitude: addr.latitude,
        longitude: addr.longitude,
        placeId: addr.placeId || null,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('Failed to create outlet:', errText);
      throw new Error('Failed to create outlet for address');
    }

    const createJson = await createRes.json();
    targetOutletId = createJson.data.id as string;
  }

  if (targetOutletId) {
    await switchOutlet(targetOutletId);
    if (refreshAccounts) await refreshAccounts();
  }

  return targetOutletId ?? null;
}
