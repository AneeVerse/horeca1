/**
 * Encrypted multi-account credential storage using Web Crypto API (AES-GCM).
 * Protects against casual localStorage inspection — not a security boundary
 * since credentials are already in the user's browser.
 */

const STORAGE_KEY = 'horeca_accounts';
const PASSPHRASE = 'horeca-hub-account-switcher-v1';
const SALT = new Uint8Array([72, 111, 82, 101, 67, 97, 72, 117, 98, 50, 48, 50, 54, 83, 65, 76]);

export interface SavedAccount {
  email: string;
  name: string;
  role: string;
  id: string;
}

interface StoredAccount extends SavedAccount {
  _ep: string; // encrypted password (base64)
  _iv: string; // IV for AES-GCM (base64)
}

async function deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(PASSPHRASE),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function encryptPassword(password: string): Promise<{ _ep: string; _iv: string }> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(password)
  );
  return { _ep: toBase64(ciphertext), _iv: toBase64(iv.buffer as ArrayBuffer) };
}

async function decryptPassword(ep: string, iv: string): Promise<string> {
  const key = await deriveKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(ep)
  );
  return new TextDecoder().decode(plaintext);
}

function readStore(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(accounts: StoredAccount[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

/** Save or update an account in the store */
export async function saveAccount(account: {
  email: string;
  password: string;
  name: string;
  role: string;
  id: string;
}): Promise<void> {
  const { _ep, _iv } = await encryptPassword(account.password);
  const stored: StoredAccount = {
    email: account.email,
    name: account.name,
    role: account.role,
    id: account.id,
    _ep,
    _iv,
  };

  const accounts = readStore();
  const idx = accounts.findIndex((a) => a.email === account.email);
  if (idx >= 0) {
    accounts[idx] = stored;
  } else {
    accounts.push(stored);
  }
  writeStore(accounts);
}

/** Get all saved accounts (without passwords) */
export function getAccounts(): SavedAccount[] {
  return readStore().map(({ email, name, role, id }) => ({ email, name, role, id }));
}

/** Get decrypted credentials for switching */
export async function getCredentials(
  email: string
): Promise<{ email: string; password: string } | null> {
  const accounts = readStore();
  const account = accounts.find((a) => a.email === email);
  if (!account) return null;

  const password = await decryptPassword(account._ep, account._iv);
  return { email: account.email, password };
}

/** Remove an account from the store */
export function removeAccount(email: string): void {
  const accounts = readStore().filter((a) => a.email !== email);
  writeStore(accounts);
}

/** Update the role of an existing account (e.g. after approval) */
export function updateAccountRole(email: string, role: string): void {
  const accounts = readStore();
  const account = accounts.find((a) => a.email === email);
  if (account) {
    account.role = role;
    writeStore(accounts);
  }
}

/** Clear all stored accounts */
export function clearAllAccounts(): void {
  localStorage.removeItem(STORAGE_KEY);
}
