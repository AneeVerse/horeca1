/**
 * HCID generator — produces the human-readable Horeca Customer ID stamped on
 * every User row at signup time. Format: "HC-XXXX-XXXX" (uppercase base32-ish).
 *
 * Must be called BEFORE prisma.user.create so the row satisfies the NOT NULL
 * constraint added in 20260520_hcid_architecture_step_c.
 */

import { prisma } from '@/lib/prisma';

function generateHcid(): string {
  const buf = new Uint8Array(5);
  globalThis.crypto.getRandomValues(buf);
  const b32 = btoa(String.fromCharCode(...buf))
    .replace(/[+/=]/g, '')
    .toUpperCase()
    .slice(0, 8)
    .padEnd(8, '0');
  return `HC-${b32.slice(0, 4)}-${b32.slice(4, 8)}`;
}

/** Return a collision-checked HCID. Retries up to 10 times before giving up. */
export async function uniqueHcid(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateHcid();
    const existing = await prisma.user.findUnique({ where: { hcidDisplay: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new Error('Could not generate unique HCID after 10 attempts');
}
