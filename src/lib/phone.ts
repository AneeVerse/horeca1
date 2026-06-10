// Canonical phone handling — User.phone is stored as a bare 10-digit Indian
// mobile number ("9892392597"). Historically some write paths stored
// "+91XXXXXXXXXX" / "91XXXXXXXXXX", which broke login lookups (the login form
// normalizes to 10 digits, findUnique({ phone }) then missed the row).
//
// Rules:
//  - normalizePhone() at EVERY write path (signup, invites, admin create/edit).
//  - phoneLookupVariants() at EVERY read path, so rows written before the
//    normalization rollout (or imported with a prefix) still match.

/** Normalize any user-supplied phone to canonical 10-digit form, or null if invalid. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/**
 * All representations a legacy row might be stored under, for OR lookups.
 * Returns [] when the input doesn't normalize to a valid Indian mobile.
 */
export function phoneLookupVariants(raw: string | null | undefined): string[] {
  const p = normalizePhone(raw);
  if (!p) return [];
  return [p, `+91${p}`, `91${p}`];
}
