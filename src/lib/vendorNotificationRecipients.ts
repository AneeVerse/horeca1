import { prisma } from '@/lib/prisma';
import { flatten } from '@/lib/permissions/engine';
import type { PermissionKey } from '@/lib/permissions/registry';

const PRODUCT_NOTIFY_PERMS: PermissionKey[] = ['products.view', 'products.edit'];

function hasProductNotifyPerm(permissions: unknown): boolean {
  const flat = flatten(permissions as Parameters<typeof flatten>[0]);
  return PRODUCT_NOTIFY_PERMS.some((p) => flat.has(p));
}

/** Vendor owner + team members who can view or edit products. */
export async function getVendorProductNotificationUserIds(vendorId: string): Promise<string[]> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { userId: true },
  });
  if (!vendor) return [];

  const members = await prisma.vendorTeamMember.findMany({
    where: { vendorId },
    select: {
      userId: true,
      roleRef: { select: { permissions: true } },
    },
  });

  const ids = new Set<string>([vendor.userId]);
  for (const m of members) {
    if (hasProductNotifyPerm(m.roleRef?.permissions)) {
      ids.add(m.userId);
    }
  }

  return [...ids];
}
