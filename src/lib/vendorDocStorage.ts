// vendorDocStorage — local-disk storage for vendor KYC documents.
//
// WHY local disk (not ImageKit): PAN cards, cancelled cheques and GST certs are
// sensitive KYC. ImageKit serves PUBLIC urls (anyone with the link can open
// them). We keep these on the droplet and serve them through an authenticated
// route (admin + owning vendor only) — see /api/v1/files/vendor-docs/[docId].
//
// Files live on a Docker named volume mounted at /app/uploads (see
// docker-compose.prod.yml). In dev they go to <project>/uploads (gitignored).
// The volume survives image rebuilds AND the weekly `docker system prune`
// (we prune with -af, never --volumes).

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Base dir: env override (prod sets nothing → defaults to /app/uploads since
// the standalone server's cwd is /app), else <cwd>/uploads for local dev.
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const VENDOR_DOC_DIR = 'vendor-docs';

export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10MB

// KYC docs are commonly PDFs OR phone photos → allow both. Keep this map as the
// single source of truth for extension ↔ mime used by both upload and serve.
export const ALLOWED_DOC_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const EXT_TO_MIME: Record<string, string> = Object.entries(ALLOWED_DOC_MIME).reduce(
  (acc, [mime, ext]) => ({ ...acc, [ext]: mime }),
  {},
);

export function extForMime(mime: string): string | null {
  return ALLOWED_DOC_MIME[mime] ?? null;
}

export function mimeForExt(ext: string): string {
  return EXT_TO_MIME[ext.toLowerCase()] ?? 'application/octet-stream';
}

// Stored on-disk filename is `<docId>.<ext>` inside the vendor's folder. We pass
// a known docId in so the DB row and the file share an id (easy lookup + delete).
export function newDocId(): string {
  return randomUUID();
}

function vendorDir(vendorId: string): string {
  return path.join(UPLOAD_ROOT, VENDOR_DOC_DIR, vendorId);
}

function safeFile(vendorId: string, docId: string, ext: string): string {
  // docId is a server-generated uuid and ext comes from the allow-list, so
  // there's no user-controlled path segment — but normalize + confine anyway.
  const file = path.join(vendorDir(vendorId), `${docId}.${ext}`);
  const root = path.resolve(UPLOAD_ROOT);
  if (!path.resolve(file).startsWith(root + path.sep)) {
    throw new Error('Resolved path escaped upload root');
  }
  return file;
}

export async function saveVendorDoc(
  vendorId: string,
  docId: string,
  ext: string,
  buffer: Buffer,
): Promise<void> {
  const dir = vendorDir(vendorId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(safeFile(vendorId, docId, ext), buffer);
}

export async function readVendorDoc(
  vendorId: string,
  docId: string,
  ext: string,
): Promise<Buffer> {
  return fs.readFile(safeFile(vendorId, docId, ext));
}

export async function deleteVendorDoc(
  vendorId: string,
  docId: string,
  ext: string,
): Promise<void> {
  await fs.rm(safeFile(vendorId, docId, ext), { force: true });
}

// We store the public-facing serve path in VendorDocument.fileUrl so no schema
// change is needed. The extension rides along so the serve route knows the
// on-disk filename + content-type without an extra column.
export function serveUrl(docId: string, ext: string): string {
  return `/api/v1/files/vendor-docs/${docId}.${ext}`;
}

// Parse "<docId>.<ext>" out of the serve route's [docId] segment.
export function parseServeSegment(segment: string): { docId: string; ext: string } | null {
  const dot = segment.lastIndexOf('.');
  if (dot <= 0) return null;
  const docId = segment.slice(0, dot);
  const ext = segment.slice(dot + 1).toLowerCase();
  if (!EXT_TO_MIME[ext]) return null;
  return { docId, ext };
}
