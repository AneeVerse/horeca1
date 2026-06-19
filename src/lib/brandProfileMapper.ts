/**
 * Maps BrandProfileInput → Prisma / API payloads.
 */

import type { Prisma } from '@prisma/client';
import {
  type BrandProfileInput,
  derivedBrandName,
  derivedDisplayName,
  derivedFullName,
  derivedLegalName,
  primaryPhoneDigits,
  parseBool,
} from '@/lib/validators/brand-profile';

function str(v: string | undefined | null): string | null {
  const t = (v ?? '').trim();
  return t || null;
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function mapToUserFields(p: BrandProfileInput): {
  fullName: string;
  phone: string;
  email: string | null;
  businessName: string | null;
  gstNumber: string | null;
  password?: string;
} {
  const legalName = derivedLegalName(p);
  const fullName = derivedFullName(p);
  return {
    fullName: fullName || legalName,
    phone: primaryPhoneDigits(p),
    email: str(p.email),
    businessName: legalName || null,
    gstNumber: str(p.gstin)?.toUpperCase() ?? null,
    ...(p.password?.trim() ? { password: p.password.trim() } : {}),
  };
}

export function mapToBusinessAccount(
  p: BrandProfileInput,
): Prisma.BusinessAccountCreateInput | Prisma.BusinessAccountUpdateInput {
  const legalName = derivedLegalName(p) || 'Brand';
  const displayName = derivedDisplayName(p);
  const phone = primaryPhoneDigits(p);

  return {
    legalName,
    displayName: displayName || null,
    companyName: legalName,
    gstin: str(p.gstin)?.toUpperCase() ?? null,
    businessType: str(p.brandType) || 'brand',
    subType: str(p.subType),
    salutation: str(p.salutation),
    firstName: str(p.firstName),
    lastName: str(p.lastName),
    designation: str(p.designation),
    billingAddressLine: str(p.addressLine || p.billingAddressLine),
    billingCity: str(p.city || p.billingCity),
    billingState: str(p.state || p.billingState),
    billingPincode: str(p.pincode || p.billingPincode),
    mobilePhone: phone || str(p.mobilePhone),
    workPhone: str(p.workPhone) || phone || null,
    businessSize: str(p.businessSize),
    remarks: str(p.remarks),
    leadStatus: str(p.leadStatus) || null,
  } as Prisma.BusinessAccountUpdateInput;
}

export function mapToBrand(
  p: BrandProfileInput,
  opts?: { slugSuffix?: string },
): Prisma.BrandCreateInput {
  const name = derivedBrandName(p);
  const baseSlug = slugify(name);
  const slug = opts?.slugSuffix ? `${baseSlug}-${opts.slugSuffix.slice(0, 8)}` : baseSlug;
  const categories = Array.isArray(p.productCategories) && p.productCategories.length > 0
    ? p.productCategories
    : [];

  return {
    name,
    slug,
    description: str(p.description),
    website: str(p.website),
    tagline: str(p.tagline),
    logoUrl: str(p.logoUrl),
    categories,
    brandType: str(p.brandType),
    subType: str(p.subType),
    businessSize: str(p.businessSize),
    distributionPresence: str(p.distributionPresence),
    targetSegments: Array.isArray(p.targetSegments) ? p.targetSegments : [],
    horecaFocused: parseBool(p.horecaFocused),
    retailFocused: parseBool(p.retailFocused),
    brandTier: str(p.brandTier),
    marketplaceVisibility: str(p.marketplaceVisibility),
    creditSupport: parseBool(p.creditSupport) ?? false,
    leadStatus: str(p.leadStatus) || 'Lead',
  } as Prisma.BrandCreateInput;
}

export function mapToPrimaryOutlet(p: BrandProfileInput): {
  name: string;
  addressLine: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
} {
  const displayName = derivedDisplayName(p);
  const addressLine = str(p.addressLine || p.billingAddressLine);

  return {
    name: str(p.outletName) || `${displayName} HQ`,
    addressLine: addressLine || 'Address pending — complete in brand settings',
    city: str(p.city || p.billingCity),
    state: str(p.state || p.billingState),
    pincode: str(p.pincode || p.billingPincode),
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    placeId: str(p.placeId),
  };
}

/** Build POST /api/v1/account payload for logged-in add-business (brand branch). */
export function buildAddBusinessPayload(p: BrandProfileInput): Record<string, unknown> {
  const legalName = derivedLegalName(p);
  const displayName = derivedDisplayName(p);
  const outlet = mapToPrimaryOutlet(p);

  return {
    legalName,
    displayName: displayName || undefined,
    gstin: str(p.gstin)?.toUpperCase() || undefined,
    businessType: str(p.brandType) || 'brand',
    subType: str(p.subType) || undefined,
    salutation: str(p.salutation) || undefined,
    firstName: str(p.firstName) || undefined,
    lastName: str(p.lastName) || undefined,
    designation: str(p.designation) || undefined,
    billingAddressLine: str(p.addressLine || p.billingAddressLine) || undefined,
    billingCity: str(p.city || p.billingCity) || undefined,
    billingState: str(p.state || p.billingState) || undefined,
    billingPincode: str(p.pincode || p.billingPincode) || undefined,
    productCategories: p.productCategories,
    businessSize: str(p.businessSize) || undefined,
    distributionPresence: str(p.distributionPresence) || undefined,
    targetSegments: p.targetSegments,
    horecaFocused: parseBool(p.horecaFocused) ?? undefined,
    retailFocused: parseBool(p.retailFocused) ?? undefined,
    website: str(p.website) || undefined,
    tagline: str(p.tagline) || undefined,
    description: str(p.description) || undefined,
    isCustomer: false,
    isVendor: false,
    isBrand: true,
    primaryOutlet: {
      name: outlet.name,
      addressLine: outlet.addressLine,
      city: outlet.city ?? undefined,
      state: outlet.state ?? undefined,
      pincode: outlet.pincode ?? undefined,
      ...(p.latitude != null && p.longitude != null && {
        latitude: p.latitude,
        longitude: p.longitude,
      }),
      ...(p.placeId != null && { placeId: p.placeId }),
    },
  };
}

export function buildAdminBrandPayload(
  p: BrandProfileInput,
  owner: { fullName: string; email: string; password: string },
): Record<string, unknown> {
  return {
    fullName: owner.fullName || derivedFullName(p),
    email: owner.email,
    password: owner.password,
    ...buildBrandProfilePayload(p),
  };
}

/** Profile fields for POST /api/v1/admin/brands (owner auth fields added by caller). */
export function buildBrandProfilePayload(p: BrandProfileInput): Record<string, unknown> {
  const legalName = derivedLegalName(p);
  const displayName = derivedDisplayName(p);
  return {
    name: displayName || legalName,
    legalName,
    displayName,
    brandType: str(p.brandType),
    subType: str(p.subType),
    productCategories: p.productCategories,
    businessSize: str(p.businessSize),
    distributionPresence: str(p.distributionPresence),
    targetSegments: p.targetSegments,
    horecaFocused: parseBool(p.horecaFocused),
    retailFocused: parseBool(p.retailFocused),
    salutation: str(p.salutation),
    firstName: str(p.firstName),
    lastName: str(p.lastName),
    designation: str(p.designation),
    phone: primaryPhoneDigits(p),
    mobilePhone: primaryPhoneDigits(p) || str(p.mobilePhone),
    gstin: str(p.gstin)?.toUpperCase(),
    city: str(p.city || p.billingCity),
    state: str(p.state || p.billingState),
    billingAddressLine: str(p.addressLine || p.billingAddressLine),
    billingPincode: str(p.pincode || p.billingPincode),
    website: str(p.website),
    tagline: str(p.tagline),
    description: str(p.description),
    logoUrl: str(p.logoUrl),
    brandTier: str(p.brandTier),
    marketplaceVisibility: str(p.marketplaceVisibility),
    creditSupport: parseBool(p.creditSupport),
    leadStatus: str(p.leadStatus),
    manualTags: p.manualTags,
    remarks: str(p.remarks),
  };
}

export function brandProfileToBusinessAccountUpdate(
  profile: Record<string, unknown>,
): Prisma.BusinessAccountUpdateInput {
  return mapToBusinessAccount(profile as BrandProfileInput);
}


/** Brand row fields for onboarding / admin create (slug computed separately). */
export function mapToBrandFields(p: BrandProfileInput): Omit<Prisma.BrandCreateInput, 'user' | 'businessAccount' | 'slug'> {
  const { slug: _omitSlug, ...fields } = mapToBrand(p) as Prisma.BrandCreateInput & { slug?: string };
  void _omitSlug;
  return fields;
}

/** Alias matching admin API import name. */
export const mapToBrandProfileFields = mapToBrandFields;

/** Flat payload for POST /api/v1/brand/onboarding/submit from /brand/register. */
export function buildBrandProfile(p: BrandProfileInput & { password?: string }): Record<string, unknown> {
  const fields = mapToBrandFields(p);
  return {
    legalName: derivedLegalName(p),
    displayName: derivedDisplayName(p),
    name: fields.name,
    fullName: derivedFullName(p),
    salutation: str(p.salutation),
    firstName: str(p.firstName),
    lastName: str(p.lastName),
    designation: str(p.designation),
    brandType: fields.brandType,
    subType: fields.subType,
    productCategories: fields.categories,
    businessSize: fields.businessSize,
    distributionPresence: fields.distributionPresence,
    targetSegments: fields.targetSegments,
    horecaFocused: fields.horecaFocused,
    retailFocused: fields.retailFocused,
    email: str(p.email),
    gstin: str(p.gstin)?.toUpperCase(),
    billingAddressLine: str(p.addressLine || p.billingAddressLine),
    city: str(p.city || p.billingCity),
    state: str(p.state || p.billingState),
    pincode: str(p.pincode || p.billingPincode),
    website: fields.website,
    tagline: fields.tagline,
    description: fields.description,
    password: p.password?.trim() || undefined,
  };
}
