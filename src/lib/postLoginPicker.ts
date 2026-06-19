/**
 * Fresh-login account picker — cookie + sessionStorage coordination.
 *
 * sessionStorage dismiss alone survives logout/login in the same tab; the
 * short-lived force-pick cookie is set on sign-in (server + client) so every
 * fresh login with 2+ business accounts must pick before redirect.
 */

export const FORCE_PICKER_COOKIE = 'horeca_force_account_picker';
export const PENDING_REDIRECT_KEY = 'horeca_pending_post_login_redirect';
export const DISMISS_KEY = 'horeca_post_login_selector_dismissed';

const COOKIE_MAX_AGE_SEC = 5 * 60;

export function readForcePickerCookie(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return document.cookie.split(';').some((c) => c.trim().startsWith(`${FORCE_PICKER_COOKIE}=1`));
  } catch {
    return false;
  }
}

export function setForcePickerCookie(): void {
  if (typeof document === 'undefined') return;
  try {
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${FORCE_PICKER_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE_SEC}; samesite=lax${secure}`;
  } catch {
    /* ignore */
  }
}

export function clearForcePickerCookie(): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${FORCE_PICKER_COOKIE}=; path=/; max-age=0`;
  } catch {
    /* ignore */
  }
}

export function clearDismissFlag(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

export function setPendingRedirect(url: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (url) sessionStorage.setItem(PENDING_REDIRECT_KEY, url);
    else sessionStorage.removeItem(PENDING_REDIRECT_KEY);
  } catch {
    /* ignore */
  }
}

export function consumePendingRedirect(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const url = sessionStorage.getItem(PENDING_REDIRECT_KEY);
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    return url;
  } catch {
    return null;
  }
}

/** Called after OTP/password sign-in on the login page — defer redirect until picker completes. */
export function prepareFreshLoginNavigation(redirectTo: string | null): void {
  clearDismissFlag();
  setPendingRedirect(redirectTo);
  setForcePickerCookie();
  window.location.href = '/';
}

/** Called when the picker finishes (or when no pick is needed). */
export function completePostLoginPicker(): void {
  clearForcePickerCookie();
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
  const pending = consumePendingRedirect();
  if (pending) window.location.href = pending;
}

/** Overlay / in-page login — no navigation, just arm the picker. */
export function markFreshLoginPendingPicker(): void {
  clearDismissFlag();
  setForcePickerCookie();
}
