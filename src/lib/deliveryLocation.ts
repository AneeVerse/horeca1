// Delivery-location resolver — lets the buyer's selected "Deliver to" address
// drive location-based pricing (pincode / city / state price-list rules)
// instead of their registered outlet.
//
// The client stores the *selected SavedAddress id* in the `h1_addr` cookie.
// The server resolves it to a pincode/city/state ONLY after confirming the
// address belongs to the requesting user — so pricing is never driven by a
// spoofed raw value. Anything unverifiable returns null and callers fall back
// to the outlet, preserving the previous behaviour.

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const DELIVERY_COOKIE = 'h1_addr';

export interface DeliveryGeo {
  pincode: string | null;
  city: string | null;
  state: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the buyer's chosen delivery location for `userId`, or null when
 * there's no trusted selection. Safe to call anywhere in a request scope;
 * any failure (no cookie, not request-scoped, address not owned) → null.
 */
export async function getDeliveryGeo(userId: string): Promise<DeliveryGeo | null> {
  try {
    const jar = await cookies();
    const addrId = jar.get(DELIVERY_COOKIE)?.value;
    // Only real SavedAddress UUIDs count — local/guest ids (addr_…, current_…)
    // can't be trusted and aren't in the DB anyway.
    if (!addrId || !UUID_RE.test(addrId)) return null;

    const addr = await prisma.savedAddress.findFirst({
      where: { id: addrId, userId },
      select: { pincode: true, city: true, state: true },
    });
    if (!addr) return null;
    return { pincode: addr.pincode ?? null, city: addr.city ?? null, state: addr.state ?? null };
  } catch {
    return null;
  }
}
