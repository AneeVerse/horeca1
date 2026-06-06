/**
 * provisionDefaultAccount — give a freshly-registered User a BusinessAccount,
 * an empty primary Outlet (requiresAddressUpdate=true until they fill it in),
 * a BusinessAccountMember, and a UserRole (Owner / Vendor Admin / Brand Admin).
 *
 * Used by:
 *  - src/auth.ts OTP auto-registration on first phone OTP
 *  - src/modules/auth/auth.service.ts signup (email+password)
 *  - any future signup paths
 *
 * Idempotent: if the user already has a primary BusinessAccountMember the
 * existing one is returned unchanged. Safe to call on every login if needed.
 */

import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AccountKind = 'customer' | 'vendor' | 'brand';

interface ProvisionInput {
  userId: string;
  kind: AccountKind;
  businessName?: string | null;
  fullName?: string | null;
  gstNumber?: string | null;
  // P0-4: real business type (Restaurant/Hotel/Caterer/…) when the signup
  // flow collects it. Falls back to the kind default only when unset, so we
  // stop blindly stamping every customer as 'customer'.
  businessType?: string | null;
}

interface ProvisionResult {
  businessAccountId: string;
  outletId: string;
  created: boolean;       // true if a new account was created, false if user already had one
  ownerRoleId: string;
}

const KIND_TO_FLAGS: Record<AccountKind, { isCustomer: boolean; isVendor: boolean; isBrand: boolean; templateName: string; templateScope: 'account' | 'vendor' | 'brand'; businessType: string }> = {
  customer: { isCustomer: true,  isVendor: false, isBrand: false, templateName: 'Owner',        templateScope: 'account', businessType: 'customer' },
  vendor:   { isCustomer: true,  isVendor: true,  isBrand: false, templateName: 'Vendor Admin', templateScope: 'vendor',  businessType: 'vendor' },
  brand:    { isCustomer: false, isVendor: false, isBrand: true,  templateName: 'Brand Admin',  templateScope: 'brand',   businessType: 'brand' },
};

export async function provisionDefaultAccount(
  input: ProvisionInput,
  client?: Pick<PrismaClient, 'businessAccountMember' | 'businessAccount' | 'outlet' | 'userRole' | 'accountRole'>,
): Promise<ProvisionResult> {
  const db = client ?? prisma;

  // Idempotent: if user already has a primary membership, return it.
  const existing = await db.businessAccountMember.findFirst({
    where: { userId: input.userId, isPrimary: true },
    select: {
      businessAccountId: true,
      businessAccount: { select: { primaryOutletId: true } },
    },
  });
  if (existing && existing.businessAccount.primaryOutletId) {
    // Make sure the Owner role assignment exists too.
    const flags = KIND_TO_FLAGS[input.kind];
    const template = await db.accountRole.findFirst({
      where: { businessAccountId: null, isTemplate: true, name: flags.templateName, scope: flags.templateScope },
      select: { id: true },
    });
    if (template) {
      const has = await db.userRole.findFirst({
        where: { userId: input.userId, businessAccountId: existing.businessAccountId, outletId: null, roleId: template.id },
        select: { id: true },
      });
      if (!has) {
        await db.userRole.create({
          data: { userId: input.userId, businessAccountId: existing.businessAccountId, outletId: null, roleId: template.id },
        });
      }
    }
    return {
      businessAccountId: existing.businessAccountId,
      outletId: existing.businessAccount.primaryOutletId,
      created: false,
      ownerRoleId: template?.id ?? '',
    };
  }

  const flags = KIND_TO_FLAGS[input.kind];
  const legalName = input.businessName?.trim() || input.fullName?.trim() || 'My Business';

  // Lookup the seeded role template up-front so we fail fast if backfill never ran.
  const template = await db.accountRole.findFirst({
    where: { businessAccountId: null, isTemplate: true, name: flags.templateName, scope: flags.templateScope },
    select: { id: true },
  });
  if (!template) {
    throw new Error(`Missing seeded ${flags.templateScope}/${flags.templateName} role template. Run prisma/migrations/20260520_hcid_architecture_step_a/data_migrate.ts.`);
  }

  const account = await db.businessAccount.create({
    data: {
      legalName,
      displayName: input.businessName?.trim() ?? null,
      gstin: input.gstNumber?.trim() ?? null,
      businessType: input.businessType?.trim() || flags.businessType,
      isCustomer: flags.isCustomer,
      isVendor: flags.isVendor,
      isBrand: flags.isBrand,
      status: 'active',
    },
  });

  const outlet = await db.outlet.create({
    data: {
      businessAccountId: account.id,
      name: input.businessName?.trim() || 'Primary Outlet',
      addressLine: 'Address pending — complete in account settings',
      latitude: null,
      longitude: null,
      requiresAddressUpdate: true,
    },
  });

  await db.businessAccount.update({
    where: { id: account.id },
    data: { primaryOutletId: outlet.id },
  });

  await db.businessAccountMember.create({
    data: {
      userId: input.userId,
      businessAccountId: account.id,
      isPrimary: true,
      acceptedAt: new Date(),
    },
  });

  await db.userRole.create({
    data: {
      userId: input.userId,
      businessAccountId: account.id,
      outletId: null,
      roleId: template.id,
    },
  });

  return {
    businessAccountId: account.id,
    outletId: outlet.id,
    created: true,
    ownerRoleId: template.id,
  };
}
