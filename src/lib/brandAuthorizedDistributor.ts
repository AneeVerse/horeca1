import { prisma } from '@/lib/prisma';
import type { BrandAuthorizedDistributorStatus } from '@prisma/client';

export function distributorAuthKey(brandId: string, vendorId: string): string {
  return `${brandId}:${vendorId}`;
}

export function recomputeAuthStatus(
  brandApprovedAt: Date | null | undefined,
  adminApprovedAt: Date | null | undefined,
  rejectedAt: Date | null | undefined,
): BrandAuthorizedDistributorStatus {
  if (rejectedAt) return 'rejected';
  if (brandApprovedAt && adminApprovedAt) return 'approved';
  return 'pending';
}

/** Set of `brandId:vendorId` keys with fully approved distributor status. */
export async function getApprovedDistributorKeys(
  filter?: { brandId?: string; vendorId?: string },
): Promise<Set<string>> {
  const rows = await prisma.brandAuthorizedDistributor.findMany({
    where: {
      status: 'approved',
      ...(filter?.brandId && { brandId: filter.brandId }),
      ...(filter?.vendorId && { vendorId: filter.vendorId }),
    },
    select: { brandId: true, vendorId: true },
  });
  return new Set(rows.map((r) => distributorAuthKey(r.brandId, r.vendorId)));
}

export async function ensurePendingDistributorAuth(brandId: string, vendorId: string): Promise<void> {
  await prisma.brandAuthorizedDistributor.upsert({
    where: { brandId_vendorId: { brandId, vendorId } },
    create: { brandId, vendorId, status: 'pending' },
    update: {},
  });
}

export async function approveDistributorByBrand(
  brandId: string,
  vendorId: string,
  userId: string,
  note?: string,
) {
  const existing = await prisma.brandAuthorizedDistributor.findUnique({
    where: { brandId_vendorId: { brandId, vendorId } },
  });
  const now = new Date();
  const adminApprovedAt = existing?.adminApprovedAt ?? null;
  const status = recomputeAuthStatus(now, adminApprovedAt, null);

  return prisma.brandAuthorizedDistributor.upsert({
    where: { brandId_vendorId: { brandId, vendorId } },
    create: {
      brandId,
      vendorId,
      status,
      brandApprovedAt: now,
      brandApprovedBy: userId,
      adminApprovedAt,
      note: note ?? null,
    },
    update: {
      status,
      brandApprovedAt: now,
      brandApprovedBy: userId,
      rejectedAt: null,
      rejectedBy: null,
      ...(note !== undefined && { note }),
    },
    include: {
      vendor: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
    },
  });
}

export async function approveDistributorByAdmin(
  brandId: string,
  vendorId: string,
  userId: string,
  note?: string,
) {
  const existing = await prisma.brandAuthorizedDistributor.findUnique({
    where: { brandId_vendorId: { brandId, vendorId } },
  });
  const now = new Date();
  const brandApprovedAt = existing?.brandApprovedAt ?? now;
  const status = recomputeAuthStatus(brandApprovedAt, now, null);

  return prisma.brandAuthorizedDistributor.upsert({
    where: { brandId_vendorId: { brandId, vendorId } },
    create: {
      brandId,
      vendorId,
      status,
      brandApprovedAt: now,
      adminApprovedAt: now,
      adminApprovedBy: userId,
      note: note ?? null,
    },
    update: {
      status,
      adminApprovedAt: now,
      adminApprovedBy: userId,
      brandApprovedAt: existing?.brandApprovedAt ?? now,
      rejectedAt: null,
      rejectedBy: null,
      ...(note !== undefined && { note }),
    },
    include: {
      vendor: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
    },
  });
}

export async function rejectDistributorAuth(
  brandId: string,
  vendorId: string,
  userId: string,
  note?: string,
) {
  const now = new Date();
  return prisma.brandAuthorizedDistributor.upsert({
    where: { brandId_vendorId: { brandId, vendorId } },
    create: {
      brandId,
      vendorId,
      status: 'rejected',
      rejectedAt: now,
      rejectedBy: userId,
      note: note ?? null,
    },
    update: {
      status: 'rejected',
      rejectedAt: now,
      rejectedBy: userId,
      ...(note !== undefined && { note }),
    },
    include: {
      vendor: { select: { id: true, businessName: true, slug: true, logoUrl: true } },
    },
  });
}

/** Strip brandMappings whose vendor is not an approved distributor for that brand. */
export async function filterProductBrandMappings<
  T extends {
    vendorId?: string;
    vendor?: { id: string } | null;
    brandMappings?: Array<{ brandId?: string }>;
  },
>(products: T[]): Promise<T[]> {
  const brandIds = new Set<string>();
  const vendorIds = new Set<string>();
  for (const p of products) {
    const vendorId = p.vendor?.id ?? p.vendorId;
    if (!vendorId) continue;
    vendorIds.add(vendorId);
    for (const m of p.brandMappings ?? []) {
      if (m.brandId) brandIds.add(m.brandId);
    }
  }
  if (brandIds.size === 0 || vendorIds.size === 0) return products;

  const approved = await getApprovedDistributorKeys();
  return products.map((p) => {
    const vendorId = p.vendor?.id ?? p.vendorId;
    if (!vendorId || !p.brandMappings?.length) return p;
    const filtered = filterAuthorizedMappings(p.brandMappings, vendorId, approved);
    if (filtered.length === p.brandMappings.length) return p;
    return { ...p, brandMappings: filtered };
  });
}

/** Filter brand mappings to those whose vendor is an approved distributor for the brand. */
export function filterAuthorizedMappings<T extends { brandId?: string; brand?: { id: string } }>(
  mappings: T[] | undefined,
  vendorId: string,
  approvedKeys: Set<string>,
): T[] {
  if (!mappings?.length) return [];
  return mappings.filter((m) => {
    const brandId = m.brandId ?? m.brand?.id;
    if (!brandId) return false;
    return approvedKeys.has(distributorAuthKey(brandId, vendorId));
  });
}
